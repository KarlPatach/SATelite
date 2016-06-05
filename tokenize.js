/**
 * Remove special characters and returns an array of tokens (words).
 *
 * @param   {string}  input
 *
 * @return  {array}
 */
 
var fs = require("fs");
var async = require("async");
/* ORIGINAL
module.exports = function (input) {
    return input
        .toLowerCase()
        .replace(/[^a-z0-9á-úñäâàéèëêïîöôùüûœç\- ]+/g, '')
        .replace('/ {2,}/',' ')
        .split(' ');
};
*/


exports.tokenize_words = function (input) {
    return input
        .toLowerCase()
        .replace('/ {2,}/',' ')
        .split(' ');
};



exports.tokenize_phrases = function (input) {
	
	var output = input;
	
	var emoticons = fs.readFileSync('./emoticons.txt','utf8').split(); //TODO supprimer retours chariot
	for(var i = 0; i<emoticons.length; i++)
		output.replace(emoticons[i],emoticons[i]+'.');
      
    return output
        .toLowerCase()
        .replace('/ {2,}/',' ')
        .split('/[\.\!\?]+/');
}

