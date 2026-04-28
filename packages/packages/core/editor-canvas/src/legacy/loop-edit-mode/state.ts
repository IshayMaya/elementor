import { __privateUseListenTo as useListenTo, windowEvent } from '@elementor/editor-v1-adapters';

const LOOP_EDIT_MODE_EVENT = 'elementor/loop-edit-mode/changed';

interface LoopEditState {
	loopId: string;
	activeItemId: string;
}

let currentState: LoopEditState | null = null;

function dispatch() {
	window.dispatchEvent( new CustomEvent( LOOP_EDIT_MODE_EVENT ) );
}

export function getLoopEditState(): LoopEditState | null {
	return currentState;
}

export function getLoopEditingId(): string | null {
	return currentState?.loopId ?? null;
}

export function getActiveItemId(): string | null {
	return currentState?.activeItemId ?? null;
}

export function setLoopEditingId( id: string | null, activeItemId?: string ) {
	if ( id === null ) {
		if ( currentState === null ) {
			return;
		}
		currentState = null;
		dispatch();
		return;
	}

	if (
		currentState?.loopId === id &&
		currentState?.activeItemId === ( activeItemId ?? currentState?.activeItemId )
	) {
		return;
	}

	currentState = { loopId: id, activeItemId: activeItemId ?? '' };
	dispatch();
}

export function setActiveItem( activeItemId: string ) {
	if ( ! currentState ) {
		return;
	}

	if ( currentState.activeItemId === activeItemId ) {
		return;
	}

	currentState = { ...currentState, activeItemId };
	dispatch();
}

export function subscribeLoopEditingId( callback: () => void ): () => void {
	window.addEventListener( LOOP_EDIT_MODE_EVENT, callback );
	return () => window.removeEventListener( LOOP_EDIT_MODE_EVENT, callback );
}

export function useLoopEditingId(): string | null {
	return useListenTo( [ windowEvent( LOOP_EDIT_MODE_EVENT ) ], getLoopEditingId );
}

export function useLoopEditState(): LoopEditState | null {
	return useListenTo( [ windowEvent( LOOP_EDIT_MODE_EVENT ) ], getLoopEditState );
}
