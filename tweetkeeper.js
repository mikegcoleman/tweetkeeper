var twit = require("twit");
var config = require("./config.js");
var mongoose = require("mongoose");

var T = new twit(config);
var params = {};
var user='';

var Schema = mongoose.Schema;
var TweetSchema = new Schema({
    id: Number,
    id_str: String,
    screen_name: String,
    created_at: String,
    full_text: String,
    in_reply_to_id_str: String,
    in_reply_to_screen_name: String,
    is_deleted: Boolean
});

var UserSchema = new Schema({
    screen_name: String,
    last_tweet: String
});

var Tweet = mongoose.model('Tweet', TweetSchema);
var User = mongoose.model('User', UserSchema);

async function processTweets(err, tweets) {
    console.log('process tweets for: ' + user);

    // loop through tweets, and save off each one
    if (tweets.length != 0) {
        if (!err) {
            for (var i = 0; i < tweets.length; i++) {
                await saveTweet(tweets[i]);
            }
            await updateLastTweet(tweets[0]);
        }
        else {
            console.log('Something went wrong retrieving user timeline: ' + err);
        }
    } else {
        console.log('no tweets to process');
    }
    // update the last tweet to the first tweet we processed

}


function updateLastTweet(tweet) {

    User.findOneAndUpdate(
        { "screen_name": user },
        { $set: { "last_tweet": tweet.id_str } },
        { new: true },
        function (err, doc) {
            if (err) {
                console.log('Error updating last tweet ID: ' + err)
            }
        }
    )
}

function saveTweet(aTweet) {
    var tweet = new Tweet({
        id_str: aTweet.id_str,
        user: user,
        created_at: aTweet.created_at,
        full_text: aTweet.full_text,
        in_reply_to_id_str: aTweet.in_reply_to_status_id_str,
        in_reply_to_screen_name: aTweet.in_reply_to_screen_name,
        is_deleted: false
    });

    try {
        console.log('Saving Tweet #: ' + tweet.id_str);
        tweet.save();
    }
    catch (err) {
        console.log('error savig tweet: ' + err);
    }
}

async function getTimeline() {
    mongoose.connect('mongodb://127.0.0.1/tweetkeeper');
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));

    await db.once('open', function () {
        console.log("DB Connection Successful!");
    });

    var users =   await User.find({}, function(err, users){
        if (err) { err => console.log() } 
    });

    for (i=0; i < users.length; i++){ 
        if (users[i].last_tweet == '0') {
                params = {
                screen_name: users[i].screen_name,
                trim_user: true,
                tweet_mode: 'extended',
                count: 50,
            }
        } else {
                params = {
                screen_name: users[i].screen_name,
                trim_user: true,
                tweet_mode: 'extended',
                count: 50,
                since_id: users[i].last_tweet
            }
        }

        user = params.screen_name;

        await T.get('statuses/user_timeline', params, processTweets);
    }
    db.close(function () {
        console.log('DB Connection Closed');
    })
}
getTimeline();

setInterval(function () { getTimeline() }, 180000);
