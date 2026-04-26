import { type Element, type ElementType, getElementSettings, getElementType } from '@elementor/editor-elements';
import { type AnyTransformable } from '@elementor/editor-props';
import { __privateUseListenTo as useListenTo, commandEndEvent } from '@elementor/editor-v1-adapters';

type ChildElementContext = {
	element: Element;
	elementType: ElementType;
	settings: Record< string, AnyTransformable | null >;
} | null;

export function useChildElementContext( childId: string, childType: string ): ChildElementContext {
	return useListenTo( [ commandEndEvent( 'document/elements/set-settings' ) ], () => {
		const elementType = getElementType( childType );

		if ( ! elementType ) {
			return null;
		}

		const settingKeys = Object.keys( elementType.propsSchema );
		const settings = getElementSettings< AnyTransformable >( childId, settingKeys );

		return {
			element: { id: childId, type: childType },
			elementType,
			settings,
		};
	} );
}
