var sentiment = require('sentiment');
var tumblr = require('tumblr.js');
var client = tumblr.createClient({
		  consumer_secret: 'mWKUO9CpIDaDSpVbHoczOTYU21A9U6lsCPINihdu7XCXpwsXP3',
		  consumer_key: 'EvG2TLatERj96hQgH5cmMK1EXQOUpR37WRqkgyHdZPArug9qX4',
		  token: '4LWlYlVjXW1XhMkKC05oFaF0UY9ZhlBv770CEZGIQHicsJ2Xk7',
		  token_secret: 'GjchewKEn6fcHtQAC8lbvcTmKUwSDHq53JlcuzKNdaJ3xQpMGu'
	});

//Requête simple de 20 posts
exports.getResultsIntermediaires = function(the_tag,timestamp, callback){
	
	var res = [];

	client.tagged(the_tag, { limit: 20, before : timestamp },function (err, data) {
		res = res.concat(data);
		callback(res);
	});
	
	
};

//Accumulation de requêtes
exports.getResults = function(the_tag, timestamp, iter, list) {
    console.log('Tag: ' + the_tag);
    var deferred = Promise.defer();
    var iteration = 0;

    exports.getResultsIntermediaires(the_tag, timestamp, function(response) {

            var responseBody = response; // Objet réponse tumblr

            list.push(response); // On accumule les posts

            if (iter < 5) {
                iteration = iter + 1;
                time = responseBody[responseBody.length - 1];
                if (typeof time !== 'undefined') {
                    time = time.timestamp;
                    exports.getResults(the_tag, time, iteration, list)
                        .then(function() {
                            deferred.resolve();
                        });
                } else {
                    deferred.resolve();
                }
            }else {
                deferred.resolve();
            }
        }
    );
    return deferred.promise;
}

//Algorithme basique avec dictionnaire AFINN
exports.basicAlgo = function(res,callback){
	console.log('enter basicAlgo');
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

//Algorithme prenant en compte le nombre de like
exports.likesAlgo = function(res,callback){
    var deferred = Promise.defer();
	console.log('enter likesAlgo');
	var feeling,
		global_score = 0;
	for(var post in res){
			for(var p in post){
				actualpost=res[post][p];
				if(typeof actualpost !== 'undefined' && actualpost !== null){
					var feel = sentiment(actualpost.summary.toString()).score*(1+actualpost.note_count); //Chaque like compte comme un avis similaire
					console.log('Feel : '+feel);
					var deferred = Promise.defer();
					if(feel > 1){
						global_score += Math.log(feel).then(function() {
                            deferred.resolve();})}
					if(feel < 1){
						global_score += -Math.log(Math.abs(feel)).then(function() {
                            deferred.resolve();})}
					else{
						defered.resolve();}
				}
			}
	}
	console.log('Feeling : '+global_score);
	callback(global_score);
	return deferred.promise;
}

