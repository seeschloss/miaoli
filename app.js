// vim:et:sw=2
/**
 * Module dependencies.
 */

var express = require('express')
  , session = require('express-session')
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

// all environments
app.set('port', config.port);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.bodyParser());
//app.use(express.methodOverride());
app.use(express.session({
  secret: config.secret,
  store: new RedisStore({
    'host': config.redis.host,
    'port': config.redis.port,
    'prefix': 'session'
  })
}));
app.use('/public', express.static(__dirname + '/public'));

// development only
if ('development' == env) {
  app.use(express.errorHandler());
}

routes.setup(app);
auth.setup(app, config);

io = io.listen(server, { log: false });

Tribune.onNewPost = function(tribune, post) {
  io.sockets.in(post.tribune).emit('new-post', {tribune: tribune, post: post});
};

io.sockets.on('connection', function(socket) {
  socket.on('post', function(post) {
    logger.info('Posting');
    Tribune.direct_post(post);
  });

  socket.on('join', function(tribune) {
    logger.info('Joining tribune ' + tribune);
    socket.join(tribune);
  });
});


server.listen(app.get('port'), config.host, function(){
  logger.info('Express server listening on port ' + app.get('port'));
});
