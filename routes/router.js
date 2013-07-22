exports.home = function(req, res){
  res.render('home', { title: 'Home' })
};

exports.tribune = function(req, res){
  res.render('tribune', { title: req.tribune.title, tribune: req.tribune, user: req.user })
};
