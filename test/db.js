// vim:et:sw=2

var MiaoliDB = require('../db'),
    User = require('../user'),
    fakeRedis = require('fakeredis');

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

if (module == require.main) require('test').run(exports);

