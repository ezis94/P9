var express = require("express");
var passport = require("passport");
var router = express.Router();
var u2f = require("u2f");
var https = require("https");
var randomstring = require("randomstring");

var request = require('request'); // "Request" library
var GoogleTokenProvider = require('refresh-token').GoogleTokenProvider;
var APP_ID = "https://localhost:4433";
var SpotifyWebApi = require('spotify-web-api-node');

var fs = require("fs");
var Users = {};
var User1 = require("../models/user");
var Song = require("../models/song");
var Song2 = require("../models/song2");

var Car = require("../models/user_car");
var googleMapsClient = require('@google/maps').createClient({
    clientId: '897949743059-29ad8f8jb800tcr6snvp809bj8odglsu.apps.googleusercontent.com',
    clientSecret: 'yjMA6z7XJPDF3gseGEMAeTyT',
});

var tempo_handle;
var User;
var Sessions = {};

//ROLE STUFF-----------------------------------------------------------------------------------------

/*const permission = ac.can('user').createOwn('video');
console.log(permission.granted);    // —> true
console.log(permission.attributes); // —> ['*'] (all attributes)

permission = ac.can('admin').updateAny('video');
console.log(permission.granted);    // —> true
console.log(permission.attributes); // —> ['title']*/
//----------------------------------------------------------------------------------------------------
// server.js
// where your node app starts

// init project
var qs = require('querystring');
var express = require('express');

// init Spotify API wrapper

var SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
    clientId : "8b9fff06998742eda4e4c23e1b89e2d0",
    clientSecret : "bb00e746afe14aa2b48d9dae4f0b3923",
});

const jssdkscopes = ["streaming", "user-read-birthdate", "user-read-email", "user-read-private", "user-modify-playback-state"];
const redirectUriParameters = {
    client_id: "8b9fff06998742eda4e4c23e1b89e2d0",
    response_type: 'token',
    scope: jssdkscopes.join(' '),
    redirect_uri: encodeURI('http://localhost:4433'),
    show_dialog: true,
}

const redirectUri = `https://accounts.spotify.com/authorize?${qs.stringify(redirectUriParameters)}`;

function authenticate(callback) {
    spotifyApi.clientCredentialsGrant()
        .then(function(data) {
            console.log('The access token expires in ' + data.body['expires_in']);
            console.log('The access token is ' + data.body['access_token']);

            callback instanceof Function && callback();

            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body['access_token']);
        }, function(err) {
            console.log('Something went wrong when retrieving an access token', err.message);
        });
}
authenticate();

// http://expressjs.com/en/starter/static-files.html
router.use(express.static('public'));

router.get("/search", function (request, response) {
    reAuthenticateOnFailure((failure) => {
        spotifyApi.searchTracks(request.query.query, { limit: 2 })
        .then(function(data) {
            response.send(data.body);
        }, failure);
})
});

const reAuthenticateOnFailure = (action) => {
    action(() => {
        authenticate(action);
})
}

router.get("/spotifyRedirectUri", function (request, response) {
    response.send(JSON.stringify({
        redirectUri
    }, null, 2))
});

