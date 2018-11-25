
var express = require('express');
var R = require('ramda');
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

let userList = [];

app.use(express.static('public'));

var io = require('socket.io')(server);
io.sockets.on('connection', (socket) => {
    io.to(socket.id).emit('users', userList);
    io.to(socket.id).emit('id', socket.id);
    userList.push({x: 400, y: 300, id: socket.id});
    console.log(`${socket.id} has joined the game`);
    socket.broadcast.emit('newPlayer', socket.id);

    socket.on('position', (posData) => {
      const index = userList.findIndex(item => item.id === posData.id);
      if (index !== -1) {
        userList[index] = {x: posData.x, y: posData.y, id: posData.id};
        socket.broadcast.emit('position', posData);
      }
    });

    socket.on('bullet', (bulletData) => {
      socket.broadcast.emit('bullet', bulletData);
    });

    socket.on('death', (deathData) => {
      const index = userList.findIndex(item => item.id === deathData.id);
      if (index !== -1) {
        console.log(`${deathData.id} has died`);
        userList = R.remove(index, 1, userList);
        // userList = userList.slice(index, 1);
        io.sockets.emit('death', deathData.id);
      }
    });

    socket.on('disconnect', () => {
      const index = userList.findIndex(item => item.id === socket.id);
      if (index !== -1) {
        console.log(`${socket.id} has died`);
        userList = R.remove(index, 1, userList);
        io.sockets.emit('death', socket.id);
      }
      console.log(`${socket.id} has disconnected`);
    });
  }
);