var Puli = function(div) {
	this.div = div;
	this.setup();

	this.onsubmit = function(text) {
	};

	this.onkeypress = function(text) {
	};
};

Puli.prototype.setup = function() {
  var self = this;
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
          self.wrapSelectionWithTag('b');
          break;
        case 73: // i
          e.preventDefault();
          self.wrapSelectionWithTag('i');
          break;
        case 83: // s
          e.preventDefault();
          self.wrapSelectionWithTag('s');
          break;
        case 85: // u
          e.preventDefault();
          self.wrapSelectionWithTag('u');
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
        var sel = self.saveSelection(this);
        this.innerHTML = self.sanitize(html);
        self.restoreSelection(this, sel);
      }
    },
    keypress: function(e) {
      // Prevents enter from inserting any
      // <br>
      var code = e.which;
      switch (code) {
        case 13: // enter
          e.preventDefault();
          var message = self.sanitize(self.div.innerHTML, false);
          var result = self.onsubmit(message);

          if (result == null || result != false) {
              self.div.innerHTML = "";
          }
          break;
      }
    },
    input: function(e) {
      // Passes the text to the sanitizing
      // function, while trying to keep an
      // eye on the selection.
      if (!e.isComposing) {
        var html = this.innerHTML;
        var sel = self.saveSelection(this);
        this.innerHTML = self.sanitize(html);
        self.restoreSelection(this, sel);
      }
    },
  };

  this.div.onkeydown = events.keydown;
  this.div.onkeyup = events.keyup;
  this.div.onkeypress = events.keypress;
  this.div.oninput = events.input;
  this.div.onblur = events.blur;
};

Puli.prototype.sanitize = function(html, keep_tags) {
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

Puli.prototype.text = function() {
  return this.sanitize(this.div.innerHTML, false);
};

Puli.prototype.clear = function() {
  this.div.innerHTML = "";
};

if (window.getSelection && document.createRange) {
  Puli.prototype.saveSelection = function(containerEl) {
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

  Puli.prototype.restoreSelection = function(containerEl, savedSel) {
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
  Puli.prototype.saveSelection = function(containerEl) {
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

  Puli.prototype.restoreSelection = function(containerEl, savedSel) {
    var textRange = containerEl.ownerDocument.body.createTextRange();
    textRange.moveToElementText(containerEl);
    textRange.collapse(true);
    textRange.moveEnd("character", savedSel.end);
    textRange.moveStart("character", savedSel.start);
    textRange.select();
  };
}

Puli.prototype.wrapSelectionWithTag = function(tag) {
  var ranges = [];

  if (window.getSelection && document.activeElement == this.div) {
    var selection = window.getSelection();
    if (selection.rangeCount) {
      var i = selection.rangeCount;
      while (i--) {
        var range = selection.getRangeAt(i).cloneRange();
        var element = document.createElement('span');

        var span_before = document.createElement('span');
        span_before.textContent = '<' + tag + '>';
        span_before.className = 'tag';

        var span = document.createElement('span');
        span.textContent = range.extractContents().textContent;

        var span_after = document.createElement('span');
        span_after.textContent = '</' + tag + '>';
        span_after.className = 'tag';

        element.appendChild(span_before);
        element.appendChild(span);
        element.appendChild(span_after);

        range.insertNode(element);
        range.selectNode(span);

        ranges.push(range);
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

