var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
  , User = require('./user');

exports.setup = function(app, config) {
	app.use(passport.initialize());
	app.use(passport.session());

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

		User.loadUser(profile.miaoliId, function(err, user) {
		  if (!user) {
			global.db.saveUser(profile, done);
		  } else if (user.checkPassword(password)) {
			done(null, user);
		  } else {
			done(null, false, {message: 'Incorrect password.'});
		  }
		});
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
	  return done(null, user.miaoliId);
	});

	passport.deserializeUser(function(miaoliId, done) {
	  return User.loadUser(miaoliId, done);
	});

	app.get('/auth/logout', function (req, res) { req.logout(); res.redirect('/'); });
	app.get('/tribune/:id/logout', function (req, res) { req.logout(); res.redirect('/tribune/' + req.params.id); });

	app.post('/auth/local', passport.authenticate('local', { successRedirect: '/user', failureRedirect: '/' }));
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
};
