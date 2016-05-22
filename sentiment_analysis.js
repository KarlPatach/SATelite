var sentiment = require('./node_modules/sentiment');
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
        before: timestamp,
        filter: "text"
    }, function(err, data) {
        res = res.concat(data);
        callback(res);
    });


};


//Accumulation de requêtes, fonction récursive
exports.getResults = function(the_tag, timestamp, iter, iterTot, list, socket) {
    var deferred = Promise.defer();
    var iteration = 0;
    //fonction qui récupère les posts
    exports.getResultsIntermediaires(the_tag, timestamp, function(response) {

        var responseBody = response; // Objet réponse tumblr
        //20 posts dans response
        list.push(response); // On accumule les posts

        if (iter < iterTot) {
            console.log('Tag: ' + the_tag + "      " + iter);
            // socket.emit('progress',{getResults : iter*20, getResultsTot : iterTot*20} );
            iteration = iter + 1;
            //on change le timestamp pour les requêtes futures
            var time = responseBody[responseBody.length - 1];
            if (typeof time !== 'undefined') {
                time = time.timestamp;
                //Si la requête est définie et non nulle (il reste des posts antérieurs)
                exports.getResults(the_tag, time, iteration, iterTot, list, socket)
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





//Algorithme écrit par l'utilisateur sous forme de string
exports.customAlgo = function(res, dico, stringFunction, socket, callback) {
    console.log("enter custom algo");
    //on appelle la fonction avec les posts, le dictionnaire choisi, le code de l'utilisateur
    var userFonct = new Function('res', 'dico', stringFunction);
    try {
        //on retourne le résultat si le code est valide
        callback(userFonct(res, dico));
    }
    catch (e) {
        var message = "Error : " + e.name + "\nError message : " + e.message;
        console.log(message); //Erreur de syntaxes/variables mal nommées etc... non prévues par les tests
        //Changement de callback possible
        callback(["error", message])
    }
}

//TF IDF
exports.getTFIDF = function(res) {
    console.log("Getting Keywords");
    var idftab = {};
    var tftab = {};

    //La première fois qu'on trouve un mot on le range, sinon on incrémente le nb de fois qu'on le trouve
    for (var i = 0; i < res.length; i++) {

        if (typeof res[i].texte === 'undefined') res[i].texte = '';
        var tokens = tokenize.tokenize_words(res[i].texte);
        for (var k = 0; k < tokens.length; k++) {
            if (!idftab.hasOwnProperty(tokens[k])) {
                idftab[tokens[k]] = 1;
            }
            else
                idftab[tokens[k]]++;

            if (!tftab.hasOwnProperty(tokens[k])) {
                var tmp = {}
                tftab[tokens[k]]=tmp
                tftab[tokens[k]][i] = 1;
         
            }
            else {
                if (!tftab[tokens[k]].hasOwnProperty(i)) {
                    tftab[tokens[k]][i] = 1;
                    
                }
                else {
                    tftab[tokens[k]][i]++;
                    
                }
            }
        }
        for (var k = 0; k < tokens.length; k++) {
            tftab[tokens[k]][i] = tftab[tokens[k]][i] / tokens.length;
        }


    }
    for (var l in idftab) { //ca il aime pas
        idftab[l] = Math.log((res.length * 20) / idftab[l])
    }

    var tf_idf = {
        tf: tftab,
        idf: idftab
    }
    return tf_idf;
}

exports.test = function() {

    var texte = fs.readFileSync("./fichierstests/265,1Mo.txt", 'utf8');
    //console.log(texte);
    var array = eval(texte);
    console.time("test");
    var lol = traitement(array, null, function(r) {
                basicAlgo(r["posts"],"AFINN.json", null, true, false, false, false, false, false, function(f) {
                    console.log(f);
                });
            });
    console.timeEnd("test");
    return;
}

//Algorithme basique avec dictionnaire 
exports.basicAlgo = function(res, mon_dico, socket, negation, amplification, ponderationParPhrase, ponderationParNombre, moyenne, tfidf, callback) {
    if (negation === undefined)
        negation = false
    if (amplification === undefined)
        amplification = false
    if (ponderationParNombre === undefined)
        ponderationParNombre = false
    if (ponderationParPhrase === undefined)
        ponderationParPhrase = false
    if (moyenne === undefined)
        moyenne = false

    console.log("logneg1 " + negation)

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
        global_score = 0;

    //on ne charge les dictionnaires que si l'option est cochée
    if (amplification) {
        var intensifiers = fs.readFileSync('./intensifiers.txt', 'utf8').replace(/[\n\r]+/g, ' ').split(' ');
        console.log("Intensifiers OK" + intensifiers[0]);
    }
    if (negation) {
        var negationWords = fs.readFileSync('./negationWords.txt', 'utf8').replace(/[\n\r]+/g, ' ').split(' ');
        console.log("Negation Words OK" + negationWords[0]);
    }
    if (tfidf) {
        var tf_idf = exports.getTFIDF(res)
    }



    //On boucle sur les posts
    var topPosts = [];
    for (var i = 0; i < res.length; i++) {
        var scorePost = 0;
        //socket.emit('progress', {basicAlgo : i , basicAlgoTot : res.length});
        if (typeof res[i].texte === 'undefined') res[i].texte = '';

        //On tokenize soit en phrases, soit en mots suivant les options
        if (negation || amplification)
            var tokens = tokenize.tokenize_phrases(res[i].texte);
        else
            var tokens = tokenize.tokenize_words(res[i].texte);



        var scorintensifier = 1;
        var scorePhrase = 0;
        var nbMots = 0;
        var scornegation = 1
        var scorintensifier = 1
            //on boucle sur les phrases (1 si tokenisation par mots, n si tokenisation par phrase)
        for (var j = 0; j < tokens.length; j++) {

            if (negation || amplification) {
                //on transforme les phrases en mots
                var words = tokenize.tokenize_words(tokens[j]);
                for (var k = 0; k < words.length; k++) {
                    var item = 0;
                    nbMots++;
                    var obj = words[k];

                    //si le mot fait partie des mots de négation
                    if (negation && negationWords.indexOf(obj) !== -1)
                        scornegation = -scornegation
                        //si le mot est un intensifier
                    if (amplification && intensifiers.indexOf(obj) !== -1)
                        scorintensifier = 2;

                    //si le mot existe dans le dictionnaire
                    if (!dico.hasOwnProperty(obj)) continue;

                    //on attribue le score du dictionnaire
                    var item = dico[obj];
                    if (tfidf)
                        item = item * tf_idf.idf[obj] * tf_idf.tf[obj][i]
                        //calcul final du mot dans la phrase
                    scorePhrase += item * scornegation * scorintensifier;


                }
            }
            else {
                nbMots++;
                //donne le score du mot
                var obj = tokens[j];
                var item = dico[obj];
                if (!dico.hasOwnProperty(obj)) continue;
                if (tfidf)
                        item = item * tf_idf.idf[obj] * tf_idf.tf[obj][i]
                scorePhrase += item;
            }


            //retire un mot de score nul
            if (scorePhrase === 0) {
                nbMots--;
            }
        }

        //limite l'importance des scores trop hauts 
        if (ponderationParPhrase) {
            if (scorePhrase > 0) {
                scorePhrase = Math.log(1 + scorePhrase);
            }
            else {
                scorePhrase = -Math.log(1 + Math.abs(scorePhrase));
            }
        }

        //rajoute de l'influence aux posts likes par beaucoup de gens
        if (ponderationParNombre) {
            scorePhrase = scorePhrase * Math.log(res[i].note_count + 2);;
        }

        //moyenne le score par post par phrase, en essayant de moyenner le poids des mots
        ////////////////////////////////////////////////////////////////////////////////////////////

        //scorePhrase= scorePhrase/(nbMots*1);

        //donne le score global du post
        scorePost += scorePhrase;
        global_score += scorePhrase;

        //"range" le score du post dans son type
        switch (res[i].type) {
            case "text":
                if (scorePost > 0) {
                    positivityByType[1][1] += scorePost;
                }
                else {
                    positivityByType[1][2] += -scorePost;
                };
                break;
            case "photo":
                if (scorePost > 0) {
                    positivityByType[2][1] += scorePost;
                }
                else {
                    positivityByType[2][2] += -scorePost;
                };
                break;
            case "quote":
                if (scorePost > 0) {
                    positivityByType[3][1] += scorePost;
                }
                else {
                    positivityByType[3][2] += -scorePost;
                };
                break;
            case "link":
                if (scorePost > 0) {
                    positivityByType[4][1] += scorePost;
                }
                else {
                    positivityByType[4][2] += -scorePost;
                };
                break;
            default:
                break;
        }

        //on récupère les meilleurs posts de type text
        if (res[i].type == "text") {
            for (var current = 0; current < 10; current++) {
                if (topPosts[current] == null || (Math.abs(scorePost) > Math.abs(topPosts[current]["score"]))) {
                    res[i]["score"] = scorePost;
                    topPosts[current] = res[i];
                    break;
                }
            }
        }
    }

    if (moyenne) {
        global_score = 100 * (global_score / (res.length));
    }

    //on construit l'objet de résultat
    var resultat = {
        "global_score": global_score,
        "positivityByType": positivityByType,
        "topPosts": topPosts
    };
    console.log('Feeling : ' + resultat.global_score);
    callback(resultat);
}


//Formalisation des données en traitant les posts récupérés
exports.traitement = function(list, socket, callback) {
    console.log('entree traitement');

    //l'objet a remplir au final
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




    //on boucle sur les chunks
    for (var i = 0; i < list.length; i++) {
        //on bloucle sur les posts (20 par chunk)
        for (var j = 0; j < list[i].length; j++) {
            //socket.emit('progress', {traitement : (i*20)+j, traitementTot : list.length * 20})

            var actualpost = list[i][j];
            var type = actualpost['type'];
            var note = actualpost["note_count"];

            //get the 5 best posts (improvable)
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

            //On récupère les mots importants par type de post, par champ de post retourné par l'API
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

            //on remplit l'objet a retourner
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