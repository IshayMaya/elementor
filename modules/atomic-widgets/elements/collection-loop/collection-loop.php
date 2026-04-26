<?php

namespace Elementor\Modules\AtomicWidgets\Elements\Collection_Loop;

use Elementor\Modules\AtomicWidgets\Controls\Section;
use Elementor\Modules\AtomicWidgets\Controls\Types\Elements\Alternate_Items_Control;
use Elementor\Modules\AtomicWidgets\Controls\Types\Number_Control;
use Elementor\Modules\AtomicWidgets\Controls\Types\Select_Control;
use Elementor\Modules\AtomicWidgets\Elements\Atomic_Heading\Atomic_Heading;
use Elementor\Modules\AtomicWidgets\Elements\Base\Atomic_Element_Base;
use Elementor\Modules\AtomicWidgets\Elements\Base\Has_Element_Template;
use Elementor\Modules\AtomicWidgets\PropTypes\Attributes_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Classes_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Primitives\Number_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Primitives\String_Prop_Type;
use Elementor\Modules\AtomicWidgets\Styles\Style_Definition;
use Elementor\Modules\AtomicWidgets\Styles\Style_Variant;
use Elementor\Modules\Components\PropTypes\Overridable_Prop_Type;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Collection_Loop extends Atomic_Element_Base {
	use Has_Element_Template;

	const BASE_STYLE_KEY = 'base';

	public function __construct( $data = [], $args = null ) {
		parent::__construct( $data, $args );
		$this->meta( 'is_container', true );
	}

	public static function get_type() {
		return 'e-collection-loop';
	}

	public static function get_element_type(): string {
		return 'e-collection-loop';
	}

	public function get_title() {
		return esc_html__( 'Collection Loop', 'elementor' );
	}

	public function get_keywords() {
		return [ 'ato', 'atom', 'atoms', 'atomic', 'loop', 'collection', 'grid', 'posts', 'query' ];
	}

	public function get_icon() {
		return 'eicon-posts-grid';
	}

	protected static function define_props_schema(): array {
		return [
			'classes' => Classes_Prop_Type::make()
				->default( [] ),
			'source' => String_Prop_Type::make()
				->enum( [ 'post', 'page' ] )
				->default( 'post' ),
			'posts_per_page' => Number_Prop_Type::make()
				->default( 3 ),
			'attributes' => Attributes_Prop_Type::make()->meta( Overridable_Prop_Type::ignore() ),
		];
	}

	protected function define_atomic_controls(): array {
		return [
			Section::make()
				->set_label( __( 'Content', 'elementor' ) )
				->set_id( 'content' )
				->set_items( [
					Alternate_Items_Control::make()
						->set_label( __( 'Alternate Items', 'elementor' ) )
						->set_meta( [
							'layout' => 'custom',
						] ),
				] ),
			Section::make()
				->set_label( __( 'Query', 'elementor' ) )
				->set_id( 'query' )
				->set_items( [
					Select_Control::bind_to( 'source' )
						->set_label( __( 'Source', 'elementor' ) )
						->set_options( [
							[
								'value' => 'post',
								'label' => __( 'Posts', 'elementor' ),
							],
							[
								'value' => 'page',
								'label' => __( 'Pages', 'elementor' ),
							],
						] ),
					Number_Control::bind_to( 'posts_per_page' )
						->set_label( __( 'Items', 'elementor' ) )
						->set_min( 1 )
						->set_max( 100 ),
				] ),
		];
	}

	protected function define_base_styles(): array {
		return [
			static::BASE_STYLE_KEY => Style_Definition::make()
				->add_variant(
					Style_Variant::make()
						->add_prop( 'display', String_Prop_Type::generate( 'flex' ) )
						->add_prop( 'flex-direction', String_Prop_Type::generate( 'column' ) )
				),
		];
	}

	protected function define_default_children() {
		$heading = Atomic_Heading::generate()
			->settings( [
				'tag' => String_Prop_Type::generate( 'h3' ),
			] )
			->build();

		$repeatable_item = Repeatable_Item::generate()
			->children( [ $heading ] )
			->build();

		$layout_container = Layout_Container::generate()
			->children( [ $repeatable_item ] )
			->build();

		return [ $layout_container ];
	}

	protected function define_render_context(): array {
		$source = $this->get_atomic_setting( 'source' ) ?? 'post';
		$per_page = $this->get_atomic_setting( 'posts_per_page' ) ?? 3;

		$query = new \WP_Query( [
			'post_type'      => $source,
			'posts_per_page' => $per_page,
			'post_status'    => 'publish',
		] );

		return [
			[
				'context' => [
					'query'     => $query,
					'has_items' => $query->have_posts(),
				],
			],
		];
	}

	protected function get_templates(): array {
		return [
			'elementor/elements/collection-loop' => __DIR__ . '/collection-loop.html.twig',
		];
	}

	protected function define_allowed_child_types() {
		return [ 'e-collection-loop-layout', 'container' ];
	}
}
