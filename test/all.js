exports["test database"] = require('./db.js');

if (module == require.main) require('test').run(exports);

