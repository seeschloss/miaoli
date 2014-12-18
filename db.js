// vim:et:sw=2

var redis = require("redis")
  , Tribune = require('./tribune').Tribune
  , Post = require('./post').Post;

function MiaoliDB(config) {
  this.redis = redis.createClient(config.redis.port, config.redis.host);
}

MiaoliDB.prototype.saveUser = function(user, callback) {
  this.redis.hmset('user:' + user.miaoliId, user, function(err, result) {
    callback(err, user);
  });
};

MiaoliDB.prototype.loadUser = function(miaoliId, callback) {
  var db = this;

  this.redis.hgetall("user:" + miaoliId, function(err, user) {
    db.loadUserOwnedTribunes(user, function(err, tribunes) {
      user.tribunes = tribunes;

      callback(err, user);
    });
  });
};

MiaoliDB.prototype.loadUserOwnedTribunes = function(user, callback) {
  this.redis.lrange("user:" + user.miaoliId + ":tribunes", 0, -1, function(err, tribune_ids) {
    if (!tribune_ids) {
      callback(err, []);
    } else {
      var tribunes = [];
      tribune_ids.forEach(function(tribune_id) {
        tribunes.push(new Tribune(tribune_id));
      });

      callback(err, tribunes);
    }
  });
};

MiaoliDB.prototype.addUserOwnedTribune = function(user, tribune, callback) {
  var db = this;

  user.tribunes.push(tribune);
  tribune.admin = user;

  this.redis.lpush('user:' + tribune.admin.miaoliId + ':tribunes', tribune.id, function(err, result) {
    db.redis.hset('tribune:' + tribune.id, 'admin', tribune.admin.miaoliId, callback);
  });
};

MiaoliDB.prototype.loadTribune = function(tribuneId, callback) {
  var db = this;

  this.redis.hgetall("tribune:" + tribuneId, function(err, tribune) {
    if (!tribune) {
      tribune = { };
    }

    tribune.id = tribuneId;

    db.loadTribunePosts(tribune, 20, function(err, posts) {
      tribune.posts = posts;

      if (tribune.admin) {
        db.loadUser(tribune.admin, function(err, user) {
          tribune.admin = user;
          callback(err, tribune);
        });
      } else {
        callback(err, tribune);
      }
    });
  });
};

MiaoliDB.prototype.loadTribunePosts = function(tribune, n, callback) {
  var db = this;

  this.redis.lrange('posts:' + tribune.id + ':json', -1 * n, -1, function(err, json_posts) {
    var posts = json_posts
      .map(function(json_post) { return new Post(tribune, json_post); })
      .sort(tribune.sort_posts);
    callback(err, posts);
  });
};

MiaoliDB.prototype.savePost = function(post, callback) {
  var db = this;

  this.redis.rpush('posts:' + post.tribune.id, '', function(err, post_id) {
    // Now we know the post's id
    post.id = post_id;

    var data = {
      id: post.id,
      user: post.user ? post.user.miaoliId : null,
      nick: post.nick,
      info: post.info,
      timestamp: post.timestamp,
      message: post.message
    };

    db.redis.rpush('posts:' + post.tribune.id + ':json', JSON.stringify(data));
    db.redis.hmset('post:' + post.tribune.id + ':' + post.id, data);

    callback(err, post);
  });
};

MiaoliDB.prototype.addPostToTribune = function(post, tribune, callback) {
  var db = this;

  this.redis.rpush('posts:' + tribune.id, '', function(err, post_id) {
    // Now we know the post's id
    post.id = post_id;

    db.redis.rpush('posts:' + tribune.id + ':json', JSON.stringify(post));
    db.redis.hmset('post:' + tribune.id + ':' + post.id, post);

    callback(err, post);
  });
};

exports.MiaoliDB = MiaoliDB;
