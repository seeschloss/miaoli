<?php

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
			$html .= $name.'="'.$value.'" ';
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
			$html .= $name.'="'.$value.'" ';
		}

		$html .= '>'.$this->value.'</textarea>';
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
						$attributes[] = "$k='$v'";
					} else if ($k === 'style') {
						$attributes[] = "$k='$v'";
					}
				}
			}

			$attributes = implode(' ', $attributes);

			return '<option value="'.$key.'" '.$selected.' '.$attributes.'>'.$title.'</option>';
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

