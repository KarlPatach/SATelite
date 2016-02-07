var express = require('express');
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieSession({
  name: 'session',
  secret: "SaT/élite"
}));

app.use('/',function(req, res, next){
    res.render('accueil.ejs');
});

app.use('/delete/:id', function(req, res, next) {
    req.session.liste[req.params.id] = null;
    next();
});

app.use('/add', function(req, res, next) {
    if(req.session.liste==undefined) req.session.liste = [];
    req.session.liste[req.session.liste.length] = req.body.tache;
    next();
});

app.use(function(req, res, next){
    res.render('index.ejs', {liste: req.session.liste});
});

app.listen(app.get('port'), function() {
    console.log('App is running, server is listening on port ', app.get('port'));
});