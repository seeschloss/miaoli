<?php

class Update {
	static function perform() {
		$db = new DB();

		if (!$db->query('SELECT COUNT(*) FROM users')) {
			self::to_1();
		}

		if (!$db->query('SELECT user_id FROM posts LIMIT 1')) {
			self::to_2();
		}

		if (!$db->query('SELECT user_id FROM tribunes LIMIT 1')) {
			self::to_3();
		}

		if (!$db->query('SELECT temporary FROM tribunes LIMIT 1')) {
			self::to_4();
		}

		if (!$db->query('SELECT id_base60 FROM tribunes LIMIT 1')) {
			self::to_5();
		}

		if (!$db->query('SELECT description FROM tribunes LIMIT 1')) {
			self::to_6();
		}

		if (!$db->query('SELECT COUNT(*) FROM feeds')) {
			self::to_7();
		}

		if (!$db->query('SELECT color FROM tribunes LIMIT 1')) {
			self::to_8();
		}

		if (!$db->query('SELECT machine_name FROM tribunes LIMIT 1')) {
			self::to_9();
		}

		if (!$db->query('SELECT machine_name FROM feeds LIMIT 1')) {
			self::to_10();
		}

		echo "All done.\n";
	}

	static function to_10() {
		echo "10. Add machine_name to table `feeds`\n";

		$db = new DB();
		$db->query(
			'ALTER TABLE feeds ADD machine_name TEXT'
		);
	}

	static function to_9() {
		echo "9. Add machine_name to table `tribunes`\n";

		$db = new DB();
		$db->query(
			'ALTER TABLE tribunes ADD machine_name TEXT'
		);
	}

	static function to_8() {
		echo "8. Add color to table `tribunes`\n";

		$db = new DB();
		$db->query(
			'ALTER TABLE tribunes ADD color TEXT'
		);
	}

	static function to_7() {
		echo "7. Create table `feeds`\n";

		$db = new DB();
		$db->query(
			'CREATE TABLE feeds (
				id INTEGER PRIMARY KEY,
				user_id INTEGER,
				title TEXT,
				description TEXT,
				tribune_ids TEXT,
				created INTEGER
			);'
		);
	}

	static function to_6() {
		echo "6. Add description to table `tribunes`\n";

		$db = new DB();
		$db->query(
			'ALTER TABLE tribunes ADD description TEXT'
		);
	}

	static function to_5() {
		echo "5. Add id_base60 to table `tribunes`\n";

		$db = new DB();
		$db->query(
			'ALTER TABLE tribunes ADD id_base60 TEXT'
		);

		$tribunes = Tribune::select();
		foreach ($tribunes as $tribune) {
			$tribune->id_base60 = Base60::encode($tribune->id);
			$tribune->update();
		}
	}

	static function to_4() {
		echo "4. Add temporary and deleted to table `tribunes`\n";

		$db = new DB();
		$db->query(
			'ALTER TABLE tribunes ADD temporary INTEGER DEFAULT 0'
		);
		$db->query(
			'ALTER TABLE tribunes ADD deleted INTEGER DEFAULT 0'
		);
	}

	static function to_3() {
		echo "3. Add user_id to table `tribunes`\n";

		$db = new DB();
		$db->query(
			'ALTER TABLE tribunes ADD user_id INTEGER'
		);
	}

	static function to_2() {
		echo "2. Add user_id to table `posts`\n";

		$db = new DB();
		$db->query(
			'ALTER TABLE posts ADD user_id INTEGER'
		);
	}

	static function to_1() {
		echo "1. Create table `users`\n";

		$db = new DB();
		$db->query(
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
			);'
		);
	}
}
