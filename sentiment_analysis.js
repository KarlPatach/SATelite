var sentiment = require('sentiment');
var tumblr = require('tumblr.js');
var client = tumblr.createClient({
    consumer_secret: 'mWKUO9CpIDaDSpVbHoczOTYU21A9U6lsCPINihdu7XCXpwsXP3',
    consumer_key: 'EvG2TLatERj96hQgH5cmMK1EXQOUpR37WRqkgyHdZPArug9qX4',
    token: '4LWlYlVjXW1XhMkKC05oFaF0UY9ZhlBv770CEZGIQHicsJ2Xk7',
    token_secret: 'GjchewKEn6fcHtQAC8lbvcTmKUwSDHq53JlcuzKNdaJ3xQpMGu'
});
var tokenize  = require('sentiment/lib/tokenize.js');
var fs = require('fs');

//Requête simple de 20 posts
exports.getResultsIntermediaires = function(the_tag, timestamp, callback) {

    var res = [];

    client.tagged(the_tag, {
        limit: 20,
        before: timestamp
    }, function(err, data) {
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
        //20 posts dans response
        list.push(response); // On accumule les posts

        if (iter > 1) {
            iteration = iter - 1;
            var time = responseBody[responseBody.length - 1];
            if (typeof time !== 'undefined') {
                time = time.timestamp;
                //do stuff if query is defined and not null
                exports.getResults(the_tag, time, iteration, list)
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
    });
    return deferred.promise;
}


//Vérifies le bon format de la fonction utilisateur
exports.checkString = function(string,callback){
	
	var isValid = true;
	
	if((string.match(/\(/g)||[]).length != (string.match(/\)/g)||[]).length) //Toutes les parenthèses doivent être fermées
		isValid = false;
	if((string.match(/\{/g)||[]).length != (string.match(/\}/g)||[]).length) //Toutes les curlybrackets doivent être fermés
		isValid = false;
	
	return isValid;

}


//Algorithme écrit par l'utilisateur sous forme de string
exports.customAlgo = function(res, dico, stringFunction, callback) {

	var resValid = checkString(stringFunction);

	var userFonct = new Function('res','dico',stringFunction);
	
	if(resValid){
		try{
			callback(userFonct(res,dico));
		}
		catch(e){
			//Erreur de syntaxes/variables mal nommées etc... non prévues par les tests
		}
	}
	else
		callback(null);
	
}


//Algorithme basique avec dictionnaire 
exports.basicAlgo = function(res, mon_dico, callback) {

    console.log('enter basicAlgo');

	//Initialisation variables
    var dico = require("sentiment/build/" + mon_dico),
		positivityByType = [
        ['Type', 'Positive', 'Negative'],
        ['Text', 0, 0],
        ['Photo', 0, 0],
        ['Quote', 0, 0],
        ['Link', 0, 0]
			],
		feeling,
        global_score = 0,
		negationOn = false;
		intensifyOn = false;
		
        if(intensifyOn)
			var intensifiers = fs.readFileSync('./intensifiers.txt','utf8').split(); //TO DO supprimer retours charriot
		else if(negationOn)
			var negationWords = fs.readFileSync('./intensifiers.txt','utf8').split(); //TODO supprimer retours charriot
		
	
	//On boucle sur les posts
    for (var i = 0; i < res.length; i++) {
	
        if (typeof res[i][0] === 'undefined') res[i][0] = '';
		
        //On tokenize soit en phrases, soit en mots suivant les options
		if(negationOn || intensifyOn)
		    var tokens = tokenize.tokenize_phrases(res[i][0]);
		else
            var tokens = tokenize.tokenize_words(res[i][0]); 

		
		for(var j = 0; j< tokens.length; j++){
			
			var item = 0;
			
			if(negationOn || intensifyOn){
				
				var negation = 1;
				var amplification  = 1;
				
				words = tokenize.tokenize_words(token);
				for(var k = 0; k<words.length; k++){
				
					var obj = words[k];
				
					if (negationWords.indexOf(obj)!==-1)
						negation=-negation
					
					if (intensifiers.indexOf(obj)!==-1) //TODO intensifiers sous forme de hashmap
						amplification = 2;
						
					if (!dico.hasOwnProperty(obj)) continue;
					
					if(amplification !== 1)
						score += item*negation;
					else{
						global_score += item*negation*amplification;
						amplification = 1;
					}
				}
			}
			else{

				var obj = tokens[j];
				var item = dico[obj];
				if (!dico.hasOwnProperty(obj)) continue;

				global_score += item;

			}
			
			//Positivity by Type
			switch (res[i][1]) {
				case "text":
					if (item > 0) {
						positivityByType[1][1] += item;
					}
					else {
						positivityByType[1][2] += -item;
					};
					break;
				case "photo":
					if (item > 0) {
						positivityByType[2][1] += item;
					}
					else {
						positivityByType[2][2] += -item;
					};
					break;
				case "quote":
					if (item > 0) {
						positivityByType[3][1] += item;
					}
					else {
						positivityByType[3][2] += -item;
					};
					break;
				case "link":
					if (item > 0) {
						positivityByType[4][1] += item;
					}
					else {
						positivityByType[4][2] += -item;
					};
					break;
				default:
					break;
			}
		}
    }
    var resultat = [global_score, positivityByType];
    console.log('Feeling : ' + resultat[0]);
    callback(resultat);
}


//Formalisation des données en traitant les posts récupérés
exports.traitement = function(list, callback) {
    console.log('entree traitement');

    var result = {
        "posts": [],
        "related": {},
        "positivityByType": [],
        "influents": [], //le plus influent sur l'algo
        "topBlogs": [null, null, null, null, null], //le plus like
        "types": {
            "text": 0,
            "photo": 0,
            "quote": 0,
            "link": 0,
            "video": 0,
            "answer": 0,
            "audio": 0
        },
        "pictures": [],
        "tag": null,
        "nbPosts": 0
    };
	
	var words  = {};
	
    var count = 0;

    console.log("taille " + list[0].length);




    for (var i = 0; i < list.length; i++) { // requete in list){
        for (var j = 0; j < list[i].length; j++) { // in requete){
            var actualpost = list[i][j];
            var type = actualpost['type'];
            var note = actualpost["note_count"];

            //console.log("boucle actualpost");
            //get the 5 best posts (improvable)


            //Top blog
            if (result["topBlogs"][4] == null || note > result["topBlogs"][4]["note_count"]) {
                if (result["topBlogs"][3] == null || note > result["topBlogs"][3]["note_count"]) {
                    if (result["topBlogs"][2] == null || note > result["topBlogs"][2]["note_count"]) {
                        if (result["topBlogs"][1] == null || note > result["topBlogs"][1]["note_count"]) {
                            if (result["topBlogs"][0] == null || note > result["topBlogs"][0]["note_count"]) {
                                result["topBlogs"][4] = result["topBlogs"][3];
                                result["topBlogs"][3] = result["topBlogs"][2];
                                result["topBlogs"][2] = result["topBlogs"][1];
                                result["topBlogs"][1] = result["topBlogs"][0];
                                result["topBlogs"][0] = actualpost;
                            }
                            else {
                                result["topBlogs"][4] = result["topBlogs"][3];
                                result["topBlogs"][3] = result["topBlogs"][2];
                                result["topBlogs"][2] = result["topBlogs"][1];
                                result["topBlogs"][1] = actualpost;
                            }
                        }
                        else {
                            result["topBlogs"][4] = result["topBlogs"][3];
                            result["topBlogs"][3] = result["topBlogs"][2];
                            result["topBlogs"][2] = actualpost;
                        }
                    }
                    else {
                        result["topBlogs"][4] = result["topBlogs"][3];
                        result["topBlogs"][3] = actualpost;
                    }
                }
                else {
                    result["topBlogs"][4] = actualpost;
                }
            }


            var texte = "";

            for (var key in actualpost) {
                switch (key) {

                    case "title":
                        texte += " " + actualpost['title'];
                        break;

                    case "tags":
                        actualpost["tags"].forEach(function(tag) {
                            if (!result["related"][tag])
                                result["related"][tag] = 1;
                            else {
                                result["related"][tag] += 1;
                            }
                        });
                        break;

                    case "type":
                        if (type == 'text') {
                            texte += " " + actualpost['body'];
                            result["types"]["text"]++;
                        }
                        else if (type == 'photo') {
                            texte += " " + actualpost['caption'];
                            //console.log("test type photo");
                            var tmp = {};
                            tmp['src'] = actualpost["photos"][0]["alt_sizes"][0]["url"];
                            tmp['postUrl'] = actualpost["post_url"];
                            tmp['title'] = actualpost["blog_name"];
                            result["pictures"][result["types"]["photo"]] = tmp;
                            result["types"]["photo"]++;

                        }
                        else if (type == 'video') {
                            texte += " " + actualpost['caption'];
                            result["types"]["video"]++;
                        }
                        else if (type == 'quote') {
                            texte += " " + actualpost['text'] + " " + actualpost['reblog']['comment'];
                            result["types"]["quote"]++;
                        }
                        else if (type == 'link') {
                            texte += " " + actualpost['description'] + " " + actualpost['excerpt'];
                            result["types"]["link"]++;
                        }
                        else if (type == 'audio') {
                            texte += " " + actualpost['description'] + " " + actualpost['excerpt'];
                            result["types"]["audio"]++;
                        }
                        else if (type == 'answer') {
                            texte += " " + actualpost['description'] + " " + actualpost['excerpt'];
                            result["types"]["answer"]++;
                        }
                        break;

                    default:
                        break;
                }
            }
            var tmp2 = [texte, actualpost.type];
            result["posts"][count] = tmp2;
            count++;
        }

    }
    console.log(result["tags"]);
    result["nbPosts"] = count;
    console.log('sortie traitement');
    callback(result);
}