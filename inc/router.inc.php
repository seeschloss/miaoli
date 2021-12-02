<?php

class Router {
	public $site = null;
	public $theme = null;

	public $public_routes = [];
	public $private_routes = [];

	public $json = false;

	public function __construct($site, $theme) {
		$this->site = $site;
		$this->theme = $theme;

		$this->public_routes = [
			'/search' => [$this, 'search'],
			
			'/<user>/:([^/]+)/posts.tsv' => [$this, 'feed_show_tsv'],
			'/<user>/:([^/]+)' => [$this, 'feed_show'],

			'/<user>/\+([^/]+)/posts.tsv' => [$this, 'tribune_show_tsv'],
			'/<user>/\+([^/]+)' => [$this, 'tribune_show'],

			'/<user>' => [$this, 'user_show'],
			
			'/\+([^/]+)/posts.tsv' => [$this, 'tribune_show_anonymous_tsv'],
			'/\+([^/]+)/posts.xml' => [$this, 'tribune_show_anonymous_xml'],
			'/\+([^/]+)/edit' => [$this, 'tribune_edit_anonymous'],
			'/\+([^/]+)' => [$this, 'tribune_show_anonymous'],
			'/\+' => [$this, 'tribune_create_anonymous'],

			'/:mine' => [$this, 'feed_show_anonymous'],
		];

		$this->private_routes = [
			'/new-feed' => [$this, 'feed_edit'],
			'/<user>/:([^/]+)/edit' => [$this, 'feed_edit'],
			'/<user>/\+([^/]+)/edit' => [$this, 'tribune_edit'],
		];

		if ($_SERVER['HTTP_ACCEPT'] == 'application/json') {
			$this->json = true;
		}
	}

	public function handle($uri, $get, $post) {
		$uri = strtok($uri, '?');

		if ($this->site->user) {
			foreach ($this->private_routes as $pattern => $function) {
				$pattern = str_replace('<user>', '@[^/]*', $pattern);

				if (preg_match('/^' . str_replace('/', '\/', $pattern) . '$/', $uri)) {
					return $function(explode('/', $uri), $get, $post);
				}
			}
		}

		foreach ($this->public_routes as $pattern => $function) {
			$pattern = str_replace('<user>', '@[^/]*', $pattern);

			if (preg_match('/^' . str_replace('/', '\/', $pattern) . '$/', $uri)) {
				return $function(explode('/', $uri), $get, $post);
			}
		}

		//header("HTTP/1.0 404 Not Found");
	}

	public function search($parts, $get, $post) {
		$query = '';
		if (!empty($get['q'])) {
			$query = trim($get['q']);
		} else if (!empty($post['q'])) {
			$query = trim($post['q']);
		}

		$tribunes = [];

		if ($query) {
			$tribunes = Tribune::select(['title LIKE' => '%'.$query.'%'], "id DESC", 10);
			$feeds = Feed::select(['title LIKE' => '%'.$query.'%'], "id DESC", 10);
		}

		$this->theme->content = $this->theme->tribunes_list($tribunes, 'search-results');
		$this->theme->content .= $this->theme->feeds_list($feeds, 'search-results');
		$this->theme->sidebar = $this->site->sidebar();
		$this->theme->topbar = $this->site->topbar();
		print $this->theme->html();

		return true;
	}

	public function feed_edit($parts, $get, $post) {
		$user = User::load_from_url($parts[1]);
		$feed = Feed::load_from_url($parts[2]);

		if (!$feed) {
			$feed = new Feed();
			$feed->user_id = $this->site->user->id;
		}

		if ($user && $feed && $user->id === $feed->user_id) {
			if (!empty($post) && $feed->fill($post)) {
				if ($feed->id) {
					$feed->update();
				} else {
					$feed->insert();
				}
			}

			$this->theme->content = $feed->edit();
		}

		$this->theme->sidebar = $this->site->sidebar();
		$this->theme->topbar = $this->site->topbar();
		print $this->theme->html();

		return true;
	}

