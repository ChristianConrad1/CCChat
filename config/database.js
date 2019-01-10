// connect to the database
var fs = require('fs');
var bcrypt = require('bcryptjs');
var formidable = require('formidable');
var path = require('path')
var watson = require('watson-developer-cloud');
var visual_recognition = watson.visual_recognition({
  api_key: '33a4eaee02f70edbdda35a7da328ba4290fbbdf7',
  version: 'v3',
  version_date: '2016-05-20'
});
const uploadDir = path.join(__dirname, '../uploads/');

var db;
var dbCredentials = {
  dbName: 'userss'
};

//Database connection
function getDBCredentialsUrl(jsonData) {
  var vcapServices = JSON.parse(jsonData);
  for (var vcapService in vcapServices) {
    if (vcapService.match(/cloudant/i)) {
      return vcapServices[vcapService][0].credentials.url;
    }
  }
}

function initDBConnection() {
  if (process.env.VCAP_SERVICES) {
    dbCredentials.url = getDBCredentialsUrl(process.env.VCAP_SERVICES);
  } else { //When running locally, the VCAP_SERVICES will not be set
    dbCredentials.url = getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
  }

  cloudant = require('cloudant')(dbCredentials.url);
  // check if DB exists if not create
  cloudant.db.create(dbCredentials.dbName, function(err, res) {
    if (err) {
      console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.');
    }
  });

  db = cloudant.use(dbCredentials.dbName);

  db.get('users', function(error, existingUsers) {
    if (!error) {
      let emptyUserList = {
        _id: 'users',
        _rev: existingUsers._rev,
        "array": []
      }
  db.insert(emptyUserList, function(err, emptyUserList) {
        if (!err) {
          console.log("DB CLEAR");
        } else {
          console.error(err);
        }
      });
    }
  });
  db.get('gameState', function(error, gameState) {
    if (!error) {
    let NewGameState = {
      _id: 'gameState',
      _rev: gameState._rev,
      "openGames": [],
      "games": {}
    }

      db.insert(gameState, function(err) {
        if (!err) {
          console.log("Games CLEARED");
        } else {
          console.error(err);
        }
      });
    }
  });
}

initDBConnection();


//Gets the attachment of a Database entry
exports.download = function(req, res, callback) {
  console.log("download database");
  var doc = req.query.id;
  var key = req.query.key;
  db.attachment.get(doc, key, function(err, body) {
    if (!err) {
      console.log("Type: " + body.type);
      callback(body);
    }

  });

}

//adds the profile picture to a user
exports.upload = function(req, res, callback) {
  console.log("Uploading File");
  //File Uploading
  var form = new formidable.IncomingForm()
  form.multiples = true
  form.keepExtensions = true
  form.uploadDir = uploadDir
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log("Error");
    } else {
      console.log("to database");
      var file = files.file;
      fs.readFile(file.path, function(err, data) {
        if (!err) {
          var params = {
            images_file: fs.createReadStream(file.path)
          };
          visual_recognition.detectFaces(params,
            function(err, response) {
              if (err) {
                console.log(err);
              } else {
                console.log(JSON.stringify(response, null, 2));
                console.log(response.images[0].faces);
                if (response.images[0].faces.length > 0) {
                  db.get(fields.username, function(err, user) {
                    if (!err) {
                      db.attachment.insert(fields.username, 'profile.jpg', data, file.type, {
                        rev: user._rev
                      }, function(err, body) {
                        if (!err) {

                          console.log("File Uploaded");
                          callback("Success");
                        } else {
                          console.log(err);
                        }
                      });
                    }
                  });
                } else {
                  callback("noface");
                }
              }
            });
          fs.unlinkSync(file.path);
        }
      });
    }
  });


  form.on('fileBegin', function(name, file) {
    const [fileName, fileExt] = file.name.split('.')
    file.path = path.join(uploadDir, `${fileName}.${fileExt}`)
  });

}

