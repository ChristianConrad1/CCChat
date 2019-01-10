var io = require('socket.io')();
var request = require('request');
var db = require('./database.js');

const redis = require('redis').createClient;
const adapter = require('socket.io-redis');
const pub = redis(19981, 'pub-redis-19981.dal-05.1.sl.garantiadata.com', {
  auth_pass: "***"
});
const sub = redis(19981, 'pub-redis-19981.dal-05.1.sl.garantiadata.com', {
  auth_pass: "***"
});
io.adapter(adapter({
  pubClient: pub,
  subClient: sub
}));




io.isUserinChat = function(username) {
  db.getArray(function(callback) {
    if (callback) {
      var found = callback.some(function(el) {
        return el.username === username;
      });
      return found;
      console.log('is user in chat: ' + found);
    }
  });
}

io.on('connection', function(socket) {

  //saves the user in the users array
  socket.on('connect user', function(username) {
    db.addUser(username, socket.id, function(callback) {
      if (callback) {
        console.log("Added");
        db.getArray(function(callback) {
          if (callback) {
            console.log(callback);
            socket.username = username;
            socket.broadcast.emit('new user', username);
            io.emit('get users', callback);
          }
        });
      }
    });

  });
  //checks if the message is sent to a private person or not. Sends the message to the recipients
  socket.on('chat message', function(msg) {
    if (isValid(msg.message)) {
      request.post({
          url: 'https://crazy-moodanalyzer-tumulous-croquette.eu-de.mybluemix.net/tone',
          json: {
            texts: [msg.message]
          }
        },
        function(err, httpResponse, body) {
          if (err) {
            return console.error('upload failed, message NOT sent...:', err);
          }
          let mood = body.mood;
          //#Temporary
          if (msg.message.length > 0) {
            if (msg.partner == "irc") {
              if (msg.message == "/list") {
                db.getArray(function(callback) {
                  if (callback) {
                    socket.emit('get users', callback);
                  }
                });
              } else {
                io.emit('chat message', {
                  username: socket.username,
                  userid: socket.id,
                  message: msg.message,
                  timestamp: msg.timestamp,
                  mood: mood
                });
              }
            } else {
              db.getArray(function(callback) {
                if (callback) {
                  console.log("partner: ");
                  let partner = callback.find(x => x.username === msg.partner);
                  console.log(partner);
                  socket.to(partner.socketid).emit('get private message', {
                    message: msg.message,
                    userid: socket.id,
                    username: socket.username,
                    timestamp: msg.timestamp,
                    mood: mood
                  });
                  socket.emit('send private message', {
                    message: msg.message,
                    username: socket.username,
                    userid: socket.id,
                    timestamp: msg.timestamp,
                    partner: partner.username,
                    mood: mood
                  });
                }
              });

            }
          }
        });

    }
  });

  //checks if the file is sent to a private person or not. Sends the file to the recipients
  socket.on('send file', function(msg) {
    console.log('received base64 file from' + socket.username);
    if (msg.partner == "irc") {
      io.sockets.emit('send file', {
        username: socket.username,
        userid: socket.id,
        file: msg.file,
        fileName: msg.fileName
      });
    } else {
      db.getArray(function(callback) {
        if (callback) {
          let partner = callback.find(x => x.username === msg.partner);
          socket.to(partner.socketid).emit('get private file', {
            file: msg.file,
            fileName: msg.fileName,
            username: socket.username,
            userid: socket.id,
            timestamp: msg.timestamp,
          });
          socket.emit('send private file', {
            file: msg.file,
            fileName: msg.fileName,
            username: socket.username,
            userid: socket.id,
            timestamp: msg.timestamp,
            partner: partner.username
          });
        }
      });

    }
  });

  // sends a disconnect message to the other users and deletes the user from the users array
  socket.on('disconnect', function() {
    db.dropUser(socket.username, function(callback) {
      if (callback) {
        console.log("removed User successfully");

        socket.broadcast.emit('delete user', socket.username);
        io.emit('get users', callback);
      }
    });

  });

  function isValid(str) {
    return !/<[a-z][\s\S]*>/i.test(str);
  }


  /*
  ====================================================================================================================================================================================
  ====================================================================================================================================================================================
  ============================================================BATTLESHIPS=============================================================================================================
  ====================================================================================================================================================================================
  ====================================================================================================================================================================================
  */

  socket.on('newgame', function(newgame) {

    db.getGameState(function(callback) {
      if (callback) {
        let games = callback.games;
        let openGames = callback.openGames;
        console.log(games);
        var name = newgame.name;
        var enemy = newgame.enemy;
        var gameid = "";
        var position = "";
        var response = {
          'gameid': gameid,
          'player': position,
        };
        var found = false;
        for (i = 0; i < openGames.length; i++) {
          if (openGames[i].enemy == name) {
            found = true;
            position = "player2";
            gameid = openGames[i].gameid;

            games[gameid].player2.name = name;
            db.setgames(games);
            openGames.splice(openGames[i], 1);
            db.setOpenGames(openGames);
            response.gameid = gameid;
            response.player = position;
            socket.join(gameid);
            socket.emit('data', response);
            var names = {
              player1: games[gameid].player1.name,
              player2: games[gameid].player2.name,
            }
            io.in(gameid).emit('start', names);
          }
        }
        if (!found) {
          console.log("Not found");
          gameid = createGame(name);
          openGames.push({
            gameid: gameid,
            enemy: enemy
          });
          db.setOpenGames(openGames);
          position = "player1";
          response.gameid = gameid;
          response.player = position;
          socket.join(gameid);
          socket.emit('data', response);
          io.in(gameid).emit('status', "Waiting for Opponent");
        }
      }
    });


  });

  socket.on('setship', function(msg) {
    db.getGameState(function(callback) {
      if (callback) {
        let games = callback.games;
        let openGames = callback.openGames;
        var player = msg.player;
        var gameid = msg.gameid;
        var coord = msg.coord;
        var size = msg.size;
        var direction = msg.direction;
        var gameboard = setShip(player, gameid, coord, size, direction);
        var enemyplayer = getEnemy(player);
        if (isready(player, gameid) == true && isready(enemyplayer, gameid) == false) {
          socket.emit('status', "Waiting for Opponent to set his ships");
        }
        if (isready(player, gameid) == true && isready(enemyplayer, gameid) == true) {
          io.in(gameid).emit('setactive', games[gameid].activeplayer);
        }
        if (gameboard == "error") {
          socket.emit('error', gameboard);
        } else {
          socket.emit('draw', gameboard);
        }
      }
    });
  });

  socket.on('shoot', function(msg) {
    db.getGameState(function(callback) {
      if (callback) {
        let games = callback.games;
        let openGames = callback.openGames;
        var player = msg.player;
        var gameid = msg.gameid;
        var coord = msg.coord;
        var feedback = shoot(player, gameid, coord);
        var msg = {
          feedback: feedback,
          coord: coord,
          player: player
        }
        io.in(gameid).emit('feedback', msg);
        if (feedback != "won") {
          io.in(gameid).emit('setactive', games[gameid].activeplayer);
        }
      }
    });
  });


});

