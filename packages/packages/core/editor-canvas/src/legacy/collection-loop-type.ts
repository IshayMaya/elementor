import {
	type CreateNestedTemplatedElementTypeOptions,
	createNestedTemplatedElementView,
} from './create-nested-templated-element-type';
import { registerElementType } from './init-legacy-views';
import { getLoopEditingId, setLoopEditingId, subscribeLoopEditingId } from './loop-edit-mode/state';
import { applyNavigatorFilter, clearNavigatorFilter } from './loop-edit-mode/structure-panel-filter';
import { waitForChildrenToComplete } from './twig-rendering-utils';
import { type ElementType, type ElementView, type LegacyWindow } from './types';

const LAYOUT_TYPE = 'e-collection-loop-layout';
const ITEM_TYPE = 'e-collection-loop-item';
const STATIC_ITEM_CLASS = 'e-loop-static-item';
const EDIT_LABEL_CLASS = 'e-loop-edit-label';
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

function applyEditModeToView( view: ElementView ) {
	const el = view.$el.get( 0 );
	if ( ! el ) {
		return;
	}

	el.querySelectorAll( `.${ STATIC_ITEM_CLASS }` ).forEach( ( node ) => node.remove() );
	el.querySelectorAll( `.${ EDIT_LABEL_CLASS }` ).forEach( ( node ) => node.remove() );
	setEditableItemsHidden( el, false );
	el.classList.add( EDITING_CLASS );
}

function exitEditModeOnView( view: ElementView ) {
	const el = view.$el.get( 0 );
	if ( ! el ) {
		return;
	}

	el.querySelectorAll( `.${ EDIT_LABEL_CLASS }` ).forEach( ( node ) => node.remove() );
	el.classList.remove( EDITING_CLASS );
}

type LoopLayoutViewInstance = ElementView & {
	_parentSettingsListener: ( () => void ) | null;
	_renderGeneration: number;
	_editModeUnsubscribe: ( () => void ) | null;
	_wasInEditMode: boolean;
	_listenToParentSettings: () => void;
	_stopListeningToParentSettings: () => void;
	_refetchStaticItems: () => void;
	_onEditModeChanged: () => void;
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
		_wasInEditMode: false as boolean,

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
			if ( loopId ) {
				setLoopEditingId( loopId );
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
			if ( loopId && getLoopEditingId() === loopId ) {
				applyEditModeToView( this );
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
		},

		onDestroy( this: LoopLayoutViewInstance ) {
			this._stopListeningToParentSettings();

			if ( this._editModeUnsubscribe ) {
				this._editModeUnsubscribe();
				this._editModeUnsubscribe = null;
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

			const isNowEditing = getLoopEditingId() === loopId;

			if ( isNowEditing && ! this._wasInEditMode ) {
				this._wasInEditMode = true;
				applyEditModeToView( this );
				applyNavigatorFilter( loopId );
			} else if ( ! isNowEditing && this._wasInEditMode ) {
				this._wasInEditMode = false;
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
