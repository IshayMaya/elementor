<?php
namespace Elementor\Tests\Phpunit\Elementor\Core\Page_Assets;

use Elementor\Core\Experiments\Manager as Experiments_Manager;
use Elementor\Core\Page_Assets\Loader as Assets_Loader;
use ElementorEditorTesting\Elementor_Test_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Test_Loader extends Elementor_Test_Base {
	public function test_init_assets() {
		$assets_loader = $this->elementor()->assets_loader;

		$assets = $assets_loader->get_assets();

		$this->assertArrayHasKey( 'styles', $assets, 'styles key was not initialized.' );
		$this->assertArrayHasKey( 'scripts', $assets, 'scripts key was not initialized.' );
	}

	public function test_get_assets() {
		$assets_loader = $this->elementor()->assets_loader;

		$this->add_testing_assets( 'e-style-get-asset', 'e-script-get-asset' );

		$assets = $assets_loader->get_assets();

		$this->assertArrayHasKey( 'e-style-get-asset', $assets['styles'], 'Can not retrieve e-style-get-asset from assets.' );
		$this->assertArrayHasKey( 'e-script-get-asset', $assets['scripts'], 'Can not retrieve e-script-get-asset from assets.' );
	}

	public function test_add_assets() {
		$assets_loader = $this->elementor()->assets_loader;

		$assets = [
			'styles' => [
				'e-style-add-asset' => [
					'src' => 'e-style-add-asset-src',
					'version' => 'e-style-add-asset-version',
					'dependencies' => [],
				],
			],
			'scripts' => [
				'e-script-add-asset' => [
					'src' => 'e-script-add-asset-src',
					'version' => 'e-script-add-asset-version',
					'dependencies' => [],
				],
			],
		];

		$assets_loader->add_assets( $assets );

		$added_assets = $assets_loader->get_assets();

		foreach ( $assets as $assets_type => $assets_type_data ) {
			$this->assertArrayHasKey( $assets_type, $added_assets, $assets_type . ' was not properly added to assets.' );

			foreach ( $assets_type_data as $asset_name => $asset_data ) {
				$this->assertArrayHasKey( $asset_name, $added_assets[ $assets_type ], $asset_name . ' was not properly added to ' . $assets_type . ' of assets.' );

				$this->assertEquals( $assets[ $assets_type ][ $asset_name ], $added_assets[ $assets_type ][ $asset_name ] );
			}
		}
	}

	public function test_register_assets() {
		global $wp_styles;
		global $wp_scripts;

		// Creating a new instance to get only the initial assets that exist in the assets loader (without the testing assets that were added by the other testing methods).
		$new_assets_loader_instance = new Assets_Loader();

		$current_assets = $new_assets_loader_instance->get_assets();

		// Deregister the current assets.
		foreach ( $current_assets as $assets_type => $assets_type_data ) {
			foreach ( $assets_type_data as $asset_name => $asset_data ) {
				if ( 'scripts' === $assets_type ) {
					wp_deregister_script( $asset_name );
					$this->assertArrayNotHasKey( $asset_name, $wp_scripts->registered, 'script asset should not be registered.' );
				} else {
					wp_deregister_style( $asset_name );
					$this->assertArrayNotHasKey( $asset_name, $wp_styles->registered, 'style asset should not be registered.' );
				}
			}
		}

		// Creating additional instance in order to trigger the private 'register_assets' method that initiated by the Assets Loader constructor.
		new Assets_Loader();

		// Making sure that the additional assets loader instance has registered all the assets that were de-registered above.
		foreach ( $current_assets as $assets_type => $assets_type_data ) {
			foreach ( $assets_type_data as $asset_name => $asset_data ) {
				if ( 'scripts' === $assets_type ) {
					$this->assertArrayHasKey( $asset_name, $wp_scripts->registered, 'script asset was not properly registered.' );
				} else {
					$this->assertArrayHasKey( $asset_name, $wp_styles->registered, 'style asset was not properly registered.' );
				}
			}
		}
	}

	private function add_testing_assets( $style_asset_key, $script_asset_key ) {
		$assets_loader = $this->elementor()->assets_loader;

		$assets = $assets_loader->get_assets();

		// Validating that the test's dummy data is unique for each test.
		if ( array_key_exists( $style_asset_key, $assets['styles'] ) ) {
			throw new \Exception( 'Style asset key already exist, set a unique key for each style asset to prevent data collision.' );
		} else if ( array_key_exists( $script_asset_key, $assets['scripts'] ) ) {
			throw new \Exception( 'Script asset key already exist, set a unique key for script each asset to prevent data collision.' );
		}

		$asset_data = [
			'src' => 'path',
			'version' => '5.9.1',
			'dependencies' => [],
		];

		$test_assets = [];

		$test_assets['styles'][ $style_asset_key ] = $asset_data;

		$test_assets['scripts'][ $script_asset_key ] = $asset_data;

		$assets_loader->add_assets( $test_assets );
	}
}
