var twit = require("twit");
var config = require("./config.js");
var mongoose = require("mongoose");

var user = process.argv[2];
var T = new twit(config);

var Schema = mongoose.Schema;
var TweetSchema = new Schema({
    id: Number,
    id_str: String,
    user: String,
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

async function checkUser(user) {
    let last_tweet = '0';

    console.log('start user check');

    await User.findOne({ 'screen_name': user }, function (err, person) {
        if (err) { console.log(err) } else {
            if (!person) {
                console.log('User not found, creating new user ' + user);
                createUser(user);
            } else {
                last_tweet = person.last_tweet;
            }
        }
    });

    return last_tweet;
}

function createUser(user) {
    var user = new User({
        screen_name: user,
        last_tweet: '0'
    });

    try {
        user.save();
        console.log('User created: ' + user.screen_name);
    }
    catch (err) {
        console.log('Error creating user: ' + user.screen_name + ' ' + err);
    }
}

async function getTimeline(user) {
    mongoose.connect('mongodb://127.0.0.1/tweetkeeper');
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));

    await db.once('open', function () {
        console.log("Connection Successful!");
    });

    let last_tweet = await checkUser(user);

    var params = {
        screen_name: user,
        trim_user: true,
        tweet_mode: 'extended',
        count: 5,
        since_id: last_tweet
    }

    await T.get('statuses/user_timeline', params, processTweets);

    db.close(function () {
        console.log('Mongoose disconnected');
    })
}
getTimeline(user);

setInterval(function () { getTimeline(user) }, 10000);
