// vim:et:sw=2
exports.home = function(req, res){
  res.render('home', { title: 'Home', user: req.user });
};

exports.tribune = function(req, res){
  res.render('tribune', { title: req.tribune.title, tribune: req.tribune, user: req.user });
};

exports.tribune_config = function(req, res){
  if (req.user && req.tribune && req.tribune.admin === req.user) {
    res.render('tribune-config', { title: req.tribune.title, tribune: req.tribune, user: req.user });
  } else {
    res.send(403);
  }
};

exports.user_home = function(req, res){
  if (req.user) {
    res.render('user-home', { user: req.user });
  } else {
    res.send(403);
  }
};

