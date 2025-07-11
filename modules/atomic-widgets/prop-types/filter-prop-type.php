<?php

namespace Elementor\Modules\AtomicWidgets\PropTypes;

use Elementor\Modules\AtomicWidgets\PropTypes\Base\Array_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Contracts\Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Blur_Filter_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Brightness_Filter_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Contrast_Filter_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Grayscale_Filter_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Invert_Filter_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Saturate_Filter_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Sepia_Filter_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Hue_Rotate_Filter_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Drop_Shadow_Filter_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Union_Prop_Type;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Filter_Prop_Type extends Array_Prop_Type {

	public static function get_key(): string {
		return 'filter';
	}

	protected function define_item_type(): Prop_Type {
		return Union_Prop_Type::make()
			->add_prop_type( Blur_Filter_Prop_Type::make() )
			->add_prop_type( Brightness_Filter_Prop_Type::make() )
			->add_prop_type( Contrast_Filter_Prop_Type::make() )
			->add_prop_type( Grayscale_Filter_Prop_Type::make() )
			->add_prop_type( Invert_Filter_Prop_Type::make() )
			->add_prop_type( Saturate_Filter_Prop_Type::make() )
			->add_prop_type( Sepia_Filter_Prop_Type::make() )
			->add_prop_type( Hue_Rotate_Filter_Prop_Type::make() )
			->add_prop_type( Drop_Shadow_Filter_Prop_Type::make() );
	}
}
