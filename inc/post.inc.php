<?php

class Post extends Record {
	public static $table = "posts";

	public $id = 0;
	public $user_id = 0;
	public $tribune_id = 0;
	public $post_id = 0;
	public $username = "";
	public $useragent = "";
	public $message = "";
	public $timestamp = 0;

	function insert() {
		$db = new DB();

		$query = 'INSERT INTO posts
				(user_id, tribune_id, post_id, username, useragent, message, timestamp)
			VALUES (
				'.(int)$this->user_id.',
				'.(int)$this->tribune_id.',
				'.(int)$this->post_id.',
				'.$db->escape($this->username).',
				'.$db->escape($this->useragent).',
				'.$db->escape($this->message).',
				'.(int)$this->timestamp.'
		);';

		$db->query($query);

		$this->id = $db->insert_id();

		return $this->id;
	}

	function tribune_time() {
		return date("YmdHis", $this->timestamp);
	}

	function unique_id() {
		return "post-{$this->tribune_id}-{$this->id}";
	}

	function html() {
		$time_formatted = date("H:i:s", $this->timestamp);
		$username_formatted = htmlentities($this->username) ?: "Anonymous";
		$message_formatted = $this->replace_urls($this->sanitize($this->message, 512));

		return <<<HTML
			<li
			 data-unique-id="{$this->unique_id()}"
			 data-timestamp="{$this->tribune_time()}"
			 class="tribune-{$this->tribune_id}">
				<span
						id="post-{$this->tribune_id}-{$this->post_id}"
						data-tribune-id="{$this->tribune_id}"
						data-post-id="{$this->post_id}"
						data-timestamp="{$this->tribune_time()}"
						class="post">
					<span class="time">{$time_formatted}</span>
					<span class="username">{$username_formatted}</span>
					<span class="message">{$message_formatted}</span>
				</span>
			</li>
HTML;
	}

	function tsv() {
		$useragent_formatted = preg_replace('/[\p{C}]/u', '', $this->useragent);
		$username_formatted = preg_replace('/[\p{C}]/u', '', $this->username);
		$message_formatted = preg_replace('/[\p{C}]/u', '', $this->message);

		return "{$this->post_id}\t{$this->datetime()}\t{$useragent_formatted}\t{$username_formatted}\t{$message_formatted}";
	}

	function xml() {
		$useragent_formatted = preg_replace('/[\p{C}]/u', '', $this->useragent);
		$username_formatted = preg_replace('/[\p{C}]/u', '', $this->username);
		$message_formatted = preg_replace('/[\p{C}]/u', '', $this->message);

		return <<<XML
	<post time="{$this->datetime()}" id="{$this->post_id}">
		<info>{$useragent_formatted}</info>
		<login>{$username_formatted}</login>
		<message>{$message_formatted}</message>
	</post>
XML;
	}

	function json() {
		return [
			'id' => $this->id,
			'html' => $this->html(),
		];
	}

	function datetime() {
		return date('YmdHis', $this->timestamp);
	}

	function sanitize($text, $length = -1) {
		$l    = strlen($text);
		$byte = 0 ;

		for ($i=0 ; $i < $l ; $i++) {
			$byte = ord($text[$i]);
			if ($byte < 32 or $byte == 127) {
				$text[$i] = ' ';
			}
		}

		$text = trim($text);

		if (function_exists("mb_detect_encoding")) {
			// let us assume that mb_substr exists too then
			if (strcasecmp(mb_detect_encoding($text, 'UTF-8', TRUE), 'UTF-8') == 0) {
				$clean = mb_substr($text, 0, $length, 'UTF-8');
			}
		} else if (function_exists("iconv_substr")) {
			// there is no iconv_detect_encoding, so let us assume that the string is UTF-8-encoded
			$clean = iconv_substr($text, 0, $length, 'UTF-8');
		} else {
			// better than nothing?
			//$clean = substr(str_ctrl_clean($s), 0, $length);
			// actually, we'll just pass it as it is, rather than risking splitting a character in two
			$clean = $text;
		}

		$replace_callback = function($matches) use(&$replace_callback) {
			$text = preg_replace_callback(':<(m|s|u|b|i|tt)>(.*?)</\1>:', $replace_callback, $matches[2]);
			switch ($matches[1]) {
				case 'm':
					$start = "====> ". chr(26) ."b". chr(27) ."Moment ";
					$stop  = chr(26) ."/b". chr(27) ." <====";
					break;
				case 'tt':
					$matches[1] = 'code';
				default:
					$start = chr(26) . $matches[1] . chr(27);
					$stop  = chr(26) ."/". $matches[1] . chr(27);
			}
			return $start . $text . $stop;
		};

		$message = preg_replace_callback(':<(m|s|u|b|i|tt|code)>(.*?)</\1>:', $replace_callback, $clean);

		$replacement = array(
			"&" =>   "&amp;",
			"<" =>    "&lt;",
			">" =>    "&gt;",
			chr(26) =>       "<",
			chr(27) =>       ">",
			chr(28) =>       "'",
			chr(29) =>       '"',
		);

		return str_replace(array_keys($replacement), array_values($replacement), $message);
	}

	function replace_urls($text) {
		$tribune_url_replace_callback = function($matches) {
			$url = $matches[1];
			$text = 'url';

			$pairs = array(
				')' => '(',
				'}' => '{',
				']' => '[',
			);

			$before = "";
			$after  = "";

			if ($matches[4]) {
				if (isset($pairs[$matches[4]]) && substr_count($url, $pairs[$matches[4]]) == substr_count($url, $matches[4]) + 1) {
				$url .= $matches[4];
				} else {
				$after = $matches[4];
				}
			}

			$after .= $matches[5];

			return $before .'<a href="'. $url .'">['. $text .']</a>'. $after;
		};

		$text = preg_replace_callback('#'.
			'('.                                        // 1
				'(https?|ftp|gopher|file|mms|rtsp|rtmp)'. // 2
				'://.*?'.
			')'.
			'('.                                        // 3
				'(,|\.|\)|\]|\})?'.                       // 4
				'(<| | |"|$)'.                            // 5
			')'.
			'#', $tribune_url_replace_callback, $text);

		return $text;
	}
}
