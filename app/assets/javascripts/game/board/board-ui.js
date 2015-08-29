var Kinetic = require('kinetic');
var Board = require('../../../../../lib/board');

UI = function(board, opts){
  this.board = board;
  this.username = opts.username;
  this.radius = opts.radius || 23;
  this.polyWidth = this.radius * 2,
  this.polyHeight =  this.radius * Math.sqrt(3);
  this.radiusShort = this.polyHeight / 2;
  this.padding = opts.padding || 6;
  this.container = opts.container;
  this.canvasWidth = opts.width || 800;
  this.canvasHeight = opts.height || (typeof(window) !== 'undefined' ? Math.max(window.innerHeight - 130) : 600);
  this.zScale = opts.zScale || 3;
  this.assistThreshold = opts.assistThreshold || this.radiusShort - 1;
  this.stage = new Kinetic.Stage({
    container: this.container,
    width: this.canvasWidth,
    height: this.canvasHeight
  });
  this.color = opts.color || Board.PLAYER_WHITE;
  this.colorOpponent = this.color === Board.PLAYER_WHITE ? Board.PLAYER_BLACK : Board.PLAYER_WHITE;
  this.pieceLayer = new Kinetic.Layer();
  this.board.on('move', this.handleMove.bind(this));
  this.board.on('rejection', this.handleRejection.bind(this));
  this.buildNotationToPixelMap(this.color === Board.PLAYER_BLACK);
  this.drawPieces();
}


UI.prototype.drawPieces = function(){
  this.drawPieceSet({ color: this.color, fillColor: UI.fillColors[this.color], y: this.canvasHeight - (2 * this.radius) + this.padding })
  this.drawPieceSet({ color: this.colorOpponent, fillColor: UI.fillColors[this.colorOpponent], y: 0 })
}


UI.prototype.drawPieceSet = function(opts){
  var pieces = this.board.pieces[opts.color];
  var xOffset = this.xPieceTrayOffset();
  for (var i = 0; i < pieces.length; i++) {
    var piece = pieces[i];
    var poly = new Kinetic.Image({
      draggable: true,
      x: i * (this.radius + this.padding / 2) * 2 + xOffset,
      y: opts.y,
      width: this.polyWidth,
      height: this.polyHeight,
      shadowColor: 'black',
      shadowBlur: 2,
      shadowOffset: {x:3, y:3},
      shadowOpacity: 0.5
    });
    if (typeof Image !== 'undefined'){
      var img = new Image();
      poly.setImage(img)
      var _this = this;
      img.onload = function(){
        _this.stage.draw();
      }
      img.src = UI.images[opts.color][piece.type];
    }
    poly.on('dragstart', this.dragPieceStart.bind(this));
    poly.on('dragend', this.dragPieceEnd.bind(this));
    poly.attrs.resetX = poly.attrs.x;
    poly.attrs.resetY = poly.attrs.y;
    poly.hive = {};
    poly.hive.piece = piece;
    this.pieceLayer.add(poly);
  }
  this.stage.add(this.pieceLayer);
}

UI.prototype.xPieceTrayOffset = function(){
  return ( this.canvasWidth - (11 * (this.padding + 2 * this.radius) ) ) / 2

}

UI.prototype.getMoveTypeNotationFromPoly = function(poly){
  return poly.hive.piece.isInPlay ? 'm' : 'p';
}

UI.prototype.getZCoordFromLocation = function(location){
  return this.board.stackedPieces(location).length;
}

UI.prototype.hiveOrigin = function(){
  var box = this.playableBoundingBox();
  var bottomRightPoint = box[2];
  return [bottomRightPoint[0]/2, bottomRightPoint[1]/2];
}

UI.prototype.playableBoundingBox = function(){
  var lowY = this.canvasHeight - 2 * (this.padding + this.radius);
  return [[0, 0],[this.canvasWidth, 0],[this.canvasWidth, lowY],[0, lowY]];
}

UI.prototype.nearestPolyOrigin = function(poly){
  var min = { distance: Number.POSITIVE_INFINITY };
  var x = poly.attrs.x;
  var y = poly.attrs.y;
  for (var notation in this.notationToPixelMap){
    if(this.notationToPixelMap.hasOwnProperty(notation)){
      var point = this.notationToPixelMap[notation];
      var dx = x - point[0];
      var dy = y - point[1];
      var distance = Math.sqrt(dx * dx + dy * dy);
      if(distance < min.distance){
        min.distance = distance;
        min.point = point;
        min.notation = notation;
        min.traveler = poly;
      }
    }
  }
  return min;
}
UI.prototype.acceptablePolyOrigin = function(poly){
  var point = [poly.attrs.x, poly.attrs.y];
  if(this.board.moves.length === 0 && UI.isInBox(point, this.playableBoundingBox())){
    return { point: this.notationToPixelMap['0:-1'], notation: '0:-1', traveler: poly }
  }else{
    return this.nearestPolyOrigin(poly);
  }
}

