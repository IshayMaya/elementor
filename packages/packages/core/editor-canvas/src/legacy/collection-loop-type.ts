import {
	type CreateNestedTemplatedElementTypeOptions,
	createNestedTemplatedElementView,
} from './create-nested-templated-element-type';
import { registerElementType } from './init-legacy-views';
import {
	getLoopEditingId,
	getLoopEditState,
	setActiveItem,
	setLoopEditingId,
	subscribeLoopEditingId,
} from './loop-edit-mode/state';
import { applyNavigatorFilter, clearNavigatorFilter } from './loop-edit-mode/structure-panel-filter';
import { waitForChildrenToComplete } from './twig-rendering-utils';
import { type ElementType, type ElementView, type LegacyWindow } from './types';

const LAYOUT_TYPE = 'e-collection-loop-layout';
const ITEM_TYPE = 'e-collection-loop-item';
const STATIC_ITEM_CLASS = 'e-loop-static-item';
const EDITING_CLASS = 'e-loop-editing';

type AjaxWindow = Window & {
	elementorCommon: {
		ajax: {
			addRequest: ( action: string, options: Record< string, unknown > ) => void;
		};
	};
};

type MarionetteExtendable = typeof ElementView & {
	extend: ( properties: Record< string, unknown > ) => typeof ElementView;
};

type BackboneChild = { get: ( k: string ) => unknown };

function getCollectionLoopParentModel( view: ElementView ) {
	return view._parent?.model;
}

function getLoopId( view: ElementView ): string | undefined {
	return getCollectionLoopParentModel( view )?.get( 'id' ) as string | undefined;
}

let fetchIdCounter = 0;

function fetchRenderedLoop( parentModel: ElementView[ 'model' ] ): Promise< string | null > {
	const ajaxWindow = window as unknown as AjaxWindow;
	const data = parentModel.toJSON();
	const uniqueId = `render_atomic_element_${ data.id ?? ++fetchIdCounter }`;

	return new Promise( ( resolve ) => {
		ajaxWindow.elementorCommon.ajax.addRequest( 'render_atomic_element', {
			unique_id: uniqueId,
			data: { data },
			success: ( response: { render: string } ) => resolve( response.render ),
			error: () => resolve( null ),
		} as Record< string, unknown > );
	} );
}

function getEditablePositions( view: ElementView ): Map< number, string > {
	const positions = new Map< number, string >();
	const children = ( view.collection?.models ?? [] ) as BackboneChild[];

	if ( children.length > 0 ) {
		positions.set( 0, String( children[ 0 ].get( 'id' ) ) );
	}

	for ( let i = 1; i < children.length; i++ ) {
		const child = children[ i ];
		const settings = child.get( 'settings' ) as { get: ( key: string ) => unknown } | undefined;
		const altIndexProp = settings?.get( 'alternate_index' ) as { value?: number } | number | null | undefined;
		const position = typeof altIndexProp === 'object' && altIndexProp !== null ? altIndexProp.value : altIndexProp;

		if ( typeof position === 'number' && position >= 1 ) {
			positions.set( position - 1, String( child.get( 'id' ) ) );
		}
	}

	return positions;
}

function getFirstEditableChildId( view: ElementView ): string | undefined {
	const children = ( view.collection?.models ?? [] ) as BackboneChild[];
	return children.length > 0 ? String( children[ 0 ].get( 'id' ) ) : undefined;
}

function getEditableChildIds( view: ElementView ): Set< string > {
	const ids = new Set< string >();
	const children = ( view.collection?.models ?? [] ) as BackboneChild[];
	for ( const child of children ) {
		ids.add( String( child.get( 'id' ) ) );
	}
	return ids;
}

function getEditableItems( el: HTMLElement ): HTMLElement[] {
	return Array.from(
		el.querySelectorAll< HTMLElement >(
			`:scope > [data-element_type="${ ITEM_TYPE }"]:not(.${ STATIC_ITEM_CLASS })`
		)
	);
}

function setEditableItemsHidden( el: HTMLElement, hidden: boolean ) {
	getEditableItems( el ).forEach( ( item ) => {
		item.style.display = hidden ? 'none' : '';
	} );
}

