/**
 * Created by LeoDT on 13-11-18.
 */

var request = require('request'),
    _ = require('underscore'),
    events = require('events'),
    fs = require('fs');

var user_id = 'leojoy710@gmail.com',
    secret;

var letters = 'ETAONRISHDLFCMUGYPWBVKJXQZ'.split('').reverse();

var word, word_limit, word_count = 0, guess_limit, guess_count = 0, dict;

function Dict(){
    var str = '',
    build_reg = function(s, allowed){
        // Reg like this ^[^et][^et]e[^et]$

        var right_letters = s.match(/[^\*]/ig),
            guessed = _.difference(letters, allowed),
            all = _.union(right_letters, guessed).join('');

        return new RegExp('^' + s.replace(/\*/ig, '[^' + all + ']') + '$', 'igm');
    };
    this.get_a_letter = function(s, allowed){
        var r = build_reg(s, allowed),
            words = str.match(r),
            letter_freq = {},
            letter, count = 0;

        _.each(words, function(w){
            _.each(w.split(''), function(l){
                if(letter_freq[l]){
                    letter_freq[l] += 1;
                }
                else{
                    letter_freq[l] = 1;
                }
            });
        });

        _.each(letter_freq, function(c, l){
            // get the max count letter which not guessed before
            if(c >= count && _.include(allowed, l.toUpperCase())){
                letter = l;
                count = c;
            }
        });

        console.log('get letter ' + letter + ' and count ' + count);
        return letter ? letter.toUpperCase() : undefined;
    };

    this.init = function(callback){
        fs.readFile('./words', 'utf-8', function(err, data){
            if(err) throw err;

            str = data;

            callback();
        });
    };
}

function post(body, options){
    if(options.auth){
        body = _.extend(body, {
            userId: user_id,
            secret: secret
        });
    }
    request.post({
        url: 'http://strikingly-interview-test.herokuapp.com/guess/process',
        json: true,
        body: body
    }, function(error, response, body){
        if(body && body.status == '200' && options.callback){
            if(body.message){
                console.log(body.message);
            }
            options.callback(body);
        }
        else{
            console.log(error);
        }
    });
}

function start_new_game(callback){
    console.log('starting new game');
    post({
        userId: user_id,
        action: 'initiateGame'
    }, {
        auth: false,
        callback: function(json){
            secret = json['secret'];
            word_limit = json['data']['numberOfWordsToGuess'];

            console.log('started');
            callback();
        }
    });
}

function next_word(callback){
    console.log('get next word');
    post({
        action: 'nextWord'
    }, {
        auth: true,
        callback: function(json){
            word = json['word'];
            console.log('get a ' + word);
            guess_limit = json['data']['numberOfGuessAllowedForThisWord'];
            word_count += 1;
            guess_count = 0;

            callback();
        }
    });
}

function guess(letter, callback){
    console.log('guess ' + letter);
    post({
        action: 'guessWord',
        guess: letter.toUpperCase()
    }, {
        auth: true,
        callback: function(json){
            word = json['word'];
            guess_count += 1;
            console.log('after guess ' + word);

            callback();
        }
    });
}

function finish(){
    console.log('guess finished');
    post({
        action: 'submitTestResults'
    }, {
        auth: true,
        callback: function(json){
            console.log(json);
        }
    });
}

function guess_a_word(letters, callback){
    next_word(function(){
        var letter_emitter = new events.EventEmitter();
        letter_emitter.on('guess_one', function(){
            var next_letter;
            if(word.search(/[^\*]/ig) != -1){
                // there is a right letter in the word
                next_letter = dict.get_a_letter(word, letters);
                if(!next_letter){
                    next_letter = letters.pop()
                }
                else{
                    letters = _.without(letters, next_letter);
                }
            }
            else{
                next_letter = letters.pop();
            }

            if(guess_count < guess_limit && word.indexOf('*') != -1){
                console.log('guess ' + guess_count);
                guess(next_letter, function(){
                    letter_emitter.emit('guess_one');
                });
            }
            else{
                //guess finished
                callback();
            }
        });
        letter_emitter.emit('guess_one');
    });
}

start_new_game(function(){
    console.log('start callback');
    var word_emitter = new events.EventEmitter();
    word_emitter.on('guess_one', function(){
        if(word_count < word_limit){
            console.log('guess word number ' + word_count);
            guess_a_word(_.clone(letters), function(){
                word_emitter.emit('guess_one');
            });
        }
        else{
            finish();
        }
    });

    dict = new Dict();
    dict.init(function(){
        word_emitter.emit('guess_one');
    });
});