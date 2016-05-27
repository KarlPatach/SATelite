var express = require('express');
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var fs = require('fs');
var favicon = require('serve-favicon'); // Charge le middleware de favicon
var analysis = require('./sentiment_analysis.js');

//Chargement de Express et de socket.io
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/static/img'));
app.use(express.static(__dirname + '/static/tpl'));
app.use(express.static(__dirname + '/static/dic'));

app.use(favicon(__dirname + '/static/img/faviconBis.png'))

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(cookieSession({
    name: 'session',
    secret: "SaT/élite"
}));

app.get('/', function(req, res, next) {
    res.redirect('/accueil');
});

app.get('/analyse', function(req, res, next) {
    if (req.query.tag != undefined) {
        var url = "/analyse/" + req.query.tag;
        var nbPosts = req.query.nbPosts;
        if (nbPosts<=0 || isNaN(nbPosts)) nbPosts = 400;
        if (nbPosts != 400) {
            url += "?nbPosts=" + nbPosts;
        }
        res.redirect(url);
    }//
    else {
        next();
    }
});

app.post('/analyse/:tag', function(req, res, next) {
    if (req.body.nbPosts == undefined) {
        req.body.nbPosts = 400; 
    }
    var list = [];
    
    //Test
    //analysis.test();
    
    switch(req.body.algo){
        //TODO Sélectionner algo + envoi des parametres
    }
    var code = req.query.code;
    console.time("récup posts"); 
    var results = analysis.getResults(req.params.tag, 0, 1, req.body.nbPosts / 20, list).then(function() {
        // log the details to the user
        console.timeEnd("récup posts"); 
        console.log('fetched all posts for Sentiment Analysis');
        analysis.traitement(list, null, function(r) {
            console.time("timer"); 
            if(req.body.algo === "basic") {
                analysis.basicAlgo(r["posts"],"AFINN.json", null, req.body.load, req.body.amplification, req.body.ponderationParPhrase, req.body.ponderationParNombre, req.body.moyenne, req.body.tfidf, function(f) {
                    console.log("feeling serv" + f.global_score);
                    r.tag = req.params.tag;
                    //score remis sur 20 (arbitraire)
                    //r.score = (f.global_score/req.query.nbPosts)*20;
                    r.score = f.global_score;
                    r.positivityByType = f.positivityByType;
                    r.topPosts=f.topPosts;
                    delete r.related[r.tag];
                    console.timeEnd("timer");
                    console.log('enter rendering');
                    res.render("analyse.ejs", r);
                });
            } else {
                analysis.customAlgo(r["posts"],"AFINN.json", req.body.script, function(f) {
                    console.log("feeling serv" + f.global_score);
                    r.tag = req.params.tag;
                    //score remis sur 20 (arbitraire)
                    //r.score = (f.global_score/req.query.nbPosts)*20;
                    r.score = f.global_score;
                    r.positivityByType = f.positivityByType;
                    r.topPosts=f.topPosts;
                    delete r.related[r.tag];
                    
                    console.log('enter rendering');
                    res.render("analyse.ejs", r);
                });            
            }

        });


});
    
});

app.get('/analyse/:tag', function(req, res, next) {
    if (req.query.nbPosts == undefined) {
        req.query.nbPosts = 400;
    }
    var list = [];

    var results = analysis.getResults(req.params.tag, 0, 1, req.query.nbPosts / 20, list).then(function() {
        // log the details to the user 
        console.log('fetched all posts for Sentiment Analysis');
        
        analysis.traitement(list, null, function(r) {

            analysis.basicAlgo(r["posts"],"AFINN.json", null, undefined, undefined, undefined, undefined, undefined, function(f) {
                console.log("feeling serv" + f.global_score);
                r.tag = req.params.tag;
                //score remis sur 20 (arbitraire)
                //r.score = (f.global_score/req.query.nbPosts)*20;
                r.score = f.global_score;
                r.positivityByType = f.positivityByType;
                r.topPosts=f.topPosts;
                delete r.related[r.tag];
                
                console.log('enter rendering');
                res.render("analyse.ejs", r);
            });

        });
    });

});

app.get('/test', function(req, res, next) {
    analysis.test();
    if (req.query.tag != undefined) {
        var url = "/test/" + req.query.tag;
        var nbPosts = req.query.nbPosts;
        if (nbPosts<=0 || nbPosts == undefined) nbPosts = 400;
        if (nbPosts != 400) {
            url += "?nbPosts=" + nbPosts;
        }
        res.redirect(url);
    }
    else {
        next();
    }
});

app.get('/test/:tag', function(req, res, next) {
    if (req.query.nbPosts == undefined) {
        req.query.nbPosts = 400;
    }
    res.render("test.ejs", {tag : req.params.tag, nbPosts : req.query.nbPosts});
});

app.get('/:page', function(req, res, next) {
    fs.access(__dirname + '/views/' + req.params.page + '.ejs', function(err) {
        if (err) {
            res.status(404);
            console.error('404 : /' + req.params.page);
            res.render('404.ejs', {
                page: req.params.page
            });
            return;
        }
        res.render(req.params.page + ".ejs", req.query);
    });
});

// Quand un client se connecte, on le note dans la console
io.sockets.on('connection', function (socket) {
    socket.on('param', function (data) {
        var list = [];
        var results = analysis.getResults(data.tag, 0, 1, data.nbPosts / 20, list, socket).then(function() {
            // log the details to the user 
            console.log('fetched all posts for Sentiment Analysis');
            
            analysis.traitement(list, socket, function(r) {
    
                analysis.basicAlgo(r["posts"],"AFINN.json", socket, undefined, undefined, undefined, undefined, undefined, function(f) {
                    r.tag = req.params.tag;
                    console.log('test Serv render');
                    r.score = f.global_score;
                    r.positivityByType = f.positivityByType;
                    r.topPosts=f.topPosts;
                    delete r.related[r.tag];
                    /*[
                        ['Type', 'Positiv', 'Negativ'],
                        ['Text', 1000, 400],
                        ['Photo', 1170, 460],
                        ['Quote', 660, 1120],
                        ['Link', 1030, 540]
                    ]*/
                    console.log('enter rendering');
                    res.render("analyse.ejs", r);
                });
    
            });
        });
    });
});

app.listen(app.get('port'), function() {
    console.log('App is running, server is listening on port ', app.get('port'));
});