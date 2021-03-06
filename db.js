// vim:et:sw=2

var redis = require("redis")
  , async = require("async")
  , Tribune = require('./tribune')
  , User = require('./user')
  , Post = require('./post')
  , logger = require('./logger');

/* istanbul ignore next */
function MiaoliDB(config) {
  if (config !== undefined && "redis" in config) {
    this.redis = redis.createClient(config.redis.port, config.redis.host);
  }

  this._users = {};
  this._tribunes = {};
}

MiaoliDB.prototype.clearCache = function() {
  this._users = {};
  this._tribunes = {};
};

MiaoliDB.prototype.saveUser = function(user, callback) {
  var db = this;

  logger.info("User " + user.miaoliId + " saved");
  this.redis.hmset('user:' + user.miaoliId, user, function(err) {
    db._users[user.miaoliId] = user;
    callback(err, user);
  });
};

MiaoliDB.prototype.loadUser = function(miaoliId, callback) {
  logger.info("Loading user " + miaoliId);
  if (miaoliId in this._users) {
    logger.info("User found in cache");
    return callback(null, this._users[miaoliId]);
  }

  var db = this;

  this.redis.hgetall("user:" + miaoliId, function(err, user) {
    if (user) {
      logger.info("User " + miaoliId + " found in db");
    } else {
      user = {
        miaoliId: miaoliId,
        displayName: miaoliId.substr(miaoliId.indexOf(':') + 1)
      };
      logger.info("User " + miaoliId + " not found in db");
    }
    db._users[miaoliId] = user;

    db.loadUserOwnedTribunes(user, function(err, tribunes) {
      user.tribunes = tribunes;

      db.loadUserSubscribedTribunes(user, function(err, tribunes) {
        user.subscribed = tribunes;

        callback(err, user);
      });
    });
  });
};

MiaoliDB.prototype.loadUserOwnedTribunes = function(user, callback) {
  logger.info("Loading user " + user.miaoliId + " tribunes");
  var db = this;
  this.redis.lrange("user:" + user.miaoliId + ":tribunes", 0, -1, function(err, tribune_ids) {
    if (!tribune_ids || tribune_ids.length == 0) {
      logger.info("User has no tribune");
      callback(err, []);
    } else {
      logger.info("User has " + tribune_ids.length + " tribunes");
      async.parallel(tribune_ids
        .filter(function(tribune_id, i, arr) { return arr.lastIndexOf(tribune_id) === i; })
        .map(function(tribune_id) {
          return function(callback) {
            Tribune.loadTribune(tribune_id, callback);
          };
        }),
        function(err, tribunes) {
            logger.info(tribunes);
          if (tribunes.length != tribune_ids.length) {
            db.saveUserOwnedTribunes(user, tribunes.map(function(tribune) { return tribune.id; }), function(err) {
              callback(err, tribunes);
            });
          } else {
            callback(err, tribunes);
          }
        }
      );
    }
  });
};

MiaoliDB.prototype.loadUserSubscribedTribunes = function(user, callback) {
  logger.info("Loading user " + user.miaoliId + " subscribed tribunes");
  var db = this;
  this.redis.lrange("user:" + user.miaoliId + ":subscribed", 0, -1, function(err, tribune_ids) {
    if (!tribune_ids || tribune_ids.length == 0) {
      logger.info("User has no tribune subscribed");
      callback(err, []);
    } else {
      logger.info("User has " + tribune_ids.length + " tribunes subscribed");
      async.parallel(tribune_ids
        .filter(function(tribune_id, i, arr) { return arr.lastIndexOf(tribune_id) === i; })
        .map(function(tribune_id) {
          return function(callback) {
            db.loadTribune(tribune_id, callback);
          };
        }),
        function(err, tribunes) {
          if (tribunes.length != tribune_ids.length) {
            db.saveUserSubscribedTribunes(user, tribunes.map(function(tribune) { return tribune.id; }), function(err) {
              callback(err, tribunes);
            });
          } else {
            callback(err, tribunes);
          }
        }
      );
    }
  });
};

