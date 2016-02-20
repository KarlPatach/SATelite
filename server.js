var express = require('express');
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var fs = require('fs');
var favicon = require('serve-favicon'); // Charge le middleware de favicon

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/static'));

app.use(favicon(__dirname + '/static/img/favicon.png'))

app.use(bodyParser.urlencoded({ extended: false }));

app.use(cookieSession({
  name: 'session',
  secret: "SaT/élite"
}));

app.get('/',function(req, res, next){
    res.redirect('/accueil');
});

app.get('/analyse', function(req, res, next) {
    if(req.query.tag != undefined) {
        res.redirect("/analyse/"+req.query.tag);
    } else {
        next();
    }
});

app.get('/analyse/:tag', function(req, res, next) {
    var params = traitement(req.params.tag);
    res.render("analyse.ejs", params);
});

app.get('/:page', function(req, res, next){
    fs.access(__dirname + '/views' + req.params.page +'.ejs', function (err) {
    	if (err) {
    	    res.status(404);
    		console.error('404 : /' + req.params.page);
    		res.render('404.ejs', {page : req.params.page});
    		return;
    	}
    	res.render(req.params.page + ".ejs", req.query);
    });
});

app.listen(app.get('port'), function() {
    console.log('App is running, server is listening on port ', app.get('port'));
});

function traitement(tag) {
    var related = [{
        "tag" : "cat", "weight" : 0.8,
        "tag" : "cute", "weight" : 0.6,
        "tag" : "kitten", "weight" : 0.5
    }];
    var influents = [{
        "text" : "Lorem ipsum dolor sit amet", "url" : "http://wordpress.com", "likes" : 6580, "grade" : 0.89,
        "text" : "Lorem ipsum dolor sit amet", "url" : "http://wordpress.com", "likes" : 6580, "grade" : 0.89,
        "text" : "Lorem ipsum dolor sit amet", "url" : "http://wordpress.com", "likes" : 6580, "grade" : 0.89
    }];
    var picture = {"src" : "http://img.com/cat.png", "postUrl" : "http://blog.tumblr.com/post"}
    var params = {
        "tag" : tag,
        "related" : related,
        "influents" : influents,
        "picture" : picture,
    }
    return params;
}