<?php

namespace Elementor\Modules\AtomicWidgets\Elements\Base;

use Elementor\Modules\AtomicWidgets\Elements\Collection_Loop\Collection_Loop;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

trait Has_Loop_Iteration {
	protected function get_loop_context_key(): string {
		return Collection_Loop::class;
	}

	protected function render_children_for_loop(): string {
		$loop_context = Render_Context::get( $this->get_loop_context_key() );

		if ( empty( $loop_context ) || empty( $loop_context['has_items'] ) ) {
			return '';
		}

		$query = $loop_context['query'];
		$children = $this->get_children();
		$default_item = $children[0] ?? null;

		if ( ! $default_item ) {
			return '';
		}

		$alternates = $this->build_alternates_map( array_slice( $children, 1 ) );

		$html = '';
		$iteration = 0;

		while ( $query->have_posts() ) {
			$query->the_post();

			$item_to_render = $alternates[ $iteration ] ?? $default_item;

			ob_start();
			$item_to_render->print_element();
			$html .= ob_get_clean();

			$iteration++;
		}

		wp_reset_postdata();

		return $html;
	}

	private function build_alternates_map( array $alternate_children ): array {
		$map = [];

		foreach ( $alternate_children as $child ) {
			$position = $child->get_atomic_setting( 'alternate_index' );

			if ( null !== $position && is_numeric( $position ) && (int) $position >= 1 ) {
				$map[ (int) $position - 1 ] = $child;
			}
		}

		return $map;
	}
}