function getStaticItems( el: HTMLElement ): HTMLElement[] {
	return Array.from( el.querySelectorAll< HTMLElement >( `:scope > .${ STATIC_ITEM_CLASS }` ) );
}

function appendStaticItems( view: ElementView, fullHtml: string ) {
	const el = view.$el.get( 0 );
	if ( ! el ) {
		return;
	}

	el.querySelectorAll( `.${ STATIC_ITEM_CLASS }` ).forEach( ( node ) => node.remove() );

	const parser = new DOMParser();
	const doc = parser.parseFromString( fullHtml, 'text/html' );

	const layoutEl = doc.querySelector( `[data-element_type="${ LAYOUT_TYPE }"]` );
	if ( ! layoutEl ) {
		return;
	}

	const allItems = Array.from( layoutEl.querySelectorAll( `:scope > [data-element_type="${ ITEM_TYPE }"]` ) );

	allItems.forEach( ( item ) => {
		item.classList.add( STATIC_ITEM_CLASS );
		( item as HTMLElement ).style.pointerEvents = 'none';
		( item as HTMLElement ).style.opacity = '0.7';
		el.appendChild( item );
	} );

	setEditableItemsHidden( el, true );
}

function applyEditModeToView( view: ElementView, activeItemId: string ) {
	const el = view.$el.get( 0 );
	if ( ! el ) {
		return;
	}

	el.classList.add( EDITING_CLASS );

	setEditableItemsHidden( el, true );

	const activeBackboneEl = el.querySelector< HTMLElement >(
		`:scope > [data-element_type="${ ITEM_TYPE }"][data-id="${ activeItemId }"]:not(.${ STATIC_ITEM_CLASS })`
	);

	if ( ! activeBackboneEl ) {
		return;
	}

	const editablePositions = getEditablePositions( view );
	let targetIterationIndex = -1;
	for ( const [ idx, itemId ] of editablePositions ) {
		if ( itemId === activeItemId ) {
			targetIterationIndex = idx;
			break;
		}
	}

	const staticItems = getStaticItems( el );

	if ( targetIterationIndex >= 0 && targetIterationIndex < staticItems.length ) {
		const staticTarget = staticItems[ targetIterationIndex ];
		staticTarget.replaceWith( activeBackboneEl );
		activeBackboneEl.style.display = '';
		activeBackboneEl.style.pointerEvents = '';
		activeBackboneEl.style.opacity = '';
	} else {
		activeBackboneEl.style.display = '';
		activeBackboneEl.style.pointerEvents = '';
		activeBackboneEl.style.opacity = '';
	}
}

function exitEditModeOnView( view: ElementView ) {
	const el = view.$el.get( 0 );
	if ( ! el ) {
		return;
	}

	el.classList.remove( EDITING_CLASS );

	getEditableItems( el ).forEach( ( item ) => {
		el.appendChild( item );
		item.style.display = 'none';
	} );
}

type LoopLayoutViewInstance = ElementView & {
	_parentSettingsListener: ( () => void ) | null;
	_renderGeneration: number;
	_editModeUnsubscribe: ( () => void ) | null;
	_navClickHandler: ( ( e: Event ) => void ) | null;
	_wasInEditMode: boolean;
	_previousActiveItemId: string | null;
	_listenToParentSettings: () => void;
	_stopListeningToParentSettings: () => void;
	_refetchStaticItems: () => void;
	_onEditModeChanged: () => void;
	_refetchAndApplyEditMode: ( activeItemId: string ) => void;
};

