<?php

require '../inc/common.inc.php';

$site = new Site();
$site->session_init();

$theme = new Theme();

$parts = explode('/', $_SERVER['REQUEST_URI']);

/*
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
	$tribune_id = false;
	if (!empty($_POST['tribune_id'])) {
		$tribune_id = $_POST['tribune_id'];
	} else if (count($parts) > 1 && $parts[1][0] === '+') {
		$tribune_id = mb_substr($parts[1], 1);
	}

	if (!empty($_POST['message']) and $tribune_id) {
		$tribune = new Tribune();
		if ($tribune->load_from_base60($tribune_id)) {
			$post = new Post();
			$post->tribune_id = $tribune->id;
			$post->message = $_POST['message'];
			$post->useragent = $_SERVER['HTTP_USER_AGENT'];
			$post->timestamp = time();
			$post->post_id = $tribune->get_post_id();

			if ($site->user) {
				$post->username = $site->user->username;
				$post->user_id = $site->user->id;
			}

			$post->insert();
		}
	}
}
*/

$page_user = new User();
$page_tribune = new Tribune();

$router = new Router($site, $theme);
if ($router->handle($_SERVER['REQUEST_URI'], $_GET, $_POST)) {
	die();
}

if (isset($parts[1][0]) and $parts[1][0] === '@') {
	$page_user = User::load_from_url($parts[1]);

	if ($parts[2][0] === '+') {
		$page_tribune = Tribune::load_from_url($parts[2]);
	}
} else if (strlen($parts[1]) > 1 and $parts[1][0] === '+') {
	$page_tribune = Tribune::load_from_url($parts[1]);
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
	$tribune_id = false;
	if (!empty($_POST['tribune_id'])) {
		$tribune_id = $_POST['tribune_id'];
	} else if (count($parts) > 1 && $parts[1][0] === '+') {
		$tribune_id = mb_substr($parts[1], 1);
	}

	if ($parts[1] === 'login') {
		$user = new User();
		if ($user->login($_POST)) {
			$site->user = $user;
			$site->session_register();

			header('HTTP/1.0 302 Found');
			header('Location: /');
			die();
		}
	} else if ($parts[1] === 'register') {
		$user = new User();
		if ($user->register($_POST)) {
			header('HTTP/1.0 302 Found');
			header('Location: /login');
			die();
		}
	} else if (!empty($_POST['action']) and $_POST['action'] === 'tribune-machine-name') {
		$tribune_id = $_POST['tribune_id'];
		$tribune = new Tribune();
		if ($tribune->load_from_base60($tribune_id)) {
			if ($site->user and $tribune->user_id == $site->user->id) {
				if ($tribune->fill($_POST)) {
					$tribune->update();
					header('HTTP/1.0 302 Found');
					header('Location: /'.$tribune->url().'/edit');
					die();
				}
			} else {
				header('HTTP/1.0 403 Forbidden');
				header('Content-Type: text/plain');
				echo "Forbidden\n";
				die();
			}
		}
	}
}

if ($parts[1] === 'register') {
	$theme->content = $site->form_userregister($_POST['username'] ?? '', $_POST['email'] ?? '');
} else if ($parts[1] === 'login') {
	$theme->content = $site->form_userlogin($_POST['username'] ?? '');
} else if ($parts[1] === 'logout') {
	$site->session_destroy();
} else if ($site->user and $parts[1] === $site->user->home_url() and $parts[2] === '+') {
	$tribune = new Tribune();
	$tribune->user_id = $site->user->id;
	$tribune->created = time();
	$tribune->generate_title();
	$tribune->generate_id();
	if ($tribune->insert()) {
		header('HTTP/1.0 302 Found');
		header('Location: /'.$tribune->url());
	}
	die();
} else {
	$theme->content = $site->homepage();
}


if (mb_substr($_SERVER['REQUEST_URI'], -4) == '.tsv') {
	header('Content-Type: text/tab-separated-values;charset=UTF-8');
	print $theme->bare();
} else {
	$theme->sidebar = $site->sidebar();
	$theme->topbar = $site->topbar();
	print $theme->html();
}
