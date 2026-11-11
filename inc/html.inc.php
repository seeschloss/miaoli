<?php

function avatar_initial($name) {
	$name = trim((string)$name);
	return $name ? mb_strtoupper(mb_substr($name, 0, 1)) : '?';
}

function icon($name, $class = '') {
	$paths = [
		'plus' => '<path d="M12 5v14M5 12h14"/>',
		'search' => '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
		'send' => '<path d="m4 11 15-6.5-4.5 15-3.2-5.8L4 11Z"/><path d="m11.3 13.7 3.2-3.2"/>',
		'settings' => '<path d="M4 7h8M16 7h4M4 17h4M12 17h8"/><circle cx="14" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
		'menu' => '<path d="M4 7h16M4 12h16M4 17h16"/>',
		'close' => '<path d="m6 6 12 12M18 6 6 18"/>',
		'sun' => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
		'moon' => '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
		'link' => '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
		'arrow-right' => '<path d="M5 12h14M13 6l6 6-6 6"/>',
		'arrow-down' => '<path d="M12 5v14M6 13l6 6 6-6"/>',
		'logout' => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
		'user' => '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
		'message' => '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
		'feed' => '<path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.4"/>',
		'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		'spark' => '<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6Z"/>',
		'copy' => '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
		'check' => '<path d="m5 12 4.5 4.5L19 7"/>',
		'external' => '<path d="M14 4h6v6M20 4 11 13"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
	];

	if (!isset($paths[$name])) {
		return '';
	}

	$class = trim('icon '.$class);

	return '<svg class="'.$class.'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'.$paths[$name].'</svg>';
}

class HTML_Input {
	public $id = "";
	public $name = "";
	public $type = "text";
	public $value = "";

	public $attributes = [];

	public function __construct($id) {
		$this->id = $id;
	}

	public function error($message) {
		return '<span class="error">'.$message.'</span>';
	}

	public function label($label) {
		return '<label for="'.$this->id.'">'.$label.'</label>';
	}

	public function element() {
		$html = '<input ';

		$attributes = $this->attributes;

		$attributes['id'] = $this->id;
		$attributes['name'] = $this->name;
		$attributes['type'] = $this->type;
		$attributes['value'] = $this->value;

		foreach ($attributes as $name => $value) {
			$html .= $name.'="'.htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8').'" ';
		}

		$html .= '/>';
		return $html;
	}

	public function html($label = '') {
		$html = '';

		if ($label) {
			$html .= $this->label($label);
		}

		$html .= $this->element();

		if (!empty($GLOBALS['form_errors'][$this->name])) {
			$html .= $this->error($GLOBALS['form_errors'][$this->name]);
		}

		return $html;
	}
}

class HTML_Input_Color extends Html_Input {
	public $type = "color";
}

class HTML_Textarea {
	public $id = "";
	public $name = "";
	public $value = "";

	public $attributes = [];

	public function __construct($id) {
		$this->id = $id;
	}

	public function error($message) {
		return '<span class="error">'.$message.'</span>';
	}

	public function label($label) {
		return '<label for="'.$this->id.'">'.$label.'</label>';
	}

	public function element() {
		$html = '<textarea ';

		$attributes = $this->attributes;

		$attributes['id'] = $this->id;
		$attributes['name'] = $this->name;

		foreach ($attributes as $name => $value) {
			$html .= $name.'="'.htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8').'" ';
		}

		$html .= '>'.htmlspecialchars((string)$this->value, ENT_QUOTES, 'UTF-8').'</textarea>';
		return $html;
	}

	public function html($label = '') {
		$html = '';

		if ($label) {
			$html .= $this->label($label);
		}

		$html .= $this->element();

		if (!empty($GLOBALS['form_errors'][$this->name])) {
			$html .= $this->error($GLOBALS['form_errors'][$this->name]);
		}

		return $html;
	}
}

class HTML_Select {
	public $id = "";
	public $name = "";
	public $options = [];
	public $selected = "";

	public $attributes = [];

	public function __construct($id) {
		$this->id = $id;
	}

	public function error($message) {
		return '<span class="error">'.$message.'</span>';
	}

	public function label($label) {
		return '<label for="'.$this->id.'">'.$label.'</label>';
	}

	public function options() {
		$elements = array_map(function($key, $value) {
			$selected = '';
			if ($key == $this->selected) {
				$selected = ' selected="selected"';
			} else if (is_array($this->selected) and array_search($key, $this->selected) !== FALSE) {
				$selected = ' selected="selected"';
			}

			$attributes = [];

			if (!is_array($value)) {
				$title = $value;
			} else {
				$title = $value['title'];

				foreach ($value as $k => $v) {
					if (strpos($k, 'data-') === 0) {
						$attributes[] = $k.'="'.htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8').'"';
					} else if ($k === 'style') {
						$attributes[] = $k.'="'.htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8').'"';
					}
				}
			}

			$attributes = implode(' ', $attributes);

			return '<option value="'.htmlspecialchars((string)$key, ENT_QUOTES, 'UTF-8').'" '.$selected.' '.$attributes.'>'.htmlspecialchars((string)$title, ENT_QUOTES, 'UTF-8').'</option>';
		}, array_keys($this->options), $this->options);

		return implode('', $elements);
	}

	public function element() {
		$html = '<select ';

		$attributes = $this->attributes;

		$attributes['id'] = $this->id;
		$attributes['name'] = $this->name;

		foreach ($attributes as $name => $value) {
			$html .= $name.'="'.$value.'" ';
		}

		$html .= '>';

		$html .= $this->options();

		$html .= '</select>';
		return $html;
	}

	public function html($label = '') {
		$html = '';

		if ($label) {
			$html .= $this->label($label);
		}

		$html .= $this->element();

		if (!empty($GLOBALS['form_errors'][$this->name])) {
			$html .= $this->error($GLOBALS['form_errors'][$this->name]);
		}

		return $html;
	}
}

