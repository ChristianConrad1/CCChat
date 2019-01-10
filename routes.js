var database = require('./config/database.js');
var csurf = require('csurf');
var csrfProtection = csurf({
  cookie: {
    secure: true,
    httpOnly: true
  }
});

module.exports = function(app, passport) {

  // =====================================
  // LOGIN ===============================
  // =====================================
  // show the login form
  app.get('/', /*csrfProtection,*/ function(req, res) {
    // render the page and pass in any flash data if it exists
    res.render('index.ejs', {
      message: req.flash('loginMessage'),
      //    csrfToken: req.csrfToken(),
    });
  });

  app.get('/instanceId', function(req, res) {
    console.log("instance");
    if (process.env.VCAP_APPLICATION) {
      var vcapApp = JSON.parse(process.env.VCAP_APPLICATION);
      var logPrefix = vcapApp.application_name + vcapApp.instance_index;
      res.json(vcapApp);
    } else {
      res.end();
    }
  })

  // process the login form
  app.post('/login', /*csrfProtection,*/ passport.authenticate('local-signin', {
    successRedirect: '/chat', // redirect to the secure chat section
    failureRedirect: '/', // redirect back to the login page if there is an error
    failureFlash: true // allow flash messages
  }));

  // =====================================
  // SIGNUP ==============================
  // =====================================
  // show the signup form
  app.get('/signup', csrfProtection, function(req, res) {

    // render the page and pass in any flash data if it exists
    res.render('signup.ejs', {
      message: req.flash('signupMessage'),
      csrfToken: req.csrfToken(),
    });
  });

  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    //app.post('/signup', csrfProtection, passport.authenticate('local-signup', {
    successRedirect: '/chat', // redirect to the secure chat section
    failureRedirect: '/signup', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }));

  app.post('/upload', function(req, res) {
    database.upload(req, res, function(callback) {
      console.log("Callback: " + callback);
      if (callback == "Success") {
        res.end('{"success" : "Updated Successfully", "status" : 200}');
      } else if (callback == "noface") {
        res.end('{"fail" : "No Face"}');
      }
    });

  });

  app.get('/download', function(req, res) {
    database.download(req, res, function(answer) {
      if (answer) {
        res.status(200);
        res.setHeader("Content-Disposition", 'inline; filename="' + 'profile.jpg' + '"');
        res.write(answer);
        res.end();
        return;
      } else {
        res.status(500);
        res.setHeader('Content-Type', 'text/plain');
        res.write('Halo: ' + err);
        res.end();
        return;
      }
    });

  });
  // =====================================
  // CHAT SECTION =====================
  // =====================================
  // we will want this protected so you have to be logged in to visit
  // we will use route middleware to verify this (the isLoggedIn function)
  app.get('/chat', isLoggedIn, function(req, res) {
    var referer = req.get('referer'); // http header field 'referer' is only filled
    if (referer !== undefined) { //if http request is a redirect from same site
      res.render('chat.ejs', {
        user: req.user // get the user out of session and pass to template
      });
    } else {
      res.redirect('/');
    }
  });


  app.get('/battleships', isLoggedIn, function(req, res) {
    console.log("battleships: " + req.query.enemy);
    res.render('battleships.ejs', {
      user: req.user // get the user out of session and pass to template
    });
  });

  // =====================================
  // LOGOUT ==============================
  // =====================================
  app.get('/logout', function(req, res) {
    req.session = null;
    req.logout();
    res.redirect('/');
  });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on
  if (req.isAuthenticated())
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
}