// vim:et:sw=2

function User(id, callback) {
  this.miaoliId = id;

  this.load(callback);
}

User.prototype.load = function(callback) {
  var user = this;

  global.db.loadUser(this.miaoliId, function(err, data) {
    for (key in data) {
      if (data.hasOwnProperty(key)) {
        user[key] = data[key];
      }
    }

    if (callback) {
      callback(err, user);
    }
  });
};

exports.User = User;

