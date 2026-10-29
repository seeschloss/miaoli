<?php

class Tribune extends Record {
	public static $table = "tribunes";

	public $id = 0;
	public $id_base60 = "";
	public $machine_name = "";
	public $user_id = 0;
	public $title = "";
	public $description = "";
	public $color = "#FFFFFF";
	public $temporary = 0;
	public $deleted = 0;
	public $created = 0;

	private $max_posts = 80;

	function __construct() {
	}

	function get_next_post_id() {
		$posts = Post::select(['tribune_id' => $this->id], 'post_id DESC', 1);

		if (count($posts)) {
			return array_pop($posts)->post_id + 1;
		} else {
			return 1;
		}
	}

	function post_locally($data, $site) {
		if (!empty($data['message'])) {
			$post = new Post();
			$post->tribune_id = $this->id;
			$post->message = trim(str_replace(" ", " ", $data['message']));
			$post->useragent = $_SERVER['HTTP_USER_AGENT'];
			$post->timestamp = time();
			$post->post_id = $this->get_next_post_id();

			if ($site->user) {
				$post->username = $site->user->username;
				$post->user_id = $site->user->id;
			}

			if ($post->insert()) {
				return $post;
			}
		}

		return false;
	}

	function post_remotely($data, $site) {
		$http = new HTTP($this->remote_post_url);
		$data = str_replace("%s", urlencode($data['message']), $this->remote_post_format);

		$options = [
			CURLOPT_USERAGENT => $_SERVER['HTTP_USER_AGENT'],
		];

		if ($site->user) {
			$options[CURLOPT_USERAGENT] = $site->user->username;
		}

		return $http->post($data, $options) !== false;
	}

	function post($data, $site) {
		if (!empty($this->remote_post_url)) {
			$result = $this->post_remotely($data, $site);
			if ($result) {
				$this->synchronize_from_backend();
				$posts = Post::select(['tribune_id' => $this->id], 'post_id DESC', 1);

				if (count($posts)) {
					return array_pop($posts);
				}
			}

			return false;
		} else {
			return $this->post_locally($data, $site);
		}
	}

	function fill($data) {
		if (isset($data['title'])) {
			$this->title = trim($data['title']);

			if (mb_strlen($this->title) > 100) {
				$GLOBALS['form_errors']['title'] = 'Tribune titles cannot be longer than 100 characters';
				return false;
			}
		}

		if (isset($data['description'])) {
			$this->description = trim($data['description']);
		}

		if (isset($data['color'])) {
			$this->color = trim($data['color']);
				var_dump($this->color);

			if (!preg_match("/^#[0-9A-F]{6}$/i", $this->color)) {
				$GLOBALS['form_errors']['color'] = 'Colors should be an hexadecimal RGB value in the form #42BF5E';
				return false;
			}
		}

		if (isset($data['remote-backend-url'])) {
			$this->remote_backend_url = trim($data['remote-backend-url']);
		}

		if (isset($data['remote-backend-type'])) {
			$this->remote_backend_type = trim($data['remote-backend-type']);
		}

		if (isset($data['remote-post-url'])) {
			$this->remote_post_url = trim($data['remote-post-url']);
		}

		if (isset($data['remote-post-format'])) {
			$this->remote_post_format = trim($data['remote-post-format']);
		}

		if (isset($data['machine_name'])) {
			$this->machine_name = trim($data['machine_name']);

			if (!preg_match("/^[a-zA-Z0-9_-]+$/", $this->machine_name)) {
				$GLOBALS['form_errors']['machine_name'] = 'Tribune identifiers should only contain letters from A to Z, digits, as well as the characters "_" and "-"';
				return false;
			}
		}

		return true;
	}

