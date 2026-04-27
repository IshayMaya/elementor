const FILTER_STYLE_ID = 'e-loop-edit-nav-filter';
const KEEP_ATTR = 'data-loop-edit-keep';
const NAV_ELEMENT_CLASS = 'elementor-navigator__element';

function getNavigatorRoot(): HTMLElement | null {
	return document.querySelector( '.elementor-navigator__elements' );
}

function findNavigatorRow( navigatorRoot: HTMLElement, elementId: string ): HTMLElement | null {
	return navigatorRoot.querySelector( `.${ NAV_ELEMENT_CLASS }[data-id="${ elementId }"]` );
}

function markAncestors( row: HTMLElement ) {
	let current: HTMLElement | null = row.parentElement?.closest( `.${ NAV_ELEMENT_CLASS }` ) as HTMLElement | null;
	while ( current ) {
		current.setAttribute( KEEP_ATTR, 'true' );
		current = current.parentElement?.closest( `.${ NAV_ELEMENT_CLASS }` ) as HTMLElement | null;
	}
}

function markDescendants( row: HTMLElement ) {
	row.querySelectorAll( `.${ NAV_ELEMENT_CLASS }` ).forEach( ( el ) => {
		el.setAttribute( KEEP_ATTR, 'true' );
	} );
}

function injectFilterStyle() {
	if ( document.querySelector( `style[data-id="${ FILTER_STYLE_ID }"]` ) ) {
		return;
	}

	const style = document.createElement( 'style' );
	style.setAttribute( 'data-id', FILTER_STYLE_ID );
	style.textContent = `.${ NAV_ELEMENT_CLASS }:not([${ KEEP_ATTR }]) { display: none !important; }`;
	document.head.appendChild( style );
}

function removeFilterStyle() {
	document.querySelector( `style[data-id="${ FILTER_STYLE_ID }"]` )?.remove();
}

function clearKeepAttributes() {
	document.querySelectorAll( `[${ KEEP_ATTR }]` ).forEach( ( el ) => {
		el.removeAttribute( KEEP_ATTR );
	} );
}

export function applyNavigatorFilter( loopId: string ) {
	clearNavigatorFilter();

	const navigatorRoot = getNavigatorRoot();
	if ( ! navigatorRoot ) {
		return;
	}

	const loopRow = findNavigatorRow( navigatorRoot, loopId );
	if ( ! loopRow ) {
		return;
	}

	loopRow.setAttribute( KEEP_ATTR, 'true' );
	markAncestors( loopRow );
	markDescendants( loopRow );

	injectFilterStyle();
}

export function clearNavigatorFilter() {
	removeFilterStyle();
	clearKeepAttributes();
}
