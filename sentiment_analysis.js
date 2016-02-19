var sentiment = require('sentiment');
var tumblr = require('tumblr.js');
var client = tumblr.createClient({
		  consumer_secret: 'mWKUO9CpIDaDSpVbHoczOTYU21A9U6lsCPINihdu7XCXpwsXP3',
		  consumer_key: 'EvG2TLatERj96hQgH5cmMK1EXQOUpR37WRqkgyHdZPArug9qX4',
		  token: '4LWlYlVjXW1XhMkKC05oFaF0UY9ZhlBv770CEZGIQHicsJ2Xk7',
		  token_secret: 'GjchewKEn6fcHtQAC8lbvcTmKUwSDHq53JlcuzKNdaJ3xQpMGu'
	});


	/*
var dataLoaded = function(res){
		console.log('Done !');
		return res;
}
	
var loadData = function(err,data,res,callback){
		console.log('Data loaded');
		res = res.concat(data);
		callback(res);		
}
*/


exports.getResults = function(the_tag,callback){
	console.log("\n======== NEW ANALYSIS ===\nTag detected : "+the_tag);
	var res = [];
	console.log('enter getResults');
	client.tagged(the_tag, { limit: 50 },function (err, data) {
		res = res.concat(data);
		callback(res);
	});
};

exports.basicAlgo = function(res,callback){
	console.log('enter getFeeling');
	var feeling,
		global_score = 0;
	for(var post in res){
			global_score += sentiment(res[post].summary.toString()).score;
	}
	console.log('Feeling : '+global_score);
	callback(global_score);
}




/*	client.tagged(the_tag, { limit: 100 },function (err, data) {
		console.log('Data loaded');
		res = res.concat(data);
		dataLoaded(data);
	});
	
	*/