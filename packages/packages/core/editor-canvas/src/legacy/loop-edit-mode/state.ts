import { __privateUseListenTo as useListenTo, windowEvent } from '@elementor/editor-v1-adapters';

const LOOP_EDIT_MODE_EVENT = 'elementor/loop-edit-mode/changed';

let currentLoopEditingId: string | null = null;

export function getLoopEditingId(): string | null {
	return currentLoopEditingId;
}

export function setLoopEditingId( id: string | null ) {
	if ( currentLoopEditingId === id ) {
		return;
	}

	currentLoopEditingId = id;
	window.dispatchEvent( new CustomEvent( LOOP_EDIT_MODE_EVENT ) );
}

export function subscribeLoopEditingId( callback: () => void ): () => void {
	window.addEventListener( LOOP_EDIT_MODE_EVENT, callback );
	return () => window.removeEventListener( LOOP_EDIT_MODE_EVENT, callback );
}

export function useLoopEditingId(): string | null {
	return useListenTo( [ windowEvent( LOOP_EDIT_MODE_EVENT ) ], getLoopEditingId );
}
