<?php

class RGB {
	public $r = 0;
	public $g = 0;
	public $b = 0;

	function __construct() {
		$args = func_get_args();

		if (count($args) == 3) {
			$this->init_rgb($args[0], $args[1], $args[2]);
		} else if (count($args) == 1) {
			$this->init_hex($args[0]);
		}
	}

	function init_rgb($r, $g, $b) {
		$this->r = $r;
		$this->g = $g;
		$this->b = $b;
	}

	function init_hex($hex) {
		if (strlen($hex) === 7) {
			$hex = substr($hex, 1);
		}

		$this->r = hexdec(substr($hex, 0, 2));
		$this->g = hexdec(substr($hex, 2, 2));
		$this->b = hexdec(substr($hex, 4, 2));
	}

	function to_css($alpha = 1) {
		return "rgba({$this->r}, {$this->g}, {$this->b}, {$alpha})";
	}
}
