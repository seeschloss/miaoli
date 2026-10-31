"use strict";

(function () {
	var body = document.body;

	// Sidebar collapse
	var sidebarToggle = document.getElementById('sidebar-toggle');
	if (sidebarToggle) {
		var collapsed = localStorage.getItem('sidebar-collapsed') === '1';
		if (collapsed) {
			body.classList.add('sidebar-collapsed');
			sidebarToggle.setAttribute('aria-expanded', 'false');
		}
		sidebarToggle.addEventListener('click', function () {
			body.classList.toggle('sidebar-collapsed');
			var now = body.classList.contains('sidebar-collapsed');
			localStorage.setItem('sidebar-collapsed', now ? '1' : '0');
			sidebarToggle.setAttribute('aria-expanded', now ? 'false' : 'true');
		});
	}

	// Manual theme toggle
	var themeToggle = document.getElementById('theme-toggle');
	function applyTheme(mode) {
		body.classList.remove('theme-light', 'theme-dark');
		if (mode === 'light' || mode === 'dark') {
			body.classList.add('theme-' + mode);
		}
	}
	var storedTheme = localStorage.getItem('theme');
	if (storedTheme) { applyTheme(storedTheme); }
	if (themeToggle) {
		themeToggle.addEventListener('click', function () {
			var isDark = body.classList.contains('theme-dark') ||
				(!body.classList.contains('theme-light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
			var next = isDark ? 'light' : 'dark';
			applyTheme(next);
			localStorage.setItem('theme', next);
		});
	}
})();
