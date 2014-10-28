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

Tribune.prototype.setup_contenteditable = function(div) {
  var tribune = this;

  var events = {
    keydown: function(e) {
      this.beforeKeyDown = this.innerHTML;
      // Enter doesn't seem to work with Firefox
      // here so we're doing it on the keypress
      // event
      var code = e.which;
      if (e.altKey) switch (code) {
        case 66: // b
          e.preventDefault();
          tribune.wrap_selection_with_tag('b');
          break;
        case 73: // i
          e.preventDefault();
          tribune.wrap_selection_with_tag('i');
          break;
        case 83: // s
          e.preventDefault();
          tribune.wrap_selection_with_tag('s');
          break;
        case 85: // u
          e.preventDefault();
          tribune.wrap_selection_with_tag('u');
          break;
        default:
          break;
      }
    },
    keyup: function(e) {
      // Doesn't seem to work with Firefox
      // so the behaviour is replicated on
      // the input event.
      if (this.beforeKeyDown != this.innerHTML) {
        var html = this.innerHTML;
        var sel = tribune.saveSelection(this);
        this.innerHTML = sanitize(html);
        tribune.restoreSelection(this, sel);
      }
    },
    keypress: function(e) {
      // Prevents enter from inserting any
      // <br>
      var code = e.which;
      switch (code) {
        case 13: // enter
          e.preventDefault();
          var message = sanitize(this.innerHTML, false);
          tribune.post(message, tribune.nickname(), 'Anonymous');
          this.innerHTML = "";
          break;
      }
    },
    input: function(e) {
      // Passes the text to the sanitizing
      // function, while trying to keep an
      // eye on the selection.
      if (!e.isComposing) {
        var html = this.innerHTML;
        var sel = tribune.saveSelection(this);
        this.innerHTML = sanitize(html);
        tribune.restoreSelection(this, sel);
      }
    },
  };

  var sanitize = function(html, keep_tags) {
    if (keep_tags === undefined) { keep_tags = true; }

    html = html.replace(/&nbsp;/g, ' ');
    html = html.replace(/  /g, '  ');

    html = html.replace(/<[^>]*>/g, '');

    if (keep_tags) {
      var callback = function(match, tag, attributes, text) {
        if (tag == 'span') {
          return text;
        } else {
          text = text.replace(/&lt;(m|s|u|b|i|tt|code|span)([^&]*)&gt;(.*?)&lt;\/\1&gt;/g, callback);
          return '<span class="tag">&lt;' + tag + '&gt;</span><' + tag + '>' + text + '</' + tag + '><span class="tag">&lt;/' + tag + '&gt;</span>';
        }
      };

      html = html.replace(/&lt;(m|s|u|b|i|tt|code|span)([^&]*)&gt;(.*?)&lt;\/\1&gt;/g, callback);
      html = html.replace(/\032/g, '<');
      html = html.replace(/\033/g, '>');
      html = html.replace(/ $/g, ' ');

      html = html.replace(
        //  |--------------------------------$1------------------------------|
        //  ||-----------------------------$2------------------------------| | |---------------------------------------------$11---------------------------------------------|
        //  ||           |--------$4-------| |--------------$7------------|| | ||---------$12---------|             |-----$16-----|                                          |
        //  |||---$3---| ||--$5--| |--$6--|| ||--$8--| |----$9---| |-$10-||| | |||---$13----| |-$14--|| |----$15---|| |---$17----|| |---------$18----------| |-----$19-----| |
           /((([0-9]{4})-((0[1-9])|(1[0-2]))-((0[1-9])|([12][0-9])|(3[01])))#)?((([01]?[0-9])|(2[0-3])):([0-5][0-9])(:([0-5][0-9]))?([:\^][0-9]|[¹²³⁴⁵⁶⁷⁸⁹])?(@[0-9A-Za-z]+)?)/g
         , "<span class='clock-reference' data-timestamp='$3$4$7$12$15$17$18'>\$1\$11</span>"
      );

      html = html.replace(/((https?|ftp|gopher|file|mms|rtsp|rtmp):\/\/[^ ]*?)((,|\.|\)|\]|\})?(<| | |"|$))/g,
        function(match, url, protocol, cruft, punctuation, after) {
          var string = '<span class="url">' + url + '</span>';
          if (undefined != punctuation) {
            string += punctuation;
          }
          if (undefined != after) {
            string += after;
          }
          return string;
        }
      );

      html = html.replace(/\[:([^\]\/]+)\]/g, '<span class="totoz">[:\$1]</span>');
    } else {
      html = html.replace(/&lt;/g,  '<');
      html = html.replace(/&gt;/g,  '>');
      html = html.replace(/&amp;/g, '&');
    }

    return html;
  };

  div.onkeydown = events.keydown;
  div.onkeyup = events.keyup;
  div.onkeypress = events.keypress;
  div.oninput = events.input;
  div.onblur = events.blur;

  this.dom.querySelector('form').onsubmit = function(e) {
    e.preventDefault();
    var message = sanitize(div.innerHTML, false);
    tribune.post(message, tribune.nickname(), 'Anonymous');
    div.innerHTML = "";
    return false;
  };
};

