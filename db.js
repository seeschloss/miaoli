// vim:et:sw=2

var redis = require("redis")
  , Tribune = require('./tribune').Tribune
  , User = require('./user').User
  , Post = require('./post').Post;

function MiaoliDB(config) {
  this.redis = redis.createClient(config.redis.port, config.redis.host);

  this._users = {};
  this._tribunes = {};
}

MiaoliDB.prototype.saveUser = function(user, callback) {
  var db = this;

  this.redis.hmset('user:' + user.miaoliId, user, function(err, result) {
    db._users[user.miaoliId] = user;
    callback(err, user);
  });
};

MiaoliDB.prototype.loadUser = function(miaoliId, callback) {
  console.log("Loading user " + miaoliId);
  if (miaoliId in this._users) {
    console.log("User found in cache");
    return callback(null, this._users[miaoliId]);
  }

  var db = this;

  this.redis.hgetall("user:" + miaoliId, function(err, user) {
    if (user) {
      console.log("User found in db");
    } else {
      console.log("User not found in db");
    }
    db._users[miaoliId] = user;

    db.loadUserOwnedTribunes(user, function(err, tribunes) {
      user.tribunes = tribunes;

      callback(err, user);
    });
  });
};

MiaoliDB.prototype.loadUserOwnedTribunes = function(user, callback) {
  console.log("Loading user " + user.miaoliId + " tribunes");
  var db = this;
  this.redis.lrange("user:" + user.miaoliId + ":tribunes", 0, -1, function(err, tribune_ids) {
    if (!tribune_ids) {
      console.log("User has no tribune");
      callback(err, []);
    } else {
      console.log("User has " + tribune_ids.length + " tribunes");
      var tribunes = [];
      tribune_ids
        .filter(function(tribune_id, i, arr) { return arr.lastIndexOf(tribune_id) === i; })
        .forEach(function(tribune_id) {
          var tribune = new Tribune(tribune_id);
          tribune.load(function(){});
          tribunes.push(tribune);
        });
      if (tribunes.length != tribune_ids.length) {
        db.saveUserOwnedTribunes(user, tribunes.map(function(tribune) { return tribune.id; }), function(){});
      }
      callback(err, tribunes);
    }
  });
};

MiaoliDB.prototype.saveUserOwnedTribunes = function(user, tribune_ids, callback) {
  this.redis.ltrim('user:' + user.miaoliId + ':tribunes', -1, 0, function(err, result) {
    tribune_ids.forEach(function(tribune_id) {
      db.addUserOwnedTribune(user, tribune_id);
    });
    callback(err, tribune_ids);
  });
}

MiaoliDB.prototype.addUserOwnedTribune = function(user, tribune_id, callback) {
  var db = this;

  this.redis.lpush('user:' + user.miaoliId + ':tribunes', tribune_id, function(err, result) {
    db.redis.hset('tribune:' + tribune_id, 'admin', user.miaoliId, callback);
  });
};

MiaoliDB.prototype.saveTribune = function(tribune, callback) {
  var data = {
    admin: tribune.admin ? tribune.admin.miaoliId : null,
    title: tribune.title,
    require_user_authentication: tribune.require_user_authentication
  };

  this._tribunes[tribune.id] = tribune;
  this.redis.hmset("tribune:" + tribune.id, data, callback);
};

MiaoliDB.prototype.loadTribune = function(tribuneId, callback) {
  console.log("Loading tribune " + tribuneId);
  if (tribuneId in this._tribunes) {
    console.log("Tribune found in cache");
    return callback(null, this._tribunes[tribuneId]);
  }

  var db = this;

  this.redis.hgetall("tribune:" + tribuneId, function(err, tribune) {
    if (!tribune) {
      tribune = { };
      console.log("Tribune not found in db");
    } else {
      console.log("Tribune found in db");
    }

    tribune.id = tribuneId;

    db._tribunes[tribuneId] = tribune;

    db.loadTribunePosts(tribune, 20, function(err, posts) {
      tribune.posts = posts;

      if (tribune.admin) {
        new User(tribune.admin, function(err, user) {
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
