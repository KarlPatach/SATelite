var sentiment = require('sentiment');
var tumblr = require('tumblr.js');
var client = tumblr.createClient({
    consumer_secret: 'mWKUO9CpIDaDSpVbHoczOTYU21A9U6lsCPINihdu7XCXpwsXP3',
    consumer_key: 'EvG2TLatERj96hQgH5cmMK1EXQOUpR37WRqkgyHdZPArug9qX4',
    token: '4LWlYlVjXW1XhMkKC05oFaF0UY9ZhlBv770CEZGIQHicsJ2Xk7',
    token_secret: 'GjchewKEn6fcHtQAC8lbvcTmKUwSDHq53JlcuzKNdaJ3xQpMGu'
});
var tokenize = require('sentiment/lib/tokenize.js');
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
    var deferred = Promise.defer();
    var iteration = 0;

    exports.getResultsIntermediaires(the_tag, timestamp, function(response) {

        var responseBody = response; // Objet réponse tumblr
        //20 posts dans response
        list.push(response); // On accumule les posts

        if (iter > 1) {
            console.log('Tag: ' + the_tag + "      " + iter);

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
var checkString = function(string, callback) {

    var isValid = true;


    return isValid;

}


//Algorithme écrit par l'utilisateur sous forme de string
exports.customAlgo = function(res, dico, stringFunction, callback) {
    console.log("enter custom algo");
    var resValid = checkString(stringFunction);
    //var resValid = true;
    var userFonct = new Function('res', 'dico', stringFunction);

    try {
        callback(userFonct(res, dico));
        if (!resValid)
            throw new Error("Invalid return statement.");
    }
    catch (e) {
        var message = "Error : " + e.name + "\nError message : " + e.message;
        console.log(message); //Erreur de syntaxes/variables mal nommées etc... non prévues par les tests
        //Changer le callback?
        callback(["error", message])
    }
}


exports.getKeywords = function(res, callback) {
    console.log("Getting Keywords");
    var keywords = {};
    for (var i = 0; i < res.length; i++) {
        var tokens = tokenize.tokenize_words(res[i].texte);
        for (var j = 0; j < tokens.length; j++) {
            if (!keywords.hasOwnProperty(tokens[j])) {
                keywords[tokens[j]] = 1;
            }
            else
                keywords[tokens[j]]++;
        }
    }
    var topWords = []
    console.log("sorting ....");
    Object.keys(keywords).forEach(function(element, key, _array) {
        for (var i = 0; i < 10; i++) {
            if (sentiment(element).score !== 0 && (keywords[element] > keywords[topWords[i]] || topWords[i] == null)) {
                topWords[i] = element;
                break;
            }
        }
    });
    callback(topWords);
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
        negationOn = true,
        intensifyOn = true;

    if (intensifyOn) {
        var intensifiers = fs.readFileSync('./intensifiers.txt', 'utf8').replace(/[\n\r]+/g, ' ').split();
        console.log("Intensifiers OK");
    }
    if (negationOn) {
        var negationWords = fs.readFileSync('./negationWords.txt', 'utf8').replace(/[\n\r]+/g, ' ').split();
        console.log("Negation Words OK");
    }

    
       
    //On boucle sur les posts
    var topPosts = [];
    for (var i = 0; i < res.length; i++) {
        var scorePost = 0;
        if (typeof res[i].texte === 'undefined') res[i].texte = '';

        //On tokenize soit en phrases, soit en mots suivant les options
        if (negationOn || intensifyOn)
            var tokens = tokenize.tokenize_phrases(res[i].texte);
        else
            var tokens = tokenize.tokenize_words(res[i].texte);

        //on boucle sur les phrases (1 || n)
        var negation = 1;
        var amplification = 1;
        var ponderationParPhrase =0;
        var ponderationParNombre = 0;
        var scorePhrase = 0;
        var moyenne=1;
         var nbMots = 0;
        for (var j = 0; j < tokens.length; j++) {
           
            if (negationOn || intensifyOn) {

                var words = tokenize.tokenize_words(tokens[j]);
                for (var k = 0; k < words.length; k++) {
                    var item = 0;
                    nbMots++;
                    var obj = words[k];

                    if (negationWords.indexOf(obj) !== -1)
                        negation = -negation

                    if (intensifiers.indexOf(obj) !== -1) //TODO intensifiers sous forme de hashmap
                        amplification = 2;

                    if (!dico.hasOwnProperty(obj)) continue;

                    var item = dico[obj];
                    
                    
                    if (amplification === 1)
                        scorePhrase += item * negation;
                    else {
                        scorePhrase += item * negation * amplification;
                        amplification = 1;
                    }
                }
            }
            else {
                nbMots++;
                var obj = tokens[j];
                var item = dico[obj];
                if (!dico.hasOwnProperty(obj)) continue;

                scorePhrase += item;
            }

            //Positivity by Type
            switch (res[i].type) {
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
            //retire un mot de score nul
            if(item === 0 ){
                    nbMots--;
                      console.log("nbMots "+nbMots + obj);
                }
        }
        
        //limite l'importance des scores trop hauts 
        if(ponderationParPhrase === 1){
            if(scorePhrase>0){
              scorePhrase = Math.log(1+ scorePhrase);            
            }
            else{
              scorePhrase = -Math.log(1+ Math.abs(scorePhrase)); 
            }
        } 
        
        //rajoute de l'influence aux posts likes par beaucoup de gens
        if(ponderationParNombre === 1){
            scorePhrase= scorePhrase * Math.log(res[i].note_count+2);;
        }
        //moyenne le score par post par phrase, en essayant de moyenner le poids des mots
        scorePhrase= scorePhrase/(nbMots*1);
          
        scorePost += scorePhrase;
        global_score += scorePhrase;

        //on récupère les meilleurs posts de type text
        if (res[i].type == "text") {
            for (var current = 0; current < 10; current++) {
                if (topPosts[current] == null || (Math.abs(scorePost) > topPosts[current]["score"])) {
                    res[i]["score"] = scorePost;
                    topPosts[current] = res[i];
                    break;
                }
            }
        }
    }
    
    /*if(moyenne === 1){
        global_score= 100*(global_score/(res.length));
    }*/
    var resultat = {
        "global_score": global_score,
        "positivityByType": positivityByType,
        "topPosts": topPosts
    };
    console.log('topPost1 : ' + resultat.topPosts[0].type);
    console.log('Feeling : ' + resultat.global_score);
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

    var words = {};

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
            var resultTraitement = {
                "texte": texte,
                "type": actualpost.type,
                "name": actualpost.blog_name,
                "url": actualpost.post_url,
                "score": 0,
                "note_count": actualpost.note_count
            };
            result["posts"][count] = resultTraitement;
            count++;
        }

    }
    console.log(result["tags"]);
    result["nbPosts"] = count;
    console.log('sortie traitement');
    callback(result);
}