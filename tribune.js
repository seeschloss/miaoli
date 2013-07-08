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

  console.log('New message for tribune ' + tribune.id + ":\n" + req.body.message);

  tribune.post({
    tribune: tribune.id,
    message: req.body.message,
    timestamp: Date.now(),
    info: req.get('User-Agent')
  }, function(post) {
    if (undefined != exports.onNewPost) {
      exports.onNewPost(post);
    }

    res.set('Location', '/tribune/' + tribune.id);
    res.send(303);
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
  // No need to write an XML formatter for this
  res.set('Content-Type', 'application/xml');

  var xml = '';

  xml += '<board site="">\n';

  req.tribune.posts.reverse().forEach(function(post) {
    xml += ' <post id="' + post.id + '" time="' + post.tribune_timestamp() + '">\n';
    xml += '  <info>' + post.info + '</info>\n';
    xml += '  <login>' + (post.user != undefined ? post.user.name : '') + '</login>\n';
    xml += '  <message>' + post.message_plain() + '</message>\n';
    xml += ' </post>\n';
  });

  xml += '</board>\n';

  res.send(xml);
  res.send(200);
};

var render_post = function(post) {
  return post.info + ': ' + post.message;
};

function Tribune(id, callback) {
  this.id = id;
  this.posts = [];

  this.max_posts = 20;

  this.post_url = "/tribune/" + this.id + "/post";
  this.title = 'Tribune ' + this.id;

  this.load_posts(this.max_posts, (function(tribune) {return function() {
    if (callback) {
      callback(tribune);
    }
  }})(this));
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
  return a.id > b.id ? 1 : -1;
};

Tribune.prototype.post = function(post, callback) {
  var tribune = this;

  db.rpush('posts:' + this.id, '', function(err, post_id) {
    // Now we know the post's id
    post.id = post_id;

    console.log('... post id is ' + post.id);
    console.log(post);

    // Store posts preparsed in a few formats.
    db.rpush('posts:' + tribune.id + ':json', JSON.stringify(post));
    db.rpush('posts:' + tribune.id + ':html', render_post(post));

    // And a post:TRIBUNE_ID:POST_ID hash with the post values.
    db.hmset('post:' + tribune.id + ':' + post.id, post);

    console.log('Post ' + post.id + ' pushed to tribune ' + tribune.id);

    if (callback) {callback(tribune.id, new Post(tribune.id, post));}
  });
};


