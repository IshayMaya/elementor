<?php
namespace Elementor\Modules\AtomicWidgets\Elements\Atomic_Heading;

use Elementor\Modules\AtomicWidgets\Controls\Section;
use Elementor\Modules\AtomicWidgets\Controls\Types\Link_Control;
use Elementor\Modules\AtomicWidgets\Controls\Types\Select_Control;
use Elementor\Modules\AtomicWidgets\Controls\Types\Textarea_Control;
use Elementor\Modules\AtomicWidgets\Elements\Atomic_Widget_Base;
use Elementor\Modules\AtomicWidgets\PropTypes\Classes_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Link_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Primitives\String_Prop_Type;
use Elementor\Modules\WpRest\Classes\WP_Post;
use Elementor\Modules\AtomicWidgets\PropTypes\Size_Prop_Type;
use Elementor\Modules\AtomicWidgets\Styles\Style_Definition;
use Elementor\Modules\AtomicWidgets\Styles\Style_Variant;
use Elementor\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Atomic_Heading extends Atomic_Widget_Base {
	const BASE_STYLE_CLASS = 'base';

	public static function get_element_type(): string {
		return 'a-heading';
	}

	public function get_title() {
		return esc_html__( 'Atomic Heading', 'elementor' );
	}

	public function get_icon() {
		return 'eicon-t-letter';
	}

	protected function render() {
		$settings = $this->get_atomic_settings();

		$format = $this->get_heading_template( ! empty( $settings['link']['href'] ) );
		$args = $this->get_template_args( $settings );

		printf( $format, ...$args ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	private function get_heading_template( bool $is_link_enabled ): string {
		return $is_link_enabled ? '<%1$s %2$s><a %3$s>%4$s</a></%1$s>' : '<%1$s %2$s>%3$s</%1$s>';
	}

	private function get_template_args( array $settings ): array {
		$tag = $settings['tag'];
		$title = esc_html( $settings['title'] );
		$classes = $settings['classes'] ?? '';
		$classes .= ' ' . static::get_base_style_class( self::BASE_STYLE_CLASS );

		$attrs = array_filter( [
			'class' => $classes,
		] );

		$default_args = [
			Utils::validate_html_tag( $tag ),
			Utils::render_html_attributes( $attrs ),
		];

		if ( ! empty( $settings['link']['href'] ) ) {
			$link_args = [
				Utils::render_html_attributes( $settings['link'] ),
				esc_html( $title ),
			];

			return array_merge( $default_args, $link_args );
		}

		$default_args[] = $title;

		return $default_args;
	}

	protected function define_atomic_controls(): array {
		return [
			Section::make()
				->set_label( __( 'Content', 'elementor' ) )
				->set_items( [
					Textarea_Control::bind_to( 'title' )
						->set_label( __( 'Title', 'elementor' ) )
						->set_placeholder( __( 'Type your title here', 'elementor' ) ),
					Select_Control::bind_to( 'tag' )
						->set_label( esc_html__( 'Tag', 'elementor' ) )
						->set_options( [
							[
								'value' => 'h1',
								'label' => 'H1',
							],
							[
								'value' => 'h2',
								'label' => 'H2',
							],
							[
								'value' => 'h3',
								'label' => 'H3',
							],
							[
								'value' => 'h4',
								'label' => 'H4',
							],
							[
								'value' => 'h5',
								'label' => 'H5',
							],
							[
								'value' => 'h6',
								'label' => 'H6',
							],
						]),
					Link_Control::bind_to( 'query' )
						->set_ajax_url( WP_Post::FORMAT )
						->set_ajax_params( [
							'keys_to_extract' => json_encode( [ 'ID', 'post_title', 'guid', 'post_type' ] ),
							'keys_dictionary' => json_encode( [ 'ID' => 'id', 'post_title' => 'label', 'guid' => 'value', 'post_type' => 'groupLabel' ] ),
						] )
						->set_allow_custom_values( true )
						->set_placeholder( __( 'Paste URL or type', 'elementor' ) ),
				] ),
		];
	}

	protected static function define_props_schema(): array {
		return [
			'classes' => Classes_Prop_Type::make()
				->default( [] ),

			'tag' => String_Prop_Type::make()
				->enum( [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ] )
				->default( 'h2' ),

			'title' => String_Prop_Type::make()
				->default( __( 'Your Title Here', 'elementor' ) ),

			'query' => Link_Prop_Type::make(),
		];
	}

	public static function define_base_styles(): array {
		return [
			self::BASE_STYLE_CLASS => Style_Definition::make()
				->add_variant( Style_Variant::make()->add_prop( 'font-size', Size_Prop_Type::generate( [
					'size' => 24,
					'unit' => 'px',
				] ) ) ),
		];
	}
}
