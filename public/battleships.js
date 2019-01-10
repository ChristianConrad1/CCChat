$(document).ready(function() {
  var socket = io();
  var size = 0;
  var direction = "horizontal";
  var active = false;
  var ready = false;

  var url = new URL(window.location.href);
  var newgame = {
    name: sessionStorage.getItem('username'),
    enemy: url.searchParams.get('enemy')
  }
  socket.emit('newgame', newgame);

  $(document).on("click", ".myships", function(e) {
    e.preventDefault();
    if (!ready) {
      var coord = $(this).attr('id');
      var x = parseInt($(this).attr("id")[1]);
      var y = parseInt($(this).attr("id")[2]);
      var length1 = parseInt(x + size);
      var length2 = parseInt(y + size);
      console.log(length1);
      console.log(length2);
      var valid = true;
      if (direction == "horizontal" && length2 > 10) {
        valid = false;
      }
      if (direction == "vertical" && length1 > 10) {
        valid = false;
      }
      if (valid) {
        if (direction == "horizontal" && length2 <= 10) {
          for (i = y; i < length2; i++) {
            if ($('#m' + x + i).hasClass("black") || $('#m' + parseInt(x + 1) + i).hasClass("black") || $('#m' + parseInt(x - 1) + i).hasClass("black") || $('#m' + x + parseInt(i + 1)).hasClass("black") || $('#m' + x + parseInt(i - 1)).hasClass("black")) {
              valid = false;

            }
          }

        } else if (direction == "vertical" && length1 <= 10) {
          for (j = x; j < length1; j++) {
            if ($('#m' + j + y).hasClass("black") || $('#m' + parseInt(j + 1) + y).hasClass("black") || $('#m' + parseInt(j - 1) + y).hasClass("black") || $('#m' + j + parseInt(y + 1)).hasClass("black") || $('#m' + j + parseInt(y - 1)).hasClass("black")) {
              valid = false;
            }
          }

        }
      }
      if (valid) {
        setShip(coord);
        var shipcount = parseInt($('#' + size).find("span").text()) - 1;
        if (shipcount == 0) {
          $('#' + size).hide();
          size = 0;
        }
        $('#' + size).find("span").text(shipcount);
      }

    }

  });

  $(document).on("mouseenter mouseleave", ".myships", function(ev) {
    if (!ready) {
      if (!$(this).hasClass("black")) {
        var x = parseInt($(this).attr("id")[1]);
        var y = parseInt($(this).attr("id")[2]);
        var length1 = parseInt(x + size);
        var length2 = parseInt(y + size);
        if (direction == "horizontal") {
          for (i = y; i < length2; i++) {
            if (ev.type == "mouseenter") {
              $('#m' + x + i).removeClass("green").addClass("darken-4").addClass("grey");
            } else if (ev.type == "mouseleave") {
              $('#m' + x + i).removeClass("grey").removeClass("darken-4").addClass("green");
            }
          }
        } else if (direction == "vertical") {
          for (j = x; j < length1; j++) {
            if (ev.type == "mouseenter") {
              $('#m' + j + y).removeClass("green").addClass("darken-4").addClass("grey");
            } else if (ev.type == "mouseleave") {
              $('#m' + j + y).removeClass("grey").removeClass("darken-4").addClass("green");
            }
          }
        }
      }
    }
  });


  $(document).on("click", ".enemyships", function(e) {
    e.preventDefault();
    if (active) {
      if (!$(this).hasClass("red") && !$(this).hasClass("blue")) {
        var coord = $(this).attr('id');
        shoot(coord);
        active = false;
      }
    }
  });

  $('.shipselect').click(function() {
    size = parseInt($(this).attr('id'));
  });

  $('#direction').click(function() {
    if ($(this).text() == "Horizontal") {
      direction = "vertical";
      $(this).text("Vertical");
    } else if ($(this).text() == "Vertical") {
      direction = "horizontal";
      $(this).text("Horizontal");
    }
  });


  function setShip(coord) {
    var player = sessionStorage.getItem("player");
    var gameid = sessionStorage.getItem("gameid");
    var sizenumber = parseInt(size);
    var msg = {
      player: player,
      gameid: gameid,
      coord: coord,
      size: sizenumber,
      direction: direction
    }
    socket.emit('setship', msg);
  };

  function shoot(coord) {
    var player = sessionStorage.getItem("player");
    var gameid = sessionStorage.getItem("gameid");
    var msg = {
      player: player,
      gameid: gameid,
      coord: coord
    }

    socket.emit('shoot', msg);
  }
  socket.on('data', function(msg) {
    //  sessionStorage.setItem("playerid", msg.playerid);
    sessionStorage.setItem("gameid", msg.gameid);
    sessionStorage.setItem("player", msg.player);
  });
  socket.on('status', function(msg) {
    $('#status').html(msg);
    /*if (msg = "Waiting for Opponent") {
      var text = "<div class='preloader-wrapper small active'><div class='spinner-layer spinner-green-only'><div class='circle-clipper left'><div class='circle'></div></div><div class='gap-patch'><div class='circle'></div></div><div class='circle-clipper right'><div class='circle'></div></div></div></div>"
      status.append(text);
    }*/
  });
  socket.on('start', function(msg) {
    drawBoards(msg);
    $('#status').text("Place Your Ships");
  });
  socket.on('error', function(msg) {
    alert(msg);
  });
  socket.on('draw', function(msg) {
    for (var i = 0; i < 10; i++) {
      for (var j = 0; j < 10; j++) {
        if (msg[i][j] == "X") {
          $('#m' + i + j).removeClass("green").removeClass("grey").removeClass("darken-4").addClass("black");
        }
      }
    }
  });

  socket.on('setactive', function(msg) {
    if (msg == sessionStorage.getItem("player")) {
      $('#status').text("Your turn");
      active = true;
    } else {
      $('#status').text("Enemy turn");
    }
  });

  socket.on('feedback', function(msg) {
    var coord = msg.coord;
    var x = parseInt(coord[1]);
    var y = parseInt(coord[2]);
    var type = "e";
    if (msg.player != sessionStorage.getItem("player")) {
      type = "m";
      var newstring = "m";
      newstring += coord.slice(1, 3);
      coord = newstring;
    }
    if (msg.feedback == "hit") {
      $('#' + coord).removeClass("grey").removeClass("black").addClass("red");
    } else if (msg.feedback == "miss") {
      $('#' + coord).removeClass("grey").removeClass("green").addClass("blue");
    } else if (msg.feedback == "sink") {
      $('#' + coord).removeClass("grey").removeClass("green").addClass("red").addClass("darken-4");
      while ($('#' + type + parseInt(x + 1) + y).hasClass("red")) {
        $('#' + type + parseInt(x + 1) + y).addClass("darken-4");
        x++;
      }
      while ($('#' + type + parseInt(x - 1) + y).hasClass("red")) {
        $('#' + type + parseInt(x - 1) + y).addClass("darken-4");
        x--;
      }
      while ($('#' + type + x + parseInt(y + 1)).hasClass("red")) {
        $('#' + type + x + parseInt(y + 1)).addClass("darken-4");
        y++;
      }
      while ($('#' + type + x + parseInt(y - 1)).hasClass("red")) {
        $('#' + type + x + parseInt(y - 1)).addClass("darken-4");
        y--;
      }
    } else if (msg.feedback == "won" && msg.player == sessionStorage.getItem("player")) {
      $('#' + coord).removeClass("grey").removeClass("black").addClass("red");
      $('#status').text("Sie haben gewonnen!");
    } else if (msg.feedback == "won" && msg.player != sessionStorage.getItem("player")) {
      $('#status').text("Sie haben verloren!");
    }
  });

  function drawBoards(msg) {
    var player = sessionStorage.getItem("player");
    var enemyplayer;
    if (player == "player1") {
      enemyplayer = 'player2';
    } else if (player == "player2") {
      enemyplayer = 'player1';
    }
    $('#player').text(msg[player]);
    $('#enemyplayer').text(msg[enemyplayer]);
    var mybuild = "<table class='bordered'>";
    for (i = 0; i < 10; i++) {
      mybuild += "<tr>"
      for (j = 0; j < 10; j++) {
        mybuild += "<td class='green myships' id='m" + i + j + "' style='border: solid 1px #fff'></td>"
      }
      mybuild += "</tr>"
    }
    mybuild += "</table>"
    var build = "<table class='bordered'>";
    for (i = 0; i < 10; i++) {
      build += "<tr>"
      for (j = 0; j < 10; j++) {
        build += "<td class='grey enemyships' id='e" + i + j + "' style='border: solid 1px #fff'></td>"
      }
      build += "</tr>"
    }
    build += "</table>"
    $('#myboard').html(mybuild);
    $('#enemyboard').html(build);
    $('#buttons').show();
  };
});
