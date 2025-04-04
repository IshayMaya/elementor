import { useEffect } from 'react';
import View from './components/view';
import Loader from '../../components/loader';
import { LOCATIONS, IMAGE_PLACEHOLDERS_HOSTS } from './constants';
import Generate from './views/generate';
import ImageTools from './views/image-tools';
import Resize from './views/resize';
import InPainting from './views/in-painting';
import OutPainting from './views/out-painting';
import Variations from './views/variations';
import ReplaceBackground from './views/replace-background';
import RemoveBackground from './views/remove-background';
import Cleanup from './views/cleanup';

import { useLocation } from './context/location-context';
import { useEditImage } from './context/edit-image-context';
import {
	ACTION_TYPES,
	useSubscribeOnPromptHistoryAction,
} from '../../components/prompt-history/context/prompt-history-action-context';
import PropTypes from 'prop-types';
import useTextToImage from './views/generate/hooks/use-text-to-image';
import ProductImageUnification from './views/product-image-unification';
import IsolateObject from './views/isolate-objects';

const MediaOutlet = ( { additionalOptions = null, onClose = null } ) => {
	const { editImage } = useEditImage();

	const { current, navigate } = useLocation( { current: additionalOptions?.location || LOCATIONS.GENERATE } );

	useEffect( () => {
		if ( editImage.url ) {
			const wireframeHostRegex = new RegExp( IMAGE_PLACEHOLDERS_HOSTS.WIREFRAME );
			const isWireframeHost = wireframeHostRegex.test( new URL( editImage.url ).host );

			if ( isWireframeHost ) {
				navigate( LOCATIONS.GENERATE );
			} else if ( 'url' === editImage.source || editImage.id ) {
				navigate( LOCATIONS.IMAGE_TOOLS );
			} else {
				navigate( LOCATIONS.GENERATE );
			}
		}
	}, [ editImage.id, editImage.url, editImage.source ] );

	useSubscribeOnPromptHistoryAction( [
		{
			type: ACTION_TYPES.RESTORE,
			handler() {
				if ( current !== LOCATIONS.GENERATE ) {
					navigate( LOCATIONS.GENERATE );
				}
			},
		},
	] );

	if ( ! current ) {
		return (
			<View alignItems="center">
				<Loader />
			</View>
		);
	}

	return (
		<>
			{ current === LOCATIONS.GENERATE && <Generate
				textToImageHook={ additionalOptions?.textToImageHook ? additionalOptions?.textToImageHook : useTextToImage }
				predefinedPrompt={ additionalOptions?.predefinedPrompt }
				initialSettings={ additionalOptions?.initialSettings } /> }
			{ current === LOCATIONS.IMAGE_TOOLS && <ImageTools /> }
			{ current === LOCATIONS.VARIATIONS && <Variations /> }
			{ current === LOCATIONS.IN_PAINTING && <InPainting /> }
			{ current === LOCATIONS.OUT_PAINTING && <OutPainting /> }
			{ current === LOCATIONS.RESIZE && <Resize /> }
			{ current === LOCATIONS.REPLACE_BACKGROUND && <ReplaceBackground /> }
			{ current === LOCATIONS.REMOVE_BACKGROUND && <RemoveBackground /> }
			{ current === LOCATIONS.CLEANUP && <Cleanup /> }
			{ current === LOCATIONS.PRODUCT_IMAGE_UNIFICATION && <ProductImageUnification onClose={ onClose } /> }
			{ current === LOCATIONS.ISOLATE_OBJECT && <IsolateObject /> }
		</>
	);
};

export default MediaOutlet;

MediaOutlet.propTypes = {
	additionalOptions: PropTypes.object,
	onClose: PropTypes.func,
};