Tribune.prototype.setup_inputs = function() {
  var inputs = this.dom.querySelectorAll('input.message-input');
  for (var i = 0; i < inputs.length; i++) {
    // There should only be one, but just in case.
    var input = inputs.item(i);

    var div = document.createElement('div');
    div.contentEditable = true;
    div.className = 'message';
    this.message_div = div;

    this.setup_contenteditable(div);

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

Tribune.prototype.wrap_selection_with_tag = function(tag) {
  var selection;
  var elements = [];
  var ranges = [];
  var rangeCount = 0;
  var frag;
  var lastChild;
  if (window.getSelection && document.activeElement == this.message_div) {
    selection = window.getSelection();
    if (selection.rangeCount) {
      var i = selection.rangeCount;
      while (i--) {
        ranges[i] = selection.getRangeAt(i).cloneRange();
        elements[i] = document.createElement(tag);
        var contents = ranges[i].extractContents();
        contents.textContent = '<' + tag + '>' + contents.textContent + '</' + tag + '>';
        elements[i].appendChild(contents);
        ranges[i].insertNode(elements[i]);
        ranges[i].selectNode(elements[i]);
      }

      // Restore ranges
      selection.removeAllRanges();
      i = ranges.length;
      while (i--) {
        selection.addRange(ranges[i]);
      }
    }
  }
}

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

if (window.getSelection && document.createRange) {
  Tribune.prototype.saveSelection = function(containerEl) {
    var sel = containerEl.ownerDocument.getSelection();
    if (sel.type == 'None') {
      return {
        start: 0,
        end: 0
      };
    }

    var range = containerEl.ownerDocument.getSelection().getRangeAt(0);
    var preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(containerEl);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    var start = preSelectionRange.toString().length;

    return {
      start: start,
      end: start + range.toString().length
    };
  };

  Tribune.prototype.restoreSelection = function(containerEl, savedSel) {
    var charIndex = 0, range = containerEl.ownerDocument.createRange();
    range.setStart(containerEl, 0);
    range.collapse(true);
    var nodeStack = [containerEl], node, foundStart = false, stop = false;

    while (!stop && (node = nodeStack.pop())) {
      if (node.nodeType == 3) {
        var nextCharIndex = charIndex + node.length;
        if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
          range.setStart(node, savedSel.start - charIndex);
          foundStart = true;
        }
        if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
          range.setEnd(node, savedSel.end - charIndex);
          stop = true;
        }
        charIndex = nextCharIndex;
      } else {
        var i = node.childNodes.length;
        while (i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    var sel = containerEl.ownerDocument.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
} else if (document.selection) {
  Tribune.prototype.saveSelection = function(containerEl) {
    var selectedTextRange = containerEl.ownerDocument.selection.createRange();
    var preSelectionTextRange = containerEl.ownerDocument.body.createTextRange();
    preSelectionTextRange.moveToElementText(containerEl);
    preSelectionTextRange.setEndPoint("EndToStart", selectedTextRange);
    var start = preSelectionTextRange.text.length;

    return {
      start: start,
      end: start + selectedTextRange.text.length
    }
  };

  Tribune.prototype.restoreSelection = function(containerEl, savedSel) {
    var textRange = containerEl.ownerDocument.body.createTextRange();
    textRange.moveToElementText(containerEl);
    textRange.collapse(true);
    textRange.moveEnd("character", savedSel.end);
    textRange.moveStart("character", savedSel.start);
    textRange.select();
  };
}

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
