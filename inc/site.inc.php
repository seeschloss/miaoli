<?php

class Site {
	public $user = null;

	public function session_init() {
		session_name('s');
		session_start();

		if (!empty($_SESSION['user']['id'])) {
			$user = new User();
			if ($user->load(['id' => $_SESSION['user']['id']])) {
				$this->user = $user;
				return true;
			}
		}
	}

	public function session_register() {
		$_SESSION['user'] = [
			'id' => $this->user->id,
		];
	}

	public function session_destroy() {
		$this->user = null;
		$_SESSION = [];
	}

	public function homepage() {
		$html = "";

		$html = $this->featured_tribunes();

		return $html;
	}

	public function featured_tribunes() {
		$html = "";

		$feeds = Feed::select();
		$feeds_list = [];
		foreach ($feeds as $feed) {
			$feeds_list[] = '<li><a href="/'.$feed->url().'">'.$feed->title.'</a></li>';
		}

		$feeds_html = implode('', $feeds_list);
		$html .= <<<HTML
			<div id="user-feeds">
				<h2>Featured</h2>
				<ul>
					{$feeds_html}
				</ul>
			</div>
HTML;

		return $html;
	}

	public function sidebar() {
		$html = "";

		if ($this->user) {
			$tribunes = Tribune::select(['user_id' => $this->user->id, 'deleted' => '0']);
			$tribunes_list = [];
			foreach ($tribunes as $tribune) {
				$tribunes_list[] = '<li><a href="/'.$tribune->url().'">'.$tribune->title.'</a> <a class="configure" href="/'.$tribune->url().'/edit">configure</a></li>';
			}

			$tribunes_html = implode('', $tribunes_list);
			$html .= <<<HTML
				<div id="user-tribunes">
					<h2>Your tribunes</h2>
					<ul>
						{$tribunes_html}
						<li><a class="new" href="/{$this->user->home_url()}/+">New tribune</a></li>
					</ul>
				</div>
HTML;

			$feeds = Feed::select(['user_id' => $this->user->id]);
			$feeds_list = [];
			foreach ($feeds as $feed) {
				$feeds_list[] = '<li><a href="/'.$feed->url().'">'.$feed->title.'</a> <a class="configure" href="/'.$feed->url().'/edit">configure</a></li>';
			}

			$feeds_html = implode('', $feeds_list);
			$html .= <<<HTML
				<div id="user-feeds">
					<h2>Your feeds</h2>
					<ul>
						{$feeds_html}
						<li><a class="new" href="/{$this->user->home_url()}/new-feed">New feed</a></li>
					</ul>
				</div>
HTML;
		}

		if (!isset($_SESSION['anonymous_tribunes'])) {
			$_SESSION['anonymous_tribunes'] = [];
		}
		$tribunes_list = [];
		foreach ($_SESSION['anonymous_tribunes'] as $id => $tribune) {
			if ($tribune->load_from_base60($tribune->id_base60())) {
				$tribunes_list[] = '<li><a href="/'.$tribune->url().'">'.$tribune->title.'</a></li>';
			} else {
				unset($_SESSION['anonymous_tribunes'][$id]);
			}
		}

		$tribunes_html = implode('', $tribunes_list);
		$html .= <<<HTML
			<div id="anonymous-tribunes">
				<h2><a href="/:mine">Anonymous tribunes</a></h2>
				<ul>
					{$tribunes_html}
					<li><a class="new" href="/+">New anonymous tribune</a></li>
				</ul>
			</div>
HTML;


		return $html;
	}

	public function topbar() {
		$html = <<<HTML
			<h1 id="title"><a href="/">Miaoli<small>.im</small></a></h1>
			{$this->form_search()}
			{$this->usermenu()}
HTML;

		return $html;
	}

	public function usermenu() {
		$html = '<div id="usermenu">';
		if (!$this->user) {
			$html .= <<<HTML
				<a href="/login">Log in</a>
				<a href="/register">Register</a>
HTML;
		} else {
			$html .= <<<HTML
				<a href="/logout">Log out</a>
HTML;
		}
		$html .= '</div>';

		return $html;
	}

	public function form_search() {
		$search = new HTML_Input('field-search');
		$search->name = 'q';
		$search->type = 'search';
		$search->value = $_REQUEST['q'] ?? '';
		$search->attributes['placeholder'] = 'Find a tribune';

		return <<<HTML
			<form id="search" method="POST" action="/search">
				{$search->html()}
			</form>
HTML;
	}

	public function form_userregister($username_value = '', $email_value = '') {
		$form_error = $GLOBALS['form_errors']['form'] ?? '';

		$username = new HTML_Input('field-username');
		$username->name = 'username';
		$username->value = $username_value;

		$password1 = new HTML_Input('field-password1');
		$password1->name = 'password1';
		$password1->type = 'password';

		$password2 = new HTML_Input('field-password2');
		$password2->name = 'password2';
		$password2->type = 'password';

		$email = new HTML_Input('field-email');
		$email->name = 'email';
		$email->type = 'email';
		
		return <<<HTML
			<form id="userregister" method="POST" action="/register">
				<p>{$username->html("Username")}</p>
				<p>{$password1->html("Password")}</p>
				<p>{$password2->html("Verify password")}</p>
				<p>{$email->html("Email (optional)")}</p>
				<p><button type="submit">Register</button><span class="error">{$form_error}</span></p>
			</form>
HTML;
	}

	public function form_userlogin($username_value = '') {
		$form_error = $GLOBALS['form_errors']['form'] ?? '';

		$username = new HTML_Input('field-username');
		$username->name = 'username';
		$username->value = $username_value;

		$password = new HTML_Input('field-password');
		$password->name = 'password';
		$password->type = 'password';

		
		return <<<HTML
			<form id="userregister" method="POST" action="/login">
				<p>{$username->html("Username")}</p>
				<p>{$password->html("Password")}</p>
				<p><button type="submit">Login</button><span class="error">{$form_error}</span></p>
			</form>
HTML;
	}
}
