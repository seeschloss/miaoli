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

  this.setup_events();
  this.setup_submit();
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

Tribune.prototype.setup_events = function(elements) {
  if (undefined == elements) {
    elements = this.dom.querySelectorAll('li');
  }

  for (var i = 0; i < elements.length, post = elements[i]; i++) {
    post.querySelector('.time').onclick = (function(tribune) {return function() {
      // "this" is the clicked element, here
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
  }
};

Tribune.prototype.setup_submit = function() {
  var id = this.id;
  this.dom.querySelector('form').onsubmit = function(e) {
    var message = this.message.value;

    if (message.length > 0) {
      socket.emit('post', {
        tribune: id,
        message: message,
        info: 'Anonymous'
      });
    }

    this.message.value = "";

    return false;
  };
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

Tribune.prototype.insert_reference = function(clock) {
  var text = clock.textContent + ' ';

  var input = this.dom.querySelector('input[name=message]');

  var range = input_get_selection_range(input);
  var original_text = input.value;

  input.focus();
  input.value = original_text.substring(0, range[0])
    + text
    + original_text.substring(range[1], original_text.length);

  input_set_selection_range(input, range[0] + text.length, range[0] + text.length);
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
