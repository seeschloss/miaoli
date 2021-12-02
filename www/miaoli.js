// vim: ts=4 sw=4
"use strict";

function Tribune(dom) {
	this.dom = dom;
	this.dom.classList.add('js-enabled');

	this.postsList = dom.querySelector('ol');

	this.id = dom.dataset.tribuneId;
	this.max_posts = +dom.dataset.maxPosts;

	this.token = dom.dataset.token;

	var select = this.dom.querySelector('select#tribune_id');
	if (select) {
		this.tribune_select = select;
	}

	this.setup_inputs();
	this.setup_events();
	this.setup_clocks();
	this.setup_timers();
	this.scroll_if_necessary();
}

Tribune.prototype.scroll_if_necessary = function() {
	this.postsList.querySelector("li:last-child").scrollIntoView();
}

// This isn't perfect.
Tribune.prototype.insert_post = function(post_html) {
	var container = document.createElement('div');
	container.innerHTML = post_html;
	var post = container.querySelector('li');
	var unique_id = post.dataset.uniqueId;

	if (this.dom.querySelectorAll('li[data-unique-id="' + unique_id + '"]').length == 0) {
		this.setup_events([post]);
		this.setup_clocks([post]);
		this.postsList.appendChild(post);

		if (this.postsList.children.length > this.max_posts) {
			var a = this.postsList.removeChild(this.postsList.children[0]);
		}
	}
};

Tribune.prototype.setup_timers = function() {
	var self = this;

	this.reload_timer = setInterval(function() {
		self.reload();
	}, 5 * 1000);
};

Tribune.prototype.setup_inputs = function() {
	var self = this;

	var input = this.dom.querySelector('input#message-input');
	var div = document.createElement('div');
	div.contentEditable = true;
	div.className = 'message';
	this.message_div = div;

	this.puli = new Puli(div);
	this.puli.onchange = function() {
		input.value = self.puli.text();
	};
	this.puli.onsubmit = function(text) {
		self.post(text);
	};
	this.puli.shortcuts[77] = {pre: '====><b> Moment ', post: '</b> <===='};

	this.puli.sanitize = function(html, keep_tags) {
		if (keep_tags === undefined) { keep_tags = true; }
		var html = Puli.prototype.sanitize(html, keep_tags);

		if (keep_tags && self.tribune_select) {
			var div = document.createElement('div');
			div.innerHTML = html;
			var tribunes = div.querySelectorAll('.tribune-name');
			var current_tribune = self.tribune_select.selectedOptions[0].textContent.replace(/ /g, '_');
			for (var j = 0, tribune; j < tribunes.length, tribune = tribunes[j]; j++) {
				if (tribune.textContent == '@' + current_tribune) {
					tribune.style.display = "none";
				}
			}

			html = div.innerHTML;
		}

		return html;
	};

	input.form.onsubmit = function(e) {
		self.post(self.puli.text());
	};

	input.type = "hidden";
	input.parentNode.insertBefore(div, input);

	if (this.tribune_select) {
		this.tribune_select.form.action = this.tribune_select.selectedOptions[0].dataset.postUrl;

		this.tribune_select.onchange = function(e) {
			self.tribune_select.form.action = self.tribune_select.selectedOptions[0].dataset.postUrl;
			var sel = self.puli.saveSelection(self.puli.div);
			self.puli.div.innerHTML = self.puli.sanitize(self.puli.text(), true);
			self.puli.restoreSelection(self.puli.div, sel);
		};
	}
};

Tribune.prototype.setup_clocks = function(elements) {
	if (undefined == elements) {
		elements = this.dom.querySelectorAll('li');
	}

	for (var i = 0, post; i < elements.length, post = elements[i]; i++) {
		var current_tribune = this.tribune_select.querySelector('[value="' + post.querySelector('span.post').dataset.tribuneId + '"]').textContent.replace(/ /g, '_');
		var tribunes = post.querySelectorAll('.tribune-name');
		for (var j = 0, tribune; j < tribunes.length, tribune = tribunes[j]; j++) {
			if (tribune.textContent == '@' + current_tribune) {
				tribune.style.display = "none";
			}
		}
	}
};