function createCollectionLoopLayoutType( options: CreateNestedTemplatedElementTypeOptions ): typeof ElementType {
	const legacyWindow = window as unknown as LegacyWindow;
	const { type, renderer, element } = options;

	const BaseView = createNestedTemplatedElementView( { type, renderer, element } ) as unknown as MarionetteExtendable;
	const baseRenderChildren = BaseView.prototype._renderChildren;

	const LoopLayoutView = BaseView.extend( {
		_parentSettingsListener: null as ( () => void ) | null,
		_renderGeneration: 0 as number,
		_editModeUnsubscribe: null as ( () => void ) | null,
		_navClickHandler: null as ( ( e: Event ) => void ) | null,
		_wasInEditMode: false as boolean,
		_previousActiveItemId: null as string | null,

		events() {
			const proto = BaseView.prototype as unknown as { events?: () => Record< string, unknown > };
			const parentEvents = typeof proto.events === 'function' ? proto.events.call( this ) : {};

			return {
				...parentEvents,
				dblclick: '_handleDblClick',
			};
		},

		_handleDblClick( this: LoopLayoutViewInstance, e: MouseEvent ) {
			e.stopPropagation();
			const loopId = getLoopId( this );
			if ( ! loopId ) {
				return;
			}

			const firstItemId = getFirstEditableChildId( this );
			if ( firstItemId ) {
				setLoopEditingId( loopId, firstItemId );
			}
		},

		async _renderChildren( this: LoopLayoutViewInstance ) {
			const generation = ++this._renderGeneration;

			baseRenderChildren.call( this );

			await waitForChildrenToComplete( this );

			if ( generation !== this._renderGeneration ) {
				return;
			}

			const loopId = getLoopId( this );
			const editState = getLoopEditState();
			if ( loopId && editState?.loopId === loopId && editState.activeItemId ) {
				const collectionLoopModel = getCollectionLoopParentModel( this );
				if ( collectionLoopModel ) {
					const html = await fetchRenderedLoop( collectionLoopModel );
					if ( html && generation === this._renderGeneration ) {
						appendStaticItems( this, html );
						applyEditModeToView( this, editState.activeItemId );
						this._previousActiveItemId = editState.activeItemId;
					}
				}
				return;
			}

			const collectionLoopModel = getCollectionLoopParentModel( this );
			if ( ! collectionLoopModel ) {
				return;
			}

			const html = await fetchRenderedLoop( collectionLoopModel );

			if ( ! html || generation !== this._renderGeneration ) {
				return;
			}

			appendStaticItems( this, html );
		},

		onRender( this: LoopLayoutViewInstance ) {
			this._listenToParentSettings();

			if ( this._editModeUnsubscribe ) {
				this._editModeUnsubscribe();
			}

			this._editModeUnsubscribe = subscribeLoopEditingId( () => this._onEditModeChanged() );

			if ( this._navClickHandler ) {
				window.removeEventListener( 'elementor/navigator/item/click', this._navClickHandler );
			}

			this._navClickHandler = ( e: Event ) => {
				const detail = ( e as CustomEvent ).detail as { id?: string } | undefined;
				if ( ! detail?.id ) {
					return;
				}

				const clickedId = String( detail.id );
				const editableIds = getEditableChildIds( this );
				if ( ! editableIds.has( clickedId ) ) {
					return;
				}

				const loopId = getLoopId( this );
				if ( ! loopId ) {
					return;
				}

				const editState = getLoopEditState();
				if ( editState?.loopId === loopId ) {
					setActiveItem( clickedId );
				} else {
					setLoopEditingId( loopId, clickedId );
				}
			};

			window.addEventListener( 'elementor/navigator/item/click', this._navClickHandler );
		},

		onDestroy( this: LoopLayoutViewInstance ) {
			this._stopListeningToParentSettings();

			if ( this._editModeUnsubscribe ) {
				this._editModeUnsubscribe();
				this._editModeUnsubscribe = null;
			}

			if ( this._navClickHandler ) {
				window.removeEventListener( 'elementor/navigator/item/click', this._navClickHandler );
				this._navClickHandler = null;
			}

			const loopId = getLoopId( this );
			if ( loopId && getLoopEditingId() === loopId ) {
				setLoopEditingId( null );
			}
		},

		_onEditModeChanged( this: LoopLayoutViewInstance ) {
			const loopId = getLoopId( this );
			if ( ! loopId ) {
				return;
			}

			const editState = getLoopEditState();
			const isThisLoop = editState?.loopId === loopId;
			const activeItemId = isThisLoop ? editState?.activeItemId ?? null : null;

			if ( isThisLoop && ! this._wasInEditMode ) {
				this._wasInEditMode = true;
				this._previousActiveItemId = activeItemId;
				if ( activeItemId ) {
					applyEditModeToView( this, activeItemId );
					applyNavigatorFilter( loopId );
				}
			} else if (
				isThisLoop &&
				this._wasInEditMode &&
				activeItemId &&
				activeItemId !== this._previousActiveItemId
			) {
				const el = this.$el.get( 0 );
				if ( el ) {
					const prevBackboneEl = this._previousActiveItemId
						? el.querySelector< HTMLElement >(
								`:scope > [data-element_type="${ ITEM_TYPE }"][data-id="${ this._previousActiveItemId }"]:not(.${ STATIC_ITEM_CLASS })`
						  )
						: null;

					if ( prevBackboneEl ) {
						prevBackboneEl.style.display = 'none';
						el.appendChild( prevBackboneEl );
					}

					this._refetchAndApplyEditMode( activeItemId );
				}
				this._previousActiveItemId = activeItemId;
			} else if ( ! isThisLoop && this._wasInEditMode ) {
				this._wasInEditMode = false;
				this._previousActiveItemId = null;
				exitEditModeOnView( this );
				clearNavigatorFilter();
				this._refetchStaticItems();
			}
		},

		_listenToParentSettings( this: LoopLayoutViewInstance ) {
			this._stopListeningToParentSettings();

			const collectionLoopModel = getCollectionLoopParentModel( this );
			if ( ! collectionLoopModel ) {
				return;
			}

			const settings = collectionLoopModel.get( 'settings' as never );
			if ( ! settings ) {
				return;
			}

			const handler = () => {
				this._refetchStaticItems();
			};

			( settings as unknown as { on: ( event: string, cb: ( ...a: unknown[] ) => void ) => void } ).on(
				'change',
				handler
			);

			this._parentSettingsListener = () => {
				( settings as unknown as { off: ( event: string, cb: ( ...a: unknown[] ) => void ) => void } ).off(
					'change',
					handler
				);
			};
		},

		_stopListeningToParentSettings( this: LoopLayoutViewInstance ) {
			if ( this._parentSettingsListener ) {
				this._parentSettingsListener();
				this._parentSettingsListener = null;
			}
		},

		async _refetchStaticItems( this: LoopLayoutViewInstance ) {
			const loopId = getLoopId( this );
			if ( loopId && getLoopEditingId() === loopId ) {
				return;
			}

			const generation = ++this._renderGeneration;

			const collectionLoopModel = getCollectionLoopParentModel( this );
			if ( ! collectionLoopModel ) {
				return;
			}

			const html = await fetchRenderedLoop( collectionLoopModel );

			if ( ! html || generation !== this._renderGeneration ) {
				return;
			}

			appendStaticItems( this, html );
		},

		async _refetchAndApplyEditMode( this: LoopLayoutViewInstance, activeItemId: string ) {
			const generation = ++this._renderGeneration;

			const collectionLoopModel = getCollectionLoopParentModel( this );
			if ( ! collectionLoopModel ) {
				return;
			}

			const html = await fetchRenderedLoop( collectionLoopModel );
			if ( ! html || generation !== this._renderGeneration ) {
				return;
			}

			const el = this.$el.get( 0 );
			if ( ! el ) {
				return;
			}

			el.querySelectorAll( `.${ STATIC_ITEM_CLASS }` ).forEach( ( node ) => node.remove() );

			const parser = new DOMParser();
			const doc = parser.parseFromString( html, 'text/html' );
			const layoutEl = doc.querySelector( `[data-element_type="${ LAYOUT_TYPE }"]` );
			if ( ! layoutEl ) {
				return;
			}

			const allItems = Array.from( layoutEl.querySelectorAll( `:scope > [data-element_type="${ ITEM_TYPE }"]` ) );
			allItems.forEach( ( item ) => {
				item.classList.add( STATIC_ITEM_CLASS );
				( item as HTMLElement ).style.pointerEvents = 'none';
				( item as HTMLElement ).style.opacity = '0.7';
				el.appendChild( item );
			} );

			setEditableItemsHidden( el, true );
			applyEditModeToView( this, activeItemId );
		},
	} );

	return class extends legacyWindow.elementor.modules.elements.types.Base {
		getType() {
			return type;
		}

		getView() {
			return LoopLayoutView as unknown as typeof ElementView;
		}

		getModel() {
			return legacyWindow.elementor.modules.elements.models.AtomicElementBase;
		}
	};
}

export function initCollectionLoopType() {
	registerElementType( LAYOUT_TYPE, ( options ) =>
		createCollectionLoopLayoutType( options as CreateNestedTemplatedElementTypeOptions )
	);
}
