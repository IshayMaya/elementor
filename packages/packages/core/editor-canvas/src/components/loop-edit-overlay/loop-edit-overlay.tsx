import * as React from 'react';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { __ } from '@wordpress/i18n';

import { setLoopEditingId, useLoopEditingId } from '../../legacy/loop-edit-mode/state';
import { useCanvasDocument } from './use-canvas-document';
import { useElementRect } from './use-element-rect';

export function LoopEditOverlay() {
	const loopId = useLoopEditingId();
	const canvasDocument = useCanvasDocument();
	const loopElement = useLoopElement( canvasDocument, loopId );

	useEscapeKey( canvasDocument );

	if ( ! loopId || ! canvasDocument?.body ) {
		return null;
	}

	return createPortal( <Backdrop canvas={ canvasDocument } element={ loopElement } />, canvasDocument.body );
}

function useLoopElement( canvasDocument: Document | null, loopId: string | null ): HTMLElement | null {
	const [ element, setElement ] = useState< HTMLElement | null >( null );

	useEffect( () => {
		if ( ! canvasDocument || ! loopId ) {
			setElement( null );
			return;
		}

		const find = () => canvasDocument.querySelector< HTMLElement >( `[data-id="${ loopId }"]` );
		setElement( find() );

		const observer = new MutationObserver( () => setElement( find() ) );
		observer.observe( canvasDocument.body, { childList: true, subtree: true } );

		return () => observer.disconnect();
	}, [ canvasDocument, loopId ] );

	return element;
}

function useEscapeKey( canvasDocument: Document | null ) {
	const loopId = useLoopEditingId();

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

function getRectClipPath( rect: DOMRect, viewport: Window ) {
	const { x, y, width, height } = rect;
	const { innerWidth: vw, innerHeight: vh } = viewport;

	const path = `path(evenodd, 'M 0 0 L ${ vw } 0 L ${ vw } ${ vh } L 0 ${ vh } Z M ${ x } ${ y } L ${
		x + width
	} ${ y } L ${ x + width } ${ y + height } L ${ x } ${ y + height } L ${ x } ${ y } Z')`;

	return path;
}
