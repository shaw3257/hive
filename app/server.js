var express = require('express');
var app = express();
var path = require('path');
var server = require('http').Server(app);
var crypto = require('crypto');

var port = (process.env.PORT || 3001);

console.log('Server listening on port ', port);

var io = require('socket.io')(server);
server.io = io;
server.listen(port);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connect', function (socket) {
  var room = getHandshakeQuery(socket).room;
  if(room === 'random'){
    var randomPlayers = socketsWithInterest();
    console.log(randomPlayers.length)
    if (randomPlayers.length > 1){
      var players = shufflePlayers(randomPlayers.pop(), randomPlayers.pop());
      var gameId = generateGameId(5);
      var game = {
        gameId: gameId,
        white: getHandshakeQuery(players[0]).username,
        black: getHandshakeQuery(players[1]).username
      };
      players.forEach(function(player){
        player.join(gameId);
        player.on('move', function(move){
          opponentFor(players, player).emit('move', move);
        });
        player.on('resignation', function(){
          console.log('resignation on room ', gameId);
          io.to(gameId).emit('resignation', {
            winner: getHandshakeQuery(opponentFor(players, player)).username
          });
        });
      });
      console.log('players are match, emitting ready event')
      io.to(gameId).emit('ready', game);
    }
  }
});

function socketsWithInterest(){
  var sockets = io.sockets.sockets;
  var list = typeof sockets.values === 'function' ? Array.from(sockets.values()) : Object.values(sockets);
  return list.filter(function(socket){
    return getHandshakeQuery(socket).room === 'random';
  });
}

function getHandshakeQuery(socket) {
  return socket.handshake && socket.handshake.query ? socket.handshake.query : {};
}

function opponentFor(players, player) {
  return players[0] === player ? players[1] : players[0];
}

function shufflePlayers(first, second) {
  return Math.random() < 0.5 ? [first, second] : [second, first];
}

function generateGameId (len) {
  return crypto.randomBytes(Math.ceil(len/2)).toString('hex').slice(0,len);
}

module.exports = server;
