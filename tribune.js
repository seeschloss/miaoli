// vim:et:sw=2

var Post = require("./post.js").Post,
    jade = require("jade"),
    async = require("async"),
    Chance = require("chance");

exports.load = function(req, res, next) {
  var id = req.params.id.replace(/:/g, '');

  exports.loadTribune(id, function(err, tribune) {
    req.tribune = tribune;

    if (tribune.admin === null && tribune.posts.length == 0 && req.user) {
      tribune.setAdmin(req.user, function(err) {next();});
    } else {
      next();
    }
  });
};

var _tribunes = {};

exports.loadTribune = function(id, callback) {
  if (id in _tribunes) {
    callback(null, _tribunes[id]);
  } else {
    global.db.loadTribune(id, function(err, data) {
      console.log("Loaded tribune " + id);
      var tribune = new Tribune(id);
      tribune.load(callback);
    });
  }
};

exports.create = function(name, callback) {
  var id = name;

  if (name == '<random>') {
    var chance = new Chance();
    id = chance.word({syllables: 3});
  } else {
    id = name.replace(/[\s\\\/:?&#]/g, '');
  }

  exports.loadTribune(id, callback);
};

exports.form_post = function(req, res, next) {
  var tribune = req.tribune;

  if (!req.body.message) {
    res.set('Location', '/tribune/' + tribune.id);
    res.send(400);
    return;
  }

  console.log('New message for tribune ' + tribune.id + ":\n" + req.body.message);

  async.waterfall([
    function(callback) {
      tribune.post({
        tribune: tribune,
        user: req.user,
        message: req.body.message,
        timestamp: Date.now(),
        info: req.get('User-Agent')
      }, callback);
    },
    function(post, callback) {
      tribune.posts.push(post);
      tribune.render_post(post, callback);
    },
    function(str, callback) {
      exports.onNewPost(tribune.id, str);
      callback(null);
    }
  ], function(err, result) {
    next();
  });
};

exports.direct_post = function(post_data) {
  var tribune;

  async.waterfall([
    function(callback) {
      exports.load(post_data.tribune, callback);
    },
    function(tribune, callback) {
      tribune.post(post_data, callback);
    },
    function(post, callback) {
      tribune.posts.push(post);
      tribune.render_post(post, callback);
    },
    function(str, callback) {
      exports.onNewPost(tribune.id, str);
      callback(null);
    }
  ]);
};

exports.xml = function(req, res, next) {
  res.set('Content-Type', 'application/xml');
  res.send(200, req.tribune.xml());
};

function Tribune(id) {
  this.id = id;
  this.anonymous = false;
  this.posts = [];
  this.admin = null;

  this.max_posts = 20;

  this.url = "/tribune/" + this.id;
  this.post_url = "/tribune/" + this.id + "/post";
  this.local_login_url = "/tribune/" + this.id + "/auth/local";
  this.google_login_url = "/tribune/" + this.id + "/auth/google";
  this.logout_url = "/tribune/" + this.id + "/logout";
  this.config_url = "/tribune/" + this.id + "/config";
  this.title = 'Tribune ' + this.id;

  this.require_user_authentication = false;
};

Tribune.prototype.load = function(callback) {
  var tribune = this;

  global.db.loadTribune(this.id, function(err, data) {
    for (key in data) {
      if (data.hasOwnProperty(key)) {
        tribune[key] = data[key];
      }
    }

    if (callback) {
      callback(err, tribune);
    }
  });
};

Tribune.prototype.setAdmin = function(user, callback) {
  user.tribunes.push(this);
  this.admin = user;
  global.db.addUserOwnedTribune(user, this.id, callback);
}

Tribune.prototype.save = function(callback) {
  global.db.saveTribune(this, callback);
};

Tribune.prototype.configFromPost = function(params, callback) {
  if ('title' in params) {
    this.title = params['title'];
  }

  if ('user-authentication' in params) {
    this.require_user_authentication = true;
  } else {
    this.require_user_authentication = false;
  }

  if ('anonymous' in params) {
    this.anonymous = true;
  } else {
    this.anonymous = false;
  }

  this.save(callback);
};

Tribune.prototype.render_post = function(post, callback) {
  var rendered_post = jade.renderFile(
    'views/post.jade',
    { tribune: this, post: post },
    function(err, str) {
      if (callback) {
        callback(err, str);
      }
    }
  );
};

Tribune.prototype.xml = function() {
  // No need to write an XML formatter for this
  var xml = '<board site="' + this.url + '">\n';

  this.posts.reverse().forEach(function(post) {
    xml += ' <post id="' + post.id + '" time="' + post.tribune_timestamp() + '">\n';
    xml += '  <info>' + post.info + '</info>\n';
    xml += '  <login>' + (post.user != undefined ? post.user.name : '') + '</login>\n';
    xml += '  <message>' + post.message_xml() + '</message>\n';
    xml += ' </post>\n';
  });

  xml += '</board>\n';

  return xml;
};

Tribune.prototype.sort_posts = function(a, b) {
  return a.data.id > b.data.id ? 1 : -1;
};

Tribune.prototype.post = function(data, callback) {
  var tribune = this;

  var post = new Post(this, data);
  post.save(callback);
};

exports.Tribune = Tribune;

