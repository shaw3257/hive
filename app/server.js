var express = require('express');
var app = express();
var path = require('path');
var server = require('http').Server(app);
var crypto = require('crypto');
var _ = require('lodash');

var port = (process.env.PORT || 3001);

console.log('Server listening on port ', port);

var io = require('socket.io')(server);
server.listen(port);

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade');


app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  res.render('game/index');
});

io.on('connect', function (socket) {
  var room = socket.handshake.query.room;
  if(room === 'random'){
    var randomPlayers = socketsWithInterest();
    console.log(randomPlayers.length)
    if (randomPlayers.length > 1){
      var players = _.shuffle([randomPlayers.pop(), randomPlayers.pop()]);
      var gameId = generateGameId(5);
      var game = { gameId: gameId, white: players[0].handshake.query.username, black: players[1].handshake.query.username };
      players.forEach(function(player){
        player.join(gameId);
        player.on('move', function(move){
          _.xor(players, [player])[0].emit('move', move);
        });
        player.on('resignation', function(){
          console.log('resignation on room ', gameId);
          io.to(gameId).emit('resignation', { winner: _.xor(players, [player])[0].handshake.query.username });
        });
      });
      console.log('players are match, emitting ready event')
      io.to(gameId).emit('ready', game);
    }
  }
});

function socketsWithInterest(){
  return io.sockets.sockets.filter(function(socket){
    return socket.handshake.query.room === 'random';
  });
}

function generateGameId (len) {
  return crypto.randomBytes(Math.ceil(len/2)).toString('hex').slice(0,len);
}