//registers the user
exports.localReg = function(username, password, callback) {
  db.get(username, function(err, body) {
    if (!body) { //username does not exist
      var hash = bcrypt.hashSync(password, 8); //hashes the password
      db.insert({
        "password": hash
      }, username, function(err, insert) {
        if (err) {
          console.log('[DEBUG-SERVER] ' + err);
          callback(false);
        } else {
          fs.readFile(path.join(__dirname, '../public/profile.jpg'), function(err, data) {
            if (!err) {
              console.log("bild hochladen");
              db.get(username, function(err, user) {
                if (!err) {
                  console.log("User: " + user);
                  db.attachment.insert(username, 'profile.jpg', data, 'image/png', {
                    rev: user._rev
                  }, function(err, body) {
                    if (!err) {
                      console.log('[DEBUG-SERVER] User: ' + username + ' registered successfuly!');
                      callback(username);
                    } else {
                      console.log(err);
                    }
                  });
                }
              });
            }
          });
        }

      });
    } else {
      console.log('[DEBUG-SERVER] User: ' + username + ' already exists!');
      callback(false);
    }
  });
}

//authorizes the user
exports.localAuth = function(username, password, callback) {
  db.get(username, function(err, body) {
    if (err) {
      console.log('[DEBUG-SERVER] ' + err);
      callback(false)
    } else {
      if (body) {
        var hash = body.password;

        if (bcrypt.compareSync(password, hash)) { //checks if the password is correct
          console.log('[DEBUG-SERVER] User: ' + username + ' logged in successfuly!');
          callback(username);
        } else {
          console.log('[DEBUG-SERVER] Username and Password don\'t match!');
          callback(false);
        }
      } else {
        console.log('[DEBUG-SERVER] User: ' + username + ' not found!');
        callback(false);
      }
    }
  });

}

exports.addUser = function(username, socketid, callback) {

  db.get('users', function(error, existingUsers) {
    if (!error) {
      let newUsersList = {
        _id: 'users',
        _rev: existingUsers._rev,
      }
      let newUser = {};
      newUser.username = username;
      newUser.socketid = socketid;
      let existingUsersArray = existingUsers.array;

      existingUsersArray.push(newUser);
      newUsersList.array = existingUsersArray;

      db.insert(newUsersList, function(err, newUsersList) {
        if (!err) {
          callback(newUsersList);
        } else {
          console.error(err);
        }
      });
    }
  });
}

exports.dropUser = function(username, callback) {
  console.log("username: ", username);

  db.get('users', function(error, existingUsers) {

      console.log("existingUsers: ", existingUsers);
      if (!error) {
        console.log("Disconnecting " + username);
        let found = existingUsers.array.some(function(el) {
          return el.username === username;
        });
        if (found) {

          let index = 0;

          existingUsers.array.forEach(function(user, userindex) {
            if (username === user.username) {
              index = userindex;
            }
          });

          let removedUser = existingUsers.array.splice(index, 1);
          console.log("left over users array:", existingUsers.array);

          db.insert(existingUsers, function(err, existingUsers) {
            if (!err) {
              console.log("User: ");
              console.log(existingUsers);
              callback(existingUsers.array);
            } else {
              console.error(err);
            }
          });

        }
      }

  });
}

exports.getArray = function(callback) {
  console.log("getArray");
  db.get('users', function(error, existingUsers) {
    if(!error){
      let array = existingUsers.array
      callback(array);
    }
  });
}


exports.getGameState = function(callback){
  db.get('gameState', function(error, gameState) {
    if(!error){
      let openGames = gameState.openGames;
      let games = gameState.games;
      console.log("GameState");
      console.log(gameState);
      callback(gameState);
    }
  });
}
exports.setOpenGames = function(openGames) {
  db.get('gameState', function(error, gameState) {
    if (!error) {
    gameState.openGames = openGames;
    gameState.games;

      db.insert(gameState, function(err) {
        if (!err) {
          console.log("Opengames Changed");
        } else {
          console.error(err);
        }
      });
    }
  });
}
exports.setgames = function(games) {
  db.get('gameState', function(error, gameState) {
    if (!error) {
    gameState.games = games;

      db.insert(gameState, function(err) {
        if (!err) {
          console.log("Games Changed");
        } else {
          console.error(err);
        }
      });
    }
  });
}
