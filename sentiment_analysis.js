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
exports.getResultsIntermediaires = function(the_tag,timestamp, callback){
	
	var res = [];

	client.tagged(the_tag, { limit: 20, before : timestamp },function (err, data) {
		res = res.concat(data);
		callback(res);
	});
	
	
};

exports.getResults=function(the_tag, timestamp,iter, list) {
	console.log('Tag: '+the_tag);
    var deferred = Promise.defer();
	var iteration=0;
    
    exports.getResultsIntermediaires(the_tag,timestamp,function(response) {
        
        var responseBody = "";  // will hold the response body as it comes
        
        // join the data chuncks as they come
       
        responseBody.concat(response);
			//console.log(response);
			
            list.push(response);
            
            if(iter<5) {iteration=iter+1;
                exports.getResults(the_tag,timestamp, iteration, response)
                .then(function() {
                    deferred.resolve();
                });
            }
            else {
                deferred.resolve();
				
            }
        }
    
	
	
	);
    return deferred.promise;
}

var list = [];
exports.getResults('Trump',0,0,list)
.then(function() {
    // log the details to the user 
    console.log('fetched all posts for Sentiment Analysis');
    console.log('all of the following posts have been loaded');
    console.log(list);
});




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