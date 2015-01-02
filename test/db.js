// vim:et:sw=2

var MiaoliDB = require('../db'),
    logger = require('../logger'),
    fakeRedis = require('fakeredis');

logger.transports.console.level = 'warn';

var oldPrototype = MiaoliDB.prototype;
MiaoliDB = function() {
  this.redis = fakeRedis.createClient("db tests");

  this._users = {};
  this._tribunes = {};
};
MiaoliDB.prototype = oldPrototype;

var db = new MiaoliDB();

exports['test loadUser with new user'] = function(assert, done) {
  db.loadUser('local:dummy', function(err, user) {
    assert.equal(user.miaoliId, 'local:dummy', 'User created with id set');
    assert.equal(user.password, null, 'User has no password yet');
    assert.equal(user.displayName, "dummy", 'User has default displayName');
    assert.equal(user.tribunes.length, 0, 'User is not the admin of any tribune');
    assert.equal(user.subscribed.length, 0, 'User has not subscribed any tribune');
    done();
  });
};

exports['test saveUser with new user'] = function(assert, done) {
  db.loadUser('local:dummy', function(err, user) {
    user.password = require('crypto').createHash('sha256').update("password").digest('hex');
    db.saveUser(user, function(err, user) {
      db.loadUser('local:dummy', function(err, user) {
        assert.equal(user.miaoliId, 'local:dummy', 'User has right id');
        assert.equal(user.displayName, 'dummy', 'User has right displayName');
        assert.equal(user.password, '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'User has right password');
        done();
      });
    });
  });
};

var createDummyUser = function(callback) {
  db.loadUser('local:dummy', function(err, user) {
    user.password = require('crypto').createHash('sha256').update("password").digest('hex');
    db.saveUser(user, function(err) {
      callback(user);
    });
  });
};

exports['test loadTribune with new tribune'] = function(assert, done) {
  db.loadTribune('dummy', function(err, tribune) {
    assert.equal(tribune.id, 'dummy', 'Tribune created with id set');
    assert.equal(tribune.admin, null, 'Tribune has no admin');
    assert.equal(tribune.posts.length, 0, 'Tribune has no post yet');
    done();
  });
};

exports['test saveTribune with new tribune'] = function(assert, done) {
  db.loadTribune('dummy', function(err, tribune) {
    tribune.title = 'Dummy tribune';
    db.saveTribune(tribune, function(err, tribune) {
      db.loadTribune('dummy', function(err, tribune) {
        assert.equal(tribune.title, 'Dummy tribune', 'Tribune name has been correctly saved');
        done();
      });
    });
  });
};

var createDummyTribune = function(callback) {
  db.loadTribune('dummy', function(err, tribune) {
    db.saveTribune(tribune, function(err) {
      callback(tribune);
    });
  });
};

var createDummyTribuneWithAdmin = function(callback) {
  createDummyTribune(function(tribune) {
    createDummyUser(function(user) {
      user.tribunes = [tribune.id];
      db.saveUserOwnedTribunes(user, user.tribunes, function() {
        tribune.admin = user;
        db.saveTribune(tribune, function(err) {
          callback(tribune);
        });
      });
    });
  });
};

exports['test loadTribune with admin'] = function(assert, done) {
  createDummyTribuneWithAdmin(function(tribune) {
    db.loadTribune(tribune.id, function(err, tribune) {
      assert.equal(tribune.admin.miaoliId, 'local:dummy', 'Tribune admin has been loaded');
      done();
    });
  });
};

var createDummyTribuneWithPosts = function(callback) {
  createDummyTribune(function(tribune) {
    db.savePost({
      tribune: tribune,
      nick: 'Plop',
      info: 'Anonymous',
      timestamp: '20150102115500',
      message: 'plop _o/'
    }, function(err, post) {
      tribune.posts.push(post);
      db.savePost({
        tribune: tribune,
        nick: 'Plop',
        info: 'Anonymous',
        timestamp: '20150102125100',
        message: '11:55:00 \\o_'
      }, function(err, post) {
        tribune.posts.push(post);
        callback(tribune);
      });
    });
  });
};

exports['test loadTribune with posts'] = function(assert, done) {
  createDummyTribuneWithPosts(function(tribune) {
    db.loadTribune(tribune.id, function(err, tribune) {
      assert.equal(tribune.posts.length, 2, 'Tribune posts have been loaded');
      done();
    });
  });
};

if (module == require.main) require('test').run(exports);

