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
    this.board.queue.push(notation);
    this.board.processQueue();
    if(this.board.errors.length > 0){
      console.error(this.board.errors, this.board.moves, notation);
      throw new Error('AI Board should never have errors');
    }
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