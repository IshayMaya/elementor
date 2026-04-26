import * as React from 'react';
import {
	ControlFormLabel,
	NumberControl,
	Repeater,
	type RepeaterItem,
	type SetRepeaterValuesMeta,
} from '@elementor/editor-controls';
import {
	updateElementEditorSettings,
	useElementChildren,
	useElementEditorSettings,
	type V1Element,
} from '@elementor/editor-elements';
import { type CreateOptions } from '@elementor/editor-props';
import { Stack, TextField } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import { ElementProvider, useElement } from '../../../contexts/element-context';
import { SettingsField } from '../../settings-field';
import { getElementByType } from '../get-element-by-type';
import { type AlternateItem, ITEM_ELEMENT_TYPE, useActions } from './use-actions';
import { useChildElementContext } from './use-child-element-context';

const LAYOUT_ELEMENT_TYPE = 'e-collection-loop-layout';

export const AlternateItemsControl = ( { label }: { label: string } ) => {
	const { element } = useElement();
	const { addItem, removeItem } = useActions();

	const { [ ITEM_ELEMENT_TYPE ]: allItems } = useElementChildren( element.id, {
		[ LAYOUT_ELEMENT_TYPE ]: ITEM_ELEMENT_TYPE,
	} );

	const layout = getElementByType( element.id, LAYOUT_ELEMENT_TYPE ) as V1Element;

	const alternateItems = allItems.slice( 1 );

	const repeaterValues: RepeaterItem< AlternateItem >[] = alternateItems.map( ( item, index ) => ( {
		id: item.id,
		title: item.editorSettings?.title ?? `Alternate item ${ index + 1 }`,
	} ) );

	const setValue = (
		_newValues: RepeaterItem< AlternateItem >[],
		_options: CreateOptions,
		meta?: SetRepeaterValuesMeta< RepeaterItem< AlternateItem > >
	) => {
		if ( meta?.action?.type === 'add' ) {
			return addItem( { layoutId: layout.id, items: meta.action.payload } );
		}

		if ( meta?.action?.type === 'remove' ) {
			return removeItem( { items: meta.action.payload } );
		}
	};

	return (
		<Repeater
			showToggle={ false }
			showDuplicate={ false }
			isSortable={ false }
			values={ repeaterValues }
			setValues={ setValue }
			label={ label }
			itemSettings={ {
				initialValues: { id: '', title: 'Alternate item' },
				Label: ItemLabel,
				Content: ItemContent,
				Icon: () => null,
			} }
		/>
	);
};

const ItemLabel = ( { value }: { value: AlternateItem } ) => {
	return (
		<Stack sx={ { minHeight: 20 } } direction="row" alignItems="center" gap={ 1.5 }>
			<span>{ value?.title }</span>
		</Stack>
	);
};

const ItemContent = ( { value }: { value: AlternateItem } ) => {
	if ( ! value.id ) {
		return null;
	}

	return (
		<Stack p={ 2 } gap={ 1.5 }>
			<ItemNameControl elementId={ value.id } />
			<ChildElementIndexField elementId={ value.id } />
		</Stack>
	);
};

const ItemNameControl = ( { elementId }: { elementId: string } ) => {
	const editorSettings = useElementEditorSettings( elementId );
	const name = ( editorSettings as Record< string, string > )?.title ?? '';

	return (
		<Stack gap={ 1 }>
			<ControlFormLabel>{ __( 'Name', 'elementor' ) }</ControlFormLabel>
			<TextField
				size="tiny"
				value={ name }
				onChange={ ( { target }: React.ChangeEvent< HTMLInputElement > ) => {
					updateElementEditorSettings( {
						elementId,
						settings: { title: target.value },
					} );
				} }
			/>
		</Stack>
	);
};

const ChildElementIndexField = ( { elementId }: { elementId: string } ) => {
	const childContext = useChildElementContext( elementId, ITEM_ELEMENT_TYPE );

	if ( ! childContext ) {
		return null;
	}

	return (
		<ElementProvider
			element={ childContext.element }
			elementType={ childContext.elementType }
			settings={ childContext.settings }
		>
			<SettingsField bind="alternate_index" propDisplayName={ __( 'Index', 'elementor' ) }>
				<Stack gap={ 1 }>
					<ControlFormLabel>{ __( 'Position', 'elementor' ) }</ControlFormLabel>
					<NumberControl />
				</Stack>
			</SettingsField>
		</ElementProvider>
	);
};
