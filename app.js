// vim:et:sw=2
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes/router')
  , http = require('http')
  , tribune = require('./tribune')
  , io = require('socket.io')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , path = require('path');

var app = express();
var server = http.createServer(app);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


passport.use(new LocalStrategy(
  function(username, password, done) {
    return done(null, {login: username});

    /*
    User.findOne({ username: username }, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!user.validPassword(password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
    */
  }
));


app.get('/', routes.home);

app.all('/tribune/:id', tribune.load);
app.all('/tribune/:id/*', tribune.load);

app.get('/tribune/:id', routes.tribune);
app.post('/tribune/:id/post', tribune.form_post);
app.get('/tribune/:id/xml', tribune.xml);

io = io.listen(server);

tribune.onNewPost = function(tribune, post) {
  io.sockets.in(post.tribune).emit('new-post', {tribune: tribune, post: post});
};

io.sockets.on('connection', function(socket) {
  socket.on('post', function(post) {
    console.log('Posting');
    tribune.direct_post(post);
  });

  socket.on('join', function(tribune) {
    console.log('Joining tribune ' + tribune);
    socket.join(tribune);
  });
});


server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
