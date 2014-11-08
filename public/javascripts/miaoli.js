// vim: et ts=2 sw=2
var input_get_selection_range = function(input) {
  if (input.setSelectionRange) {
    return [input.selectionStart, input.selectionEnd];
  } else if (input.createTextRange) {
    var range = document.selection.createRange();

    if (range.parentElement() == input) {
      var range2 = input.createTextRange();
      range2.collapse(true);
      range2.setEndPoint('EndToEnd', range);
      return [range2.text.length - range.text.length, range2.text.length];
    }
  }

  return [input.value.length, input.value.length];
};

var input_set_selection_range = function(input, start, end) {
  if (input.setSelectionRange) {
    input.setSelectionRange(start, end);
  } else if (input.createTextRange) {
    var range = input.createTextRange();
    range.collapse(true);
    range.moveStart('character', start);
    range.moveEnd('character', end - start);
    range.select();
  }
};


function Tribune(dom) {
  this.dom = dom;
  this.dom.classList.add('js-enabled');

  this.postsList = dom.querySelector('.posts');

  this.id = dom.dataset.tribuneId;
  this.max_posts = +dom.dataset.maxPosts;

  this.setup_inputs();
  this.setup_events();
}

// This isn't perfect.
Tribune.prototype.insert_post = function(post) {
  var container = document.createElement('ol');
  container.innerHTML = post;
  var post = container.firstChild;
  this.postsList.appendChild(post);
  this.setup_events([post]);

  if (this.postsList.children.length > this.max_posts) {
    var a = this.postsList.removeChild(this.postsList.children[0]);
  }
};

Tribune.prototype.setup_inputs = function() {
  var self = this;

  var inputs = this.dom.querySelectorAll('input.message-input');
  for (var i = 0; i < inputs.length; i++) {
    // There should only be one, but just in case.
    var input = inputs.item(i);

    var div = document.createElement('div');
    div.contentEditable = true;
    div.className = 'message';
    this.message_div = div;

    var puli = new Puli(div);
    puli.onsubmit = function(text) {
        self.post(text, tribune.nickname(), 'Anonymous');
    };

    div.ownerDocument.querySelector('form').onsubmit = function(e) {
      e.preventDefault();
      tribune.post(puli.text(), tribune.nickname(), 'Anonymous');
      puli.clear();
    };

    input.parentNode.replaceChild(div, input);
  }
};

Tribune.prototype.setup_events = function(elements) {
  if (undefined == elements) {
    elements = this.dom.querySelectorAll('li');
  }

  for (var i = 0; i < elements.length, post = elements[i]; i++) {
    post.querySelector('.time').onmousedown = (function(tribune) {return function(e) {
      e.preventDefault();
      // the mousedown event is fired before focus has changed
      tribune.insert_reference(this);
    }})(this);

    var references = post.querySelectorAll('.reference');
    for (var j = 0; j < references.length, reference = references[j]; j++) {
      reference.onmouseover = (function(tribune) {return function() {
        tribune.mouse_over(this);
      }})(this);
      reference.onmouseout = (function(tribune) {return function() {
        tribune.reset_highlight();
      }})(this);
    }

    var totozes = post.querySelectorAll('.totoz');
    for (var j = 0; j < references.length, totoz = totozes[j]; j++) {
      var img = document.createElement('img');
      var totoz_name = totoz.innerHTML.substr(2, totoz.innerHTML.length - 3);
      img.src = 'https://totoz.eu/img/' + totoz_name;
      totoz.appendChild(img);
    }
  }
};

Tribune.prototype.nickname = function() {
  return this.dom.querySelector('form').nickname.value;
};

Tribune.prototype.post = function(message, nickname, info) {
  if (message.length > 0) {
    socket.emit('post', {
      tribune: this.id,
      message: message,
      info: 'Anonymous',
      nick: nickname
    });
  }
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
    for (var i = 0; i < found.length, post = found[i]; i++) {
      post.classList.add('highlighted');
    }
  }
}

Tribune.prototype.reset_highlight = function() {
  var highlighted = this.dom.querySelectorAll('.highlighted');
  for (var i = 0; i < highlighted.length, element = highlighted[i]; i++) {
    element.classList.remove('highlighted');
  }
};

Tribune.prototype.insert_element_in_message = function(element) {
    var sel, range, html;
    if (element.ownerDocument.getSelection) {
      sel = element.ownerDocument.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        range = sel.getRangeAt(0);
        range.deleteContents();
        var node = element.ownerDocument.createTextNode(" ");
        if (range.startOffset > 0) {
          range.insertNode(node);
          range.setStartAfter(node);
          range.setEndAfter(node);
        }
        range.insertNode(element);
        range = range.cloneRange();
        range.setStartAfter(element);
        range.setEndAfter(element);
        node = element.ownerDocument.createTextNode(" ");
        range.insertNode(node);
        range.setStartAfter(node);
        range.setEndAfter(node);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else if (element.ownerDocument.selection && element.ownerDocument.selection.createRange) {
      element.ownerDocument.selection.createRange().text = element.innerText;
    }
  }


Tribune.prototype.insert_reference = function(clock) {
  var element = this.message_div.ownerDocument.createElement('span');
  element.className = 'clock-reference';
  element.innerHTML = clock.textContent;

  if (document.activeElement != this.message_div) {
    this.message_div.focus();
  }

  this.insert_element_in_message(element);
};

Tribune.prototype.new_post = function(post) {
  this.insert_post(post);
};

var element = document.querySelector('.tribune');

if (element) {
  var tribune = new Tribune(element);
  var socket = io.connect();
  socket.emit('join', tribune.id);

  socket.on('new-post', function(data) {
    if (data.tribune == tribune.id){
      tribune.new_post(data.post);
    }
  });
}
