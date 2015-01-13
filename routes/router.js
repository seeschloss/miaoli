// vim:et:sw=2

var Tribune = require('../tribune');

exports.setup = function(app) {
  var load_tribune = function(req, res, next) {
    var id = req.params.id.replace(/:/g, '');

    Tribune.loadTribune(id, function(err, tribune) {
      req.tribune = tribune;

      if (tribune.admin === null && tribune.posts.length == 0 && req.user) {
        tribune.setAdmin(req.user, function(err) {next();});
      } else {
        next();
      }
    });
  };

  var require_logged_user = function(req, res, next) {
    if (req.user) {
      next();
    } else {
      res.send(403);
    }
  };

  var require_tribune_admin = function(req, res, next) {
    if (req.user && req.tribune && req.tribune.admin && req.tribune.admin.miaoliId === req.user.miaoliId) {
      next();
    } else {
      res.send(403);
    }
  };

  app.all('/tribune/:id', load_tribune);
  app.all('/tribune/:id/*', load_tribune);

  app.all('/user', require_logged_user);
  app.all('/user/*', require_logged_user);

  app.get('/', function(req, res) { res.render('home', { title: 'Home', user: req.user }); });
  app.post('/', function(req, res) { res.redirect(302, '/tribune/' + Tribune.createName(req.body.random ? null : req.body.name.toString())); });

  app.get('/tribune/:id', function(req, res) {
    res.render('tribune', {
      title: req.tribune.title,
      tribune: req.tribune,
      user: req.user,
      token: req.sessionID
    });
  });

  app.all('/tribune/:id/config', require_tribune_admin);
  app.post('/tribune/:id/config', function(req, res) { req.tribune.configFromPost(req.body, function(err) {res.redirect(302, '/tribune/' + req.tribune.id);}); });
  app.all('/tribune/:id/config', function(req, res) { res.render('tribune-config', { title: req.tribune.title, tribune: req.tribune, user: req.user, errors: req.formErrors }); });

  app.post('/tribune/:id/post', Tribune.form_post);
  app.post('/tribune/:id/post', function(req, res) { res.set('Content-Type', 'application/xml, charset=utf8'); res.send(201, req.tribune.xml()); });
  app.get('/tribune/:id/xml', function(req, res) { res.set('Content-Type', 'application/xml, charset=utf8'); res.send(200, req.tribune.xml()); });

  app.get('/user', function(req, res) { res.render('user-home', { user: req.user }); });
  app.post('/user/config', function(req, res, next) {
    req.user.configFromPost(req.body, function(err) {
      if (err) {
        req.formErrors = err;
        next();
      } else {
        res.redirect(302, '/user');
      }
    });
  });
  app.all('/user/config', function(req, res) { res.render('user-config', { user: req.user, errors: req.formErrors }); });
};

