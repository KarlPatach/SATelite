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
        
        var responseBody = response;  // will hold the response body as it comes
        
        // join the data chuncks as they come
       
        //responseBody.concat(response);
			//console.log(response);
			//for(var post in response){
			//list.push(post);
	//}
			list.push(response);
            
            if(iter<20) {iteration=iter+1;
				time=responseBody[responseBody.length-1];
				if ( typeof time !== 'undefined')
{		time=time.timestamp;
  //do stuff if query is defined and not null
  exports.getResults(the_tag,time, iteration, list)
                .then(function() {
                    deferred.resolve();
                });
}
else {
                deferred.resolve();
				
            }
                
            }
            else {
                deferred.resolve();
				
            }
        }
    
	
	
	);
    return deferred.promise;
}

/*
var list = [];
exports.getResults('Trump',0,0,list)
.then(function() {
    // log the details to the user 
    console.log('fetched all posts for Sentiment Analysis');
    console.log('all of the following posts have been loaded');
    console.log(list);
	var feeling = analysis.basicAlgo(list,function(f){
				console.log('enter rendering');
				res.render('result',
					{title : 'Sentiment Analysis on Tumblr',
					message : 'Enter a tag you want to analyze :',
					feeling : f}
				);
			});
});
*/


exports.basicAlgo = function(res,callback){
	console.log('enter getFeeling');
	var feeling,
		global_score = 0;
	for(var post in res){
			for(var p in post){
				actualpost=res[post][p];
				if(typeof actualpost !== 'undefined' && actualpost !== null)
				global_score += sentiment(actualpost.summary.toString()).score;
			}
			
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