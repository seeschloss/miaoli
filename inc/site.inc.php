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

	private function e($text) {
		return htmlspecialchars((string)$text, ENT_QUOTES, 'UTF-8');
	}

	private function is_current($url) {
		$path = strtok($_SERVER['REQUEST_URI'] ?? '/', '?');
		return $path === '/'.$url or strpos($path, '/'.$url.'/') === 0;
	}

	public function homepage() {
		$start_url = $this->user ? '/'.$this->user->home_url().'/+' : '/+';
		$hero_note = $this->user ? '' : 'No account needed.';
		$featured = $this->featured_tribunes();

		return <<<HTML
			<div class="home">
				<section class="hero">
					<h1>Miaoli</h1>
					<div class="hero-actions">
						<a class="button primary" href="{$start_url}">{$this->icon('plus')}<span>Start a tribune</span></a>
						<a class="button ghost" href="#featured">{$this->icon('spark')}<span>Feeds</span></a>
					</div>
					<p class="hero-note">{$hero_note}</p>
				</section>

				<section class="home-section" id="featured">
					<div class="section-head">
						<h2>Feeds</h2>
					</div>
					{$featured}
				</section>
			</div>
HTML;
	}

	private function icon($name) {
		return icon($name);
	}

	public function featured_tribunes() {
		$feeds = Feed::select();

		if (!count($feeds)) {
			return <<<HTML
				<div class="empty-state">
					<span class="empty-icon">{$this->icon('feed')}</span>
					<p>No feeds yet.</p>
				</div>
HTML;
		}

		$cards = [];
		foreach ($feeds as $feed) {
			$count = is_array($feed->tribune_ids) ? count($feed->tribune_ids) : 0;
			$description = $feed->description ? '<span class="space-card-desc">'.$this->e($feed->description).'</span>' : '';

			$cards[] = <<<HTML
				<a class="space-card" href="/{$feed->url()}">
					<span class="space-card-icon">{$this->icon('feed')}</span>
					<span class="space-card-body">
						<span class="space-card-title">{$this->e($feed->title)}</span>
						{$description}
						<span class="space-card-meta">{$count} tribune{$this->plural($count)}</span>
					</span>
					<span class="space-card-arrow">{$this->icon('arrow-right')}</span>
				</a>
HTML;
		}

		return '<div class="card-grid">'.implode('', $cards).'</div>';
	}

	private function plural($count) {
		return $count == 1 ? '' : 's';
	}

	public function sidebar() {
		$create_url = $this->user ? '/'.$this->user->home_url().'/+' : '/+';
		$html = '<div class="sidebar-inner">';
		$html .= '<a class="button primary new-tribune" href="'.$create_url.'">'.$this->icon('plus').'<span>New tribune</span></a>';

		if ($this->user) {
			$tribunes = Tribune::select(['user_id' => $this->user->id, 'deleted' => '0']);
			$html .= $this->sidebar_section('Your tribunes', $this->tribune_items($tribunes, true), '');

			$feeds = Feed::select(['user_id' => $this->user->id]);
			$new_feed = '<a class="sidebar-action" href="/'.$this->user->home_url().'/new-feed">New</a>';
			$html .= $this->sidebar_section('Your feeds', $this->feed_items($feeds), $new_feed);
		}

		if (!isset($_SESSION['anonymous_tribunes'])) {
			$_SESSION['anonymous_tribunes'] = [];
		}

		$anonymous = [];
		foreach ($_SESSION['anonymous_tribunes'] as $id => $tribune) {
			if ($tribune->load_from_base60($tribune->id_base60())) {
				$anonymous[] = $tribune;
			} else {
				unset($_SESSION['anonymous_tribunes'][$id]);
			}
		}

		if (count($anonymous) or !$this->user) {
			$action = count($anonymous) ? '<a class="sidebar-action" href="/:mine">View all</a>' : '';
			$html .= $this->sidebar_section('Anonymous tribunes', $this->tribune_items($anonymous, true), $action);
		}

		$html .= '</div>';

		$html .= '<div class="sidebar-footer">';
		if ($this->user) {
			$html .= '<span class="footer-user">'.$this->icon('user').'<span>'.$this->e($this->user->username).'</span></span>';
			$html .= '<a href="/logout">Log out</a>';
		} else {
			$html .= '<a href="/login">Log in</a>';
			$html .= '<a href="/register">Create an account</a>';
		}
		$html .= '</div>';

		return $html;
	}

	private function sidebar_section($title, $items, $action = '') {
		return <<<HTML
			<section class="sidebar-section">
				<div class="sidebar-heading">
					<h2>{$title}</h2>
					{$action}
				</div>
				<ul class="space-list">
					{$items}
				</ul>
			</section>
HTML;
	}

	private function tribune_items($tribunes, $can_edit = false) {
		if (!count($tribunes)) {
			return '<li class="space-empty">Nothing here yet.</li>';
		}

		$items = [];
		foreach ($tribunes as $tribune) {
			$title = $this->e($tribune->title ?: 'Untitled tribune');
			$href = '/'.$tribune->url();
			$active = $this->is_current($tribune->url()) ? ' is-active' : '';
			$edit = '';
			if ($can_edit) {
				$edit = '<a class="space-edit" href="'.$href.'/edit" title="Settings for '.$title.'" aria-label="Settings for '.$title.'">'.$this->icon('settings').'</a>';
			}

			$items[] = <<<HTML
				<li class="space-item{$active}">
					<a class="space-link" href="{$href}">
						<span class="space-dot" style="--space-color: {$this->e($tribune->color)}"></span>
						<span class="space-name">{$title}</span>
					</a>
					{$edit}
				</li>
HTML;
		}

		return implode('', $items);
	}

	private function feed_items($feeds) {
		if (!count($feeds)) {
			return '<li class="space-empty">No feeds yet.</li>';
		}

		$items = [];
		foreach ($feeds as $feed) {
			$title = $this->e($feed->title ?: 'Untitled feed');
			$href = '/'.$feed->url();
			$active = $this->is_current($feed->url()) ? ' is-active' : '';
			$items[] = <<<HTML
				<li class="space-item{$active}">
					<a class="space-link" href="{$href}">
						<span class="space-icon">{$this->icon('feed')}</span>
						<span class="space-name">{$title}</span>
					</a>
					<a class="space-edit" href="{$href}/edit" title="Settings for {$title}" aria-label="Settings for {$title}">{$this->icon('settings')}</a>
				</li>
HTML;
		}

		return implode('', $items);
	}

	public function topbar() {
		$html = '<button type="button" class="icon-button sidebar-toggle" id="sidebar-toggle" aria-controls="sidebar" aria-expanded="false" aria-label="Open navigation">'.$this->icon('menu').'</button>';
		$html .= '<a class="brand" href="/" aria-label="Miaoli home"><span class="brand-mark" aria-hidden="true"><img src="/miaoli.svg" /></span><span class="brand-word">miaoli<small>.im</small></span></a>';
		$html .= $this->form_search();
		$html .= $this->usermenu();

		return $html;
	}

	public function usermenu() {
		$html = '<div id="usermenu" class="user-menu">';

		$html .= '<button type="button" class="icon-button theme-toggle" data-theme-toggle aria-label="Switch theme" title="Switch theme">';
		$html .= '<span class="theme-icon theme-icon-light">'.$this->icon('sun').'</span>';
		$html .= '<span class="theme-icon theme-icon-dark">'.$this->icon('moon').'</span>';
		$html .= '</button>';

		if (!$this->user) {
			$html .= '<a class="button ghost compact login-link" href="/login">Log in</a>';
			$html .= '<a class="button primary compact register-link" href="/register">Register</a>';
		} else {
			$initial = avatar_initial($this->user->username);
			$html .= '<a class="user-chip" href="/'.$this->user->home_url().'" title="'.$this->e($this->user->username).'">';
			$html .= '<span class="avatar user-avatar">'.$initial.'</span>';
			$html .= '<span class="user-name">'.$this->e($this->user->username).'</span>';
			$html .= '</a>';
			$html .= '<a class="icon-button logout-link" href="/logout" title="Log out" aria-label="Log out">'.$this->icon('logout').'</a>';
		}

		$html .= '</div>';

		return $html;
	}

	public function form_search() {
		$search = new HTML_Input('field-search');
		$search->name = 'q';
		$search->type = 'search';
		$search->value = $_REQUEST['q'] ?? '';
		$search->attributes['placeholder'] = 'Search tribunes and feeds';
		$search->attributes['aria-label'] = 'Search tribunes and feeds';
		$search->attributes['autocomplete'] = 'off';

		return <<<HTML
			<form id="search" class="search" role="search" method="POST" action="/search">
				<span class="search-icon">{$this->icon('search')}</span>
				{$search->html()}
			</form>
HTML;
	}

	public function form_userregister($username_value = '', $email_value = '') {
		$form_error = $GLOBALS['form_errors']['form'] ?? '';

		$username = new HTML_Input('field-username');
		$username->name = 'username';
		$username->value = $username_value;
		$username->attributes['autocomplete'] = 'username';
		$username->attributes['autofocus'] = 'autofocus';

		$password1 = new HTML_Input('field-password1');
		$password1->name = 'password1';
		$password1->type = 'password';
		$password1->attributes['autocomplete'] = 'new-password';

		$password2 = new HTML_Input('field-password2');
		$password2->name = 'password2';
		$password2->type = 'password';
		$password2->attributes['autocomplete'] = 'new-password';

		$email = new HTML_Input('field-email');
		$email->name = 'email';
		$email->type = 'email';
		$email->attributes['autocomplete'] = 'email';

		return <<<HTML
			<div class="form-page">
				<form id="userregister" class="form-card" method="POST" action="/register">
					<h1>Create an account</h1>
					<p class="form-intro">Keep your tribunes across devices.</p>
					<div class="field">{$username->html("Username")}</div>
					<div class="field">{$password1->html("Password")}</div>
					<div class="field">{$password2->html("Verify password")}</div>
					<div class="field">{$email->html("Email <span class=\"optional\">optional</span>")}</div>
					<p class="form-error">{$form_error}</p>
					<button class="button primary full" type="submit">Create account</button>
					<p class="form-alt">Have an account? <a href="/login">Log in</a></p>
				</form>
			</div>
HTML;
	}

	public function form_userlogin($username_value = '') {
		$form_error = $GLOBALS['form_errors']['form'] ?? '';

		$username = new HTML_Input('field-username');
		$username->name = 'username';
		$username->value = $username_value;
		$username->attributes['autocomplete'] = 'username';
		$username->attributes['autofocus'] = 'autofocus';

		$password = new HTML_Input('field-password');
		$password->name = 'password';
		$password->type = 'password';
		$password->attributes['autocomplete'] = 'current-password';

		return <<<HTML
			<div class="form-page">
				<form id="userlogin" class="form-card" method="POST" action="/login">
					<h1>Log in</h1>
					<div class="field">{$username->html("Username")}</div>
					<div class="field">{$password->html("Password")}</div>
					<p class="form-error">{$form_error}</p>
					<button class="button primary full" type="submit">Log in</button>
					<p class="form-alt">Need an account? <a href="/register">Create one</a></p>
				</form>
			</div>
HTML;
	}
}
