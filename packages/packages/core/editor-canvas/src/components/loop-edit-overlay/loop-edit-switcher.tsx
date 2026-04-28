import { type CSSProperties, useCallback, useMemo } from 'react';
import { findChildRecursive, getContainer, getElementChildrenWithFallback } from '@elementor/editor-elements';
import { __privateUseListenTo as useListenTo, commandEndEvent, v1ReadyEvent } from '@elementor/editor-v1-adapters';
import { __ } from '@wordpress/i18n';

import { setActiveItem } from '../../legacy/loop-edit-mode/state';

const LAYOUT_TYPE = 'e-collection-loop-layout';
const ITEM_TYPE = 'e-collection-loop-item';

interface EditableItem {
	id: string;
	label: string;
	position: number | null;
}

function getEditableItemsForLoop( loopId: string ): EditableItem[] {
	const loopContainer = getContainer( loopId );
	if ( ! loopContainer?.model ) {
		return [];
	}

	const layoutResult = findChildRecursive( loopContainer.model, ( m ) => m.get( 'elType' ) === LAYOUT_TYPE );

	if ( ! layoutResult ) {
		return [];
	}

	const children = getElementChildrenWithFallback( layoutResult.model, ( m ) => m.get( 'elType' ) === ITEM_TYPE );

	return children.map( ( child, index ) => {
		const settings = child.model.get( 'settings' ) as { get: ( key: string ) => unknown } | undefined;
		const altIndexProp = settings?.get( 'alternate_index' ) as { value?: number } | number | null | undefined;
		const position = typeof altIndexProp === 'object' && altIndexProp !== null ? altIndexProp.value : altIndexProp;

		const isDefault = index === 0;
		const label = isDefault
			? __( 'Default', 'elementor' )
			: `${ __( 'Alternate', 'elementor' ) } @ ${ typeof position === 'number' ? position : '?' }`;

		return {
			id: child.model.get( 'id' ) as string,
			label,
			position: typeof position === 'number' ? position : null,
		};
	} );
}

interface LoopEditSwitcherProps {
	loopId: string;
	activeItemId: string;
}

export function LoopEditSwitcher( { loopId, activeItemId }: LoopEditSwitcherProps ) {
	const items = useListenTo(
		[
			v1ReadyEvent(),
			commandEndEvent( 'document/elements/create' ),
			commandEndEvent( 'document/elements/delete' ),
			commandEndEvent( 'document/elements/update' ),
			commandEndEvent( 'document/elements/set-settings' ),
		],
		() => getEditableItemsForLoop( loopId ),
		[ loopId ]
	) as EditableItem[];

	const handleChange = useCallback( ( e: React.ChangeEvent< HTMLSelectElement > ) => {
		setActiveItem( e.target.value );
	}, [] );

	const selectStyle: CSSProperties = useMemo(
		() => ( {
			border: '1px solid #ccc',
			borderRadius: '3px',
			padding: '2px 4px',
			fontSize: '12px',
			cursor: 'pointer',
			background: '#fff',
		} ),
		[]
	);

	if ( ! items.length ) {
		return null;
	}

	return (
		<select
			value={ activeItemId }
			onChange={ handleChange }
			style={ selectStyle }
			aria-label={ __( 'Switch editable item', 'elementor' ) }
		>
			{ items.map( ( item ) => (
				<option key={ item.id } value={ item.id }>
					{ item.label }
				</option>
			) ) }
		</select>
	);
}