router.get("/features", function (request, response) {
    reAuthenticateOnFailure((failure) => {
        spotifyApi.getAudioFeaturesForTrack(request.query.id)
        .then(function(data) {
            response.send(data.body);
        }, failure);
});
});
router.get("/analysis", function (request, response) {
    reAuthenticateOnFailure((failure) => {
        spotifyApi.getAudioAnalysisForTrack(request.query.id)
        .then(function(data) {
            response.send(data.body);
        }, failure);
});
});
router.get("/playlistanalysis", function (request, response) {
    reAuthenticateOnFailure((failure) => {

        spotifyApi.getPlaylistTracks(request.query.name,request.query.id)
            .then(function(data) {
                console.log("Here i am " + JSON.stringify(data));

                data.body.items.forEach(function(element) {
                    process.nextTick(function () {
                        Song.findOne({"song.id": element.track.id}, function (err, song) {
                            if (err) return done(err);

                            else {
                                reAuthenticateOnFailure((failure) => {
                                    spotifyApi.getAudioFeaturesForTrack(element.track.id)
                                        .then(function(data) {
                                            reAuthenticateOnFailure((failure) => {
                                                spotifyApi.getAudioAnalysisForTrack(element.track.id)
                                                    .then(function(data2) {
                                                        var newSong = new Song();
                                                       // console.log(data2.body.segments);

                                                        data2.body.segments.forEach(function(art) {
                                                            var temppitch = [];
                                                            var temptim = [];
                                                            var i=0;

                                                            //newSong.song.notes[i].timestamp=art.start;
                                                            art.pitches.forEach(function(art2) {
                                                                temppitch[i] = art2;
                                                                i++;
                                                                //newSong.song.notes[i].pitches.push(art2);
                                                            });
                                                            i=0;

                                                            art.timbre.forEach(function(art2) {
                                                               // newSong.song.notes[i].timbre.push(art2);
                                                                temptim[i] = art2;
                                                                i++
                                                            });
                                                            newSong.song.notes.push({timestamp:art.start, pitches: temppitch, timbre: temptim});
                                                        });
                                                        newSong.song.id = element.track.id;
                                                        newSong.song.name = element.track.name;
                                                        element.track.artists.forEach(function(art) {
                                                            newSong.song.artists.push(art.name);
                                                        });
                                                        newSong.song.acousticness=data.body.acousticness;
                                                        newSong.song.danceability=data.body.danceability;
                                                        newSong.song.energy=data.body.energy;
                                                        newSong.song.instrumentalness=data.body.instrumentalness;
                                                        newSong.song.loudness=data.body.loudness;
                                                        newSong.song.valence=data.body.valence;

                                                        newSong.save(function (err) {
                                                            if (err) throw err;
                                                            else  console.log("done");

                                                        });                                                    }, failure);
                                            });

                                        }, failure);
                                });

                            }
                        });
                    });                });
            }, failure);


});});
router.post("/spotifyanalysis", function (req, res) {


        console.log(req.body);
        var seder_array= [];
 for(var i=0;i<req.body.rec_songs.length;i++){

 }
  res.send("hi");

    });

router.get("/playnewlistanalysis", function (request, response) {
    process.nextTick(function () {
        Song.find({},function(err, element) {
            if (err) return done(err);

            else {
            //    result.forEach(function(element) {
//var i=7
for(var i=360;i<373;i++) {
    var newSong = new Song2();

    newSong.song.notes = element[i].song.notes;
    newSong.song.id = element[i].song.id;
    newSong.song.name = element[i].song.name;
    newSong.song.artists = element[i].song.artists;
    var loud = 0;
    if (element[i].song.loudness > -23) {
        loud = (element[i].song.loudness + 23) / 23;
        newSong.song.arousal = element[i].song.acousticness * (-0.8) * (-0.65) + element[i].song.energy * (0.94) * (0.86) + loud * (0.88) * (0.86);
    }
    else {
        loud = (element[i].song.loudness + 60) / 37;
        newSong.song.arousal = element[i].song.acousticness * (-0.8) * (-0.65) + element[i].song.energy * (0.94) * (0.86) + loud * (-0.81) * (-0.65);
    }

    newSong.song.depth = element[i].song.danceability * (-0.54) * (-0.57) + element[i].song.instrumentalness * (0.84) * (0.89);

    newSong.song.valence = element[i].song.valence;

    newSong.save(function (err) {
        if (err) throw err;
        else console.log("done");

    });
}
      //          });


            }
        });
    });
});
// listen for requests :)

router.get("/", function(req, res, next) {
  if (!req.cookies.userid) {
    res.cookie("userid", Math.floor(Math.random() * 100000));
  }
  res.render("index", { title: "Express" });
});

router.get("/login", function(req, res, next) {
  res.render("login.ejs", { message: req.flash("loginMessage") });
});





router.get("/signup", function(req, res) {
  res.render("signup.ejs", { message: req.flash("signupMessage") });
});

