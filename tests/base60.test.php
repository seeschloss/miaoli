<?php

namespace tests\units;

require_once __DIR__.'/../inc/base60.inc.php';

use atoum;

class Base60 extends atoum {
	public function testEncode() {
		$this
			->string(\Base60::encode(10))
			->isEqualTo("a");

		$this
			->string(\Base60::encode(21))
			->isEqualTo("m");

		$this
			->string(\Base60::encode(2000110))
			->isEqualTo("9fAa");
	}

	public function testDecode() {
		$this
			->string(\Base60::decode("a"))
			->isEqualTo("10");

		$this
			->string(\Base60::decode("m"))
			->isEqualTo("21");

		$this
			->string(\Base60::decode("9fAa"))
			->isEqualTo("2000110");
	}
}
