/**
 * Created by LeoDT on 13-11-18.
 */

var request = require('request'),
    _ = require('underscore'),
    events = require('events');

var user_id = 'leojoy710@gmail.com',
    secret;

var letter_freq = 'ETAONRISHDLFCMUGYPWBVKJXQZ'.split('').reverse();

var word, word_limit, word_count = 0, guess_limit, guess_count = 0;

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
        body: body,
        proxy: 'http://127.0.0.1:8888'
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

function guess_a_word(letters, callback){
    next_word(function(){
        var letter_emitter = new events.EventEmitter();
        letter_emitter.on('guess_one', function(){
            if(guess_count < guess_limit && word.indexOf('*') != -1){
                console.log('guess ' + guess_count);
                guess(letters.pop(), function(){
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
            guess_a_word(_.clone(letter_freq), function(){
                word_emitter.emit('guess_one');
            });
        }
    });

    word_emitter.emit('guess_one');
});