var date = require("date-fu"),
    fs = require("fs"),
    timezoneJS = require("timezone-js");

tz = timezoneJS.timezone;
tz.transport = function (opts) {
  if (opts.async) {
    if (typeof opts.success !== 'function') return;
    opts.error = opts.error || console.error;
    return fs.readFile(opts.url, 'utf8', function (err, data) {
        return err ? opts.error(err) : opts.success(data);
        });
  }
  return fs.readFileSync(opts.url, 'utf8');
};

tz.loadingScheme = tz.loadingSchemes.MANUAL_LOAD;
tz.loadZoneJSONData('timezones.json', true);


exports.Post = function (tribune_id, data) {
  this.tribune = tribune_id;

  if (undefined != data) {
    if (typeof data == 'string') {
      this.json = JSON.parse(data);
    } else {
      this.json = data;
    }

    for (var k in this.json) {
      if (this.json.hasOwnProperty(k)) {
        this[k] = this.json[k];
      }
    }
  }
}

exports.Post.prototype.nickname = function() {
  if (undefined != this.user) {
    return this.user.name;
  } else if (undefined != this.info) {
    return this.info.substr(0, 10);
  } else {
    return '';
  }
};

exports.Post.prototype.clock = function() {
  return date.strftime(new timezoneJS.Date(this.timestamp, "Europe/Paris"), "%H:%M:%S");
};

exports.Post.prototype.tribune_timestamp = function() {
  return date.strftime(new timezoneJS.Date(this.timestamp, "Europe/Paris"), "%Y%m%d%H%M%S");
};

exports.Post.prototype.message_html = function() {
  if (this.message) {
    var callback = function(match, tag, text) {
      text = text.replace(/<(m|s|u|b|i|tt|code)>(.*?)<\/\1>/g, callback);
      return '\032' + tag + '\033' + text + '\032/' + tag + '\033';
    }
    message = this.message.replace(/<(m|s|u|b|i|tt|code)>(.*?)<\/\1>/g, callback);

    message = message.replace(/&/g, '&amp;');
    message = message.replace(/</g, '&lt;');
    message = message.replace(/>/g, '&gt;');

    message = message.replace(/\032/g, '<');
    message = message.replace(/\033/g, '>');

    message = message.replace(/((https?|ftp|gopher|file|mms|rtsp|rtmp):\/\/.*?)((,|\.|\)|\]|\})?(<| |-|"|$))/,
      function(match, url, protocol, cruft, punctuation, after) {
        var string = '<a href="' + url + '">[url]</a>';
        if (undefined != punctuation) {
          string += punctuation;
        }
        if (undefined != after) {
          string += after;
        }
        return string;
      }
    );

    return message.replace(
      /((([0-9]{4})-((0[1-9])|(1[0-2]))-((0[1-9])|([12][0-9])|(3[01])))#)?((([01]?[0-9])|(2[0-3])):([0-5][0-9])(:([0-5][0-9]))?([:\^][0-9]|[¹²³⁴⁵⁶⁷⁸⁹])?(@[0-9A-Za-z]+)?)/g,
      "<span class='reference' data-timestamp='$3$4$7$12$15$17$18'>\$1\$11</span>"
    );
  } else {
    return '';
  }
};

exports.Post.prototype.message_plain = function() {
  return this.message;
};