	function edit() {
		$input_title = new HTML_Input("tribune-title");
		$input_title->name = "title";
		$input_title->value = $this->title;

		$input_description = new HTML_Textarea("tribune-description");
		$input_description->name = "description";
		$input_description->value = $this->description;

		$input_color = new HTML_Input_Color("tribune-color");
		$input_color->name = "color";
		$input_color->value = $this->color;

		$html = <<<HTML
			<form method="POST" action="/{$this->url()}/edit">
				<input type="hidden" name="tribune_id" value="{$this->id_base60()}" />
				<input type="hidden" name="action" value="tribune-edit" />
				<p>{$input_title->html("Title")}</p>
				<p>{$input_description->html("Short description")}</p>
				<p>{$input_color->html("Characteristic color")}</p>
HTML;

		if (!$this->temporary) {
			$input_remote_backend_url = new HTML_Input("tribune-remote-backend-url");
			$input_remote_backend_url->name = "remote-backend-url";
			$input_remote_backend_url->value = $this->remote_backend_url;

			$input_remote_backend_type = new HTML_Input("tribune-remote-backend-type");
			$input_remote_backend_type->name = "remote-backend-type";
			$input_remote_backend_type->value = $this->remote_backend_type;

			$input_remote_post_url = new HTML_Input("tribune-remote-post-url");
			$input_remote_post_url->name = "remote-post-url";
			$input_remote_post_url->value = $this->remote_post_url;

			$input_remote_post_format = new HTML_Input("tribune-remote-post-format");
			$input_remote_post_format->name = "remote-post-format";
			$input_remote_post_format->value = $this->remote_post_format;

			$html .= <<<HTML
					<input type="hidden" name="tribune_id" value="{$this->id_base60()}" />
					<input type="hidden" name="action" value="tribune-remote" />
					<p>{$input_remote_backend_url->html("Remote backend URL")}</p>
					<p>{$input_remote_backend_type->html("Remote backend type")}</p>
					<p>{$input_remote_post_url->html("Remote post URL")}</p>
					<p>{$input_remote_post_format->html("Remote post format")}</p>

HTML;
		}

		$html .= <<<HTML
				<p><button type="submit">Save</button></p>
			</form>
HTML;

		if (!$this->temporary) {
			if (!$this->machine_name) {
				$default_machine_name = mb_strtolower($this->title);
				$default_machine_name = preg_replace('/[^a-zA-Z0-9_-]/', '-', $default_machine_name);

				$input_machine_name = new HTML_Input("machine-name");
				$input_machine_name->name = "machine_name";
				$input_machine_name->value = $default_machine_name;

				$html .= <<<HTML
				<form method="POST" action="/{$this->url()}/edit">
					<input type="hidden" name="tribune_id" value="{$this->id_base60()}" />
					<input type="hidden" name="action" value="tribune-machine-name" />
					<p>{$input_machine_name->html("Identifier")}</p>
					<p>This identifier will replace the default id ({$this->id_base60()}) in this tribune's URL.
					   It is only a cosmetic change. This choice is definitive.</p>
					<p><button class="warning" type="submit">Save</button></p>
				</form>
HTML;
			} else {
				$html .= <<<HTML
				<p><label for="machine-name">Identifier</label>: <span id="machine-name">{$this->machine_name}</span></p>
HTML;
			}
		}

		return $html;
	}

	function insert() {
		$db = new DB();

		$fields = [
			'id' => (int)$this->id,
			'id_base60' => $db->escape($this->id_base60()),
			'machine_name' => $db->escape($this->machine_name),
			'user_id' => (int)$this->user_id,
			'title' => $db->escape($this->title),
			'description' => $db->escape($this->description),
			'color' => $db->escape($this->color),
			'remote_backend_url' => $db->escape($this->remote_backend_url),
			'remote_backend_type' => $db->escape($this->remote_backend_type),
			'remote_post_url' => $db->escape($this->remote_post_url),
			'remote_post_format' => $db->escape($this->remote_post_format),
			'deleted' => (int)$this->deleted,
			'temporary' => (int)$this->temporary,
			'created' => (int)$this->created,
		];

		$query = 'INSERT INTO tribunes ('.implode(',', array_keys($fields)).') '.
		                       'VALUES ('.implode(',', array_values($fields)).')';

		$db->query($query);

		return $this->id;
	}

	function update() {
		$db = new DB();

		$fields = [
			'id_base60' => $db->escape($this->id_base60()),
			'machine_name' => $db->escape($this->machine_name),
			'user_id' => (int)$this->user_id,
			'title' => $db->escape($this->title),
			'description' => $db->escape($this->description),
			'color' => $db->escape($this->color),
			'remote_backend_url' => $db->escape($this->remote_backend_url),
			'remote_backend_type' => $db->escape($this->remote_backend_type),
			'remote_post_url' => $db->escape($this->remote_post_url),
			'remote_post_format' => $db->escape($this->remote_post_format),
			'deleted' => (int)$this->deleted,
			'temporary' => (int)$this->temporary,
		];

		$query = 'UPDATE tribunes SET ' . implode(', ', array_map(function($k, $v) { return $k . '=' . $v; }, array_keys($fields), $fields)) .
		         ' WHERE id = '.(int)$this->id;

		$db->query($query);

		return $this->id;
	}

	public static function select($conditions = [], $order = NULL, $limit = NULL) {
		if (!isset($conditions['deleted'])) {
			$conditions['deleted'] = '0';
		}

		
		//if (!isset($conditions['temporary']) and !isset($conditions['created'])) {
		//	$conditions[] = '(temporary=0 OR created >= '.(time() - 3600).')';
		//}

		return parent::select($conditions, $order, $limit);
	}

	public function prune() {
		// No automatic pruning of temporary tribunes anymore
		return false;

		if ($this->temporary and $this->created < (time() - 3600)) {
			$posts = Post::select(['tribune_id' => $this->id, 'timestamp > '.(time() - 3600)], 'post_id DESC', 1);
			if (count($posts) === 0) {
				// This temporary tribune has not had activity for at least an hour
				$this->deleted = 1;
				$this->update();

				return true;
			}
		}

		return false;
	}

