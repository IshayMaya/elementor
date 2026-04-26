import {
	type CreateNestedTemplatedElementTypeOptions,
	createNestedTemplatedElementView,
} from './create-nested-templated-element-type';
import { registerElementType } from './init-legacy-views';
import { waitForChildrenToComplete } from './twig-rendering-utils';
import { type ElementType, type ElementView, type LegacyWindow } from './types';

const LAYOUT_TYPE = 'e-collection-loop-layout';
const ITEM_TYPE = 'e-collection-loop-item';
const STATIC_ITEM_CLASS = 'e-loop-static-item';

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

	const children = ( view.collection?.models ?? [] ) as Array< { get: ( k: string ) => unknown } >;

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
	const editablePositions = getEditablePositions( view );

	allItems.forEach( ( item, iterationIndex ) => {
		const editableId = editablePositions.get( iterationIndex );

		if ( editableId ) {
			const editableEl = el.querySelector(
				`:scope > [data-element_type="${ ITEM_TYPE }"][data-id="${ editableId }"]`
			);
			if ( editableEl ) {
				el.appendChild( editableEl );
			}
			return;
		}

		item.classList.add( STATIC_ITEM_CLASS );
		( item as HTMLElement ).style.pointerEvents = 'none';
		( item as HTMLElement ).style.opacity = '0.7';
		el.appendChild( item );
	} );
}

function createCollectionLoopLayoutType( options: CreateNestedTemplatedElementTypeOptions ): typeof ElementType {
	const legacyWindow = window as unknown as LegacyWindow;
	const { type, renderer, element } = options;

	const BaseView = createNestedTemplatedElementView( { type, renderer, element } ) as unknown as MarionetteExtendable;
	const baseRenderChildren = BaseView.prototype._renderChildren;

	const LoopLayoutView = BaseView.extend( {
		_parentSettingsListener: null as ( () => void ) | null,
		_renderGeneration: 0 as number,

		async _renderChildren(
			this: ElementView & { _parentSettingsListener: ( () => void ) | null; _renderGeneration: number }
		) {
			const generation = ++this._renderGeneration;

			baseRenderChildren.call( this );

			await waitForChildrenToComplete( this );

			if ( generation !== this._renderGeneration ) {
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

		onRender( this: ElementView & { _listenToParentSettings: () => void } ) {
			this._listenToParentSettings();
		},

		onDestroy( this: ElementView & { _stopListeningToParentSettings: () => void } ) {
			this._stopListeningToParentSettings();
		},

		_listenToParentSettings(
			this: ElementView & {
				_parentSettingsListener: ( () => void ) | null;
				_stopListeningToParentSettings: () => void;
				_refetchStaticItems: () => void;
			}
		) {
			this._stopListeningToParentSettings();

			const collectionLoopModel = getCollectionLoopParentModel( this );
			if ( ! collectionLoopModel ) {
				return;
			}

			const settings = collectionLoopModel.get( 'settings' as never );
			if ( ! settings ) {
				return;
			}

			const handler = () => this._refetchStaticItems();

			( settings as unknown as { on: ( event: string, cb: () => void ) => void } ).on( 'change', handler );

			this._parentSettingsListener = () => {
				( settings as unknown as { off: ( event: string, cb: () => void ) => void } ).off( 'change', handler );
			};
		},

		_stopListeningToParentSettings( this: ElementView & { _parentSettingsListener: ( () => void ) | null } ) {
			if ( this._parentSettingsListener ) {
				this._parentSettingsListener();
				this._parentSettingsListener = null;
			}
		},

		async _refetchStaticItems( this: ElementView & { _renderGeneration: number } ) {
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
