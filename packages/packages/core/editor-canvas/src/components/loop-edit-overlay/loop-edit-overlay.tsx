import * as React from 'react';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { __ } from '@wordpress/i18n';

import { setLoopEditingId, useLoopEditState } from '../../legacy/loop-edit-mode/state';
import { LoopEditSwitcher } from './loop-edit-switcher';
import { useCanvasDocument } from './use-canvas-document';
import { useElementRect } from './use-element-rect';

export function LoopEditOverlay() {
	const editState = useLoopEditState();
	const canvasDocument = useCanvasDocument();
	const activeElement = useActiveItemElement( canvasDocument, editState?.activeItemId ?? null );

	useEscapeKey( canvasDocument, editState?.loopId ?? null );

	if ( ! editState || ! canvasDocument?.body ) {
		return null;
	}

	return createPortal(
		<>
			<Backdrop canvas={ canvasDocument } element={ activeElement } />
			<SwitcherToolbar
				canvas={ canvasDocument }
				element={ activeElement }
				loopId={ editState.loopId }
				activeItemId={ editState.activeItemId }
			/>
		</>,
		canvasDocument.body
	);
}

function useActiveItemElement( canvasDocument: Document | null, activeItemId: string | null ): HTMLElement | null {
	const [ element, setElement ] = useState< HTMLElement | null >( null );

	useEffect( () => {
		if ( ! canvasDocument || ! activeItemId ) {
			setElement( null );
			return;
		}

		const find = () => canvasDocument.querySelector< HTMLElement >( `[data-id="${ activeItemId }"]` );
		setElement( find() );

		const observer = new MutationObserver( () => setElement( find() ) );
		observer.observe( canvasDocument.body, { childList: true, subtree: true } );

		return () => observer.disconnect();
	}, [ canvasDocument, activeItemId ] );

	return element;
}

function useEscapeKey( canvasDocument: Document | null, loopId: string | null ) {
	useEffect( () => {
		if ( ! canvasDocument || ! loopId ) {
			return;
		}

		const handleEsc = ( event: KeyboardEvent ) => {
			if ( event.key === 'Escape' ) {
				setLoopEditingId( null );
			}
		};

		canvasDocument.body.addEventListener( 'keydown', handleEsc );

		return () => canvasDocument.body.removeEventListener( 'keydown', handleEsc );
	}, [ canvasDocument, loopId ] );
}

function Backdrop( { canvas, element }: { canvas: Document; element: HTMLElement | null } ) {
	const rect = useElementRect( element );
	const viewport = canvas.defaultView as Window;
	const clipPath = element ? getRectClipPath( rect, viewport ) : undefined;

	const backdropStyle: CSSProperties = useMemo(
		() => ( {
			position: 'fixed',
			top: 0,
			left: 0,
			width: '100vw',
			height: '100vh',
			backgroundColor: 'rgba(0, 0, 0, 0.5)',
			zIndex: 999,
			pointerEvents: 'painted',
			cursor: 'pointer',
			clipPath,
		} ),
		[ clipPath ]
	);

	const handleKeyDown = ( event: React.KeyboardEvent ) => {
		if ( event.key === 'Enter' || event.key === ' ' ) {
			event.preventDefault();
			setLoopEditingId( null );
		}
	};

	return (
		<div
			style={ backdropStyle }
			onClick={ () => setLoopEditingId( null ) }
			onKeyDown={ handleKeyDown }
			role="button"
			tabIndex={ 0 }
			aria-label={ __( 'Exit loop editing mode', 'elementor' ) }
		/>
	);
}

interface SwitcherToolbarProps {
	canvas: Document;
	element: HTMLElement | null;
	loopId: string;
	activeItemId: string;
}

function SwitcherToolbar( { canvas, element, loopId, activeItemId }: SwitcherToolbarProps ) {
	const rect = useElementRect( element );
	const viewport = canvas.defaultView as Window;

	if ( ! element || ! viewport ) {
		return null;
	}

	const toolbarStyle: CSSProperties = {
		position: 'fixed',
		left: rect.x,
		top: Math.max( 0, rect.y - 36 ),
		zIndex: 1000,
		display: 'flex',
		alignItems: 'center',
		gap: '8px',
		background: '#fff',
		borderRadius: '4px',
		padding: '4px 8px',
		boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
		fontSize: '12px',
		fontFamily: 'Arial, sans-serif',
	};

	return (
		<div style={ toolbarStyle }>
			<LoopEditSwitcher loopId={ loopId } activeItemId={ activeItemId } />
		</div>
	);
}

function getRectClipPath( rect: DOMRect, viewport: Window ) {
	const { x, y, width, height } = rect;
	const { innerWidth: vw, innerHeight: vh } = viewport;

	const path = `path(evenodd, 'M 0 0 L ${ vw } 0 L ${ vw } ${ vh } L 0 ${ vh } Z M ${ x } ${ y } L ${
		x + width
	} ${ y } L ${ x + width } ${ y + height } L ${ x } ${ y + height } L ${ x } ${ y } Z')`;

	return path;
}
