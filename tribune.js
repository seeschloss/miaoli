// vim:et:sw=2

var redis = require("redis"),
    Post = require("./post.js").Post,
    jade = require("jade");

var db;

// This is for AppFog. If not there, we'll just use
// a local redis instance.
if (process.env.VCAP_SERVICES) {
  var conf = JSON.parse(process.env.VCAP_SERVICES);
  for (first in conf) break;
  conf = conf[first];
  db = redis.createClient(conf.port, conf.host);
  db.auth(conf.password);
} else {
  db = redis.createClient();
}

exports.load = function(req, res, next) {
  var id = req.params.id;

  req.tribune = new Tribune(id, function() {next();});
};

exports.form_post = function(req, res, next) {
  var tribune = req.tribune;

  if (!req.body.message) {
    res.set('Location', '/tribune/' + tribune.id);
    res.send(400);
    return;
  }

  console.log('New message for tribune ' + tribune.id + ":\n" + req.body.message);

  tribune.post({
    tribune: tribune.id,
    message: req.body.message,
    timestamp: Date.now(),
    info: req.get('User-Agent')
  }, function(tribune_id, post) {
    if (undefined != exports.onNewPost) {
      var rendered_post = jade.renderFile(
        'views/post.jade',
        { tribune: tribune, post: post },
        function(err, str) {
          if (!err) {
            exports.onNewPost(tribune.id, str);
            res.set('Content-Type', 'application/xml');
            res.send(201, req.tribune.xml());
          }
        }
      );
    }
  });
};

exports.direct_post = function(post_data) {
  new Tribune(post_data.tribune, function(tribune) {
    console.log('New message for tribune ' + tribune.id + ":\n" + post_data.message);

    post_data.timestamp = Date.now();

    tribune.post(post_data, function(tribune_id, post) {
      if (undefined != exports.onNewPost) {
        var rendered_post = jade.renderFile(
          'views/post.jade',
          { tribune: tribune, post: post },
          function(err, str) {
            if (!err) {
              exports.onNewPost(tribune.id, str);
            }
          }
        );
      }
    });
  });
};

exports.xml = function(req, res, next) {
  res.set('Content-Type', 'application/xml');
  res.send(200, req.tribune.xml());
};

function Tribune(id, callback) {
  this.id = id;
  this.anonymous = true;
  this.posts = [];

  this.max_posts = 20;

  this.post_url = "/tribune/" + this.id + "/post";
  this.login_url = "/tribune/" + this.id + "/login";
  this.logout_url = "/tribune/" + this.id + "/logout";
  this.title = 'Tribune ' + this.id;

  this.load_posts(this.max_posts, (function(tribune) {return function() {
    if (callback) {
      callback(tribune);
    }
  }})(this));
};

Tribune.prototype.xml = function() {
  // No need to write an XML formatter for this
  var xml = '<board site="' + this.url() + '">\n';

  this.posts.reverse().forEach(function(post) {
    xml += ' <post id="' + post.data.id + '" time="' + post.tribune_timestamp() + '">\n';
    xml += '  <info>' + post.data.info + '</info>\n';
    xml += '  <login>' + (post.data.user != undefined ? post.data.user.name : '') + '</login>\n';
    xml += '  <message>' + post.message_plain() + '</message>\n';
    xml += ' </post>\n';
  });

  xml += '</board>\n';

  return xml;
};

Tribune.prototype.url = function() {
  return "http://cypris.seos.fr:3000/tribune/" + this.id;
};

Tribune.prototype.load_posts = function(n, callback) {
  this.posts = [];

  db.lrange('posts:' + this.id + ':json', -1 * n, -1,
   (function(tribune) {return function(err, json_posts) {
    for (var i = 0, l = json_posts.length ; i < l ; i++) {
      var post = new Post(tribune.id, json_posts[i]);
      tribune.posts.push(post);
    }

    tribune.posts = tribune.posts.sort(tribune.sort_posts);

    if (callback) {
      callback();
    }
  }})(this));
};

Tribune.prototype.sort_posts = function(a, b) {
  return a.data.id > b.data.id ? 1 : -1;
};

Tribune.prototype.post = function(post, callback) {
  var tribune = this;

  db.rpush('posts:' + this.id, '', function(err, post_id) {
    // Now we know the post's id
    post.id = post_id;

    post.message = post.message.substr(0, 500);

    console.log('... post id is ' + post.id);
    console.log(post);

    // Store posts preparsed in a few formats.
    db.rpush('posts:' + tribune.id + ':json', JSON.stringify(post));

    // And a post:TRIBUNE_ID:POST_ID hash with the post values.
    db.hmset('post:' + tribune.id + ':' + post.id, post);

    console.log('Post ' + post.id + ' pushed to tribune ' + tribune.id);

    if (callback) {callback(tribune.id, new Post(tribune.id, post));}
  });
};


