// vim:et:sw=2
/**
 * Module dependencies.
 */

var express = require('express')
  , session = require('express-session')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , RedisStore = require('connect-redis')(session)
  , routes = require('./routes/router')
  , auth = require('./auth')
  , http = require('http')
  , Tribune = require('./tribune')
  , User = require('./user')
  , MiaoliDB = require('./db')
  , io = require('socket.io')
  , logger = require('./logger')
  , path = require('path');

var env = process.env.NODE_ENV || 'development';
var config = require('./config.json')[env];

global.db = new MiaoliDB(config);

var app = express();
var server = http.createServer(app);

var sessionStore = new RedisStore({
  'host': config.redis.host,
  'port': config.redis.port,
  'prefix': 'session'
});

// all environments
app.set('port', config.port);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser(config.secret));
app.use(session({
  secret: config.secret,
  store: sessionStore,
  resave: true,
  saveUninitialized: true
}));
app.use('/public', express.static(__dirname + '/public'));

auth.setup(app, config);
routes.setup(app);

io = io.listen(server, { log: false });

Tribune.onNewPost = function(tribune, post) {
  io.sockets.in(post.tribune).emit('new-post', {tribune: tribune, post: post});
};

io.sockets.on('connection', function(socket) {
  socket.on('post', function(post) {
    logger.info('Posting');
    post.user = socket.user;
    if (post.user) {
      post.nick = post.user.displayName;
    }
    Tribune.direct_post(post);
  });

  socket.on('join', function(tribune) {
    logger.info('Joining tribune ' + tribune);
    socket.join(tribune);
  });

  socket.on('token', function(token) {
    sessionStore.get(token, function(err, session) {
      if (session && session.passport && session.passport.user) {
        User.loadUser(session.passport.user, function(err, user) {
          socket.user = user;
        });
      }
    });
  });
});


server.listen(app.get('port'), config.host, function(){
  logger.info('Express server listening on port ' + app.get('port'));
});
