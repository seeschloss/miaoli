<?php

class Board {
	private $tribunes = [];
	private $url = "";

	private $max_posts = 80;

	function __construct($tribunes, $url) {
		$this->tribunes = $tribunes;
		$this->url = $url;
	}

	function tribune_ids() {
		$tribune_ids = [];

		foreach ($this->tribunes as $tribune) {
			$tribune_ids[] = (int)$tribune->id;
		}

		return $tribune_ids;
	}

	function latest_posts() {
		$posts = Post::select(['tribune_id IN ('.implode(',', $this->tribune_ids()).')'], 'timestamp DESC, post_id DESC', $this->max_posts);
		$posts = array_reverse($posts);

		return $posts;
	}

	function css() {
		$css = "";
		foreach ($this->tribunes as $tribune) {
			$color = new RGB($tribune->color);
			$css .= <<<CSS
				.feed li.tribune-{$tribune->id} {
					background-color: {$color->to_css(0.2)};
				}
CSS;
		}

		return $css;
	}

	function show() {
		$html = "<style>".$this->css()."</style>";
		$html .= "<div class='feed tribune' data-max-posts='{$this->max_posts}' data-reload-url='/{$this->url}'>";

		if (count($this->tribunes) == 1) {
			$html .= "<h1>{$this->tribunes[0]->link_with_configure()}</h1>";
		}

		$html .= "<div class='pinnipede'><ol>";
		foreach ($this->latest_posts() as $post) {
			$html .= $post->html();
		}
		$html .= "</ol></div>";

		$html .= $this->form_post();
		$html .= "</div>";

		return $html;
	}

	function tsv() {
		$tsv = '';

		foreach ($this->latest_posts() as $post) {
			$tsv .= $post->tsv()."\n";
		}
		
		return $tsv;
	}

	function xml() {
		$xml = "<board site=\"https://miaoli.im/{$this->url}\">\n";

		foreach (array_reverse($this->latest_posts()) as $post) {
			$xml .= $post->xml()."\n";
		}
		
		$xml .= "</board>\n";
		return $xml;
	}

	function json($posts = NULL) {
		if ($posts === NULL) {
			$posts = $this->latest_posts();
		}

		$json = ['posts' => []];
		foreach ($posts as $post) {
			$json['posts'][] = $post->json();
		}

		return json_encode($json);
	}

	function form_post() {
		$input_tribune = new HTML_Select('tribune_id');
		$input_tribune->name = "tribune_id";
		$input_tribune->options = [];
		foreach ($this->tribunes as $tribune) {
			$input_tribune->options[$tribune->id] = [
				'title' => $tribune->title,
				'data-post-url' => '/'.$tribune->url(),
				'style' => "background-color: ".$tribune->color,
			];
		}

		$post_url = $this->url;
		if (count($this->tribunes) == 1) {
			$post_url = $this->tribunes[0]->url();
			$input_tribune->attributes['class'] = "hidden";
		}

		return <<<HTML
			<form id="tribune-post" method="POST" action="/{$post_url}">
				{$input_tribune->html()}
				<input type="text" name="message" id="message-input" />
				<button type="submit">⏎</button>
			</form>
			<script type="text/javascript" src="/puli.js"></script>
			<script type="text/javascript" src="/miaoli.js"></script>
HTML;
	}
}
