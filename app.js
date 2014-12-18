// vim:et:sw=2
/**
 * Module dependencies.
 */

var express = require('express')
  , session = require('express-session')
  , RedisStore = require('connect-redis')(session)
  , routes = require('./routes/router')
  , http = require('http')
  , tribune = require('./tribune')
  , MiaoliDB = require('./db').MiaoliDB
  , io = require('socket.io')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
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
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == env) {
  app.use(express.errorHandler());
}


passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  },
  function(username, password, done) {
    var profile = {
      displayName: username,
      pass: password
    };

    profile.miaoliId = 'local:' + username;
    profile.providerLabel = "Miaoli";

    global.db.saveUser(profile, done);
  }
));

passport.use(new GoogleStrategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackURL
  },
  function(accessToken, refreshToken, profile, done) {
    profile.miaoliId = "google:" + profile.id;
    profile.providerLabel = "Google";

    global.db.saveUser(profile, done);
  }
));

passport.serializeUser(function(user, done) {
  console.log("Serialize " + user.miaoliId);
  done(null, user.miaoliId);
});

passport.deserializeUser(function(miaoliId, done) {
  console.log("Deserialize " + miaoliId);
  global.db.loadUser(miaoliId, function(err, user) {
    done(err, user);
  });
});


app.get('/', routes.home);
app.post('/', function(req, res) { tribune.create(req.body.name, function(err, tribune) {res.redirect(302, '/tribune/' + tribune.id);}); });

app.all('/tribune/:id', tribune.load);
app.all('/tribune/:id/*', tribune.load);

app.get('/user', routes.user_home);
app.get('/tribune/:id', routes.tribune);
app.get('/tribune/:id/config', routes.tribune_config);
app.post('/tribune/:id/post', tribune.form_post);
app.post('/tribune/:id/post', function(req, res) { res.set('Content-Type', 'application/xml'); res.send(201, req.tribune.xml()); });
app.get('/tribune/:id/xml', tribune.xml);

app.get('/auth/logout', function (req, res) { req.logout(); res.redirect('/'); });
app.get('/tribune/:id/logout', function (req, res) { req.logout(); res.redirect('/tribune/' + req.params.id); });

app.post('/auth/local', passport.authenticate('local'), function (req, res) { res.redirect('/'); });
app.post('/tribune/:id/auth/local', passport.authenticate('local'), function (req, res) { res.redirect('/tribune/' + req.params.id); });

app.get('/auth/google', function(req, res) { return passport.authenticate('google', { scope: 'profile', state: null })(req, res); });
app.get('/tribune/:id/auth/google', function(req, res) { return passport.authenticate('google', { scope: 'profile', state: req.params.id })(req, res); });
app.get('/auth/google/return', passport.authenticate('google'), function(req, res) {
  if ("state" in req.query && req.query.state) {
    res.redirect('/tribune/' + req.query.state);
  } else {
    res.redirect('/');
  }
});

io = io.listen(server, { log: false });

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


server.listen(app.get('port'), config.host, function(){
  console.log('Express server listening on port ' + app.get('port'));
});
