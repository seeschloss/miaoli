// vim:et:sw=2

var _users = {};

function User(id, callback) {
  this.miaoliId = id;
  this.tribunes = [];
  this.subscribed = [];
}

User.loadUser = function(miaoliId, callback) {
  if (miaoliId in _users) {
    callback(null, _users[miaoliId]);
  } else {
    global.db.loadUser(miaoliId, function(err, data) {
      var user = new User(miaoliId);

      for (key in data) {
        if (data.hasOwnProperty(key)) {
          user[key] = data[key];
        }
      }

      if (callback) {
        callback(err, user);
      }
    });
  }
};

User.prototype.checkPassword = function(password) {
  var crypto = require('crypto');
  var hash = crypto.createHash('sha256').update(password).digest('hex');

  console.log("Password " + (hash == this.password ? "matches" : "does not match"));
  return hash == this.password;
}

User.prototype.configFromPost = function(params, callback) {
  var user = this;

  if ('name' in params) {
    this.displayName = params['name'];
  }

  if ('email' in params) {
    this.email = params['email'];
  }

  if ('password' in params && params['password'] != "") {
    if ('password-confirm' in params) {
      if (params['password'] == params['password-confirm']) {
        var crypto = require('crypto');
        this.password = crypto.createHash('sha256').update(params['password']).digest('hex');
      } else {
        return callback({message: 'The passwords do not match.'});
      }
    } else {
      return callback({message: 'You must enter your password twice.'});
    }
  }

  return this.save(callback);
};

User.prototype.save = function(callback) {
  global.db.saveUser(this, callback);
};

module.exports = User;