router.get("/profile", isLoggedIn, function(req, res) {
        console.log(req.user);
        var date = new Date().getTime();

        var user1 = req.user;

        if (req.user.spotify.expires <= date) {
            console.log(date);
            var authOptions = {
                url: 'https://accounts.spotify.com/api/token',
                headers: {'Authorization': 'Basic ' + (new Buffer('8b9fff06998742eda4e4c23e1b89e2d0:bb00e746afe14aa2b48d9dae4f0b3923').toString('base64'))},
                form: {
                    grant_type: 'refresh_token',
                    refresh_token: req.user.spotify.refresh
                },
                json: true
            };
            request.post(authOptions, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    var access_token = body.access_token;
                    var expire_in = body.expires_in;
                    console.log(JSON.stringify(body));
                    process.nextTick(function () {
                        User1.findOne({"local.email": user1.local.email}, function (err, user) {
                            if (err) return done(err);
                            if (!user)
                                return done(null, false, req.flash("loginMessage", "No user found1."));
                            else {

                                user.spotify.access = access_token;
                                var date = new Date().getTime();

                                var t = parseInt(expire_in, 10) * 1000;
                                console.log(t);
                                user.spotify.expires = date + t;
                                user.save(function (err) {
                                    if (err) throw err;
                                });
                            }
                        });
                    });
                }
            });
        }


        res.render("profile.ejs", {user: req.user});

});
router.get("/new_profile", isLoggedIn, function(req, res) {
    console.log(req.user);
    var date = new Date().getTime();

    var user1 = req.user;

    if (req.user.spotify.expires <= date) {
        console.log(date);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            headers: {'Authorization': 'Basic ' + (new Buffer('8b9fff06998742eda4e4c23e1b89e2d0:bb00e746afe14aa2b48d9dae4f0b3923').toString('base64'))},
            form: {
                grant_type: 'refresh_token',
                refresh_token: req.user.spotify.refresh
            },
            json: true
        };
        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var access_token = body.access_token;
                var expire_in = body.expires_in;
                console.log(JSON.stringify(body));
                process.nextTick(function () {
                    User1.findOne({"local.email": user1.local.email}, function (err, user) {
                        if (err) return done(err);
                        if (!user)
                            return done(null, false, req.flash("loginMessage", "No user found1."));
                        else {

                            user.spotify.access = access_token;
                            var date = new Date().getTime();

                            var t = parseInt(expire_in, 10) * 1000;
                            console.log(t);
                            user.spotify.expires = date + t;
                            user.save(function (err) {
                                if (err) throw err;
                            });
                        }
                    });
                });
            }
        });
    }
    res.render("new_profile.ejs", {user: req.user});

});
router.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});




router.post(
  "/signup",
  passport.authenticate("local-signup", {
    successRedirect: "/new_profile",
    failureRedirect: "/signup",
    failureFlash: true
  })
);

router.post(
  "/login",
  passport.authenticate("local-login", {
    successRedirect: "/new_profile",
    failureRedirect: "/login",
    failureFlash: true
  })
);

router.post(

    "/changerole", function(req, res) {
        var permission = ac.can(req.user.local.ROLE).updateAny('role');
        if (permission.granted){
            process.nextTick(function () {
                User1.findOne({"local.email": req.body.id}, function (err, user) {
                    if (err) return res.send(err);
                    else {
                        user.local.ROLE=req.body.role;
                        user.save(function (err) {
                            if (err) throw err;
                            res.send(JSON.stringify({stat: true}));
                        });
                    }
                });
            });
        }
    });




router.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope:[ "email","user_birthday","user_location","user_hometown","user_likes","user_tagged_places"] })
);

router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect: "/profile",
    failureRedirect: "/"
  })
);

router.get("/auth/twitter", passport.authenticate("twitter"));

router.get(
  "/auth/twitter/callback",
  passport.authenticate("twitter", {
    successRedirect: "/profile",
    failureRedirect: "/"
  })
);

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/profile",
    failureRedirect: "/"
  })
);

router.get('/auth/spotify',
    passport.authenticate('spotify',{ scope: ["user-read-birthdate", "user-read-email", "user-read-private ","user-modify-playback-state", "playlist-read-private","streaming","user-follow-read","user-read-currently-playing"] }),
    function(req, res){
        // The request will be redirected to spotify for authentication, so this
        // function will not be called.
    });

router.get('/auth/spotify/callback',
    passport.authenticate('spotify', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/new_profile');
    });

router.get("/api/register_request", function(req, res) {
  var authRequest = u2f.request(APP_ID);
  console.log(authRequest);
  Sessions[req.cookies.userid] = { authRequest: authRequest };
  res.send(JSON.stringify(authRequest));
});

