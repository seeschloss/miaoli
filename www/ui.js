// vim: ts=4 sw=4
"use strict";

(function () {
	var root = document.documentElement;
	var body = document.body;

	function current_theme() {
		return root.dataset.theme === 'dark' ? 'dark' : 'light';
	}

	function update_theme_buttons() {
		var label = current_theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
		document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
			button.setAttribute('aria-label', label);
			button.setAttribute('title', label);
		});
	}

	function set_theme(theme) {
		root.dataset.theme = theme;
		try {
			localStorage.setItem('miaoli-theme', theme);
		} catch (e) {
		}
		update_theme_buttons();
	}

	document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
		button.addEventListener('click', function () {
			set_theme(current_theme() === 'dark' ? 'light' : 'dark');
		});
	});
	update_theme_buttons();

	var sidebar_toggle = document.getElementById('sidebar-toggle');

	function set_navigation(open) {
		body.classList.toggle('nav-open', open);
		if (sidebar_toggle) {
			sidebar_toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		}
	}

	if (sidebar_toggle) {
		sidebar_toggle.addEventListener('click', function () {
			set_navigation(!body.classList.contains('nav-open'));
		});
	}

	document.querySelectorAll('[data-sidebar-close]').forEach(function (element) {
		element.addEventListener('click', function () {
			set_navigation(false);
		});
	});

	document.addEventListener('keydown', function (event) {
		if (event.key === 'Escape' && body.classList.contains('nav-open')) {
			set_navigation(false);
		}

		if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
			var search = document.querySelector('#search input');
			if (search) {
				event.preventDefault();
				search.focus();
			}
		}
	});

	document.querySelectorAll('#sidebar a').forEach(function (link) {
		link.addEventListener('click', function () {
			if (window.matchMedia('(max-width: 820px)').matches) {
				set_navigation(false);
			}
		});
	});

	var search_input = document.querySelector('#search input');
	if (search_input) {
		var search_placeholder = search_input.placeholder;
		var narrow_search = window.matchMedia('(max-width: 560px)');
		var update_search_placeholder = function () {
			search_input.placeholder = narrow_search.matches ? 'Search' : search_placeholder;
		};
		update_search_placeholder();
		if (narrow_search.addEventListener) {
			narrow_search.addEventListener('change', update_search_placeholder);
		}
	}

})();
