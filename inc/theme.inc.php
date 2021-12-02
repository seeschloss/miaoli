<?php

class Theme {
	public $title = "Miaoli.im - threaded instant messaging";

	public $topbar = "";
	public $sidebar = "";
	public $content = "";
	public $footer = "";

	public $head = "";

	function __construct() {
	}

	function title() {
		if (strpos('Miaoli.im', $this->title) === FALSE) {
			return $this->title.' - Miaoli.im - threaded instant messaging';
		} else {
			return $this->title;
		}
	}

	function html() {
		$html = <<<HTML
<!DOCTYPE html>
<html>
	<head>
		<title>{$this->title()}</title>
		<link rel="stylesheet" href="/layout.css" />
		<link rel="stylesheet" href="/colors.css" />
		<link rel="stylesheet" href="/tribunes.css" />
		<link rel="stylesheet" href="/style.css" />
		{$this->head}
	</head>
	<body>
		<div id="topbar">{$this->topbar}</div>
		<div id="sidebar">{$this->sidebar}</div>
		<div id="content">{$this->content}</div>
	</body>
</html>
HTML;

		return $html;
	}

	function bare() {
		return $this->content;
	}

	function tribunes_list($tribunes, $class) {
		$tribunes_list = [];
		foreach ($tribunes as $tribune) {
			$tribunes_list[] = '<li><a href="/'.$tribune->url().'">'.$tribune->title.'</a></li>';
		}

		$tribunes_html = implode('', $tribunes_list);
		$html = <<<HTML
			<ul class="tribunes {$class}">
				{$tribunes_html}
			</ul>
HTML;

		return $html;
	}

	function feeds_list($feeds, $class) {
		$feeds_list = [];
		foreach ($feeds as $feed) {
			$feeds_list[] = '<li><a href="/'.$feed->url().'">'.$feed->title.'</a></li>';
		}

		$feeds_html = implode('', $feeds_list);
		$html = <<<HTML
			<ul class="feeds {$class}">
				{$feeds_html}
			</ul>
HTML;

		return $html;
	}
}