	public function load($conditions = []) {
		parent::load($conditions);
		
		if ($this->prune()) {
			return 0;
		}

		return $this->id;
	}

	public static function load_from_title($title) {
		$tribunes = self::select(['title' => $title]);

		if (count($tribunes) === 1) {
			return array_pop($tribunes);
		}

		return false;
	}

	public static function load_from_url($url) {
		if (strlen($url) > 1 and $url[0] === '+') {
			$url = substr($url, 1);
		}

		$tribunes = self::select(['id_base60' => $url]);

		if (count($tribunes) === 1) {
			return array_pop($tribunes);
		}

		$tribunes = self::select(['machine_name' => $url]);
		if (count($tribunes) === 1) {
			return array_pop($tribunes);
		}

		return false;
	}

	function load_from_base60($id_base60) {
		$id_base10 = Base60::decode($id_base60);

		return $this->load(['id' => $id_base10]);
	}

	function id_base60() {
		return Base60::encode($this->id);
	}

	function generate_id() {
		// I think this is sufficiently random to not care about the
		// possibility that two tribunes could generate the same id
		// at the same time before either gets commited to database

		do {
			$this->id = base_convert(bin2hex(random_bytes(7)), 16, 10);
		} while (count(Tribune::select(['id' => $this->id, 'deleted' => [0, 1], 'temporary' => [0, 1]])));
	}

	function generate_title() {
		$c  = 'bbccddffgjkllmnprssttvz';   // common consonants
		$v  = 'aaaaeeeeéiiiooou';          // common vowels
		$a  = $c.$v;                       // both
		$e  = $v.'clst';                   // endings

		$title = '';

		$syllables = 2;

		for ($i = 0; $i < $syllables; $i++){
			$title .= mb_substr($c, rand(0, mb_strlen($c)-1), 1);
			$title .= mb_substr($v, rand(0, mb_strlen($v)-1), 1);
			$title .= mb_substr($a, rand(0, mb_strlen($a)-1), 1);
		}

		$title .= mb_substr($e, rand(0, mb_strlen($e)-1), 1);

		$this->title = mb_strtoupper($title[0]).mb_substr($title, 1);
	}

	function generate_color() {
		$r = rand(100, 255);
		$g = rand(100, 255);
		$b = rand(100, 255);

		$r_hex = str_pad(dechex($r), 2, "0", STR_PAD_LEFT);
		$g_hex = str_pad(dechex($g), 2, "0", STR_PAD_LEFT);
		$b_hex = str_pad(dechex($b), 2, "0", STR_PAD_LEFT);

		$this->color = "#".$r_hex.$g_hex.$b_hex;
	}

	function url() {
		if ($this->temporary) {
			return '+'.$this->id_base60();
		}

		if ($this->user_id) {
			$user = new User();
			$user->load(['id' => $this->user_id]);

			if ($this->machine_name) {
				return $user->home_url().'/+'.$this->machine_name;
			} else {
				return $user->home_url().'/+'.$this->id_base60();
			}
		}

		return "";
	}

	function link_with_configure() {
		$html = '<a href="/'.$this->url().'">'.$this->title.'</a>';

		if ($this->temporary) {
			if (isset($_SESSION['anonymous_tribunes']) and count($_SESSION['anonymous_tribunes'])) {
				foreach ($_SESSION['anonymous_tribunes'] as $anonymous_tribune) {
					if ($anonymous_tribune->id_base60 == $this->id_base60) {
						$html .= ' <a class="configure" href="/'.$this->url().'/edit">configure</a>';
					}
				}
			}
		} else {
			if (isset($_SESSION['user']) and $_SESSION['user']['id'] == $this->user_id) {
				$html .= ' <a class="configure" href="/'.$this->url().'/edit">configure</a>';
			}
		}

		return $html;
	}

	function synchronize_from_backend() {
		$http = new HTTP($this->remote_backend_url);
		$data = $http->get();

		$next_post_id = $this->get_next_post_id();

		switch ($this->remote_backend_type) {
			case 'tsv':
				$lines = explode("\n", $data);
				foreach ($lines as $line) {
					$parts = explode("\t", trim($line));

					if (count($parts) == 5) {
						$post_id = $parts[0];
						$post_time = $parts[1];
						$post_user = $parts[2];
						$post_info = $parts[3];
						$post_message = $parts[4];

						$post_datetime = DateTimeImmutable::createFromFormat('YmdHis', $post_time);
						if ($post_datetime and $post_id and $post_id >= $next_post_id) {
							$post_timestamp = $post_datetime->getTimestamp();

							$post_message = preg_replace('@<a href="([^"]*)">([^<]*)</a>@', '$1', $post_message);

							$post = new Post();
							$post->tribune_id = $this->id;
							$post->message = trim($post_message);
							$post->useragent = $post_info;
							$post->timestamp = $post_timestamp;
							$post->post_id = $post_id;
							$post->username = $post_user;

							$post->insert();
						}
					}
				}

				break;
		}
	}
}
