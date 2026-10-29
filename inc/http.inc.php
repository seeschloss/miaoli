<?php

class HTTP {
	public $url = "";

	public $data = "";
	public $error = "";
	public $code = 0;
	public $length = 0;
	public $content_type = "";
	public $headers = [];
	public $proxy = false;

	public function __construct($url) {
		$this->url = $url;
	}

	public function get($opts = []) {
		$c = curl_init();

		$headers_string = "";

		curl_setopt($c, CURLOPT_USERAGENT, "Mozilla/5.0 (X11; Linux x86_64; rv:29.0) Gecko/20100101 Firefox/29.0");
		curl_setopt($c, CURLOPT_URL, $this->url);
		curl_setopt($c, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($c, CURLOPT_SSL_VERIFYPEER, false);
		curl_setopt($c, CURLOPT_CONNECTTIMEOUT, 2);
		curl_setopt($c, CURLOPT_TIMEOUT, 15);
		curl_setopt($c, CURLOPT_AUTOREFERER, true);
		curl_setopt($c, CURLOPT_FOLLOWLOCATION, true);
		curl_setopt($c, CURLOPT_MAXREDIRS, 5);
		//curl_setopt($c, CURLOPT_VERBOSE, true);
		curl_setopt($c, CURLOPT_HEADERFUNCTION, function($curl, $data) use(&$headers_string) {
				$headers_string .= $data;
				return strlen($data);
		});

		if (!empty($this->proxy)) {
			curl_setopt($c, CURLOPT_PROXY, $this->proxy);
			curl_setopt($c, CURLOPT_PROXYTYPE, CURLPROXY_SOCKS5);
		}

		foreach ($opts as $opt_key => $opt_value) {
			curl_setopt($c, $opt_key, $opt_value);
		}

		$this->data = curl_exec($c);
		$this->code = curl_getinfo($c, CURLINFO_HTTP_CODE);

		$this->error = curl_error($c);
		if ($this->error or $this->code >= 400) {
			return false;
		}

		$this->length = curl_getinfo($c, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
		$this->content_type = curl_getinfo($c, CURLINFO_CONTENT_TYPE);
		$this->headers = [];
		foreach (explode("\n", trim($headers_string)) as $header_line) {
			if (strpos($header_line, ':') !== false) {
				list($key, $value) = explode(":", trim($header_line), 2);
				if (!isset($this->headers[strtolower($key)])) {
					$this->headers[strtolower($key)] = [];
				}
				$this->headers[strtolower($key)][] = trim($value);
			}
		}

		return $this->data;
	}

	public function post($data = "", $opts = []) {
		$c = curl_init();

		$headers_string = "";

		curl_setopt($c, CURLOPT_USERAGENT, "Mozilla/5.0 (X11; Linux x86_64; rv:29.0) Gecko/20100101 Firefox/29.0");
		curl_setopt($c, CURLOPT_URL, $this->url);
		curl_setopt($c, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($c, CURLOPT_SSL_VERIFYPEER, false);
		curl_setopt($c, CURLOPT_CONNECTTIMEOUT, 2);
		curl_setopt($c, CURLOPT_TIMEOUT, 15);
		curl_setopt($c, CURLOPT_AUTOREFERER, true);
		curl_setopt($c, CURLOPT_FOLLOWLOCATION, true);
		curl_setopt($c, CURLOPT_MAXREDIRS, 5);
		curl_setopt($c, CURLOPT_POSTFIELDS, $data);
		curl_setopt($c, CURLOPT_HEADERFUNCTION, function($curl, $data) use(&$headers_string) {
				$headers_string .= $data;
				return strlen($data);
		});

		if (!empty($this->proxy)) {
			curl_setopt($c, CURLOPT_PROXY, $this->proxy);
			curl_setopt($c, CURLOPT_PROXYTYPE, CURLPROXY_SOCKS5);
		}

		foreach ($opts as $opt_key => $opt_value) {
			curl_setopt($c, $opt_key, $opt_value);
		}

		if (!$this->data = curl_exec($c)) {
			$this->error = curl_error($c);
			return false;
		}

		$this->code = curl_getinfo($c, CURLINFO_HTTP_CODE);
		$this->length = curl_getinfo($c, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
		$this->content_type = curl_getinfo($c, CURLINFO_CONTENT_TYPE);
		$this->headers = [];
		foreach (explode("\n", trim($headers_string)) as $header_line) {
			if (strpos($header_line, ':') !== false) {
				list($key, $value) = explode(":", trim($header_line), 2);
				if (!isset($this->headers[strtolower($key)])) {
					$this->headers[strtolower($key)] = [];
				}
				$this->headers[strtolower($key)][] = trim($value);
			}
		}

		return $this->data;
	}
}
