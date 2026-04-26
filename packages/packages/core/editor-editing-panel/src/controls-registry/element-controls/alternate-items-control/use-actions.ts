import { type ItemsActionPayload } from '@elementor/editor-controls';
import { createElements, getContainer, removeElements } from '@elementor/editor-elements';
import { __ } from '@wordpress/i18n';

export const ITEM_ELEMENT_TYPE = 'e-collection-loop-item';

export type AlternateItem = {
	id: string;
	title?: string;
};

export const useActions = () => {
	const addItem = ( { layoutId, items }: { layoutId: string; items: ItemsActionPayload< AlternateItem > } ) => {
		const layoutContainer = getContainer( layoutId );

		if ( ! layoutContainer ) {
			throw new Error( 'Layout container not found' );
		}

		items.forEach( ( { index } ) => {
			const position = index + 1;

			createElements( {
				title: __( 'Alternate Items', 'elementor' ),
				elements: [
					{
						container: layoutContainer,
						model: {
							elType: ITEM_ELEMENT_TYPE,
							settings: {
								alternate_index: { $$type: 'number', value: position },
							},
							editor_settings: {
								title: `Alternate item ${ position }`,
							},
						},
					},
				],
			} );
		} );
	};

	const removeItem = ( { items }: { items: ItemsActionPayload< AlternateItem > } ) => {
		removeElements( {
			title: __( 'Alternate Items', 'elementor' ),
			elementIds: items.map( ( { item } ) => item.id as string ),
		} );
	};

	return {
		addItem,
		removeItem,
	};
};