UI.prototype.buildNotationToPixelMap = function(invert){
  var direction = invert ? -1 : 1;
  this.notationToPixelMap = {};
  this.pix = {};
  var originPoint = this.hiveOrigin();
  for(var col = -5; col <= 5; col++){
    var x = (3/2 * (this.radius + this.padding)) * col;
    for(var row = -10; row <= 10; row++){
      var y = (this.radiusShort + this.padding) * row * -1;
      var xIsEven = col % 2 === 0;
      var yIsEven = row % 2 === 0;
      if((xIsEven && !yIsEven) || (!xIsEven && yIsEven)){
        this.notationToPixelMap[col + ':' + row] = [x * direction + originPoint[0], y * direction + originPoint[1] - this.padding/2];
      }
    }
  }
};

UI.isInBox = function(point, box){
  var x = point[0];
  var y = point[1];
  var topLeftPoint = box[0];
  var bottomRightPoint = box[2];
  var leftBound = topLeftPoint[0];
  var topBound = topLeftPoint[1];
  var rightBound = bottomRightPoint[0];
  var bottomBound = bottomRightPoint[1];
  return (x > leftBound && x < rightBound && y > topBound && y < bottomBound);
}

UI.prototype.getPolyFromPiece = function(piece){
  return this.pieceLayer.children.filter(function(poly){
    return poly.hive.piece == piece;
  })[0];
}

UI.prototype.getDestLocationFromNotation = function(notation){
  var parts = notation.split(':');
  var point = this.notationToPixelMap[[parts[3] + ':' + parts[4]]];
  return { x: point[0], y: point[1] };

}

UI.prototype.getNotationFromLocation = function(location){
  var poly = location.traveler;
  var color = poly.hive.piece.color === 'BLACK' ? 'b' : 'w';
  var moveType = this.getMoveTypeNotationFromPoly(poly);
  var pieceType = Board.notationFromType(poly.hive.piece.type, poly.hive.piece.typeId);
  var destCoord = location.notation;
  var zCoord = this.getZCoordFromLocation(destCoord);
  return color + ':' + moveType + ':' + pieceType + ':' + destCoord + ':' + zCoord;
}

UI.prototype.dragPieceStart = function(e){
  var poly = e.target;
}

UI.prototype.dragPieceEnd = function(e){
  var poly = e.target;
  var x = poly.attrs.resetX;
  var y = poly.attrs.resetY;
  var location = this.acceptablePolyOrigin(poly);
  if(location) {
    var notation = this.getNotationFromLocation(location);
    this.board.queue.push(notation);
    this.board.processQueue(true);
  }else {
    new Kinetic.Tween({
      node: poly,
      x: poly.attrs.resetX,
      y: poly.attrs.resetY,
      duration: .2
    }).play();
  }  
}

UI.prototype.handleMove = function(e){
  var piece = e.piece;
  var poly = this.getPolyFromPiece(piece);
  var point = this.getDestLocationFromNotation(e.notation);
  var zIndex = Board.coordsFromNotation(e.notation).z;
  poly.setWidth(this.polyWidth - ( zIndex * this.zScale ));
  poly.attrs.resetX = point.x;
  poly.attrs.resetY = point.y;
  new Kinetic.Tween({
    node: poly, 
    x: point.x, 
    y: point.y, 
    duration: .5 
  }).play();
}

UI.prototype.handleRejection = function(e){
  console.error(e);
  var piece = e.piece;
  var poly = this.getPolyFromPiece(piece);
  var point = this.getDestLocationFromNotation(e.notation);
  new Kinetic.Tween({
    node: poly,
    x: poly.attrs.resetX,
    y: poly.attrs.resetY,
    duration: .2
  }).play();
}

// ===========================================================
// Class Methods
// ===========================================================

UI.images = {
  WHITE: {
    QUEEN: 'images/white_queen.png',
    ANT: 'images/white_ant.png',
    GRASSHOPPER: 'images/white_grasshopper.png',
    BEETLE: 'images/white_beetle.png',
    SPIDER: 'images/white_spider.png'
  },
  BLACK: {
    QUEEN: 'images/black_queen.png',
    ANT: 'images/black_ant.png',
    GRASSHOPPER: 'images/black_grasshopper.png',
    BEETLE: 'images/black_beetle.png',
    SPIDER: 'images/black_spider.png'
  }
};

UI.fillColors = { WHITE: '#FFFFCC', BLACK: '#000000' };

// ===========================================================
// Exports
// ===========================================================

module.exports = UI;