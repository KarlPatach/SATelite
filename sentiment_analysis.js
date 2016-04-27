var sentiment = require('sentiment');
var tumblr = require('tumblr.js');
var client = tumblr.createClient({
    consumer_secret: 'mWKUO9CpIDaDSpVbHoczOTYU21A9U6lsCPINihdu7XCXpwsXP3',
    consumer_key: 'EvG2TLatERj96hQgH5cmMK1EXQOUpR37WRqkgyHdZPArug9qX4',
    token: '4LWlYlVjXW1XhMkKC05oFaF0UY9ZhlBv770CEZGIQHicsJ2Xk7',
    token_secret: 'GjchewKEn6fcHtQAC8lbvcTmKUwSDHq53JlcuzKNdaJ3xQpMGu'
});

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

exports.getDictionnaries = function(callback) {



}

//Algorithme basique avec dictionnaire 
exports.basicAlgo = function(res, mon_dico, callback) {

    var dico = require("sentiment/build/" + mon_dico);


    var positivityByType = [
        ['Type', 'Positiv', 'Negativ'],
        ['Text', 0, 0],
        ['Photo', 0, 0],
        ['Quote', 0, 0],
        ['Link', 0, 0]
    ];

    console.log('enter basicAlgo');

    var feeling,
        global_score = 0;


    for (var i = 0; i < res.length; i++) {
        var tmpscore = sentiment(res[i][0]).score;

        //phrase = res[i][0] / inject ballec / callback is good
        if (typeof res[i][0] === 'undefined') res[i][0] = '';
        //if (typeof callback === 'undefined') callback = null;
        
        // /!\ a enlever
        var tokens = [res[i][0]];
        // Storage objects
        /*if(négation ou multiplicateur coché)
            var tokens      = tokenize.tokenize_phrases(res[i][0]);
        else
            var tokens = [res[i][0]];    */

        var score = 0,
            words = [],
            positive = [],
            negative = [];
            
       

        // Iterate over tokens
        var len = tokens.length;
        while (len--) {
            /*
                var mots = tokenize.tokenize_words(tokens);
                var len2 = mots.length;
                while(len2--){
                      var obj = tokens[len];
                        var item = dico[obj];
                        if (!dico.hasOwnProperty(obj)) continue;
                
                        words.push(obj);
                        if (item > 0) positive.push(obj);
                        if (item < 0) negative.push(obj);
                
                        score += item;
                }
                
                
            */

            var obj = tokens[len];
            var item = dico[obj];
            if (!dico.hasOwnProperty(obj)) continue;

            words.push(obj);
            if (item > 0) positive.push(obj);
            if (item < 0) negative.push(obj);

            score += item;
        }

        // Handle optional async interface
        var result = {
            score: score,
            comparative: score / tokens.length,
            tokens: tokens,
            words: words,
            positive: positive,
            negative: negative
        };

        //if (callback === null) return result;
        /*process.nextTick(function() {
            callback(null, result);
        });*/
        switch (res[i][1]) {
            case "text":
                if (tmpscore > 0) {
                    positivityByType[1][1] += tmpscore;
                }
                else {
                    positivityByType[1][2] += -tmpscore;
                };
                break;
            case "photo":
                if (tmpscore > 0) {
                    positivityByType[2][1] += tmpscore;
                }
                else {
                    positivityByType[2][2] += -tmpscore;
                };
                break;
            case "quote":
                if (tmpscore > 0) {
                    positivityByType[3][1] += tmpscore;
                }
                else {
                    positivityByType[3][2] += -tmpscore;
                };
                break;
            case "link":
                if (tmpscore > 0) {
                    positivityByType[4][1] += tmpscore;
                }
                else {
                    positivityByType[4][2] += -tmpscore;
                };
                break;
            default:
                break;
        }
        global_score += tmpscore;
    }
    
    var resultat = [global_score, positivityByType];
    console.log('Feeling : ' + resultat[0]);
    callback(resultat);
}

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