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
		if (!is_array($this->tribune_ids) or !count($this->tribune_ids)) {
			return [];
		}

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
		$input_title->attributes['maxlength'] = 100;

		$input_description = new HTML_Textarea("feed-description");
		$input_description->name = "description";
		$input_description->value = $this->description;
		$input_description->attributes['rows'] = 3;

		$user = User::load_from_id($this->user_id);
		$form_url = $this->id
			? '/'.$this->url().'/edit'
			: ($user ? '/'.$user->home_url().'/new-feed' : '/new-feed');

		$user_tribunes = Tribune::select(['user_id' => $this->user_id, 'deleted' => '0']);
		$tribune_boxes = [];
		foreach ($user_tribunes as $tribune) {
			$checked = (is_array($this->tribune_ids) and in_array($tribune->id, $this->tribune_ids)) ? ' checked="checked"' : '';
			$tribune_title = htmlspecialchars($tribune->title, ENT_QUOTES, 'UTF-8');
			$tribune_boxes[] = <<<HTML
				<label class="checkbox-item">
					<input type="checkbox" name="tribune_ids[]" value="{$tribune->id}"{$checked} />
					<span class="space-dot" style="--space-color: {$tribune->color}"></span>
					<span>{$tribune_title}</span>
				</label>
HTML;
		}

		if (!count($tribune_boxes)) {
			$tribune_boxes[] = '<p class="field-hint">Create a tribune first.</p>';
		}

		$boxes_html = implode('', $tribune_boxes);
		$eyebrow_html = $this->id ? '<p class="eyebrow">Feed settings</p>' : '';
		$heading = $this->id ? htmlspecialchars($this->title, ENT_QUOTES, 'UTF-8') : 'New feed';
		$form_url = htmlspecialchars($form_url, ENT_QUOTES, 'UTF-8');
		$intro = $this->id
			? 'Choose tribunes for this feed.'
			: 'Choose tribunes to combine.';

		return <<<HTML
			<div class="form-page">
				<div class="page-head">
					{$eyebrow_html}
					<h1>{$heading}</h1>
					<p class="form-intro">{$intro}</p>
				</div>
				<form class="form-card" method="POST" action="{$form_url}">
					<input type="hidden" name="feed_id" value="{$this->id}" />
					<input type="hidden" name="action" value="feed-edit" />
					<div class="field">{$input_title->html("Title")}</div>
					<div class="field">{$input_description->html("Short description")}</div>
					<fieldset class="field checkbox-field">
						<legend>Included tribunes</legend>
						<div class="checkbox-list">{$boxes_html}</div>
					</fieldset>
					<div class="form-actions">
						<button class="button primary" type="submit">Save feed</button>
					</div>
				</form>
			</div>
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
			$this->tribune_ids = isset($data['tribune_ids']) ? $data['tribune_ids'] : [];

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
