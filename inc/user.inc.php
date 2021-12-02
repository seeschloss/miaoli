<?php

class User extends Record {
	public static $table = "users";

	public $id = 0;
	public $username = '';
	public $password = '';
	public $email = '';
	public $oauth_provider = '';
	public $oauth_data = '';
	public $last_used = 0;
	public $activated = 0;
	public $created = 0;

	public static function load_from_id($id) {
		$users = self::select(['id' => $id]);

		if (count($users) === 1) {
			return array_pop($users);
		}

		return false;
	}

	public static function load_from_url($url) {
		$users = self::select(['username' => mb_substr($url, 1)]);

		if (count($users) === 1) {
			return array_pop($users);
		}

		return false;
	}

	function home_url() {
		return '@'.$this->username;
	}

	function hash_password($plain_password, $master_salt) {
		return password_hash($plain_password.$master_salt, PASSWORD_BCRYPT, ['cost' => 10]);
	}

	function check_password($plain_password, $master_salt) {
		return password_verify($plain_password.$master_salt, $this->password);
	}

	function login($data) {
		if (empty($data['username'])) {
			$GLOBALS['form_errors']['username'] = "Missing username";
		}

		if (empty($data['password'])) {
			$GLOBALS['form_errors']['password'] = "Missing password";
		}

		// If some of the fields are missing, return right now
		if (!empty($GLOBALS['form_errors'])) {
			return false;
		}

		if (!$this->load(['username' => $data['username']])) {
			$GLOBALS['form_errors']['username'] = "No such user";
			return false;
		}

		if (!$this->check_password($data['password'], $GLOBALS['config']['salt'])) {
			$GLOBALS['form_errors']['password'] = "Wrong password";
			return false;
		}

		return true;
	}

	function register($data) {
		if (empty($data['username'])) {
			$GLOBALS['form_errors']['username'] = "Missing username";
		}

		if (empty($data['password1'])) {
			$GLOBALS['form_errors']['password1'] = "Missing password";
		}

		if (empty($data['password2'])) {
			$GLOBALS['form_errors']['password2'] = "Missing password verification";
		}

		// If some of the fields are missing, return right now
		if (!empty($GLOBALS['form_errors'])) {
			return false;
		}

		if ($data['password1'] !== $data['password2']) {
			$GLOBALS['form_errors']['password2'] = "Incorrect password verification";
		}

		if (!preg_match("/^[a-zA-Z0-9_-]+$/", $data['username'])) {
			$GLOBALS['form_errors']['username'] = 'Your username should only contain letters from A to Z, digits, as well as the characters "_", and "-"';
		}

		if (count(User::select(['username' => $data['username']]))) {
			$GLOBALS['form_errors']['username'] = "Username already taken";
		}

		if (!empty($GLOBALS['form_errors'])) {
			return false;
		}

		$this->username = $data['username'];
		$this->password = $this->hash_password($data['password1'], $GLOBALS['config']['salt']);
		$this->email = $data['email'] ?? '';
		$this->created = time();
		
		if (!$this->insert()) {
			$GLOBALS['form_errors']['form'] = "Database error, could not create user :/ Please contact us as {$GLOBALS['config']['contact']}";
			return false;
		}

		return true;
	}

	function insert() {
		$db = new DB();

		$query = 'INSERT INTO users
				(username, password, email, oauth_provider, oauth_data, last_used, activated, created)
			VALUES (
				'.$db->escape($this->username).',
				'.$db->escape($this->password).',
				'.$db->escape($this->email).',
				'.$db->escape($this->oauth_provider).',
				'.$db->escape($this->oauth_data).',
				'.(int)$this->last_used.',
				'.(int)$this->activated.',
				'.(int)$this->created.'
		);';

		$db->query($query);

		$this->id = $db->insert_id();

		return $this->id;
	}
}