MiaoliDB.prototype.saveUserSubscribedTribunes = function(user, tribune_ids, callback) {
  var db = this;

  this.redis.ltrim('user:' + user.miaoliId + ':subscribed', -1, 0, function(err, result) {
    async.each(tribune_ids, function(tribune_id, done) {
      db.addUserSubscribedTribune(user, tribune_id, done);
    }, function(err) {
      user.subscribed = tribune_ids;
      callback(err);
    });
  });
}

MiaoliDB.prototype.saveUserOwnedTribunes = function(user, tribune_ids, callback) {
  var db = this;

  this.redis.ltrim('user:' + user.miaoliId + ':tribunes', -1, 0, function(err, result) {
    async.each(tribune_ids, function(tribune_id, done) {
      db.addUserOwnedTribune(user, tribune_id, done);
    }, function(err) {
      user.tribunes = tribune_ids;
      callback(err);
    });
  });
}

MiaoliDB.prototype.addUserSubscribedTribune = function(user, tribune_id, callback) {
  this.redis.lpush('user:' + user.miaoliId + ':subscribed', tribune_id, callback);
};

MiaoliDB.prototype.addUserOwnedTribune = function(user, tribune_id, callback) {
  var db = this;

  this.redis.lpush('user:' + user.miaoliId + ':tribunes', tribune_id, function(err, result) {
    db.redis.hset('tribune:' + tribune_id, 'admin', user.miaoliId, callback);
  });
};

MiaoliDB.prototype.saveTribune = function(tribune, callback) {
  var data = {
    admin: tribune.admin ? tribune.admin.miaoliId : "",
    title: tribune.title,
    require_user_authentication: +tribune.require_user_authentication
  };

  this._tribunes[tribune.id] = tribune;
  this.redis.hmset("tribune:" + tribune.id, data, function(err) {
    callback(err, tribune);
  });
};

MiaoliDB.prototype.loadTribune = function(tribuneId, callback) {
  logger.info("Loading tribune " + tribuneId);
  if (tribuneId in this._tribunes) {
    logger.info("Tribune found in cache");
    return callback(null, this._tribunes[tribuneId]);
  }

  var db = this;

  this.redis.hgetall("tribune:" + tribuneId, function(err, tribune) {
    if (!tribune) {
      tribune = { };
      logger.info("Tribune not found in db");
    } else {
      logger.info("Tribune found in db");
    }

    tribune.id = tribuneId;
    tribune.require_user_authentication = !!+tribune.require_user_authentication;

    db._tribunes[tribuneId] = tribune;

    db.loadTribunePosts(tribune, 20, function(err, posts) {
      tribune.posts = posts;

      if (tribune.admin && tribune.admin != "") {
        db.loadUser(tribune.admin, function(err, user) {
          tribune.admin = user;
          callback(err, tribune);
        });
      } else {
        tribune.admin = null;
        callback(err, tribune);
      }
    });
  });
};

MiaoliDB.prototype.loadTribunePosts = function(tribune, n, callback) {
  var db = this;

  this.redis.lrange('posts:' + tribune.id + ':json', -1 * n, -1, function(err, json_posts) {

    var posts = [];
    async.each(json_posts, function(json_post, done) {
      new Post(tribune, json_post, function(err, post) {
        posts.push(post);
        done(err);
      });
    }, function(err) {
      posts.sort(tribune.sort_posts);
      callback(err, posts);
    });
  });
};

MiaoliDB.prototype.savePost = function(post, callback) {
  var db = this;

  this.redis.rpush('posts:' + post.tribune.id, '', function(err, post_id) {
    // Now we know the post's id
    post.id = post_id;

    var data = {
      id: post.id,
      user: post.user ? post.user.miaoliId : "",
      nick: post.nick ? post.nick : "",
      info: post.info,
      timestamp: post.timestamp,
      message: post.message
    };

    db.redis.rpush('posts:' + post.tribune.id + ':json', JSON.stringify(data), function(err) {
      db.redis.hmset('post:' + post.tribune.id + ':' + post.id, data, function(err) {
        callback(err, post);
      });
    });
  });
};

module.exports = MiaoliDB;
