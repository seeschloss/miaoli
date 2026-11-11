<?php

class Theme {
	public $title = "";

	public $topbar = "";
	public $sidebar = "";
	public $content = "";
	public $footer = "";

	public $head = "";

	function __construct() {
	}

	function title() {
		$base = "Miaoli";

		if (!$this->title) {
			return $base;
		}

		return $this->title.' · '.$base;
	}

	function html() {
		$title = htmlspecialchars($this->title(), ENT_QUOTES, 'UTF-8');
		$favicon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%230e7490'/%3E%3Cpath d='M9 22V11l7 7 7-7v11' fill='none' stroke='white' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

		return <<<HTML
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
		<title>{$title}</title>
		<meta name="description" content="A small, live discussion space." />
		<meta name="color-scheme" content="light dark" />
		<meta name="theme-color" content="#fbfaf7" />
		<link rel="icon" href="{$favicon}" />
		<script>
			(function () {
				try {
					var theme = localStorage.getItem('miaoli-theme');
					if (theme !== 'light' && theme !== 'dark') {
						theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
					}
					document.documentElement.dataset.theme = theme;
				} catch (e) {
					document.documentElement.dataset.theme = 'light';
				}
			})();
		</script>
		<link rel="stylesheet" href="/style.css" />
		{$this->head}
	</head>
	<body>
		<a class="skip-link" href="#content">Skip to content</a>
		<div class="app">
			<header id="topbar">{$this->topbar}</header>
			<aside id="sidebar" aria-label="Tribunes and feeds">{$this->sidebar}</aside>
			<button type="button" class="sidebar-backdrop" data-sidebar-close aria-label="Close navigation"></button>
			<main id="content">{$this->content}</main>
		</div>
		<script src="/ui.js" defer></script>
	</body>
</html>
HTML;
	}

	function bare() {
		return $this->content;
	}

	function tribunes_list($tribunes, $class) {
		if (!count($tribunes)) {
			return "";
		}

		$tribunes_list = [];
		foreach ($tribunes as $tribune) {
			$title = htmlspecialchars($tribune->title ?: 'Untitled tribune', ENT_QUOTES, 'UTF-8');
			$tribunes_list[] = <<<HTML
				<li class="result-item">
					<a class="space-link" href="/{$tribune->url()}">
						<span class="space-dot" style="--space-color: {$tribune->color}"></span>
						<span class="space-name">{$title}</span>
					</a>
				</li>
HTML;
		}

		$tribunes_html = implode('', $tribunes_list);
		return <<<HTML
			<ul class="result-list {$class}">
				{$tribunes_html}
			</ul>
HTML;
	}

	function feeds_list($feeds, $class) {
		if (!count($feeds)) {
			return "";
		}

		$feeds_list = [];
		foreach ($feeds as $feed) {
			$title = htmlspecialchars($feed->title ?: 'Untitled feed', ENT_QUOTES, 'UTF-8');
			$count = is_array($feed->tribune_ids) ? count($feed->tribune_ids) : 0;
			$description = $feed->description ? '<span class="result-desc">'.htmlspecialchars($feed->description, ENT_QUOTES, 'UTF-8').'</span>' : '';
			$feeds_list[] = <<<HTML
				<li class="result-item">
					<a class="space-link" href="/{$feed->url()}">
						<span class="space-icon">{$this->icon('feed')}</span>
						<span class="result-body">
							<span class="space-name">{$title}</span>
							{$description}
						</span>
						<span class="result-meta">{$count} tribune{$this->plural($count)}</span>
					</a>
				</li>
HTML;
		}

		$feeds_html = implode('', $feeds_list);
		return <<<HTML
			<ul class="result-list {$class}">
				{$feeds_html}
			</ul>
HTML;
	}

	private function icon($name) {
		return icon($name);
	}

	private function plural($count) {
		return $count == 1 ? '' : 's';
	}
}
