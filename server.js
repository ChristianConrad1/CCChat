var express = require('express');
var app = express();
//var server = require('http').Server(app);
var server = require('http').Server(app);
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var fs = require('fs');
var flash = require('connect-flash');
var session = require('cookie-session');
var bcrypt = require('bcryptjs');
var database = require('./config/database.js')
var io = require('./config/socketio.js');
var helmet = require('helmet');
//socket





app.use(express.static(path.join(__dirname, 'public')));

app.enable('trust proxy');
/*
app.use(function(req, res, next) {
  if (req.secure) {
    // request was via https, so do no special handling
    next();
  } else {
    // request was via http, so redirect to https
    res.redirect('https://' + req.headers.host + req.url);
  }
});
*/
app.use(helmet());
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json({
  limit: '5mb'
}));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '5mb'
}));

app.set('view engine', 'ejs'); // set up ejs for templating


// required for passport
app.use(session({
  secret: 'blaaa',
  name: 'jsessionid',
  cookie: {
    secure: true,
    httpOnly: true
  }
})); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session
require('./routes.js')(app, passport);
require('./config/passport')(passport);


var port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;

server.listen(port, function() {
  console.log("Server listening on: " + port);
});

io.attach(server);
io.set('transports', ['websocket']);
