<?php

class Feed extends Record {
	public static $table = "feeds";

	public $id = 0;
	public $user_id = 0;
	public $title = "";
	public $description = "";
	public $tribune_ids = [];
	public $deleted = 0;
	public $created = 0;

	private $max_posts = 80;

	function load($conditions = []) {
		parent::load($conditions);

		$this->tribune_ids = unserialize($this->tribune_ids);

		return $this->id;
	}

	public static function load_from_url($url) {
		$feeds = self::select(['id' => mb_substr($url, 1)]);

		if (count($feeds) === 1) {
			return array_pop($feeds);
		}

		return false;
	}

	static function select($conditions = [], $order = NULL, $limit = NULL) {
		$found = parent::select($conditions, $order, $limit);

		foreach ($found as $o) {
			$o->tribune_ids = unserialize($o->tribune_ids);
		}

		return $found;
	}

	function tribunes() {
		return Tribune::select(['id IN ('.implode(',', $this->tribune_ids).')']);
	}

	function insert() {
		$db = new DB();

		$query = 'INSERT INTO feeds
				(user_id, title, description, tribune_ids, created)
			VALUES (
				'.(int)$this->user_id.',
				'.$db->escape($this->title).',
				'.$db->escape($this->description).',
				'.$db->escape(serialize($this->tribune_ids)).',
				'.(int)time().'
		);';

		$db->query($query);

		$this->id = $db->insert_id();

		return $this->id;
	}

	function update() {
		$db = new DB();

		$query = 'UPDATE feeds SET
					user_id='.(int)$this->user_id.',
					title='.$db->escape($this->title).',
					description='.$db->escape($this->description).',
					tribune_ids='.$db->escape(serialize($this->tribune_ids)).'
				WHERE
					id='.(int)$this->id.';
		';

		$db->query($query);

		return $this->id;
	}

	function edit() {
		$input_title = new HTML_Input("feed-title");
		$input_title->name = "title";
		$input_title->value = $this->title;

		$input_description = new HTML_Textarea("feed-description");
		$input_description->name = "description";
		$input_description->value = $this->description;

		$user_tribunes = Tribune::select(['user_id' => $this->user_id, 'deleted' => '0']);

		$input_tribunes = new HTML_Select("feed-tribune-ids");
		$input_tribunes->name = "tribune_ids[]";
		$input_tribunes->options = array_map(function($tribune) { return $tribune->title; }, $user_tribunes);
		$input_tribunes->selected = $this->tribune_ids;
		$input_tribunes->attributes['size'] = max(8, count($user_tribunes));
		$input_tribunes->attributes['multiple'] = "multiple";

		return <<<HTML
			<form method="POST" action="/{$this->url()}/edit">
				<input type="hidden" name="feed_id" value="{$this->id}" />
				<input type="hidden" name="action" value="feed-edit" />
				<p>{$input_title->html("Title")}</p>
				<p>{$input_description->html("Short description")}</p>
				<p>{$input_tribunes->html("Included tribunes")}</p>
				<p><button type="submit">Save</button></p>
			</form>
HTML;
	}

	function url() {
		if (!$this->id) {
			return 'new-feed';
		}

		$user = User::load_from_id($this->user_id);
		return $user->home_url().'/:'.$this->id;
	}

	function fill($data) {
		$ok = true;

		if (isset($data['title'])) {
			$this->title = trim($data['title']);

			if (mb_strlen($this->title) > 100) {
				$GLOBALS['form_errors']['title'] = 'Feed titles cannot be longer than 100 characters';
				return false;
			}

			/*
			if (!preg_match("/^[a-zA-Z0-9_-]+$/", $data['title'])) {
				$GLOBALS['form_errors']['title'] = 'Feed titles should only contain letters from A to Z, digits, as well as the characters "_" and "-"';
				$ok = false;
			}
			*/
		}

		if (isset($data['description'])) {
			$this->description = trim($data['description']);
		}

		if (isset($data['tribune_ids'])) {
			$this->tribune_ids = $data['tribune_ids'];
		}

		return $ok;
	}
}
