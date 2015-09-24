var Board = require('./board');
var AI = require('./ai');
var io = require('socket.io-client');

// ===========================================================
// Constructor
// ===========================================================

Hive = function(opts){
  var opts = opts || {};
  this.color = undefined;
  this.ready = false;
  this.gameId = undefined;
  this.connected;
  this.endpoint = opts.endpoint;
  this.room = opts.room;
  this.username = opts.username;
  this.usernameOpponent = undefined;
  this.board = new Board();
  this.status = 'Waiting for players...';
  this.aiWorker = undefined;
  this.quietMode = false;
  this.listeners = {
    ready: [],
    resignation: []
  }
};

// ===========================================================
// Instance Methods
// ===========================================================

Hive.prototype.connect = function(cb){
  if(this.room){
    this.playOnServer(cb);
  }else{
    this.color = Board.randomColor();
    this.playAI();
  }
};

Hive.prototype.playAI = function(){
  this.usernameOpponent = 'Computer';
  var board = this.board;
  var color = this.color;
  var _this = this;
  if(typeof window !== 'undefined' && window.Worker){
    var aiWorker = this.aiWorker = new Worker('ai.js');
    aiWorker.onmessage = function(e){
      if(!_this.isMyTurn()) {
        board.queue.push(e.data.notation);
        board.processQueue();
      }
    };
    this.board.on('move', function(e){
      _this.status = _this.turnStatus();
      if(!_this.isMyTurn() && !_this.quietMode){
        aiWorker.postMessage(e.notation);
      }
    });

    this.board.on('gameover', function(){
      aiWorker.terminate();
    });

    if(color === Board.PLAYER_BLACK){
      aiWorker.postMessage(null);
    }
  }
  this.status = this.turnStatus();
  this.ready = true;
  this.broadcast('ready', this.board);
}

Hive.prototype.playOnServer = function(){
  this.status = 'Searching for opponent...';
  var endpoint = this.endpoint + '?room=' + this.room + '&username=' + this.username;
  var socket = this.socket = io(endpoint, { multiplex: false });
  var _this = this;
  socket.on('connect', function(){

    _this.connected = true;

    socket.on('move', function(res){
      _this.board.queue.push(res.notation);
      _this.board.processQueue(true);
    });

    socket.on('resignation', _this.resignationHandler.bind(_this));

    _this.board.on('move', function(move){
      _this.status = _this.turnStatus();
      if(!_this.isMyTurn() ){
        socket.emit('move', { notation:  move.notation });
      }
    });

    socket.on('ready', function(res){
      console.log('hive got ready from server to start playing', res)
      _this.gameId = res.gameId;
      _this.color = res.white === _this.username ? Board.PLAYER_WHITE : Board.PLAYER_BLACK;
      _this.usernameOpponent = res.white === _this.username ? res.black : res.white;
      _this.ready = true;
      _this.status = _this.turnStatus();
      _this.broadcast('ready', _this.board);
    });

  });
}

Hive.prototype.resignationHandler = function(res){
  if(this.board.isGameover === false){
    this.status = res.winner + ' wins by resignation';
    this.board.isGameover = true;
    this.disconnect();
    this.broadcast('resignation', res);
  }
}

Hive.prototype.isMyTurn = function(){
  return this.board.whoseTurn() === this.color;
}

Hive.prototype.turnStatus = function(){
  return this.isMyTurn() ? 'Your Turn' : this.usernameOpponent + '\'s turn';
}

Hive.prototype.on = function(eventName, cb){
  var listeners = this.listeners[eventName];
  if(listeners){
    this.listeners[eventName].push(cb);
  }else {
    this.board.on(eventName, cb);
  }
}

Hive.prototype.resign = function(){
  if(this.socket){
    this.socket.emit('resignation', {});
  } else if(this.aiWorker) {
    this.aiWorker.terminate();
    this.resignationHandler({ winner: this.usernameOpponent });
  }
}

Hive.prototype.disconnect = function(){
  if(this.socket){
    this.socket.disconnect();
  }
}

Hive.prototype.broadcast = function(eventName, message){
  var _this = this;
  var listeners = this.listeners[eventName];
  if (listeners) {
    this.listeners[eventName].forEach(function(listener){
      listener.apply(_this, [message]);
    });
  } else {
    this.board.broadcast(eventName, message);
  }
}

module.exports = Hive;
