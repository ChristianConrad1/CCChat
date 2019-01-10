// load all the things we need
var LocalStrategy = require('passport-local').Strategy;

var database = require('./database.js');
var io = require('./socketio.js');
// expose this function to our app using module.exports
module.exports = function(passport) {

  // Passport session setup.
  passport.serializeUser(function(user, done) {
    console.log("serializing " + user);
    done(null, user);
  });

  passport.deserializeUser(function(obj, done) {
    console.log("deserializing " + obj);
    done(null, obj);
  });

  passport.use('local-signup', new LocalStrategy({
      passReqToCallback: true
    }, //allows us to pass back the request to the callback
    function(req, username, password, done) {

      if (isValid(req.body.username)) {
        if (req.body.username.length > 0 && req.body.username.indexOf(" ") == -1) { //check if there is already a user with this name saved
          database.localReg(req.body.username, req.body.password, function(user) {
            if (user) {
              done(null, user);
              console.log('[DEBUG-SERVER] Signup successful!');
            } else {
              return done(null, false, req.flash('signupMessage', 'That username is already taken.'));
              console.log('[DEBUG-SERVER] Signup NOT successful!');
            }
          });
        } else {
          return done(null, false, req.flash('signupMessage', 'Signup NOT successful!'));
          console.log('[DEBUG-SERVER] Signup NOT successful!');
        }
      } else {
        return done(null, false, req.flash('signupMessage', 'Username not valid'));
      }
    }
  ));

// checks if User exists and if he is already logged in with another instance
  passport.use('local-signin', new LocalStrategy({
    passReqToCallback: true
  }, //allows us to pass back the request to the callback
  function(req, username, password, done) {
    let userAlreadyInChat = io.isUserinChat(username);
    if (!userAlreadyInChat) {
      if (isValid(req.body.username)) {
        if (req.body.username.length > 0 && req.body.username.indexOf(" ") == -1) {
          database.localAuth(username, password, function(user) {
            if (user) {
              done(null, user);
              console.log('[DEBUG-SERVER] Signin successful!');
            } else {
              return done(null, false, req.flash('loginMessage', 'Password and User didnt match!'));
            }
          });
        } else {
          return done(null, false, req.flash('loginMessage', 'Password and User didnt match!'));
          console.log('[DEBUG-SERVER] Signin NOT successful!');
        }
      } else {
        return done(null, false, req.flash('loginMessage', 'Username not valid'));
      }
    } else {
      return done(null, false, req.flash('loginMessage', 'You are already logged in with another instance'));
    }
  }
));
};

function isValid(str) {
  return !/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(str);
}
