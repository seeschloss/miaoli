// vim:et:sw=2

var Post = require("./post.js"),
    jade = require("jade"),
    async = require("async"),
    logger = require('./logger'),
    Chance = require("chance");

Tribune.randomName = function(name, callback) {
  var id = name;

  if (name == '<random>') {
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

  this.posts.sort(this.sort_posts).reverse().forEach(function(post) {
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
  return a.id > b.id ? 1 : -1;
};

Tribune.prototype.post = function(data, callback) {
  var tribune = this;

  var post = new Post(this, data);
  post.save(function(err) {
    tribune.posts.push(post);
    callback(err, post);
  });
};

module.exports = Tribune;

