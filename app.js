//Chargement des modules
var express = require('express');
var stylus = require('stylus');
var nib = require('nib');
var url = require('url');
var bodyparser = require('body-parser');
var querystring = require('querystring');
var analysis = require('./sentiment_analysis.js');
var favicon = require('serve-favicon');


function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}


var app = express();


//Chargement des middlewares
app.set('views', __dirname + "/views")
app.set('view engine','jade')
app.use(favicon(__dirname + '/public/images/favicon.ico'))
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({extended : true}))
app.use(stylus.middleware(
	{ src: __dirname + '/public'
	  , compile: compile
	  }
))
app.use(express.static(__dirname + '/public'))



//Routing
app.get('/',function(req,res){
	res.render('index',
	{title : 'Sentiment Analysis on Tumblr',
	message : 'Enter a tag you want to analyze :'})
	}
)
.get('/result',function(req,res){
	var params = querystring.parse(url.parse(req.url).query);
	
	if( 'tag' in params){
		var list = [];

		var results = analysis.getResults(params['tag'],function(results){
				var feeling = analysis.basicAlgo(results,function(f){
					console.log('enter rendering');
					res.render('result',
						{title : 'Sentiment Analysis on Tumblr',
						message : 'Enter a tag you want to analyze :',
						feeling : f}
						);
					})
				}
		);
	}
})
.post('/*', function(req, res) {
    var tag = req.body.tag;
	res.redirect('/result?tag='+tag);
})

//Execution
app.listen(8080);