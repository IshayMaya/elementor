import { expect } from '@playwright/test';
import { parallelTest as test } from '../../../../../../../../../parallelTest';
import WpAdminPage from '../../../../../../../../../pages/wp-admin-page';
import TopBarSelectors from '../../../../../../../../../selectors/top-bar-selectors';
import EditorPage from '../../../../../../../../../pages/editor-page';

test( 'Exit to user preference sanity test', async ( { page, apiRequests }, testInfo ) => {
	const wpAdmin = new WpAdminPage( page, testInfo, apiRequests );
	const editor = await wpAdmin.openNewPage();
	let exitHref: string;

	// Exit to `dashboard`
	await editor.openUserPreferencesPanel();
	await editor.setSelectControlValue( 'exit_to', 'dashboard' );
	await editor.clickTopBarItem( TopBarSelectors.elementorLogo );
	await page.waitForTimeout( 100 );
	exitHref = await page.locator( 'body a', { hasText: 'Exit to WordPress' } ).getAttribute( 'href' );
	await page.press( 'body', 'Escape' );
	expect( exitHref ).toContain( '/wp-admin/' );

	// Exit to `this_post`
	await editor.openUserPreferencesPanel();
	await setExitTo( editor, 'this_post' );
	await editor.clickTopBarItem( TopBarSelectors.elementorLogo );
	await page.waitForTimeout( 100 );
	exitHref = await page.locator( 'body a', { hasText: 'Exit to WordPress' } ).getAttribute( 'href' );
	await page.press( 'body', 'Escape' );
	expect( exitHref ).toContain( '/wp-admin/post.php?post=' );

	// Exit to `all_posts`
	await editor.openUserPreferencesPanel();
	await setExitTo( editor, 'all_posts' );
	await editor.clickTopBarItem( TopBarSelectors.elementorLogo );
	await page.waitForTimeout( 100 );
	exitHref = await page.locator( 'body a', { hasText: 'Exit to WordPress' } ).getAttribute( 'href' );
	await page.press( 'body', 'Escape' );
	expect( exitHref ).toContain( '/wp-admin/edit.php?post_type=' );
} );

const setExitTo = async ( editor: EditorPage, exitTo: 'this_post' | 'dashboard' | 'all_posts' ) => {
	return Promise.all( [
		editor.setSelectControlValue( 'exit_to', exitTo ),
		editor.page.waitForResponse( '/wp-admin/admin-ajax.php' ),
	] );
};
