$(function() {
  var socket = io({
    transports: ['websocket'],
    upgrade: false,
    reconnection: false
  });
  var intervalID;
  var reconnectCount = 0;


  var partner = "irc";
  var notifications = {
    "irc": 0,
  };
  $('.modal').modal();
  updatePicture();

  /*
   * Get current Instance
   */

  $('#instance').click(function() {
    $.getJSON('/instanceId', function(response) {
      console.log("Response");
      console.log(response);
    });
  })


  //sends a message to the server
  $('#chatform').submit(function(e) {
    e.preventDefault();
    let timestamp = new Date();
    let message = $('#m').val()
    socket.emit('chat message', {
      message: message,
      timestamp: timestamp,
      partner: partner,
    });
    $('#m').val('');
    return false;
  });
  //opens a new tab if the user clicks on a username on the list
  $('#users').on('click', 'li', function() {
    let username = $(this).text();
    if (!$("#" + username + "tab").length) {
      openTab(username);
    }
    $('ul.tabs').tabs('select_tab', username + 'chat');
    notifications[username] = 0;
    let selector = "#" + username + "notification";
    $(selector).css('visibility', 'hidden');
  });

  //changes the chat partner by clicking on the tab name
  $('.tabs').on('click', 'li', function() {
    if ($(this).attr('id') != "irc") {
      let substring = $(this).attr('id');
      partner = substring.slice(0, -3);
      notifications[partner] = 0;
      let selector = "#" + partner + "notification";
      $(selector).css('visibility', 'hidden');
    } else {
      partner = "irc";
      notifications.irc = 0;
      $('#ircnotification').css('visibility', 'hidden');
    }
  });

  $('#battleships').on('click', function() {
    var url = "/battleships?enemy=" + partner;
    var win = window.open(url, '_blank ');
    win.focus();
  });

  socket.on('connect', function() {
    socket.emit('connect user', sessionStorage.getItem('username'));
  });

  //if the login fails, the user gets an error message
  socket.on('failure', function(msg) {
    $('#failure').text(msg)
  });

  socket.on('new user', function(username) {
    $('#messages').append($("<li class='message'>").text(username + " has connected"));
  });

  socket.on('delete user', function(username) {
    $('#messages').append($("<li class='message'>").text(username + " is disconnected"));
  });

  //adds the new chat message to message list
  socket.on('chat message', function(msg) {
    let date = new Date(msg.timestamp);

    if (socket.id === msg.userid) { //is sender
      $('#messages').append("<li class='message sender " + msg.mood + "'><div class='messagetop'><span>" + msg.username + "</span><span> " + date.getHours() + ":" + getMinutesWithZero(date.getMinutes()) + "</span></div><div class='messagecontent'><span> " + msg.message + "</span></div>");
    } else { //is one of the recipants
      $('#messages').append("<li class='message recipant " + msg.mood + "'><div class='messagetop'><span>" + msg.username + "</span><span> " + date.getHours() + ":" + getMinutesWithZero(date.getMinutes()) + "</span></div><div class='messagecontent'><span> " + msg.message + "</span></div>");
    }
    $('#top')[0].scrollTop = $('#top')[0].scrollHeight;
    if (partner != "irc") {
      notifications.irc += 1;
      $('#ircnotification').text(notifications.irc);
      $('#ircnotification').css('visibility', 'visible');
    }
  });

  //adds the new private message to message list of the recipant and if neccessary opens the new user tab
  socket.on('get private message', function(msg) {
    if (!$("#" + msg.username + "tab").length) {
      openTab(msg.username);
    }
    let date = new Date(msg.timestamp);
    //class recipant
    $("#" + msg.username + "chat").append("<li class='message recipant " + msg.mood + "'><div class='messagetop'><span>" + msg.username + "</span><span> " + date.getHours() + ":" + getMinutesWithZero(date.getMinutes()) + "</span></div><div class='messagecontent'><span> " + msg.message + "</span></div>");
    $('ul.tabs').tabs();
    if (partner != msg.username) {
      notifications[msg.username] += 1;
      let selector = "#" + msg.username + "notification";
      $(selector).text(notifications[msg.username]);
      $(selector).css('visibility', 'visible');
    }
    $('#top')[0].scrollTop = $('#top')[0].scrollHeight;
  });

  //adds the new private message to message list of the sender
  socket.on('send private message', function(msg) {
    console.log(msg);
    let date = new Date(msg.timestamp);
    //class sender
    $("#" + msg.partner + "chat").append("<li class='message sender " + msg.mood + "'><div class='messagetop'><span>" + msg.username + "</span><span> " + date.getHours() + ":" + getMinutesWithZero(date.getMinutes()) + "</span></div><div class='messagecontent'><span> " + msg.message + "</span></div>");
    $('#top')[0].scrollTop = $('#top')[0].scrollHeight;
  });

  //after each new connected and disconnected user the user list gets updated
  socket.on('get users', function(users) {
    console.log(users);
    $('#users').empty();
    users.forEach(function(element) {
      if (element.username != sessionStorage.getItem("username")) {
        $('#users').append($("<li><span class='userli'>" + element.username + "</span><img class='circle' src='/download?id=" + element.username + "&key=profile.jpg' alt='Missing Template' height='70' width='70'></li>"));
      }
    });
  });

  //when a file is received at a socket endpoint, display a new message with href-link to file
  socket.on('send file', function(msg) {
    if (socket.id === msg.userid) { //is sender
      $('#messages').append($("<li class='message sender'><a href='" + msg.file + "' download='" + msg.fileName + "' target='_blank'>" + msg.fileName + "</a></li>"));
    } else { //is one of the recipants
      $('#messages').append($("<li class='message recipant'><a href='" + msg.file + "' download='" + msg.fileName + "' target='_blank'>" + msg.fileName + "</a></li>"));
    }
    console.log(msg);
  });


  socket.on('get private file', function(msg) {
    if (!$("#" + msg.username + "tab").length) {
      openTab(msg.username);
    }
    let date = new Date(msg.timestamp);
    $("#" + msg.username + "chat").append($("<li class='message recipant'><a href='" + msg.file + "' download='" + msg.fileName + "' target='_blank'>" + msg.fileName + "</a></li>"));
    $('ul.tabs').tabs();
    console.log(msg);
  });

  //when socket enpoint receives a private file, display file-download via href
  socket.on('send private file', function(msg) {
    console.log(msg);
    let date = new Date(msg.timestamp);
    if (socket.id === msg.userid) { //is sender
      $("#" + msg.partner + "chat").append($("<li class='message sender'><a href='" + msg.file + "' download='" + msg.fileName + "' target='_blank'>" + msg.fileName + "</a></li>"));
    } else { //is the recipant
      $("#" + msg.partner + "chat").append($("<li class='message recipant'><a href='" + msg.file + "' download='" + msg.fileName + "' target='_blank'>" + msg.fileName + "</a></li>"));
    }
  });

  socket.on('disconnect', function() {
    console.log("Disconnect");
    intervalID = setInterval(tryReconnect, 4000);
  });

  var tryReconnect = function() {
    ++reconnectCount;
    if (reconnectCount == 5) {
      clearInterval(intervalID);
    }
    console.log('Making a dummy http call to set jsessionid (before we do socket.io reconnect)');
    $.ajax({
      url: '/',
      type: 'GET',
      processData: false,
      contentType: false,
      success: function(data) {
        console.log("http request succeeded");
        //reconnect the socket AFTER we got jsessionid set
        socket.open();
        clearInterval(intervalID);
      },
      error: function(err) {
        console.log("http request failed (probably server not up yet)");

      }
    });

  };

  $('#fileupload input').on('change', function(e) {
    e.preventDefault();
    var file = $("input[type=file]")[0].files[0];

    // 2 mb is max filesize
    if (file.size > 2097152) {
      alert("File size must under 2MB!");
      return;
    }
    readThenSendFile(file);
  });

  //encodes the file with base 64 and sends the filestring to the server
  function readThenSendFile(data) {
    var reader = new FileReader();
    let timestamp = new Date();
    reader.onload = function(evt) {
      let msg = {
        username: sessionStorage.getItem('username'),
        file: evt.target.result,
        fileName: data.name,
        partner: partner,
        timestamp: timestamp
      };
      socket.emit('send file', msg);
    };
    reader.readAsDataURL(data);
  }

  function openTab(username) {
    $('.tabs').append("<li class='tab col s3' id='" + username + "tab'><a href='#" + username + "chat'><span style='visibility: hidden' id='" + username + "notification' class='new badge red' data-badge-caption=''></span>" + username + "</a></li>");
    $('#top').append("<ul id='" + username + "chat' class='messagewindow'><a href='/battleships?enemy=" + username + "' target='_blank' class='battleships btn-floating btn-large waves-effect waves-light red'><i class='material-icons'>videogame_asset</i></a></ul>");
    notifications[username] = 0;
    console.log(notifications);
  }

  function getMinutesWithZero(minutes) {
    return ('0' + minutes).slice(-2);
  }

  $('#pictureupload').on('click', function() {

    var files = $('#upload-input').get(0).files;

    if (files.length > 0) {

      // create a FormData object which will be sent as the data payload in the
      // AJAX request
      var formData = new FormData();

      formData.append('file', files[0], files[0].name);

      var username = sessionStorage.getItem('username');
      formData.append('username', username);
      $.ajax({
        url: '/upload',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(data) {
          console.log('upload successful!\n' + data);
          updatePicture();
        }
      });
    }

  });

  function updatePicture() {
    $("#profilepicture").attr("src", "/download?id=" + sessionStorage.getItem('username') + "&key=profile.jpg&timestamp=" + new Date().getTime());
  }
  /*
  $.getJSON('/instanceId', function(response, statusText, jqXHR) {
    if (jqXHR.status == 200) {
      $('#instance-id').show();
      $('#instance-id-value').html(response.id);
    }
  });
  */
});