Tribune.prototype.setup_events = function(elements) {
	if (undefined == elements) {
		elements = this.dom.querySelectorAll('li');
	}

	var self = this;

	for (var i = 0, post; i < elements.length, post = elements[i]; i++) {
		post.querySelector('.time').onmousedown = function(e) {
			if (e.button == 0) {
				e.preventDefault();
				// the mousedown event is fired before focus has changed
				self.insert_reference(this);
			}
		};

		var message = post.querySelector('.message');
		message.innerHTML = message.innerHTML.replace(
		  //  |--------------------------------$1------------------------------|
		  //  ||-----------------------------$2------------------------------| | |---------------------------------------------$11---------------------------------------------|
		  //  ||           |--------$4-------| |--------------$7------------|| | ||---------$12---------|             |-----$16-----|                                          |
		  //  |||---$3---| ||--$5--| |--$6--|| ||--$8--| |----$9---| |-$10-||| | |||---$13----| |-$14--|| |----$15---|| |---$17----|| |---------$18----------| |-----$19-----| |
			 /((([0-9]{4})-((0[1-9])|(1[0-2]))-((0[1-9])|([12][0-9])|(3[01])))#)?((([01]?[0-9])|(2[0-3])):([0-5][0-9])(:([0-5][0-9]))?([:\^][0-9]|[¹²³⁴⁵⁶⁷⁸⁹])?(@[0-9A-Za-z_.-]+)?)/g
		   , "<span class='clock-reference' data-timestamp='$3$4$7$12$15$17$18' data-tribune-name='$19'>\$1\$12:\$15\$16\$18<span class='tribune-name'>\$19</span></span>"
		);

		var references = post.querySelectorAll('.clock-reference');
		for (var j = 0, reference; j < references.length, reference = references[j]; j++) {
			reference.onmouseover = function() {
				self.mouse_over(this);
			};
			reference.onmouseout = function() {
				self.reset_highlight();
			};
		}

		var totozes = post.querySelectorAll('.totoz');
		for (var j = 0, totoz; j < references.length, totoz = totozes[j]; j++) {
			var img = document.createElement('img');
			var totoz_name = totoz.innerHTML.substr(2, totoz.innerHTML.length - 3);
			img.src = 'https://totoz.eu/img/' + totoz_name;
			totoz.appendChild(img);
		}
	}
};

Tribune.prototype.nickname = function() {
	var field = this.dom.querySelector('form#tribune-post').nickname;
	if (field) {
		return field.value;
	} else {
		return null;
	}
};

Tribune.prototype.reload = function(message) {
	var self = this;

	var url = this.dom.dataset.reloadUrl;
	var req = new XMLHttpRequest();
	req.open('GET', url, true);
	req.setRequestHeader('Accept', 'application/json');
	req.send();
	req.addEventListener("load", function(e) {
		if (req.status == 200) {
			var data = JSON.parse(req.responseText);
			for (var i in data.posts) {
				self.insert_post(data.posts[i].html);
			}
		}
	});
};

Tribune.prototype.post = function(message) {
	var self = this;

	var form = this.dom.querySelector('form#tribune-post');
	var req = new XMLHttpRequest();
	var data = new FormData();
	data.append('message', message);
	req.open('POST', form.action, true);
	req.setRequestHeader('Accept', 'application/json');
	req.send(data);
	req.addEventListener("load", function(e) {
		if (req.status == 200) {
			self.puli.clear();
			var data = JSON.parse(req.responseText);
			for (var i in data.posts) {
				self.insert_post(data.posts[i].html);
			}
		}
	});
};

Tribune.prototype.mouse_over = function(reference) {
	var timestamp = reference.dataset.timestamp;
	var found = undefined;

	if (timestamp.length == 4) {
		found = this.dom.querySelectorAll('li[data-timestamp*="' + timestamp + '"]');
	} else if (timestamp.length == 6 || timestamp.length == 14) {
		found = this.dom.querySelectorAll('li[data-timestamp$="' + timestamp + '"]');
	}

	if (found && found.length > 0) {
		for (var i = 0, post; i < found.length, post = found[i]; i++) {
			post.classList.add('highlighted');
		}
	}
}

Tribune.prototype.reset_highlight = function() {
	var highlighted = this.dom.querySelectorAll('.highlighted');
	for (var i = 0, element; i < highlighted.length, element = highlighted[i]; i++) {
		element.classList.remove('highlighted');
	}
};

Tribune.prototype.insert_element_in_message = function(element) {
	this.puli.prefixSelectionWithText(element.innerText + " ");
	var sel = this.puli.saveSelection(this.puli.div);
	this.puli.div.innerHTML = this.puli.sanitize(this.puli.text(), true);
	this.puli.restoreSelection(this.puli.div, sel);
	return;
};


Tribune.prototype.insert_reference = function(clock) {
	var element = this.message_div.ownerDocument.createElement('span');
	element.className = 'clock-reference';
	element.innerHTML = clock.textContent;

	if (this.tribune_select) {
		var tribune_option = this.dom.querySelector('#tribune_id [value="' + clock.parentElement.dataset.tribuneId + '"]');
		if (tribune_option) {
			tribune_option.selected = true;
			var tribune_name = tribune_option.textContent.replace(/ /g, '_');
			element.innerHTML += '@' + tribune_name;
		}
		this.tribune_select.onchange();
	}

	if (document.activeElement != this.message_div) {
		this.message_div.focus();
	}

	this.insert_element_in_message(element);
};

var element = document.querySelector('.tribune');

if (element) {
	var tribune = new Tribune(element);
}
