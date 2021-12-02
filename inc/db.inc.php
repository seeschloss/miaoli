<?php
class DB {
	static private $resource;

	function schema() {
		return [
			'CREATE TABLE tribunes (
				id INTEGER,
				id_base60 TEXT,
				machine_name TEXT,
				user_id INTEGER,
				title TEXT,
				description TEXT,
				color TEXT,
				temporary INTEGER,
				deleted INTEGER,
				created INTEGER
			);',

			'CREATE TABLE posts (
				id INTEGER PRIMARY KEY,
				user_id INTEGER,
				tribune_id INTEGER,
				post_id INTEGER,
				username TEXT,
				useragent TEXT,
				message TEXT,
				timestamp INTEGER
			);',
			'CREATE UNIQUE INDEX tribune_post_id ON posts(tribune_id, post_id);',

			'CREATE TABLE users (
				id INTEGER PRIMARY KEY,
				username TEXT,
				password TEXT,
				email TEXT,
				oauth_provider TEXT,
				oauth_data TEXT,
				last_used INTEGER,
				activated INTEGER,
				created INTEGER
			);',

			'CREATE TABLE feeds (
				id INTEGER,
				machine_name TEXT,
				user_id INTEGER,
				title TEXT,
				description TEXT,
				tribune_ids TEXT,
				created INTEGER
			);',

		];
	}

	function init_schema() {
		foreach ($this->schema() as $table) {
			$this->query($table);
		}
	}

	function __construct() {
		if (!isset(self::$resource)) {
			self::$resource = new PDO($GLOBALS['config']['database']['dsn']);

			$result = $this->query("SELECT COUNT(*) FROM tribunes");
			if (!$result) {
				$this->init_schema();
			}
		}
	}

	function error() {
		$error = self::$resource->errorInfo();

		return is_array($error) ? $error[2] : "";
	}

	function query($query) {
		$result = self::$resource->query($query);
		if (!$result) {
			$error = $this->error();
			if (class_exists('Logger')) {
				Logger::error($error);
				Logger::error("Query was: ".$query);
			}
			else {
				trigger_error($error);
				trigger_error("Query was: ".$query);
			}
		}
		return $result;
	}

	function value($query) {
		$result = $this->query($query);
		if ($result) while ($row = $result->fetch()) {
			return $row[0];
		}

		return '';
	}

	function escape($string) {
		return self::$resource->quote($string);
	}

	function insert_id() {
		return self::$resource->lastInsertId();
	}
}