router.get("/api/sign_request", function(req, res) {
  //var s=JSON.parse(req.user.local);
  console.log("THIS IS HANLD    " + req.user.local.handle.length);
  var authRequest = [];
  for (i = 0; i < req.user.local.handle.length; i++) {
    authRequest[i] = u2f.request(APP_ID, JSON.parse(req.user.local.handle[i]));
    authRequest[i].challenge = authRequest[0].challenge;
  }
  //var authRequest = u2f.request(APP_ID, JSON.parse(req.user.local.handle[0]));

  console.log("THIS IS AUTH    " + JSON.stringify(authRequest));

  Sessions[req.cookies.userid] = { authRequest: authRequest[0] };
  res.send(JSON.stringify(authRequest));
});



// google ---------------------------------

// send to google to do the authentication
router.get('/connect/google', passport.authorize('google', { scope : ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly'],accessType: 'offline', approvalPrompt: 'force'  }));

// the callback after google has authorized the user

router.get('/connect/google/callback',
    passport.authorize('google', {
        successRedirect : '/profile',
        failureRedirect : '/'
    }));
router.get('/unlink/google', isLoggedIn, function(req, res) {
    var user          = req.user;
    user.google.token = undefined;
    user.google.refresh = undefined;
    user.google.email = undefined;
    user.google.expires = undefined;
    user.google.id = undefined;
    user.google.name = undefined;

    user.save(function(err) {
        res.redirect('/profile');
    });
});
router.get('/unlink/spotify', isLoggedIn, function(req, res) {
    var user          = req.user;
    user.spotify.access = undefined;
    user.spotify.refresh = undefined;
    user.spotify.expires = undefined;
    user.spotify.spotifyId = undefined;

    user.save(function(err) {
        res.redirect('/profile');
    });
});
router.post(
  "/authorize",
  passport.authenticate("local-auth", {
    successRedirect: "/profile_car",
    failureRedirect: "/loginu2fcar",
    failureFlash: true
  })
);
router.post("/api/register", function(req, res) {
  console.log(req.body);
  var checkRes = u2f.checkRegistration(
    Sessions[req.cookies.userid].authRequest,
    req.body
  );
  console.log(checkRes);
  if (checkRes.successful) {
    Users[req.cookies.userid] = {
      publicKey: checkRes.publicKey,
      keyHandle: checkRes.keyHandle
    };
    User = { publicKey: checkRes.publicKey, keyHandle: checkRes.keyHandle };

    res.send(JSON.stringify({ stat: true, usr: User }));
  } else {
    res.send(checkRes.errorMessage);
  }
  console.log(User);
});

router.post("/api/authenticatecar", function(req, res) {
  tempo_handle = req.body.keyHandle;
  var checkRes;
  var j = req.user.local.handle.indexOf(JSON.stringify(req.body.keyHandle));
  console.log(j);
  checkRes = u2f.checkSignature(
    Sessions[req.cookies.userid].authRequest,
    req.body,
    req.user.local.publickey[j]
  );
  console.log(checkRes);
  if (checkRes.successful) {
    res.send({ success: true, secretData: req.user.local.handle[j] });
  } else {
    res.send({ error: checkRes.errorMessage });
  }
});
router.post("/api/authenticate", function(req, res) {
  tempo_handle = req.body.keyHandle;
  var checkRes;
  var j = req.user.local.handle.indexOf(JSON.stringify(req.body.keyHandle));
  console.log(j);
  checkRes = u2f.checkSignature(
    Sessions[req.cookies.userid].authRequest,
    req.body,
    req.user.local.publickey[j]
  );
  console.log(checkRes);
  if (checkRes.successful) {
    res.send({ success: true, secretData: "euueueueu" });
  } else {
    res.send({ error: checkRes.errorMessage });
  }
});

router.post("/spotify_status", function(req, res) {
    process.nextTick(function() {
        User1.findOne({ "local.email": req.user.local.email }, function(err, user) {
            if (err) return done(err);
            if (!user)
                return done(null, false, req.flash("loginMessage", "No user found."));
            else {




                console.log( req.body.mapon);
                User1.update({"local.email": req.user.local.email}, {
                    "spotify.enabled": req.body.spoton,

                }, function(err, numberAffected, rawResponse) {
                    console.log(JSON.stringify(user));

                    res.send(JSON.stringify({ stat: true}));
                });








            }
        });
    });
});

module.exports = router;

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/");
}