//
//Game logic
//

function createGame(name) {
  db.getGameState(function(callback) {
    if (callback) {
      let games = callback.games;
      let openGames = callback.openGames;
      var gameid = Math.floor((Math.random() * 100000) + 1);
      var player1 = {
        name: name,
        board: "",
        player: 'player1',
        remainingships: 0,
      };
      var player2 = {
        name: "",
        board: "",
        player: 'player2',
        remainingships: 0,
      };
      var board1 = new Array(10);
      var board2 = new Array(10);
      board1 = drawBoard(board1);
      board2 = drawBoard(board2);
      player1.board = board1;
      player2.board = board2;
      var game = {
        player1: player1,
        player2: player2,
        activeplayer: "player1"
      }

      games[gameid] = game;
      db.setgames(games);
      return gameid;
    }
  });
}

function setShip(player, gameid, coord, size, direction) {
  db.getGameState(function(callback) {
    if (callback) {
      let games = callback.games;
      let openGames = callback.openGames;
      var enemyplayer = getEnemy(player);
      games[gameid][player].remainingships += size;
      db.setgames(games);
      if (games[gameid][player].remainingships > 30) {
        console.log("to many ships");
        return "error"
      }
      var x = coord[1];
      var y = coord[2];
      var length1 = parseInt(x) + parseInt(size);
      var length2 = parseInt(y) + parseInt(size);
      if (direction == "vertical") {
        for (i = x; i < parseInt(length1); i++) {
          games[gameid][player].board[i][y] = "X";
        }
      } else if (direction == "horizontal") {
        for (j = y; j < parseInt(length2); j++) {
          games[gameid][player].board[x][j] = "X";
        }
      }
      //  console.log(gameboard);
      return games[gameid][player].board;

    }
  });
}

