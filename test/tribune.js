// vim:et:sw=2

var MiaoliDB = require('../db'),
    logger = require('../logger'),
    fakeRedis = require('fakeredis'),
    Tribune = require('../tribune')
    User = require('../user')
    async = require('async');

logger.transports.console.level = 'warn';

var db = new MiaoliDB();
db.redis = fakeRedis.createClient("tribune tests");
global.db = db;

exports['test loadTribune with new tribune'] = function(assert, done) {
  Tribune.loadTribune('dummy', function(err, tribune) {
    assert.equal(Object.getPrototypeOf(tribune), Tribune.prototype, 'Tribune object returned');
    assert.equal(tribune.id, 'dummy', 'Tribune has default id');
    assert.equal(tribune.title, 'Tribune dummy', 'Tribune has default title');
    assert.equal(tribune.admin, null, 'Tribune has no admin');
    assert.equal(tribune.anonymous, false, 'Tribune is not anonymous');
    assert.equal(tribune.require_user_authentication, false, 'Tribune does not require authentication');
    done();
  });
};

var createDummyTribune = function(callback) {
  db.redis.flushdb();
  db.clearCache();
  Tribune.loadTribune('dummy'+Math.random(), function(err, tribune) {
    tribune.title = 'Dummy tribune';
    tribune.save(function(err) {
      db.clearCache();
      callback(tribune);
    });
  });
};

exports['test loadTribune with existing tribune'] = function(assert, done) {
  createDummyTribune(function(tribune1) {
    Tribune.loadTribune(tribune1.id, function(err, tribune2) {
      assert.deepEqual(tribune1, tribune2, 'Tribune was correctly loaded');
      done();
    });
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

exports['test setAdmin'] = function(assert, done) {
  createDummyTribune(function(tribune) {
    createDummyUser(function(user) {
      tribune.setAdmin(user, function(err) {
        assert.equal(tribune.admin, user, 'Tribune admin has been correctly set');

        Tribune.loadTribune(tribune.id, function(err, tribune) {
          assert.equal(tribune.admin.miaoliId, user.miaoliId, 'Tribune admin has been correctly loaded');

          done();
        });
      });
    });
  });
};

exports['test save'] = function(assert, done) {
  createDummyTribune(function(tribune1) {
    tribune1.title = "New silly title";
    tribune1.save(function(err) {
      Tribune.loadTribune(tribune1.id, function(err, tribune2) {
        assert.equal(tribune1.title, tribune2.title, 'Tribune has been correctly saved');

        done();
      });
    });
  });
};

exports['test configFromPost'] = function(assert, done) {
  createDummyTribune(function(tribune) {
    var params = {
      title: "Silly title",
      'user-authentication': "1",
      'anonymous': "1"
    };
    tribune.configFromPost(params, function(err) {
      Tribune.loadTribune(tribune.id, function(err, tribune) {
        assert.equal(tribune.title, params.title, 'Tribune title has been saved');
        assert.equal(tribune.anonymous, true, 'Tribune anonimosity has been saved');
        assert.equal(tribune.require_user_authentication, true, 'Tribune authentication requirement has been saved');

        done();
      });
    });
  });
};

exports['test configFromPost with other values'] = function(assert, done) {
  createDummyTribune(function(tribune) {
    var params = {
      title: "Another silly title",
      'anonymous': false
    };
    tribune.configFromPost(params, function(err) {
      Tribune.loadTribune(tribune.id, function(err, tribune) {
        assert.equal(tribune.title, params.title, 'Tribune title has been saved');
        assert.equal(tribune.anonymous, false, 'Tribune anonimosity has been saved');
        assert.equal(tribune.require_user_authentication, false, 'Tribune authentication requirement has been saved');

        done();
      });
    });
  });
};

exports['test latest_posts'] = function(assert, done) {
  createDummyTribune(function(tribune) {
    async.times(25, function(n, next) {
      tribune.post({
        info: 'Mozilla/42',
        timestamp: "20140102223400",
        message: 'Plop _o/ ' + n
      }, function(err, post) {
        next(null);
      });
    }, function(err) {
      assert.equal(tribune.latest_posts().length, 20, "Latest posts list is kept to 20 posts");
      var posts = tribune.latest_posts();
      assert.equal(posts[0].message, "Plop _o/ 5", "Posts are correctly ordered");
      assert.equal(posts[posts.length - 1].message, "Plop _o/ 24", "Posts are correctly ordered");

      done();
    });
  });
};

exports['test post'] = function(assert, done) {
  createDummyTribune(function(tribune) {
    tribune.post({
        info: 'Mozilla/42',
        timestamp: '20140102223400',
        message: 'Plop _o/'
      }, function(err) {
        assert.equal(err, null, "Post was correctly inserted");
        assert.equal(tribune.posts.length, 1, 'Post has been appended to tribune');
        console.log(tribune.posts);

        Tribune.loadTribune(tribune.id, function(err, tribune) {
          assert.equal(tribune.posts.length, 1, 'Post has been saved and loaded');

          done();
        });
      });
  });
};

exports['test createName'] = function(assert, done) {
  Tribune.createName('dummy', function(err, tribune) {
    assert.equal(tribune.id, 'dummy', 'Tribune has been created with given title');

    done();
  });
};

exports['test createName with sanitization'] = function(assert, done) {
  Tribune.createName('dummy:plop/prout', function(err, tribune) {
    assert.equal(tribune.id, 'dummyplopprout', 'Tribune has been created with sane title');

    done();
  });
};

exports['test createName with random name'] = function(assert, done) {
  Tribune.createName('<random>', function(err, tribune) {
    assert.ok(tribune.id.length > 0, 'Tribune has been created with a random title');
    assert.notEqual(tribune.id, '<random>', 'Tribune has been created with a random title');

    done();
  });
};

if (module == require.main) require('test').run(exports);

