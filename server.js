
var express = require('express');
// Create the app
var app = express();

// Set up the server
// process.env.PORT is related to deploying on heroku
var server = app.listen(process.env.PORT || 3000, listen);

// This call back just tells us that the server has started
function listen() {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://' + host + ':' + port);
}

const userList = {};

app.use(express.static('public'));

var io = require('socket.io')(server);
io.sockets.on('connection', (socket) => {
    io.to(socket.id).emit('users', userList);
    io.to(socket.id).emit('id', socket.id);
    userList[socket.id] = {x: 400, y: 300, id: socket.id};
    console.log("We have a new client: " + socket.id);
    socket.broadcast.emit('newPlayer', socket.id);

    socket.on('position', (posData) => {
      console.log(posData);
      userList[posData.id] = {x: posData.x, y: posData.y};
      socket.broadcast.emit('position', posData);
    });

    socket.on('bullet', (bulletData) => {
      console.log(bulletData);
      socket.broadcast.emit('bullet', bulletData);
    });

    socket.on('death', (deathData) => {
      console.log(deathData);
      if (userList[deathData.id]) {
        delete userList[deathData.id];
        io.sockets.emit('death', deathData.id);
      }
    });

    socket.on('disconnect', function(data) {
      console.log("Client has disconnected");
    });
  }
);