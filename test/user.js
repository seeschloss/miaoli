// vim:et:sw=2

var MiaoliDB = require('../db'),
    logger = require('../logger'),
    fakeRedis = require('fakeredis'),
    User = require('../user');

logger.transports.console.level = 'warn';

var db = new MiaoliDB();
db.redis = fakeRedis.createClient("user tests");
global.db = db;

exports['test loadUser with new user'] = function(assert, done) {
  User.loadUser('local:dummy', function(err, user) {
    assert.equal(Object.getPrototypeOf(user), User.prototype, 'User object returned');

    assert.equal(user.miaoliId, 'local:dummy', 'New user returned');
    assert.equal(user.displayName, 'dummy', 'New user has default displayName');
    assert.equal(user.password, null, 'New user has no password');
    done();
  });
};

var createDummyUser = function(callback) {
  db.clearCache();
  User.loadUser('local:dummy', function(err, user) {
    user.password = require('crypto').createHash('sha256').update("password").digest('hex');
    user.displayName = 'Dummy user';
    db.saveUser({
      miaoliId: user.miaoliId,
      displayName: user.displayName,
      password: user.password
    }, function(err) {
      db.clearCache();
      callback(user);
    });
  });
};

exports['test loadUser with existing user'] = function(assert, done) {
  db.redis.flushdb();
  createDummyUser(function(user) {
    User.loadUser('local:dummy', function(err, user) {
      assert.equal(user.miaoliId, 'local:dummy', 'Existing user returned');
      assert.equal(user.displayName, 'Dummy user', 'Existing user has correct displayName');
      assert.equal(user.password, '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'User has correct password');
      done();
    });
  });
};

exports['test checkPassword with new user'] = function(assert, done) {
  db.redis.flushdb();
  db.clearCache();
  User.loadUser('local:dummy', function(err, user) {
    assert.ok(user.checkPassword('plop') && user.checkPassword('prout'), 'User with no password can use any password');
    done();
  });
};

exports['test checkPassword with existing user'] = function(assert, done) {
  db.redis.flushdb();
  db.clearCache();
  createDummyUser(function(user) {
    User.loadUser('local:dummy', function(err, user) {
      assert.ok(user.checkPassword('password'), 'Right password check ok');
      assert.ok(!user.checkPassword('wrong password'), 'Wrong password check ok');
      done();
    });
  });
};

exports['test configFromPost'] = function(assert, done) {
  db.redis.flushdb();
  db.clearCache();
  createDummyUser(function(user) {
    var params = {
      name: "Not a dummy",
      email: "dummy@example.com",
      password: "pass",
      'password-confirm': "pass"
    };
    user.configFromPost(params, function(err, user) {
      User.loadUser('local:dummy', function(err, user) {
        assert.equal(user.displayName, params.name, 'User displayName was changed');
        assert.equal(user.email, params.email, 'User email address was changed');
        assert.ok(user.checkPassword('pass'), 'Password was correctly changed');
        done();
      });
    });
  });
};

exports['test configFromPost no password change'] = function(assert, done) {
  db.redis.flushdb();
  db.clearCache();
  createDummyUser(function(user) {
    var params = {
      name: "Not a dummy",
      email: "dummy@example.com",
      password: "",
      'password-confirm': ""
    };
    user.configFromPost(params, function(err, user) {
      User.loadUser('local:dummy', function(err, user) {
        assert.equal(user.displayName, params.name, 'User displayName was changed');
        assert.equal(user.email, params.email, 'User email address was changed');
        assert.ok(user.checkPassword('password'), 'Password was not changed');
        done();
      });
    });
  });
};

exports['test configFromPost passwords do not match'] = function(assert, done) {
  db.redis.flushdb();
  db.clearCache();
  createDummyUser(function(user) {
    var params = {
      name: "Not a dummy",
      email: "dummy@example.com",
      password: "pass",
      'password-confirm': "passqs"
    };
    user.configFromPost(params, function(err, user) {
      assert.notEqual(err, null, 'Error returned');
      User.loadUser('local:dummy', function(err, user) {
        assert.notEqual(user.displayName, params.name, 'User displayName was not changed');
        assert.notEqual(user.email, params.email, 'User email address was not changed');
        assert.ok(user.checkPassword('password'), 'Password was not changed');
        done();
      });
    });
  });
};

exports['test configFromPost password confirmation not given'] = function(assert, done) {
  db.redis.flushdb();
  db.clearCache();
  createDummyUser(function(user) {
    var params = {
      name: "Not a dummy",
      email: "dummy@example.com",
      password: "pass",
      'password-confirm': ""
    };
    user.configFromPost(params, function(err, user) {
      assert.notEqual(err, null, 'Error returned');
      User.loadUser('local:dummy', function(err, user) {
        assert.notEqual(user.displayName, params.name, 'User displayName was not changed');
        assert.notEqual(user.email, params.email, 'User email address was not changed');
        assert.ok(user.checkPassword('password'), 'Password was not changed');
        done();
      });
    });
  });
};

exports['test save'] = function(assert, done) {
  db.redis.flushdb();
  db.clearCache();
  createDummyUser(function(user) {
    user.email = "plop@example.com";
    user.displayName = "Another dummy";
    user.password = 'd74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000feb82e8f1';
    user.save(function(err) {
      User.loadUser('local:dummy', function(err, user) {
        assert.equal(user.displayName, "Another dummy", 'User displayName was changed');
        assert.equal(user.email, "plop@example.com", 'User email address was changed');
        assert.ok(user.checkPassword('pass'), 'Password was changed');
        done();
      });
    });
  });
};

if (module == require.main) require('test').run(exports);

