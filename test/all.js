exports["test database"] = require('./db.js');
exports["test user"] = require('./user.js');

if (module == require.main) require('test').run(exports);

