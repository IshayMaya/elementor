import * as React from 'react';
import { useRef, useState } from 'react';
import { numberPropTypeUtil } from '@elementor/editor-props';
import { InputAdornment, TextField, type TextFieldProps } from '@elementor/ui';

import { useBoundProp } from '../bound-prop-context';
import ControlActions from '../control-actions/control-actions';
import { createControl } from '../create-control';

const isEmptyOrNaN = ( value?: string | number | null ) =>
	value === null || value === undefined || value === '' || Number.isNaN( Number( value ) );

const RESTRICTED_INPUT_KEYS = [ 'e', 'E', '+' ];

export const NumberControl = createControl(
	( {
		placeholder: labelPlaceholder,
		max = Number.MAX_VALUE,
		min = -Number.MAX_VALUE,
		step = 1,
		shouldForceInt = false,
		startIcon,
	}: {
		placeholder?: string;
		max?: number;
		min?: number;
		step?: number;
		shouldForceInt?: boolean;
		startIcon?: React.ReactNode;
	} ) => {
		const { value, setValue, placeholder, disabled, restoreValue, setIsValid } = useBoundProp( numberPropTypeUtil );

		const handleChange = ( event: React.ChangeEvent< HTMLInputElement > ) => {
			const eventValue: string = event.target.value;

			const { valid } = event.target.validity;

			const formattedValue = shouldForceInt ? +parseInt( eventValue ) : Number( eventValue );

			if ( ! valid ) {
				// setIsValid( false );
				setValue( Math.min( Math.max( formattedValue, min ), max ), undefined, {
					validation: () => valid,
				} );

				return;
			}

			if ( isEmptyOrNaN( eventValue ) ) {
				setValue( null );

				return;
			}

			setValue( Math.min( Math.max( formattedValue, min ), max ) );
		};

		return (
			<ControlActions>
				<NumberInput
					size="tiny"
					type="number"
					fullWidth
					disabled={ disabled }
					value={ isEmptyOrNaN( value ) ? '' : value }
					onInput={ handleChange }
					placeholder={ labelPlaceholder ?? ( isEmptyOrNaN( placeholder ) ? '' : String( placeholder ) ) }
					inputProps={ { step } }
					InputProps={ {
						startAdornment: startIcon ? (
							<InputAdornment position="start" disabled={ disabled }>
								{ startIcon }
							</InputAdornment>
						) : undefined,
					} }
					onKeyDown={ ( event ) => {
						if ( RESTRICTED_INPUT_KEYS.includes( event.key ) ) {
							event.preventDefault();
						}
					} }
					onBlur={ restoreValue }
				/>
			</ControlActions>
		);
	}
);

function NumberInput( props: TextFieldProps ) {
	const [ key, setKey ] = useState< string | null >( null );

	return (
		<TextField
			{ ...props }
			key={ key }
			onBlur={ ( e ) => {
				const { valid } = e.target.validity;
				console.log( 'isValid:', { isValid: valid } );

				if ( ! valid ) {
					setKey( String( Math.random() ) );
				}

				props.onBlur?.( e );
			} }
		/>
	);
}
