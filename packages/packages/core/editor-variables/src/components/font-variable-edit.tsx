import * as React from 'react';
import { useState } from 'react';
import { PopoverContent, useBoundProp } from '@elementor/editor-controls';
import { useSuppressedMessage } from '@elementor/editor-current-user';
import { PopoverBody } from '@elementor/editor-editing-panel';
import { PopoverHeader } from '@elementor/editor-ui';
import { ArrowLeftIcon, TextIcon, TrashIcon } from '@elementor/icons';
import { Button, CardActions, Divider, FormHelperText, IconButton } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import { usePermissions } from '../hooks/use-permissions';
import { deleteVariable, updateVariable, useVariable } from '../hooks/use-prop-variables';
import { fontVariablePropTypeUtil } from '../prop-types/font-variable-prop-type';
import { ERROR_MESSAGES, mapServerError } from '../utils/validations';
import { FontField } from './fields/font-field';
import { LabelField, useLabelError } from './fields/label-field';
import { DeleteConfirmationDialog } from './ui/delete-confirmation-dialog';
import { EDIT_CONFIRMATION_DIALOG_ID, EditConfirmationDialog } from './ui/edit-confirmation-dialog';

const SIZE = 'tiny';

type Props = {
	editId: string;
	onClose: () => void;
	onGoBack?: () => void;
	onSubmit?: () => void;
};

export const FontVariableEdit = ( { onClose, onGoBack, onSubmit, editId }: Props ) => {
	const { setValue: notifyBoundPropChange, value: assignedValue } = useBoundProp( fontVariablePropTypeUtil );
	const [ isMessageSuppressed, suppressMessage ] = useSuppressedMessage( EDIT_CONFIRMATION_DIALOG_ID );
	const [ deleteConfirmation, setDeleteConfirmation ] = useState( false );
	const [ editConfirmation, setEditConfirmation ] = useState( false );
	const [ errorMessage, setErrorMessage ] = useState( '' );

	const { labelFieldError, setLabelFieldError } = useLabelError();

	const variable = useVariable( editId );
	if ( ! variable ) {
		throw new Error( `Global font variable "${ editId }" not found` );
	}

	const userPermissions = usePermissions();

	const [ fontFamily, setFontFamily ] = useState( variable.value );
	const [ label, setLabel ] = useState( variable.label );

	const handleUpdate = () => {
		if ( isMessageSuppressed ) {
			handleSaveVariable();
		} else {
			setEditConfirmation( true );
		}
	};

	const handleSaveVariable = () => {
		updateVariable( editId, {
			value: fontFamily,
			label,
		} )
			.then( () => {
				maybeTriggerBoundPropChange();
				onSubmit?.();
			} )
			.catch( ( error ) => {
				const mappedError = mapServerError( error );
				if ( mappedError && 'label' === mappedError.field ) {
					setLabel( '' );
					setLabelFieldError( {
						value: label,
						message: mappedError.message,
					} );
					return;
				}

				setErrorMessage( ERROR_MESSAGES.UNEXPECTED_ERROR );
			} );
	};

	const handleDelete = () => {
		deleteVariable( editId ).then( () => {
			maybeTriggerBoundPropChange();
			onSubmit?.();
		} );
	};

	const maybeTriggerBoundPropChange = () => {
		if ( editId === assignedValue ) {
			notifyBoundPropChange( editId );
		}
	};

	const handleDeleteConfirmation = () => {
		setDeleteConfirmation( true );
	};

	const closeDeleteDialog = () => () => {
		setDeleteConfirmation( false );
	};

	const closeEditDialog = () => () => {
		setEditConfirmation( false );
	};

	const hasEmptyValue = () => {
		return ! fontFamily.trim() || ! label.trim();
	};

	const noValueChanged = () => {
		return fontFamily === variable.value && label === variable.label;
	};

	const hasErrors = () => {
		return !! errorMessage;
	};

	const isSubmitDisabled = noValueChanged() || hasEmptyValue() || hasErrors();

	const actions = [];

	if ( userPermissions.canDelete() ) {
		actions.push(
			<IconButton
				key="delete"
				size={ SIZE }
				aria-label={ __( 'Delete', 'elementor' ) }
				onClick={ handleDeleteConfirmation }
			>
				<TrashIcon fontSize={ SIZE } />
			</IconButton>
		);
	}

	return (
		<>
			<PopoverBody height="auto">
				<PopoverHeader
					icon={
						<>
							{ onGoBack && (
								<IconButton
									size={ SIZE }
									aria-label={ __( 'Go Back', 'elementor' ) }
									onClick={ onGoBack }
								>
									<ArrowLeftIcon fontSize={ SIZE } />
								</IconButton>
							) }
							<TextIcon fontSize={ SIZE } />
						</>
					}
					title={ __( 'Edit variable', 'elementor' ) }
					onClose={ onClose }
					actions={ actions }
				/>

				<Divider />

				<PopoverContent p={ 2 }>
					<LabelField
						value={ label }
						error={ labelFieldError }
						onChange={ ( value ) => {
							setLabel( value );
							setErrorMessage( '' );
						} }
					/>
					<FontField
						value={ fontFamily }
						onChange={ ( value ) => {
							setFontFamily( value );
							setErrorMessage( '' );
						} }
					/>

					{ errorMessage && <FormHelperText error>{ errorMessage }</FormHelperText> }
				</PopoverContent>

				<CardActions sx={ { pt: 0.5, pb: 1 } }>
					<Button size="small" variant="contained" disabled={ isSubmitDisabled } onClick={ handleUpdate }>
						{ __( 'Save', 'elementor' ) }
					</Button>
				</CardActions>
			</PopoverBody>

			{ deleteConfirmation && (
				<DeleteConfirmationDialog
					open
					label={ label }
					onConfirm={ handleDelete }
					closeDialog={ closeDeleteDialog() }
				/>
			) }

			{ editConfirmation && ! isMessageSuppressed && (
				<EditConfirmationDialog
					closeDialog={ closeEditDialog() }
					onConfirm={ handleSaveVariable }
					onSuppressMessage={ suppressMessage }
				/>
			) }
		</>
	);
};
