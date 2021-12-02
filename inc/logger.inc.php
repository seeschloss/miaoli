<?php

class Logger {
	public static function __callStatic($function, $arguments) {
		$level = $function;
		$message = $arguments[0];

		$file = $GLOBALS['config']['logging']['directory'] . '/' . date('Y-m-d').'.log';
		
		if (!file_exists($GLOBALS['config']['logging']['directory'])) {
			mkdir($GLOBALS['config']['logging']['directory']);
		}

		file_put_contents($file, gmdate('Y-m-d\TH:i:s').' [' . $level . '] ' . $message . "\n", FILE_APPEND);
	}
}

class debug {
	public static function dump_as_string($var) {
		ob_start();
		var_dump($var);
		$dump = ob_get_contents();
		ob_end_clean();
		return $dump;
	}

	public static function dump() {
		$args = func_get_args();

		$dump = '';

		foreach ($args as $arg) {
			$dump .= self::dump_as_string($arg);
		}

		$dump = self::get_backtrace_as_string() . $dump."\n";

		if (php_sapi_name() != 'cli') {
			$dump = '<pre style="text-align:left;padding:3px;margin:3px;border:solid 1px #000;color:#000;background-color:#eee">' . $dump . '</pre>';
		}

		echo $dump;
	}

	protected static function get_backtrace_as_string() {
		$string = '';
		$level = 0;

		foreach(array_reverse(array_slice(debug_backtrace(), 1)) as $backtrace) {
			if (!isset($backtrace['file'])) {
				$backtrace['file'] = 'unknown';
			}

			if (!isset($backtrace['line'])) {
				$backtrace['line'] = 'unknown';
			}

			$string .= str_repeat('  ', $level++).'=> ' . ($backtrace['file']) . ' on line ' . $backtrace['line'] . "\n";
		}

		return $string;
	}
}


