// vim:et:sw=2

var Post = require("./post.js"),
    jade = require("jade"),
    async = require("async"),
    logger = require('./logger'),
    Chance = require("chance");

Tribune.createName = function(name, callback) {
  var id = name;

  if (name == null) {
    var chance = new Chance();
    id = chance.word({syllables: 3});
  } else {
    id = name.replace(/[\s\\\/:?&#]/g, '');
  }

  return id;
};

Tribune.form_post = function(req, res, next) {
  var tribune = req.tribune;

  if (!req.body.message) {
    res.set('Location', '/tribune/' + tribune.id);
    res.send(400);
    return;
  }

  if (req.body.email && req.body.email != "dont@change.org") {
    res.send(200);
    return;
  }

  logger.info('New message for tribune ' + tribune.id + ":\n" + req.body.message);

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
      tribune.render_post(post, callback);
    },
    function(str, callback) {
      Tribune.onNewPost(tribune.id, str);
      callback(null);
    }
  ], function(err, result) {
    next();
  });
};

Tribune.direct_post = function(post_data) {
  var tribune;

  async.waterfall([
    function(callback) {
      Tribune.loadTribune(post_data.tribune, callback);
    },
    function(loaded_tribune, callback) {
      tribune = loaded_tribune;
      tribune.post(post_data, callback);
    },
    function(post, callback) {
      tribune.render_post(post, callback);
    },
    function(str, callback) {
      Tribune.onNewPost(tribune.id, str);
      callback(null);
    }
  ]);
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

Tribune.loadTribune = function(id, callback) {
  logger.info("Loaded tribune " + id);
  (new Tribune(id)).load(callback);
};

Tribune.prototype.setProperties = function(properties) {
  for (key in properties) {
    if (properties.hasOwnProperty(key)) {
      this[key] = properties[key];
    }
  }
};

Tribune.prototype.load = function(callback) {
  var tribune = this;

  global.db.loadTribune(this.id, function(err, data) {
    tribune.setProperties(data);

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

  if ('user-authentication' in params && params['user-authentication']) {
    this.require_user_authentication = true;
  } else {
    this.require_user_authentication = false;
  }

  if ('anonymous' in params && params['anonymous']) {
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
    callback
  );
};

Tribune.prototype.xml = function() {
  // No need to write an XML formatter for this
  var xml = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n";
  xml += '<board site="' + this.url + '">\n';

  this.latest_posts().reverse().forEach(function(post) {
    xml += ' <post id="' + post.id + '" time="' + post.tribune_timestamp() + '">\n';
    xml += '  <info>' + (post.info != undefined && post.info != "" ? post.info : post.nick) + '</info>\n';
    xml += '  <login>' + (post.user != undefined && post.user.name != undefined ? post.user.name : '') + '</login>\n';
    xml += '  <message>' + post.message_xml() + '</message>\n';
    xml += ' </post>\n';
  });

  xml += '</board>\n';

  return xml;
};

Tribune.prototype.tsv = function() {
  var tsv = "";

  this.latest_posts().forEach(function(post) {
    var info = (post.info != undefined && post.info != "" ? post.info : post.nick);
    var login = (post.user != undefined && post.user.name != undefined ? post.user.name : '');
    tsv += [post.id, post.tribune_timestamp(), info, login, post.message_tsv()]
      .join("\t") + "\n";
  });

  return tsv;
};

Tribune.prototype.latest_posts = function() {
  this.posts.sort(this.sort_posts);
  this.posts = this.posts.slice(-20);
  return this.posts;
};

Tribune.prototype.sort_posts = function(a, b) {
  return a.id > b.id ? 1 : -1;
};

Tribune.prototype.post = function(data, callback) {
  var tribune = this;

  var post = new Post(this, data, function(err, post) {
    post.save(function(err) {
      tribune.posts.push(post);
      callback(err, post);
    });
  });
};

module.exports = Tribune;