	public function feed_show($parts, $get, $post) {
		$user = User::load_from_url($parts[1]);
		$feed = Feed::load_from_url($parts[2]);

		if ($user && $feed && $user->id === $feed->user_id) {
			$board = new Board($feed->tribunes(), $feed->url());

			if ($this->json) {
				$this->theme->content = $board->json();
			} else {
				$this->theme->content = $board->show();
			}
		}

		if ($this->json) {
			header('Content-Type: application/json;charset=UTF-8');
			print $this->theme->bare();
		} else {
			$this->theme->sidebar = $this->site->sidebar();
			$this->theme->topbar = $this->site->topbar();
			print $this->theme->html();
		}

		return true;
	}

	public function feed_show_tsv($parts, $get, $post) {
		$user = User::load_from_url($parts[1]);
		$feed = Feed::load_from_url($parts[2]);

		if ($user && $feed && $user->id === $feed->user_id) {
			$board = new Board($feed->tribunes(), $feed->url());
			$this->theme->content = $board->tsv();
		}

		header('Content-Type: text/tab-separated-values;charset=UTF-8');
		print $this->theme->bare();

		return true;
	}

	public function feed_show_anonymous($parts, $get, $post) {
		if (!isset($_SESSION['anonymous_tribunes'])) {
			$_SESSION['anonymous_tribunes'] = [];
		}

		$board = new Board($_SESSION['anonymous_tribunes'], trim(implode("/", $parts), "/"));

		$this->theme->title = "plop";
		$this->theme->content = $board->show();

		$this->theme->sidebar = $this->site->sidebar();
		$this->theme->topbar = $this->site->topbar();
		print $this->theme->html();

		return true;
	}

	public function tribune_edit_anonymous($parts, $get, $post) {
		$tribune = Tribune::load_from_url($parts[1]);

		if ($tribune && $tribune->temporary) {
			if (isset($_SESSION['anonymous_tribunes']) and in_array($tribune, $_SESSION['anonymous_tribunes'])) {
				if (!empty($post) && $tribune->fill($post)) {
					if ($tribune->id) {
						$tribune->update();
					} else {
						$tribune->insert();
					}

					header('HTTP/1.0 302 Found');
					header('Location: /'.$tribune->url());
				}

				$this->theme->title = $tribune->title;
				$this->theme->content = $tribune->edit();
			}
		}

		$this->theme->sidebar = $this->site->sidebar();
		$this->theme->topbar = $this->site->topbar();
		print $this->theme->html();

		return true;
	}

	public function tribune_create_anonymous($parts, $get, $post) {
		$tribune = new Tribune();
		if (!isset($_SESSION['anonymous_tribunes'])) {
			$_SESSION['anonymous_tribunes'] = [];
		}
		$tribune->temporary = 1;
		$tribune->created = time();
		$tribune->generate_title();
		$tribune->generate_color();
		$tribune->generate_id();
		if ($tribune->insert()) {
			$_SESSION['anonymous_tribunes'][] = $tribune;
		}

		$this->theme->title = $tribune->title;
		$this->theme->content = $tribune->edit();

		$this->theme->sidebar = $this->site->sidebar();
		$this->theme->topbar = $this->site->topbar();
		print $this->theme->html();

		return true;
	}

	public function tribune_show_anonymous($parts, $get, $post) {
		if (!$tribune = Tribune::load_from_url($parts[1]) or !$tribune->temporary or $tribune->deleted) {
			header('HTTP/1.0 404 Not Found');
		} else {
			$board = new Board([$tribune], $tribune->url());

			if ($new_post = $tribune->post($post, $this->site) and $this->json) {
				$this->theme->content = $board->json([$new_post]);
			} else if ($this->json) {
				$this->theme->content = $board->json();
			} else {
				$this->theme->title = $tribune->title;
				$this->theme->content = $board->show();
			}
		}

		if ($this->json) {
			header('Content-Type: application/json;charset=UTF-8');
			print $this->theme->bare();
		} else {
			$this->theme->sidebar = $this->site->sidebar();
			$this->theme->topbar = $this->site->topbar();
			print $this->theme->html();
		}

		return true;
	}

