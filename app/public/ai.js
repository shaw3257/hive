(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Board = require('../../../../lib/board');
var AI = require('../../../../lib/ai');

var board = new Board();
var ai = new AI(board);

onmessage = function(e){
  var notation = e.data;
  if(notation)  {
    console.log('ai-worker.js processing ', notation);
    updateBoard(notation)
  }
  var bestMove = ai.bestMove(2);
  console.log('ai-worker.js has best move being ', bestMove);
  updateBoard(bestMove.notation)
  postMessage(bestMove);
}

updateBoard = function(notation){
  board.queue.push(notation);
  board.processQueue();
}

},{"../../../../lib/ai":2,"../../../../lib/board":3}],2:[function(require,module,exports){
var Board = require('./board');

var evalCnt = 0;

// ===========================================================
// Constructor
// ===========================================================

function AI(board){
   this.board = board;
}

// ===========================================================
// Instance Methods
// ===========================================================

AI.prototype.allPossiblePlacements = function(color) {
  var allPlacments = [];
  var pieces = this.board.piecesNotInPlayByColor(color);
  var colorNotation = Board.notationFromColor(color);
  for(var i = 0; i < pieces.length; i++){
    var piece = pieces[i];
    var pieceTypeNotation = Board.notationFromType(piece.type, piece.typeId);
    var placements = this.board.legalPiecePlacements(piece);
    for(var j = 0; j < placements.length; j++){
      var notation = colorNotation + ':' + 'p' + ':' + pieceTypeNotation + ':' + placements[j];
      if(this.board.validateQueenPlaced(notation)){
        allPlacments.push(notation);
      }
    }
  }
  return allPlacments;
}

AI.prototype.allPossibleMovements = function(color) {
  var allMovements = [];
  var pieces = this.board.piecesInPlayByColor(color);
  var colorNotation = Board.notationFromColor(color);
  for(var i = 0; i < pieces.length; i++){
    var piece = pieces[i];
    var pieceTypeNotation = Board.notationFromType(piece.type, piece.typeId);
    var placements = this.board.legalPieceMovements(piece);
    for(var j = 0; j < placements.length; j++){
      var notation = colorNotation + ':' + 'm' + ':' + pieceTypeNotation + ':' + placements[j];
      if(this.board.validateQueenPlaced(notation) && this.board.validateConnected(notation)){
        allMovements.push(notation);
      }
      this.board.errors = [];
    }
  }
  return allMovements;
}

AI.prototype.allPossibleMoves = function(color) {
  return AI.shuffle(this.allPossiblePlacements(color).concat(this.allPossibleMovements(color)));
}

AI.prototype.surroundingQueenCnt = function(color){
  var queen = this.board.findPiece(color, 'QUEEN', '1');
  return queen.isInPlay ? this.board.surroundingPieces(queen.location, true).length : 0;
}


AI.prototype.evaluatePosition = function() {
  var minQueenSurroundCnt = this.surroundingQueenCnt(this.minimizingColor);
  var maxQueenSurroundCnt = this.surroundingQueenCnt(this.maximizingColor);
  if (minQueenSurroundCnt === 6) minQueenSurroundCnt = Number.POSITIVE_INFINITY;
  if (maxQueenSurroundCnt === 6) maxQueenSurroundCnt = Number.NEGATIVE_INFINITY;
  var score = minQueenSurroundCnt - maxQueenSurroundCnt;
  return score;
}


AI.prototype.bestMove = function(depth) {
  evalCnt = 0;
  this.maximizingColor = this.board.whoseTurn();
  this.minimizingColor = AI.toggleColor(this.maximizingColor);
  this.board.quietMode = true;
  var move = this.minimax(depth, true, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
  this.board.quietMode = false;
  console.log('eval count: ' + evalCnt);
  return move;
}

AI.prototype.minimax = function(depth, maximizing, alpha, beta, notation) {
  if(notation) {
    this.board.moves.push(notation);
    this.board.movement(notation);
  }
  if(depth === 0){
    evalCnt += 1;
    var score = this.evaluatePosition(!maximizing);
    this.board.revertLast();
    return { score: score, notation: notation }
  }
  var color = this.board.whoseTurn();
  var allPossibleMoves = this.allPossibleMoves(color);
  var bestPath = maximizing ? { score: Number.NEGATIVE_INFINITY } : { score: Number.POSITIVE_INFINITY } ;
  for(var i = 0; i < allPossibleMoves.length; i++){
    var candidate = allPossibleMoves[i];
    var results = this.minimax(depth - 1, !maximizing, alpha, beta, candidate);
    if(maximizing){
      if (results.score > bestPath.score){
        bestPath = { score: results.score, notation: candidate }
      }
      alpha = Math.max(alpha, bestPath.score);
    }else {
      if (results.score < bestPath.score) {
        bestPath = { score: results.score, notation: candidate }
      }
      beta = Math.min(beta, bestPath.score);
    }

    if(beta <= alpha){
      break;
    }
  }
  if(notation){
    this.board.revertLast();
  }
  return bestPath;
}

// ===========================================================
// Class Methods
// ===========================================================

AI.toggleColor = function(color){
  return color === 'BLACK' ? 'WHITE' : 'BLACK';
}

// Source - http://jsfromhell.com/array/shuffle
AI.shuffle = function(o){
  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
}

module.exports = AI;
},{"./board":3}],3:[function(require,module,exports){
// ===========================================================
// Constructor
// ===========================================================

function Board() {
  this.hive = {};
  this.queue = [];
  this.moves = [];
  this.errors = [];
  this.isGameover = false;
  this.pieces = {};
  this.pieces.WHITE = Board.createPieces(Board.PLAYER_WHITE);
  this.pieces.BLACK = Board.createPieces(Board.PLAYER_BLACK);
  this.quietMode = false;
  this.listeners = {
    move: [],
    rejection: [],
    gameover: [],
    draw: [],
    joined: [],
    left: []
  }
}

// ===========================================================
// Constants
// ===========================================================

Board.PLAYER_WHITE = 'WHITE';

Board.PLAYER_BLACK = 'BLACK';

Board.FIRST_LOCATION = '0:-1:0';

Board.SECOND_LOCATION = '0:1:0';

Board.pieceSet = function(){
  return ['QUEEN', 'SPIDER', 'SPIDER', 'BEETLE', 'BEETLE', 'GRASSHOPPER', 'GRASSHOPPER', 'GRASSHOPPER', 'ANT', 'ANT', 'ANT'];
}

// ===========================================================
// Instance Methods
// ===========================================================

Board.prototype.whoseTurn = function(){
  return (this.turn() % 2 === 0) ? Board.PLAYER_BLACK : Board.PLAYER_WHITE;
}


Board.prototype.turn = function(){
  return this.moves.length + 1;
}


Board.prototype.surroundingPieces = function(location, filtered){
  var _this = this;
  var pieces = Board.surroundingLocations(location).map(function(neighbor){
    return _this.hive[neighbor];
  });
  if(filtered){
    pieces = pieces.filter(function(piece){
      return !!piece && !piece.isMoving;
    });
  }
  return pieces;
};

Board.prototype.stackedPieces = function(location){
  var piece = this.hive[location + ':0'];
  var pieces = [];
  while(piece){
    pieces.push(piece);
    var newLocation = Board.MOVEMENTS.UP(piece.location);
    piece = this.hive[newLocation];
  }
  return pieces;
}


Board.prototype.moveableLocations = function(location, distance, visited){
  var moveableLocations = [];
  var _this = this;
  var distance = distance || 1;
  var visited = visited || {};
  visited[location] = location;
  var possibleLocations = Board.surroundingLocations(location);
  for(var i = 0; i < possibleLocations.length; i++){
    var neighborLocation = possibleLocations[i];
    var neighbor = this.hive[neighborLocation];
    if (neighbor || visited[neighborLocation]){
      continue;
    }
    var adjacentLeft = this.hive[possibleLocations[ (i === 0) ? 5 : i - 1 ]];
    if (adjacentLeft && adjacentLeft.isMoving){
      adjacentLeft = undefined;
    }
    var adjacentRight = this.hive[possibleLocations[ (i === 5) ? 0 : i + 1 ]];
    if (adjacentRight && adjacentRight.isMoving){
      adjacentRight = undefined;
    }
    if(!adjacentLeft != !adjacentRight){
      if(distance === Number.POSITIVE_INFINITY || distance === 1){
        moveableLocations.push(neighborLocation);
      }
      if(distance > 1){
        moveableLocations = moveableLocations.concat(this.moveableLocations(neighborLocation, distance - 1, visited));
      }
    }
  }
  return moveableLocations;
}


Board.prototype.crawlupableLocations = function(location){
  var crawlupableLocations = [];
  var locations = Board.surroundingLocations(location);
  for(var i = 0; i < locations.length; i++){
    var neighborLocation = locations[i];
    var neighborPiece = this.hive[neighborLocation];
    if(neighborPiece){
      var pinner = neighborPiece;
      while(pinner){
        var lastLocation = Board.MOVEMENTS.UP(pinner.location);
        pinner = this.hive[lastLocation];
      }
      crawlupableLocations.push(lastLocation);
    }
  }
  return crawlupableLocations;
}

Board.prototype.crawlableLocations = function(location){
  var crawlableLocations = [];
  var coords = Board.coordsFromNotation(location);
  if(coords.z === 0){
    return crawlableLocations;
  }
  var locations = Board.surroundingLocations(Board.MOVEMENTS.DOWN(location));
  for(var i = 0; i < locations.length; i++){
    var neighborLocation = locations[i];
    if (this.hive[neighborLocation]){
      var neighborCoords = Board.coordsFromNotation(neighborLocation);
      crawlableLocations.push(Board.MOVEMENTS.UP(neighborLocation));
    }
  }
  return crawlableLocations;
}

Board.prototype.droppableLocations = function(location){
  var droppableLocations = [];
  if(Board.coordsFromNotation(location).z === 0){
    return droppableLocations;
  }
  var locations = Board.surroundingLocations(location);
  for(var i = 0; i < locations.length; i++){
    var neighborLocation = locations[i];
    var piece;
    do {
      var neighborLocation = Board.MOVEMENTS.DOWN(neighborLocation);
      piece = this.hive[neighborLocation];
    } while(piece || Board.coordsFromNotation(neighborLocation).z > 0);
    if(!piece){
      droppableLocations.push(neighborLocation);
    }
  }
  return droppableLocations;
}


Board.prototype.hoppableLocations = function(location){
  var hoppableLocations = [];
  var directions = ['N', 'NE', 'SE', 'S', 'SW', 'NW']
  for(var i = 0; i < directions.length; i++){
    var moveFunction = Board.MOVEMENTS[directions[i]];
    var piece = this.hive[location];
    var lastLocation = location;
    var cnt = 0;
    while(piece){
      lastLocation = moveFunction(piece.location);
      piece = this.hive[lastLocation];
      cnt++;
    }
    if (cnt > 1) {
      hoppableLocations.push(lastLocation);
    }
  }
  return hoppableLocations;
}

Board.prototype.legalPiecePlacements = function(piece){
  if(this.turn() === 1){
    return [Board.FIRST_LOCATION];
  }
  if(this.turn() === 2){
    return [Board.SECOND_LOCATION];
  }
  var legalPlacements = {};
  var pieces = this.piecesInPlayByColor(piece.color);
  for(var i = 0; i < pieces.length; i++){
    var inPlayPiece = pieces[i]
    if(Board.coordsFromNotation(inPlayPiece.location).z !== 0){
      continue
    }
    var surroundingLocations = Board.surroundingLocations(inPlayPiece.location);
    for(var j = 0; j < surroundingLocations.length; j++){
      var possibleLocation = surroundingLocations[j];
      if(this.hive[possibleLocation]){
        continue;
      }
      var possibleLocationNeighbors = this.surroundingPieces(possibleLocation, true);
      var hasEnemyNeighbor = false;
      for(var k = 0; k < possibleLocationNeighbors.length; k++){
        if(possibleLocationNeighbors[k].color !== piece.color){
          hasEnemyNeighbor = true;
        }
      }
      if(!hasEnemyNeighbor){
        legalPlacements[possibleLocation] = possibleLocation;
      }
    }
  }
  return Object.keys(legalPlacements);
}

Board.prototype.legalPieceMovements = function(piece){
  var legalMovements = [];
  piece.isMoving = true;
  var pieces = this.piecesInPlayByColor(piece.color)
  if(piece.ability.moves){
    legalMovements = legalMovements.concat(this.moveableLocations(piece.location, piece.ability.moves));
  }
  if(piece.ability.canHop){
    legalMovements = legalMovements.concat(this.hoppableLocations(piece.location));
  }
  if(piece.ability.canCrawl) {
    legalMovements = legalMovements.concat(this.crawlableLocations(piece.location), this.crawlupableLocations(piece.location), this.droppableLocations(piece.location));
  }
  piece.isMoving = false;
  return legalMovements;
}

Board.prototype.piecesInPlayOnGround = function(){
  return this.piecesInPlay().filter(function(piece){
    return Board.coordsFromNotation(piece.location).z === 0;
  });
}

Board.prototype.piecesInPlay = function(){
  var whitePieces = this.piecesInPlayByColor(Board.PLAYER_WHITE);
  var blackPieces = this.piecesInPlayByColor(Board.PLAYER_BLACK);
  return whitePieces.concat(blackPieces);
};


Board.prototype.piecesInPlayByColor = function(color){
  return this.pieces[color].filter(function(piece){ return piece.isInPlay && !piece.isMoving });
};

Board.prototype.piecesNotInPlayByColor = function(color){
  return this.pieces[color].filter(function(piece){ return !piece.isInPlay });
};


Board.prototype.validate = function(notation, skipMovment, flushErrors){
  var valid = true;
  var skipMovment = skipMovment || false;
  valid = valid && this.validateColorTurnOrder(notation);
  valid = valid && this.validateQueenPlaced(notation);
  valid = valid && this.validateConnected(notation);
  if(!skipMovment) {
    valid = valid && this.validateMovement(notation);
  }
  if(flushErrors){
    this.errors = [];
  }
  return valid;
};

Board.prototype.validateMovement = function(notation){
  var valid;
  var piece = this.findPieceFromNotation(notation);
  var moveType = Board.moveTypeFromNotation(notation);
  var location = Board.keyFromNotation(notation);
  if(moveType === 'm'){
    valid = this.legalPieceMovements(piece).indexOf(location) !== -1 ? true :false;
    if(!valid){
      this.errors.push('Attempted to move to ' + location + ', but piece can only move ' + piece.ability.moves);
    }
  }else{
    valid = this.legalPiecePlacements(piece).indexOf(location) !== -1 ? true :false;
    if(!valid){
      this.errors.push('Can not place piece next to adjacent opponent piece')
    }
  }
  return valid;
}

Board.prototype.validateColorTurnOrder = function(notation){
  var color = Board.colorFromNotation(notation);
  var valid = this.whoseTurn() === color;
  if(!valid){
    this.errors.push('It is not ' + color + '\'s turn to play');
  }
  return valid;
}


Board.prototype.validateQueenPlaced = function(notation){
  var turn = this.turn();
  var color = Board.colorFromNotation(notation);
  var piece = this.findPieceFromNotation(notation);
  var valid = true;
  if( (turn === 7 && color === Board.PLAYER_WHITE) || (turn === 8 && color === Board.PLAYER_BLACK) ) {
    if (piece.type !== 'QUEEN'){
      valid = this.pieces[color].filter(function (piece) { return piece.type === 'QUEEN' && piece.isInPlay }).length === 1;
      if(!valid){
        this.errors.push('Queen must be out within first 4 turns');
      }
    }
  }
  return valid;
};


Board.prototype.validateConnected = function(notation){
  var valid = true;
  var moveType = Board.moveTypeFromNotation(notation);
  if(moveType === 'm'){
    var piece = this.findPieceFromNotation(notation);
    piece.isMoving = true;
    var pieces = this.piecesInPlayOnGround();
    var startingPiece = pieces[0];
    var coords = Board.coordsFromNotation(startingPiece.location);
    var visited = {};
    var queue = [startingPiece];
    while (queue.length > 0){
      var neighbor = queue.shift();
      if (!visited[neighbor.location]){
        visited[neighbor.location] = neighbor;
        queue = queue.concat(this.surroundingPieces(neighbor.location, true));
      }
    }
    valid = (Object.keys(visited).length === pieces.length);
    if(!valid){
      this.errors.push('This move results in a disconnected hive');
    }
    piece.isMoving = false;
  }
  return valid;
};


Board.prototype.checkGameover = function(){
  if (this.quietMode) return;
  var _this = this;
  var queens = [Board.PLAYER_WHITE, Board.PLAYER_BLACK].map(function(color){
    return _this.findPiece(color, 'QUEEN', '1');
  })
  var winners = queens.filter(function(queen){
    return !queen.isInPlay || _this.surroundingPieces(queen.location, true).length !== 6;
  });
  if(winners.length === 1) {
    this.isGameover = true
    this.broadcast('gameover', {
      winner: winners[0].color
    });
  }
}


Board.prototype.movement = function(notation){
  var piece = this.findPieceFromNotation(notation);
  if(piece.location){
    delete this.hive[piece.location];
  }
  this.hive[Board.keyFromNotation(notation)] = piece;
  piece.prevLocations.push(piece.location);
  piece.location = Board.keyFromNotation(notation);
  piece.isInPlay = true;
  this.broadcast('move', {
    turn: this.turn(),
    notation: notation,
    piece: piece
  });
}


Board.prototype.rejectMovment = function(notation){
  var piece = this.findPieceFromNotation(notation);
  this.broadcast('rejection', {
    turn: this.turn(),
    notation: notation,
    piece: piece,
    errors: this.errors
  });
}

Board.prototype.revertLast = function(){
  var notation = this.moves.pop();
  var moveType = Board.moveTypeFromNotation(notation);
  var key = Board.keyFromNotation(notation);
  var piece = this.hive[key];
  delete this.hive[key];
  if(moveType === 'm'){
    var prevLocation = piece.prevLocations.pop();
    this.hive[prevLocation] = piece;
    piece.location = prevLocation;
  }else{
    piece.isInPlay = false;
    delete piece.location;
  }
}

Board.prototype.findPieceFromNotation = function(notation){
  var color = Board.colorFromNotation(notation);
  var pieceType = Board.typeFromNotation(notation);
  var pieceTypeId = Board.typeIdFromNotation(notation);
  return this.findPiece(color, pieceType, pieceTypeId);
}


Board.prototype.findPiece = function(color, pieceType, pieceTypeId){
  return this.pieces[color].filter(function(piece){
    return piece.color === color && piece.type === pieceType && piece.typeId === parseInt(pieceTypeId);
  })[0];
}


Board.prototype.processQueue = function(flushErrors){
  if(this.isGameover){
    throw new Error('Can not process queue if the game is over');
  }
  while(this.queue.length != 0 && !this.isGameover){
    var notation = this.queue.shift();
    this.validate(notation);
    if(this.errors.length === 0){
      this.moves.push(notation);
      this.movement(notation);
      this.checkGameover();
    }else{
      this.rejectMovment(notation);
      if(flushErrors){
        this.errors = [];
      }
    }
  }
}


Board.prototype.on = function(eventName, cb){
  this.listeners[eventName].push(cb)
}


Board.prototype.broadcast = function(eventName, message){
  if(this.quietMode) return;
  var _this = this;
  var listeners = this.listeners[eventName];
  if(!listeners){
    throw new Error('Broadcasting to "' + eventName + '" is not allowed');
  }
  this.listeners[eventName].forEach(function(listener){
    listener.apply(_this, [message]);
  });
}

// ===========================================================
// Class Methods
// ===========================================================

Board.createPieces = function(color) {
  var pieces = [];
  Board.pieceSet().forEach(function(piece, i){
    pieces.push(new Board.Piece({ color: color, type: piece, typeId: i + 1 }));
  });
  return pieces;
}


Board.shallowHashClone = function(hash){
  var clone = {}
  Object.keys(hash).forEach(function(key){
    clone[key] = hash[key];
  });
  return clone;
}


Board.surroundingLocations = function(location){
  var locations = [];
  ['N', 'NE', 'SE', 'S', 'SW', 'NW'].forEach(function(direction){
    var moveFn = Board.MOVEMENTS[direction];
    locations.push(moveFn(location));
  });
  return locations;
}


Board.MOVEMENTS = {
  N: function(location){
    var coords = Board.coordsFromNotation(location);
    return Board.keyFromCoords(coords.x, coords.y + 2, coords.z);
  },
  NE: function(location){
    var coords = Board.coordsFromNotation(location);
    return Board.keyFromCoords(coords.x + 1, coords.y + 1, coords.z);
  },
  SE: function(location){
    var coords = Board.coordsFromNotation(location);
    return Board.keyFromCoords(coords.x + 1, coords.y - 1, coords.z);
  },
  S: function(location){
    var coords = Board.coordsFromNotation(location);
    return Board.keyFromCoords(coords.x, coords.y - 2, coords.z);
  },
  SW: function(location){
    var coords = Board.coordsFromNotation(location);
    return Board.keyFromCoords(coords.x - 1, coords.y - 1, coords.z);
  },
  NW: function(location){
    var coords = Board.coordsFromNotation(location);
    return Board.keyFromCoords(coords.x - 1, coords.y + 1, coords.z);
  },
  UP: function(location){
    var coords = Board.coordsFromNotation(location);
    return Board.keyFromCoords(coords.x, coords.y, coords.z + 1);
  },
  DOWN: function(location){
    var coords = Board.coordsFromNotation(location);
    return Board.keyFromCoords(coords.x, coords.y, coords.z - 1);
  }
}

Board.buildNotation = function(color, moveType, pieceType, pieceTypeId, x, y, z) {
  return color + ':' + moveType + ':' + pieceType + ':' + pieceTypeId + ':' + x + ':' + y + ':' + z;
}

Board.typeFromNotation = function(notation) {
  if(notation.length > 1){
    notation = notation.split(':')[2]
  }
  notation = notation.split('_')[0];
  switch (notation) {
    case 's':
      return 'SPIDER';
    case 'b':
      return 'BEETLE';
    case 'a':
      return 'ANT';
    case 'q':
      return 'QUEEN';
    case 'g':
      return 'GRASSHOPPER';
    default:
      throw new Error(notation + ' is not a valid piece');
  }
}

Board.typeIdFromNotation = function(notation) {
  if(notation.length > 1){
    notation = notation.split(':')[2]
  }
  return notation.split('_')[1];
}

Board.notationFromType = function(type, typeId){
  switch (type) {
    case 'SPIDER':
      return 's_' + typeId;
    case 'BEETLE':
      return 'b_' + typeId;
    case 'ANT':
      return 'a_' + typeId;
    case 'QUEEN':
      return 'q_' + typeId;
    case 'GRASSHOPPER':
      return 'g_' + typeId;
    default:
      throw new Error(type + ' is not a valid piece');
  }
}

Board.notationFromColor = function(color){
  return color === 'WHITE' ? 'w' : 'b'
}

Board.moveTypeFromNotation = function(notation){
  return notation.split(':')[1];
}

Board.colorFromNotation = function(notation){
  if(notation.length > 1){
    notation = notation.split(':')[0];
  }
  switch (notation) {
    case 'w':
      return 'WHITE';
    case 'b':
      return 'BLACK';
    default:
      throw new Error(notation + ' is not a valid color');
  }
}

Board.coordsFromNotation = function(notation){
  var parts = Board.keyPartsFromNotation(notation);
  return { x: parseInt(parts[0]), y: parseInt(parts[1]), z: parseInt(parts[2]) };
}

Board.keyFromNotation = function(notation){
  var parts = Board.keyPartsFromNotation(notation);
  return parts.join(':');
}

Board.keyPartsFromNotation = function(notation){
  var parts = notation.split(':');
  if(parts.length > 3){
    parts = parts.slice(3,6);
  }
  return parts;
}

Board.keyFromCoords = function(x, y, z) {
  return x + ':' + y + ':' + z;
}

Board.randomColor = function() {
  return [Board.PLAYER_WHITE, Board.PLAYER_BLACK][Math.floor(Math.random() * 2)];
}

Board.Piece =  function(attrs) {
  this.isInPlay = false;
  this.isMoving = false;
  this.type = attrs.type;
  this.typeId = attrs.typeId;
  this.color = attrs.color;
  this.prevLocations = [];
  switch (this.type) {
    case 'SPIDER':
      this.ability = { moves: 3, canCrawl: false, canHop: false  };
      break;
    case 'BEETLE':
      this.ability = { moves: 1, canCrawl: true, canHop: false  };
      break;
    case 'ANT':
      this.ability = { moves: Number.POSITIVE_INFINITY, canCrawl: false, canHop: false  };
      break;
    case 'QUEEN':
      this.ability = { moves: 1, canCrawl: false, canHop: false  };
      break;
    case 'GRASSHOPPER':
      this.ability = { moves: 0, canCrawl: false, canHop: true  };
      break;
    default:
      throw new Error(this.type + ' is not a piece');
  }
}

module.exports = Board;

},{}]},{},[1]);
