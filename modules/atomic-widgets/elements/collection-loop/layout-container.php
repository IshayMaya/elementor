<?php

namespace Elementor\Modules\AtomicWidgets\Elements\Collection_Loop;

use Elementor\Modules\AtomicWidgets\Controls\Section;
use Elementor\Modules\AtomicWidgets\Controls\Types\Text_Control;
use Elementor\Modules\AtomicWidgets\Elements\Base\Atomic_Element_Base;
use Elementor\Modules\AtomicWidgets\Elements\Base\Has_Element_Template;
use Elementor\Modules\AtomicWidgets\Elements\Base\Has_Loop_Iteration;
use Elementor\Modules\AtomicWidgets\PropTypes\Attributes_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Classes_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Primitives\String_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Size_Prop_Type;
use Elementor\Modules\AtomicWidgets\Styles\Style_Definition;
use Elementor\Modules\AtomicWidgets\Styles\Style_Variant;
use Elementor\Modules\Components\PropTypes\Overridable_Prop_Type;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Layout_Container extends Atomic_Element_Base {
	use Has_Element_Template;
	use Has_Loop_Iteration;

	const BASE_STYLE_KEY = 'base';

	public function __construct( $data = [], $args = null ) {
		parent::__construct( $data, $args );
		$this->meta( 'is_container', true );
	}

	public static function get_type() {
		return 'e-collection-loop-layout';
	}

	public static function get_element_type(): string {
		return 'e-collection-loop-layout';
	}

	public function get_title() {
		return esc_html__( 'Collection Layout', 'elementor' );
	}

	public function get_keywords() {
		return [ 'ato', 'atom', 'atoms', 'atomic' ];
	}

	public function get_icon() {
		return 'eicon-inner-container';
	}

	public function should_show_in_panel() {
		return false;
	}

	protected static function define_props_schema(): array {
		return [
			'classes' => Classes_Prop_Type::make()
				->default( [] ),
			'attributes' => Attributes_Prop_Type::make()->meta( Overridable_Prop_Type::ignore() ),
		];
	}

	protected function define_atomic_controls(): array {
		return [
			Section::make()
				->set_label( __( 'Settings', 'elementor' ) )
				->set_id( 'settings' )
				->set_items( [
					Text_Control::bind_to( '_cssid' )
						->set_label( __( 'ID', 'elementor' ) )
						->set_meta( [
							'layout' => 'two-columns',
						] ),
				] ),
		];
	}

	protected function define_base_styles(): array {
		return [
			static::BASE_STYLE_KEY => Style_Definition::make()
				->add_variant(
					Style_Variant::make()
						->add_prop( 'display', String_Prop_Type::generate( 'flex' ) )
						->add_prop( 'flex-wrap', String_Prop_Type::generate( 'wrap' ) )
						->add_prop( 'gap', Size_Prop_Type::generate( [
							'size' => 20,
							'unit' => 'px',
						] ) )
				),
		];
	}

	protected function render_children_to_html(): string {
		$loop_html = $this->render_children_for_loop();

		if ( ! empty( $loop_html ) ) {
			return $loop_html;
		}

		$html = '';

		foreach ( $this->get_children() as $child ) {
			ob_start();
			$child->print_element();
			$html .= ob_get_clean();
		}

		return $html;
	}

	protected function get_templates(): array {
		return [
			'elementor/elements/collection-loop-layout' => __DIR__ . '/layout-container.html.twig',
		];
	}

	protected function define_allowed_child_types() {
		return [ 'e-collection-loop-item', 'container' ];
	}
}