function shoot(player, gameid, coord) {
  db.getGameState(function(callback) {
    if (callback) {
      let games = callback.games;
      let openGames = callback.openGames;
      var x = parseInt(coord[1]);
      var y = parseInt(coord[2]);
      var left = x - 1;
      var right = x + 1;
      var bottom = y - 1;
      var top = y + 1;
      var enemyplayer = getEnemy(player);
      games[gameid].activeplayer = enemyplayer;
      db.setgames(games);

      if (games[gameid][enemyplayer].board[x][y] == "X") {
        games[gameid][enemyplayer].board[x][y] = "H";
        games[gameid][enemyplayer].remainingships--;
        db.setgames(games);
        if (games[gameid][enemyplayer].remainingships == 0) {
          return "won";
        } else {
          var found = false;
          var end = false;
          while (left >= 0 && left < 10 && !end && !found) {
            if (games[gameid][enemyplayer].board[left][y] == "O") {
              end = true;
            }
            if (games[gameid][enemyplayer].board[left][y] == "X") {
              found = true;
            }
            left--
          }
          end = false;
          while (right >= 0 && right < 10 && !end && !found) {
            if (games[gameid][enemyplayer].board[right][y] == "O") {
              end = true;
            }
            if (games[gameid][enemyplayer].board[right][y] == "X") {
              found = true;
            }
            right++;
          }
          end = false;
          while (top >= 0 && top < 10 && !end && !found) {
            if (games[gameid][enemyplayer].board[x][top] == "O") {
              end = true;
            }
            if (games[gameid][enemyplayer].board[x][top] == "X") {
              found = true;
            }
            top--;
          }
          end = false;
          while (bottom >= 0 && bottom < 10 && !end && !found) {
            if (games[gameid][enemyplayer].board[x][bottom] == "O") {
              end = true;
            }
            if (games[gameid][enemyplayer].board[x][bottom] == "X") {
              found = true;
            }
            bottom++;
          }
          if (!found) {
            return "sink";
          }
        }
        return "hit";
      } else if (games[gameid][enemyplayer].board[x][y] == "O") {
        return "miss";
      }
    }
  });
}

function isready(player, gameid) {
  db.getGameState(function(callback) {
    if (callback) {
      let games = callback.games;
      let openGames = callback.openGames;
      if (games[gameid][player].remainingships == 30) {
        return true;
      } else {
        return false;
      }
    }
  });
}

function getEnemy(player) {
  if (player == "player1") {
    return "player2"
  } else if (player == "player2") {
    return "player1";
  }
}

function drawBoard(board) {
  for (i = 0; i < board.length; i++) {
    board[i] = new Array(10);
    for (j = 0; j < 10; j++) {
      board[i][j] = "O";
    }
  }
  return board;
}




module.exports = io;