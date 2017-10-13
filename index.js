var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var dl = require('delivery');
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');


var users = new Array();
//socket
io.on('connection', function(socket) {
  socket.on('create user', function(username) {
    var found = users.some(function(el) {
      return el.username === username;
    });
    if (found) {
      socket.emit('failure');
    } else {
      users.push({
        username: username,
        id: socket.id
      });
      socket.username = username;
      socket.broadcast.emit('new user', username);
      socket.emit('success', username);
      io.emit('get users', users);
    }
  });
  socket.on('chat message', function(msg) {
    if (msg.partner == "irc") {
      io.emit('chat message', {
        username: socket.username,
        message: msg.message,
        timestamp: msg.timestamp
      });
    } else {

      var partner = users.find(x => x.username === msg.partner);
      console.log(partner);
      socket.to(partner.id).emit('get private message', {
        message: msg.message,
        username: socket.username,
        timestamp: msg.timestamp,
      });
      socket.emit('send private message', {
        message: msg.message,
        username: socket.username,
        timestamp: msg.timestamp,
        partner: partner.username
      });
    }
  });

  socket.on('send file', function(msg) {
    console.log('received base64 file from' + socket.username);
    // socket.broadcast.emit('base64 image', //exclude sender
    io.sockets.emit('send file', //include sender

      {
        username: socket.username,
        file: msg.file,
        fileName: msg.fileName
      }

    );
  });

  socket.on('disconnect', function() {
    socket.broadcast.emit('delete user', socket.username);
    var index = users.indexOf(socket.username);
    users.splice(index, 1);
    io.emit('get users', users);
  });

});




app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

server.listen(3000, function() {
  console.log("Listening on: 3000");
});
