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
		$message_formatted = htmlentities($this->message);

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
}