	public function tribune_show_anonymous_tsv($parts, $get, $post) {
		$tribune = Tribune::load_from_url($parts[1]);
		
		if (!$tribune->temporary or $tribune->deleted) {
			header('HTTP/1.0 404 Not Found');
		} else {
			$board = new Board([$tribune], $tribune->url());
			$this->theme->content = $board->tsv();
		}

		header('Content-Type: text/tab-separated-values;charset=UTF-8');
		print $this->theme->bare();

		return true;
	}

	public function tribune_show_anonymous_xml($parts, $get, $post) {
		$tribune = Tribune::load_from_url($parts[1]);
		
		if (!$tribune->temporary or $tribune->deleted) {
			header('HTTP/1.0 404 Not Found');
		} else {
			$board = new Board([$tribune], $tribune->url());
			$this->theme->content = $board->xml();
		}

		header('Content-Type: text/tab-separated-values;charset=UTF-8');
		print $this->theme->bare();

		return true;
	}

	public function tribune_edit($parts, $get, $post) {
		$user = User::load_from_url($parts[1]);
		$tribune = Tribune::load_from_url($parts[2]);

		if ($user && $tribune && $user->id === $tribune->user_id) {
			if (!empty($post) && $tribune->fill($post)) {
				if ($tribune->id) {
					$tribune->update();
				} else {
					$tribune->insert();
				}
			}

			$this->theme->title = $tribune->title;
			$this->theme->content = $tribune->edit();
		}

		$this->theme->sidebar = $this->site->sidebar();
		$this->theme->topbar = $this->site->topbar();
		print $this->theme->html();

		return true;
	}

	public function tribune_show($parts, $get, $post) {
		$user = User::load_from_url($parts[1]);
		$tribune = Tribune::load_from_url($parts[2]);

		if ($user && $tribune && $user->id === $tribune->user_id) {
			$board = new Board([$tribune], $tribune->url());

			if ($new_post = $tribune->post($post, $this->site) and $this->json) {
				$this->theme->content = $board->json([$new_post]);
			} else if ($this->json) {
				$this->theme->content = $board->json();
			} else {
				$this->theme->title = $tribune->title;
				$this->theme->content = $board->show();
			}
		}

		if ($this->json) {
			header('Content-Type: application/json;charset=UTF-8');
			print $this->theme->bare();
		} else {
			$this->theme->sidebar = $this->site->sidebar();
			$this->theme->topbar = $this->site->topbar();
			print $this->theme->html();
		}

		return true;
	}

	public function tribune_show_tsv($parts, $get, $post) {
		$user = User::load_from_url($parts[1]);
		$tribune = Tribune::load_from_url($parts[2]);

		if ($user && $tribune && $user->id === $tribune->user_id) {
			$board = new Board([$tribune], $tribune->url());
			$this->theme->content = $board->tsv();
		}

		header('Content-Type: text/tab-separated-values;charset=UTF-8');
		print $this->theme->bare();

		return true;
	}

	public function user_show($parts, $get, $post) {
		$user = User::load_from_url($parts[1]);

		if ($user) {
			$tribunes = Tribune::select(['user_id' => $user->id]);
			$board = new Board($tribunes, $user->home_url());

			if ($this->json) {
				$this->theme->content = $board->json();
			} else {
				$this->theme->title = $tribune->title;
				$this->theme->content = $board->show();
			}
		}

		if ($this->json) {
			header('Content-Type: application/json;charset=UTF-8');
			print $this->theme->bare();
		} else {
			$this->theme->sidebar = $this->site->sidebar();
			$this->theme->topbar = $this->site->topbar();
			print $this->theme->html();
		}

		return true;
	}
}
