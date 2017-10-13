$(function() {
  var socket = io();
  var partner = "irc";

  $('#loginform').submit(function(e) {
    e.preventDefault();
    socket.emit('create user', $('#username').val());
  });

  $('#chatform').submit(function(e) {
    e.preventDefault();
    var timestamp = new Date();
    var message = $('#m').val()
    socket.emit('chat message', {
      message: message,
      timestamp: timestamp,
      partner: partner,
    });
    $('#m').val('');
    return false;
  });


  $('#users').on('click', 'li', function() {
    var username = $(this).text();
    if (!$("#" + username + "tab").length) {
      $('.tabs').append("<li class='tab col s3' id='" + username + "tab'><a href='#" + username + "chat'>" + username + "</a></li>");
      $('#top').append("<ul id='" + username + "chat'></ul>");
    }
  });

  $('.tabs').on('click', 'li', function() {
    if ($(this).attr('id') != "irc") {
      var substring = $(this).attr('id');
      partner = substring.slice(0, -3);
    } else {
      partner = "irc";
    }
  });

  socket.on('success', function(username) {
    $('#login').hide();
    $('#chat').show();
    localStorage.setItem("username", username);
  });

  socket.on('failure', function() {
    $('#failure').text('The Username has already been taken.')
  });

  socket.on('new user', function(username) {
    $('#messages').append($('<li>').text(username + " has connected"));
  });

  socket.on('delete user', function(username) {
    $('#messages').append($('<li>').text(username + " is disconnected"));
  });

  socket.on('chat message', function(msg) {
    var date = new Date(msg.timestamp);
    $('#messages').append($('<li>').text(date.getHours() + ":" + date.getMinutes() + " " + msg.username + ": " + msg.message));
  });

  socket.on('get private message', function(msg) {
    if (!$("#" + msg.username + "tab").length) {
      $('.tabs').append("<li class='tab col s3' id='" + msg.username + "tab'><a href='#" + msg.username + "chat'>" + msg.username + "</a></li>");
      $('#top').append("<ul id='" + msg.username + "chat'></ul>");
    }
    var date = new Date(msg.timestamp);
    $("#" + msg.username + "chat").append($('<li>').text(date.getHours() + ":" + date.getMinutes() + " " + msg.username + ": " + msg.message));
  });

  socket.on('send private message', function(msg) {
    console.log(msg);
    var date = new Date(msg.timestamp);
    $("#" + msg.partner + "chat").append($('<li>').text(date.getHours() + ":" + date.getMinutes() + " " + msg.username + ": " + msg.message));
  });

  socket.on('get users', function(users) {
    $('#users').empty();
    users.forEach(function(element) {
      if (element.username != localStorage.getItem("username")) {
        $('#users').append($('<li>').text(element.username));
      }
    });
  });

  socket.on('send file', function(msg) {
    $('#messages').append($("<li><a href='" + msg.file + "' download='" + msg.fileName + "' target='_blank'>" + msg.fileName + "</a></li>"));
    console.log(msg);
  })


  $('#fileupload').on('change', function(e) {
    e.preventDefault();
    var file = $("input[type=file]")[0].files[0];
    readThenSendFile(file);
  });


  function readThenSendFile(data) {
    var reader = new FileReader();
    reader.onload = function(evt) {
      var msg = {};
      msg.username = username;
      msg.file = evt.target.result;
      msg.fileName = data.name;
      socket.emit('send file', msg);
    };
    reader.readAsDataURL(data);
  }
});
