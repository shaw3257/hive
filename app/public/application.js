var global = globalThis;
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // lib/board.js
  var require_board = __commonJS({
    "lib/board.js"(exports, module) {
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
        };
      }
      Board.PLAYER_WHITE = "WHITE";
      Board.PLAYER_BLACK = "BLACK";
      Board.FIRST_LOCATION = "0:-1:0";
      Board.SECOND_LOCATION = "0:1:0";
      Board.pieceSet = function() {
        return ["QUEEN", "SPIDER", "SPIDER", "BEETLE", "BEETLE", "GRASSHOPPER", "GRASSHOPPER", "GRASSHOPPER", "ANT", "ANT", "ANT"];
      };
      Board.prototype.whoseTurn = function() {
        return this.turn() % 2 === 0 ? Board.PLAYER_BLACK : Board.PLAYER_WHITE;
      };
      Board.prototype.turn = function() {
        return this.moves.length + 1;
      };
      Board.prototype.surroundingPieces = function(location2, filtered) {
        var _this = this;
        var pieces = Board.surroundingLocations(location2).map(function(neighbor) {
          return _this.hive[neighbor];
        });
        if (filtered) {
          pieces = pieces.filter(function(piece) {
            return !!piece && !piece.isMoving;
          });
        }
        return pieces;
      };
      Board.prototype.stackedPieces = function(location2) {
        var piece = this.hive[location2 + ":0"];
        var pieces = [];
        while (piece) {
          pieces.push(piece);
          var newLocation = Board.MOVEMENTS.UP(piece.location);
          piece = this.hive[newLocation];
        }
        return pieces;
      };
      Board.prototype.moveableLocations = function(location2, distance, visited) {
        var moveableLocations = [];
        var _this = this;
        var distance = distance || 1;
        var visited = visited || {};
        visited[location2] = location2;
        var possibleLocations = Board.surroundingLocations(location2);
        for (var i = 0; i < possibleLocations.length; i++) {
          var neighborLocation = possibleLocations[i];
          var neighbor = this.hive[neighborLocation];
          if (neighbor || visited[neighborLocation]) {
            continue;
          }
          var adjacentLeft = this.hive[possibleLocations[i === 0 ? 5 : i - 1]];
          if (adjacentLeft && adjacentLeft.isMoving) {
            adjacentLeft = void 0;
          }
          var adjacentRight = this.hive[possibleLocations[i === 5 ? 0 : i + 1]];
          if (adjacentRight && adjacentRight.isMoving) {
            adjacentRight = void 0;
          }
          if (!adjacentLeft != !adjacentRight) {
            if (distance === Number.POSITIVE_INFINITY || distance === 1) {
              moveableLocations.push(neighborLocation);
            }
            if (distance > 1) {
              moveableLocations = moveableLocations.concat(this.moveableLocations(neighborLocation, distance - 1, visited));
            }
          }
        }
        return moveableLocations;
      };
      Board.prototype.crawlupableLocations = function(location2) {
        var crawlupableLocations = [];
        var locations = Board.surroundingLocations(location2);
        for (var i = 0; i < locations.length; i++) {
          var neighborLocation = locations[i];
          var neighborPiece = this.hive[neighborLocation];
          if (neighborPiece) {
            var pinner = neighborPiece;
            while (pinner) {
              var lastLocation = Board.MOVEMENTS.UP(pinner.location);
              pinner = this.hive[lastLocation];
            }
            crawlupableLocations.push(lastLocation);
          }
        }
        return crawlupableLocations;
      };
      Board.prototype.crawlableLocations = function(location2) {
        var crawlableLocations = [];
        var coords = Board.coordsFromNotation(location2);
        if (coords.z === 0) {
          return crawlableLocations;
        }
        var locations = Board.surroundingLocations(Board.MOVEMENTS.DOWN(location2));
        for (var i = 0; i < locations.length; i++) {
          var neighborLocation = locations[i];
          if (this.hive[neighborLocation]) {
            var neighborCoords = Board.coordsFromNotation(neighborLocation);
            crawlableLocations.push(Board.MOVEMENTS.UP(neighborLocation));
          }
        }
        return crawlableLocations;
      };
      Board.prototype.droppableLocations = function(location2) {
        var droppableLocations = [];
        if (Board.coordsFromNotation(location2).z === 0) {
          return droppableLocations;
        }
        var locations = Board.surroundingLocations(location2);
        for (var i = 0; i < locations.length; i++) {
          var neighborLocation = locations[i];
          var piece;
          do {
            var neighborLocation = Board.MOVEMENTS.DOWN(neighborLocation);
            piece = this.hive[neighborLocation];
          } while (piece || Board.coordsFromNotation(neighborLocation).z > 0);
          if (!piece) {
            droppableLocations.push(neighborLocation);
          }
        }
        return droppableLocations;
      };
      Board.prototype.hoppableLocations = function(location2) {
        var hoppableLocations = [];
        var directions = ["N", "NE", "SE", "S", "SW", "NW"];
        for (var i = 0; i < directions.length; i++) {
          var moveFunction = Board.MOVEMENTS[directions[i]];
          var piece = this.hive[location2];
          var lastLocation = location2;
          var cnt = 0;
          while (piece) {
            lastLocation = moveFunction(piece.location);
            piece = this.hive[lastLocation];
            cnt++;
          }
          if (cnt > 1) {
            hoppableLocations.push(lastLocation);
          }
        }
        return hoppableLocations;
      };
      Board.prototype.legalPiecePlacements = function(piece) {
        if (this.turn() === 1) {
          return [Board.FIRST_LOCATION];
        }
        if (this.turn() === 2) {
          return [Board.SECOND_LOCATION];
        }
        var legalPlacements = {};
        var pieces = this.piecesInPlayByColor(piece.color);
        for (var i = 0; i < pieces.length; i++) {
          var inPlayPiece = pieces[i];
          if (Board.coordsFromNotation(inPlayPiece.location).z !== 0) {
            continue;
          }
          var surroundingLocations = Board.surroundingLocations(inPlayPiece.location);
          for (var j = 0; j < surroundingLocations.length; j++) {
            var possibleLocation = surroundingLocations[j];
            if (this.hive[possibleLocation]) {
              continue;
            }
            var possibleLocationNeighbors = this.surroundingPieces(possibleLocation, true);
            var hasEnemyNeighbor = false;
            for (var k = 0; k < possibleLocationNeighbors.length; k++) {
              if (possibleLocationNeighbors[k].color !== piece.color) {
                hasEnemyNeighbor = true;
              }
            }
            if (!hasEnemyNeighbor) {
              legalPlacements[possibleLocation] = possibleLocation;
            }
          }
        }
        return Object.keys(legalPlacements);
      };
      Board.prototype.legalPieceMovements = function(piece) {
        var legalMovements = [];
        piece.isMoving = true;
        var pieces = this.piecesInPlayByColor(piece.color);
        if (piece.ability.moves) {
          legalMovements = legalMovements.concat(this.moveableLocations(piece.location, piece.ability.moves));
        }
        if (piece.ability.canHop) {
          legalMovements = legalMovements.concat(this.hoppableLocations(piece.location));
        }
        if (piece.ability.canCrawl) {
          legalMovements = legalMovements.concat(this.crawlableLocations(piece.location), this.crawlupableLocations(piece.location), this.droppableLocations(piece.location));
        }
        piece.isMoving = false;
        return legalMovements;
      };
      Board.prototype.piecesInPlayOnGround = function() {
        return this.piecesInPlay().filter(function(piece) {
          return Board.coordsFromNotation(piece.location).z === 0;
        });
      };
      Board.prototype.piecesInPlay = function() {
        var whitePieces = this.piecesInPlayByColor(Board.PLAYER_WHITE);
        var blackPieces = this.piecesInPlayByColor(Board.PLAYER_BLACK);
        return whitePieces.concat(blackPieces);
      };
      Board.prototype.piecesInPlayByColor = function(color) {
        return this.pieces[color].filter(function(piece) {
          return piece.isInPlay && !piece.isMoving;
        });
      };
      Board.prototype.piecesNotInPlayByColor = function(color) {
        return this.pieces[color].filter(function(piece) {
          return !piece.isInPlay;
        });
      };
      Board.prototype.validate = function(notation, skipMovment, flushErrors) {
        var valid = true;
        var skipMovment = skipMovment || false;
        valid = valid && this.validateColorTurnOrder(notation);
        valid = valid && this.validateQueenPlaced(notation);
        valid = valid && this.validateConnected(notation);
        if (!skipMovment) {
          valid = valid && this.validateMovement(notation);
        }
        if (flushErrors) {
          this.errors = [];
        }
        return valid;
      };
      Board.prototype.validateMovement = function(notation) {
        var valid;
        var piece = this.findPieceFromNotation(notation);
        var moveType = Board.moveTypeFromNotation(notation);
        var location2 = Board.keyFromNotation(notation);
        if (moveType === "m") {
          valid = this.legalPieceMovements(piece).indexOf(location2) !== -1 ? true : false;
          if (!valid) {
            this.errors.push("Attempted to move to " + location2 + ", but piece can only move " + piece.ability.moves);
          }
        } else {
          valid = this.legalPiecePlacements(piece).indexOf(location2) !== -1 ? true : false;
          if (!valid) {
            this.errors.push("Can not place piece next to adjacent opponent piece");
          }
        }
        return valid;
      };
      Board.prototype.validateColorTurnOrder = function(notation) {
        var color = Board.colorFromNotation(notation);
        var valid = this.whoseTurn() === color;
        if (!valid) {
          this.errors.push("It is not " + color + "'s turn to play");
        }
        return valid;
      };
      Board.prototype.validateQueenPlaced = function(notation) {
        var turn = this.turn();
        var color = Board.colorFromNotation(notation);
        var piece = this.findPieceFromNotation(notation);
        var valid = true;
        if (turn === 7 && color === Board.PLAYER_WHITE || turn === 8 && color === Board.PLAYER_BLACK) {
          if (piece.type !== "QUEEN") {
            valid = this.pieces[color].filter(function(piece2) {
              return piece2.type === "QUEEN" && piece2.isInPlay;
            }).length === 1;
            if (!valid) {
              this.errors.push("Queen must be out within first 4 turns");
            }
          }
        }
        return valid;
      };
      Board.prototype.validateConnected = function(notation) {
        var valid = true;
        var moveType = Board.moveTypeFromNotation(notation);
        if (moveType === "m") {
          var piece = this.findPieceFromNotation(notation);
          piece.isMoving = true;
          var pieces = this.piecesInPlayOnGround();
          var startingPiece = pieces[0];
          var coords = Board.coordsFromNotation(startingPiece.location);
          var visited = {};
          var queue = [startingPiece];
          while (queue.length > 0) {
            var neighbor = queue.shift();
            if (!visited[neighbor.location]) {
              visited[neighbor.location] = neighbor;
              queue = queue.concat(this.surroundingPieces(neighbor.location, true));
            }
          }
          valid = Object.keys(visited).length === pieces.length;
          if (!valid) {
            this.errors.push("This move results in a disconnected hive");
          }
          piece.isMoving = false;
        }
        return valid;
      };
      Board.prototype.checkGameover = function() {
        if (this.quietMode) return;
        var _this = this;
        var queens = [Board.PLAYER_WHITE, Board.PLAYER_BLACK].map(function(color) {
          return _this.findPiece(color, "QUEEN", "1");
        });
        var winners = queens.filter(function(queen) {
          return !queen.isInPlay || _this.surroundingPieces(queen.location, true).length !== 6;
        });
        if (winners.length === 1) {
          this.isGameover = true;
          this.broadcast("gameover", {
            winner: winners[0].color
          });
        }
      };
      Board.prototype.movement = function(notation) {
        var piece = this.findPieceFromNotation(notation);
        if (piece.location) {
          delete this.hive[piece.location];
        }
        this.hive[Board.keyFromNotation(notation)] = piece;
        piece.prevLocations.push(piece.location);
        piece.location = Board.keyFromNotation(notation);
        piece.isInPlay = true;
        this.broadcast("move", {
          turn: this.turn(),
          notation,
          piece
        });
      };
      Board.prototype.rejectMovment = function(notation) {
        var piece = this.findPieceFromNotation(notation);
        this.broadcast("rejection", {
          turn: this.turn(),
          notation,
          piece,
          errors: this.errors
        });
      };
      Board.prototype.revertLast = function() {
        var notation = this.moves.pop();
        var moveType = Board.moveTypeFromNotation(notation);
        var key = Board.keyFromNotation(notation);
        var piece = this.hive[key];
        delete this.hive[key];
        if (moveType === "m") {
          var prevLocation = piece.prevLocations.pop();
          this.hive[prevLocation] = piece;
          piece.location = prevLocation;
        } else {
          piece.isInPlay = false;
          delete piece.location;
        }
      };
      Board.prototype.findPieceFromNotation = function(notation) {
        var color = Board.colorFromNotation(notation);
        var pieceType = Board.typeFromNotation(notation);
        var pieceTypeId = Board.typeIdFromNotation(notation);
        return this.findPiece(color, pieceType, pieceTypeId);
      };
      Board.prototype.findPiece = function(color, pieceType, pieceTypeId) {
        return this.pieces[color].filter(function(piece) {
          return piece.color === color && piece.type === pieceType && piece.typeId === parseInt(pieceTypeId);
        })[0];
      };
      Board.prototype.processQueue = function(flushErrors) {
        if (this.isGameover) {
          throw new Error("Can not process queue if the game is over");
        }
        while (this.queue.length != 0 && !this.isGameover) {
          var notation = this.queue.shift();
          this.validate(notation);
          if (this.errors.length === 0) {
            this.moves.push(notation);
            this.movement(notation);
            this.checkGameover();
          } else {
            this.rejectMovment(notation);
            if (flushErrors) {
              this.errors = [];
            }
          }
        }
      };
      Board.prototype.on = function(eventName, cb) {
        this.listeners[eventName].push(cb);
      };
      Board.prototype.broadcast = function(eventName, message) {
        if (this.quietMode) return;
        var _this = this;
        var listeners = this.listeners[eventName];
        if (!listeners) {
          throw new Error('Broadcasting to "' + eventName + '" is not allowed');
        }
        this.listeners[eventName].forEach(function(listener) {
          listener.apply(_this, [message]);
        });
      };
      Board.createPieces = function(color) {
        var pieces = [];
        Board.pieceSet().forEach(function(piece, i) {
          pieces.push(new Board.Piece({ color, type: piece, typeId: i + 1 }));
        });
        return pieces;
      };
      Board.shallowHashClone = function(hash) {
        var clone = {};
        Object.keys(hash).forEach(function(key) {
          clone[key] = hash[key];
        });
        return clone;
      };
      Board.surroundingLocations = function(location2) {
        var locations = [];
        ["N", "NE", "SE", "S", "SW", "NW"].forEach(function(direction) {
          var moveFn = Board.MOVEMENTS[direction];
          locations.push(moveFn(location2));
        });
        return locations;
      };
      Board.MOVEMENTS = {
        N: function(location2) {
          var coords = Board.coordsFromNotation(location2);
          return Board.keyFromCoords(coords.x, coords.y + 2, coords.z);
        },
        NE: function(location2) {
          var coords = Board.coordsFromNotation(location2);
          return Board.keyFromCoords(coords.x + 1, coords.y + 1, coords.z);
        },
        SE: function(location2) {
          var coords = Board.coordsFromNotation(location2);
          return Board.keyFromCoords(coords.x + 1, coords.y - 1, coords.z);
        },
        S: function(location2) {
          var coords = Board.coordsFromNotation(location2);
          return Board.keyFromCoords(coords.x, coords.y - 2, coords.z);
        },
        SW: function(location2) {
          var coords = Board.coordsFromNotation(location2);
          return Board.keyFromCoords(coords.x - 1, coords.y - 1, coords.z);
        },
        NW: function(location2) {
          var coords = Board.coordsFromNotation(location2);
          return Board.keyFromCoords(coords.x - 1, coords.y + 1, coords.z);
        },
        UP: function(location2) {
          var coords = Board.coordsFromNotation(location2);
          return Board.keyFromCoords(coords.x, coords.y, coords.z + 1);
        },
        DOWN: function(location2) {
          var coords = Board.coordsFromNotation(location2);
          return Board.keyFromCoords(coords.x, coords.y, coords.z - 1);
        }
      };
      Board.buildNotation = function(color, moveType, pieceType, pieceTypeId, x, y, z) {
        return color + ":" + moveType + ":" + pieceType + ":" + pieceTypeId + ":" + x + ":" + y + ":" + z;
      };
      Board.typeFromNotation = function(notation) {
        if (notation.length > 1) {
          notation = notation.split(":")[2];
        }
        notation = notation.split("_")[0];
        switch (notation) {
          case "s":
            return "SPIDER";
          case "b":
            return "BEETLE";
          case "a":
            return "ANT";
          case "q":
            return "QUEEN";
          case "g":
            return "GRASSHOPPER";
          default:
            throw new Error(notation + " is not a valid piece");
        }
      };
      Board.typeIdFromNotation = function(notation) {
        if (notation.length > 1) {
          notation = notation.split(":")[2];
        }
        return notation.split("_")[1];
      };
      Board.notationFromType = function(type, typeId) {
        switch (type) {
          case "SPIDER":
            return "s_" + typeId;
          case "BEETLE":
            return "b_" + typeId;
          case "ANT":
            return "a_" + typeId;
          case "QUEEN":
            return "q_" + typeId;
          case "GRASSHOPPER":
            return "g_" + typeId;
          default:
            throw new Error(type + " is not a valid piece");
        }
      };
      Board.notationFromColor = function(color) {
        return color === "WHITE" ? "w" : "b";
      };
      Board.moveTypeFromNotation = function(notation) {
        return notation.split(":")[1];
      };
      Board.colorFromNotation = function(notation) {
        if (notation.length > 1) {
          notation = notation.split(":")[0];
        }
        switch (notation) {
          case "w":
            return "WHITE";
          case "b":
            return "BLACK";
          default:
            throw new Error(notation + " is not a valid color");
        }
      };
      Board.coordsFromNotation = function(notation) {
        var parts = Board.keyPartsFromNotation(notation);
        return { x: parseInt(parts[0]), y: parseInt(parts[1]), z: parseInt(parts[2]) };
      };
      Board.keyFromNotation = function(notation) {
        var parts = Board.keyPartsFromNotation(notation);
        return parts.join(":");
      };
      Board.keyPartsFromNotation = function(notation) {
        var parts = notation.split(":");
        if (parts.length > 3) {
          parts = parts.slice(3, 6);
        }
        return parts;
      };
      Board.keyFromCoords = function(x, y, z) {
        return x + ":" + y + ":" + z;
      };
      Board.randomColor = function() {
        return [Board.PLAYER_WHITE, Board.PLAYER_BLACK][Math.floor(Math.random() * 2)];
      };
      Board.Piece = function(attrs) {
        this.isInPlay = false;
        this.isMoving = false;
        this.type = attrs.type;
        this.typeId = attrs.typeId;
        this.color = attrs.color;
        this.prevLocations = [];
        switch (this.type) {
          case "SPIDER":
            this.ability = { moves: 3, canCrawl: false, canHop: false };
            break;
          case "BEETLE":
            this.ability = { moves: 1, canCrawl: true, canHop: false };
            break;
          case "ANT":
            this.ability = { moves: Number.POSITIVE_INFINITY, canCrawl: false, canHop: false };
            break;
          case "QUEEN":
            this.ability = { moves: 1, canCrawl: false, canHop: false };
            break;
          case "GRASSHOPPER":
            this.ability = { moves: 0, canCrawl: false, canHop: true };
            break;
          default:
            throw new Error(this.type + " is not a piece");
        }
      };
      module.exports = Board;
    }
  });

  // lib/ai.js
  var require_ai = __commonJS({
    "lib/ai.js"(exports, module) {
      var Board = require_board();
      var evalCnt = 0;
      function AI(board) {
        this.board = board;
      }
      AI.prototype.allPossiblePlacements = function(color) {
        var allPlacments = [];
        var pieces = this.board.piecesNotInPlayByColor(color);
        var colorNotation = Board.notationFromColor(color);
        for (var i = 0; i < pieces.length; i++) {
          var piece = pieces[i];
          var pieceTypeNotation = Board.notationFromType(piece.type, piece.typeId);
          var placements = this.board.legalPiecePlacements(piece);
          for (var j = 0; j < placements.length; j++) {
            var notation = colorNotation + ":p:" + pieceTypeNotation + ":" + placements[j];
            if (this.board.validateQueenPlaced(notation)) {
              allPlacments.push(notation);
            }
          }
        }
        return allPlacments;
      };
      AI.prototype.allPossibleMovements = function(color) {
        var allMovements = [];
        var pieces = this.board.piecesInPlayByColor(color);
        var colorNotation = Board.notationFromColor(color);
        for (var i = 0; i < pieces.length; i++) {
          var piece = pieces[i];
          var pieceTypeNotation = Board.notationFromType(piece.type, piece.typeId);
          var placements = this.board.legalPieceMovements(piece);
          for (var j = 0; j < placements.length; j++) {
            var notation = colorNotation + ":m:" + pieceTypeNotation + ":" + placements[j];
            if (this.board.validateQueenPlaced(notation) && this.board.validateConnected(notation)) {
              allMovements.push(notation);
            }
            this.board.errors = [];
          }
        }
        return allMovements;
      };
      AI.prototype.allPossibleMoves = function(color) {
        return AI.shuffle(this.allPossiblePlacements(color).concat(this.allPossibleMovements(color)));
      };
      AI.prototype.surroundingQueenCnt = function(color) {
        var queen = this.board.findPiece(color, "QUEEN", "1");
        return queen.isInPlay ? this.board.surroundingPieces(queen.location, true).length : 0;
      };
      AI.prototype.evaluatePosition = function() {
        var minQueenSurroundCnt = this.surroundingQueenCnt(this.minimizingColor);
        var maxQueenSurroundCnt = this.surroundingQueenCnt(this.maximizingColor);
        if (minQueenSurroundCnt === 6) minQueenSurroundCnt = Number.POSITIVE_INFINITY;
        if (maxQueenSurroundCnt === 6) maxQueenSurroundCnt = Number.NEGATIVE_INFINITY;
        var score = minQueenSurroundCnt - maxQueenSurroundCnt;
        return score;
      };
      AI.prototype.bestMove = function(depth) {
        evalCnt = 0;
        this.maximizingColor = this.board.whoseTurn();
        this.minimizingColor = AI.toggleColor(this.maximizingColor);
        this.board.quietMode = true;
        var move = this.minimax(depth, true, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
        this.board.quietMode = false;
        console.log("eval count: " + evalCnt);
        return move;
      };
      AI.prototype.minimax = function(depth, maximizing, alpha, beta, notation) {
        if (notation) {
          this.board.moves.push(notation);
          this.board.movement(notation);
        }
        if (depth === 0) {
          evalCnt += 1;
          var score = this.evaluatePosition(!maximizing);
          this.board.revertLast();
          return { score, notation };
        }
        var color = this.board.whoseTurn();
        var allPossibleMoves = this.allPossibleMoves(color);
        var bestPath = maximizing ? { score: Number.NEGATIVE_INFINITY } : { score: Number.POSITIVE_INFINITY };
        for (var i = 0; i < allPossibleMoves.length; i++) {
          var candidate = allPossibleMoves[i];
          var results = this.minimax(depth - 1, !maximizing, alpha, beta, candidate);
          if (maximizing) {
            if (results.score > bestPath.score) {
              bestPath = { score: results.score, notation: candidate };
            }
            alpha = Math.max(alpha, bestPath.score);
          } else {
            if (results.score < bestPath.score) {
              bestPath = { score: results.score, notation: candidate };
            }
            beta = Math.min(beta, bestPath.score);
          }
          if (beta <= alpha) {
            break;
          }
        }
        if (notation) {
          this.board.revertLast();
        }
        return bestPath;
      };
      AI.toggleColor = function(color) {
        return color === "BLACK" ? "WHITE" : "BLACK";
      };
      AI.shuffle = function(o) {
        for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x) ;
        return o;
      };
      module.exports = AI;
    }
  });

  // node_modules/engine.io-parser/build/cjs/commons.js
  var require_commons = __commonJS({
    "node_modules/engine.io-parser/build/cjs/commons.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ERROR_PACKET = exports.PACKET_TYPES_REVERSE = exports.PACKET_TYPES = void 0;
      var PACKET_TYPES = /* @__PURE__ */ Object.create(null);
      exports.PACKET_TYPES = PACKET_TYPES;
      PACKET_TYPES["open"] = "0";
      PACKET_TYPES["close"] = "1";
      PACKET_TYPES["ping"] = "2";
      PACKET_TYPES["pong"] = "3";
      PACKET_TYPES["message"] = "4";
      PACKET_TYPES["upgrade"] = "5";
      PACKET_TYPES["noop"] = "6";
      var PACKET_TYPES_REVERSE = /* @__PURE__ */ Object.create(null);
      exports.PACKET_TYPES_REVERSE = PACKET_TYPES_REVERSE;
      Object.keys(PACKET_TYPES).forEach((key) => {
        PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
      });
      var ERROR_PACKET = { type: "error", data: "parser error" };
      exports.ERROR_PACKET = ERROR_PACKET;
    }
  });

  // node_modules/engine.io-parser/build/cjs/encodePacket.browser.js
  var require_encodePacket_browser = __commonJS({
    "node_modules/engine.io-parser/build/cjs/encodePacket.browser.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.encodePacket = void 0;
      exports.encodePacketToBinary = encodePacketToBinary;
      var commons_js_1 = require_commons();
      var withNativeBlob = typeof Blob === "function" || typeof Blob !== "undefined" && Object.prototype.toString.call(Blob) === "[object BlobConstructor]";
      var withNativeArrayBuffer = typeof ArrayBuffer === "function";
      var isView = (obj) => {
        return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj && obj.buffer instanceof ArrayBuffer;
      };
      var encodePacket = ({ type, data }, supportsBinary, callback) => {
        if (withNativeBlob && data instanceof Blob) {
          if (supportsBinary) {
            return callback(data);
          } else {
            return encodeBlobAsBase64(data, callback);
          }
        } else if (withNativeArrayBuffer && (data instanceof ArrayBuffer || isView(data))) {
          if (supportsBinary) {
            return callback(data);
          } else {
            return encodeBlobAsBase64(new Blob([data]), callback);
          }
        }
        return callback(commons_js_1.PACKET_TYPES[type] + (data || ""));
      };
      exports.encodePacket = encodePacket;
      var encodeBlobAsBase64 = (data, callback) => {
        const fileReader = new FileReader();
        fileReader.onload = function() {
          const content = fileReader.result.split(",")[1];
          callback("b" + (content || ""));
        };
        return fileReader.readAsDataURL(data);
      };
      function toArray(data) {
        if (data instanceof Uint8Array) {
          return data;
        } else if (data instanceof ArrayBuffer) {
          return new Uint8Array(data);
        } else {
          return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        }
      }
      var TEXT_ENCODER;
      function encodePacketToBinary(packet, callback) {
        if (withNativeBlob && packet.data instanceof Blob) {
          return packet.data.arrayBuffer().then(toArray).then(callback);
        } else if (withNativeArrayBuffer && (packet.data instanceof ArrayBuffer || isView(packet.data))) {
          return callback(toArray(packet.data));
        }
        encodePacket(packet, false, (encoded) => {
          if (!TEXT_ENCODER) {
            TEXT_ENCODER = new TextEncoder();
          }
          callback(TEXT_ENCODER.encode(encoded));
        });
      }
    }
  });

  // node_modules/engine.io-parser/build/cjs/contrib/base64-arraybuffer.js
  var require_base64_arraybuffer = __commonJS({
    "node_modules/engine.io-parser/build/cjs/contrib/base64-arraybuffer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.decode = exports.encode = void 0;
      var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      var lookup = typeof Uint8Array === "undefined" ? [] : new Uint8Array(256);
      for (let i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
      }
      var encode = (arraybuffer) => {
        let bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = "";
        for (i = 0; i < len; i += 3) {
          base64 += chars[bytes[i] >> 2];
          base64 += chars[(bytes[i] & 3) << 4 | bytes[i + 1] >> 4];
          base64 += chars[(bytes[i + 1] & 15) << 2 | bytes[i + 2] >> 6];
          base64 += chars[bytes[i + 2] & 63];
        }
        if (len % 3 === 2) {
          base64 = base64.substring(0, base64.length - 1) + "=";
        } else if (len % 3 === 1) {
          base64 = base64.substring(0, base64.length - 2) + "==";
        }
        return base64;
      };
      exports.encode = encode;
      var decode = (base64) => {
        let bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
        if (base64[base64.length - 1] === "=") {
          bufferLength--;
          if (base64[base64.length - 2] === "=") {
            bufferLength--;
          }
        }
        const arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
        for (i = 0; i < len; i += 4) {
          encoded1 = lookup[base64.charCodeAt(i)];
          encoded2 = lookup[base64.charCodeAt(i + 1)];
          encoded3 = lookup[base64.charCodeAt(i + 2)];
          encoded4 = lookup[base64.charCodeAt(i + 3)];
          bytes[p++] = encoded1 << 2 | encoded2 >> 4;
          bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
          bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
        }
        return arraybuffer;
      };
      exports.decode = decode;
    }
  });

  // node_modules/engine.io-parser/build/cjs/decodePacket.browser.js
  var require_decodePacket_browser = __commonJS({
    "node_modules/engine.io-parser/build/cjs/decodePacket.browser.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.decodePacket = void 0;
      var commons_js_1 = require_commons();
      var base64_arraybuffer_js_1 = require_base64_arraybuffer();
      var withNativeArrayBuffer = typeof ArrayBuffer === "function";
      var decodePacket = (encodedPacket, binaryType) => {
        if (typeof encodedPacket !== "string") {
          return {
            type: "message",
            data: mapBinary(encodedPacket, binaryType)
          };
        }
        const type = encodedPacket.charAt(0);
        if (type === "b") {
          return {
            type: "message",
            data: decodeBase64Packet(encodedPacket.substring(1), binaryType)
          };
        }
        const packetType = commons_js_1.PACKET_TYPES_REVERSE[type];
        if (!packetType) {
          return commons_js_1.ERROR_PACKET;
        }
        return encodedPacket.length > 1 ? {
          type: commons_js_1.PACKET_TYPES_REVERSE[type],
          data: encodedPacket.substring(1)
        } : {
          type: commons_js_1.PACKET_TYPES_REVERSE[type]
        };
      };
      exports.decodePacket = decodePacket;
      var decodeBase64Packet = (data, binaryType) => {
        if (withNativeArrayBuffer) {
          const decoded = (0, base64_arraybuffer_js_1.decode)(data);
          return mapBinary(decoded, binaryType);
        } else {
          return { base64: true, data };
        }
      };
      var mapBinary = (data, binaryType) => {
        switch (binaryType) {
          case "blob":
            if (data instanceof Blob) {
              return data;
            } else {
              return new Blob([data]);
            }
          case "arraybuffer":
          default:
            if (data instanceof ArrayBuffer) {
              return data;
            } else {
              return data.buffer;
            }
        }
      };
    }
  });

  // node_modules/engine.io-parser/build/cjs/index.js
  var require_cjs = __commonJS({
    "node_modules/engine.io-parser/build/cjs/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.decodePayload = exports.decodePacket = exports.encodePayload = exports.encodePacket = exports.protocol = void 0;
      exports.createPacketEncoderStream = createPacketEncoderStream;
      exports.createPacketDecoderStream = createPacketDecoderStream;
      var encodePacket_js_1 = require_encodePacket_browser();
      Object.defineProperty(exports, "encodePacket", { enumerable: true, get: function() {
        return encodePacket_js_1.encodePacket;
      } });
      var decodePacket_js_1 = require_decodePacket_browser();
      Object.defineProperty(exports, "decodePacket", { enumerable: true, get: function() {
        return decodePacket_js_1.decodePacket;
      } });
      var commons_js_1 = require_commons();
      var SEPARATOR = String.fromCharCode(30);
      var encodePayload = (packets, callback) => {
        const length = packets.length;
        const encodedPackets = new Array(length);
        let count = 0;
        packets.forEach((packet, i) => {
          (0, encodePacket_js_1.encodePacket)(packet, false, (encodedPacket) => {
            encodedPackets[i] = encodedPacket;
            if (++count === length) {
              callback(encodedPackets.join(SEPARATOR));
            }
          });
        });
      };
      exports.encodePayload = encodePayload;
      var decodePayload = (encodedPayload, binaryType) => {
        const encodedPackets = encodedPayload.split(SEPARATOR);
        const packets = [];
        for (let i = 0; i < encodedPackets.length; i++) {
          const decodedPacket = (0, decodePacket_js_1.decodePacket)(encodedPackets[i], binaryType);
          packets.push(decodedPacket);
          if (decodedPacket.type === "error") {
            break;
          }
        }
        return packets;
      };
      exports.decodePayload = decodePayload;
      function createPacketEncoderStream() {
        return new TransformStream({
          transform(packet, controller) {
            (0, encodePacket_js_1.encodePacketToBinary)(packet, (encodedPacket) => {
              const payloadLength = encodedPacket.length;
              let header;
              if (payloadLength < 126) {
                header = new Uint8Array(1);
                new DataView(header.buffer).setUint8(0, payloadLength);
              } else if (payloadLength < 65536) {
                header = new Uint8Array(3);
                const view = new DataView(header.buffer);
                view.setUint8(0, 126);
                view.setUint16(1, payloadLength);
              } else {
                header = new Uint8Array(9);
                const view = new DataView(header.buffer);
                view.setUint8(0, 127);
                view.setBigUint64(1, BigInt(payloadLength));
              }
              if (packet.data && typeof packet.data !== "string") {
                header[0] |= 128;
              }
              controller.enqueue(header);
              controller.enqueue(encodedPacket);
            });
          }
        });
      }
      var TEXT_DECODER;
      function totalLength(chunks) {
        return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      }
      function concatChunks(chunks, size) {
        if (chunks[0].length === size) {
          return chunks.shift();
        }
        const buffer = new Uint8Array(size);
        let j = 0;
        for (let i = 0; i < size; i++) {
          buffer[i] = chunks[0][j++];
          if (j === chunks[0].length) {
            chunks.shift();
            j = 0;
          }
        }
        if (chunks.length && j < chunks[0].length) {
          chunks[0] = chunks[0].slice(j);
        }
        return buffer;
      }
      function createPacketDecoderStream(maxPayload, binaryType) {
        if (!TEXT_DECODER) {
          TEXT_DECODER = new TextDecoder();
        }
        const chunks = [];
        let state = 0;
        let expectedLength = -1;
        let isBinary = false;
        return new TransformStream({
          transform(chunk, controller) {
            chunks.push(chunk);
            while (true) {
              if (state === 0) {
                if (totalLength(chunks) < 1) {
                  break;
                }
                const header = concatChunks(chunks, 1);
                isBinary = (header[0] & 128) === 128;
                expectedLength = header[0] & 127;
                if (expectedLength < 126) {
                  state = 3;
                } else if (expectedLength === 126) {
                  state = 1;
                } else {
                  state = 2;
                }
              } else if (state === 1) {
                if (totalLength(chunks) < 2) {
                  break;
                }
                const headerArray = concatChunks(chunks, 2);
                expectedLength = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length).getUint16(0);
                state = 3;
              } else if (state === 2) {
                if (totalLength(chunks) < 8) {
                  break;
                }
                const headerArray = concatChunks(chunks, 8);
                const view = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length);
                const n = view.getUint32(0);
                if (n > Math.pow(2, 53 - 32) - 1) {
                  controller.enqueue(commons_js_1.ERROR_PACKET);
                  break;
                }
                expectedLength = n * Math.pow(2, 32) + view.getUint32(4);
                state = 3;
              } else {
                if (totalLength(chunks) < expectedLength) {
                  break;
                }
                const data = concatChunks(chunks, expectedLength);
                controller.enqueue((0, decodePacket_js_1.decodePacket)(isBinary ? data : TEXT_DECODER.decode(data), binaryType));
                state = 0;
              }
              if (expectedLength === 0 || expectedLength > maxPayload) {
                controller.enqueue(commons_js_1.ERROR_PACKET);
                break;
              }
            }
          }
        });
      }
      exports.protocol = 4;
    }
  });

  // node_modules/@socket.io/component-emitter/lib/cjs/index.js
  var require_cjs2 = __commonJS({
    "node_modules/@socket.io/component-emitter/lib/cjs/index.js"(exports) {
      exports.Emitter = Emitter;
      function Emitter(obj) {
        if (obj) return mixin(obj);
      }
      function mixin(obj) {
        for (var key in Emitter.prototype) {
          obj[key] = Emitter.prototype[key];
        }
        return obj;
      }
      Emitter.prototype.on = Emitter.prototype.addEventListener = function(event, fn) {
        this._callbacks = this._callbacks || {};
        (this._callbacks["$" + event] = this._callbacks["$" + event] || []).push(fn);
        return this;
      };
      Emitter.prototype.once = function(event, fn) {
        function on() {
          this.off(event, on);
          fn.apply(this, arguments);
        }
        on.fn = fn;
        this.on(event, on);
        return this;
      };
      Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function(event, fn) {
        this._callbacks = this._callbacks || {};
        if (0 == arguments.length) {
          this._callbacks = {};
          return this;
        }
        var callbacks = this._callbacks["$" + event];
        if (!callbacks) return this;
        if (1 == arguments.length) {
          delete this._callbacks["$" + event];
          return this;
        }
        var cb;
        for (var i = 0; i < callbacks.length; i++) {
          cb = callbacks[i];
          if (cb === fn || cb.fn === fn) {
            callbacks.splice(i, 1);
            break;
          }
        }
        if (callbacks.length === 0) {
          delete this._callbacks["$" + event];
        }
        return this;
      };
      Emitter.prototype.emit = function(event) {
        this._callbacks = this._callbacks || {};
        var args = new Array(arguments.length - 1), callbacks = this._callbacks["$" + event];
        for (var i = 1; i < arguments.length; i++) {
          args[i - 1] = arguments[i];
        }
        if (callbacks) {
          callbacks = callbacks.slice(0);
          for (var i = 0, len = callbacks.length; i < len; ++i) {
            callbacks[i].apply(this, args);
          }
        }
        return this;
      };
      Emitter.prototype.emitReserved = Emitter.prototype.emit;
      Emitter.prototype.listeners = function(event) {
        this._callbacks = this._callbacks || {};
        return this._callbacks["$" + event] || [];
      };
      Emitter.prototype.hasListeners = function(event) {
        return !!this.listeners(event).length;
      };
    }
  });

  // node_modules/engine.io-client/build/cjs/globals.js
  var require_globals = __commonJS({
    "node_modules/engine.io-client/build/cjs/globals.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.defaultBinaryType = exports.globalThisShim = exports.nextTick = void 0;
      exports.createCookieJar = createCookieJar;
      exports.nextTick = (() => {
        const isPromiseAvailable = typeof Promise === "function" && typeof Promise.resolve === "function";
        if (isPromiseAvailable) {
          return (cb) => Promise.resolve().then(cb);
        } else {
          return (cb, setTimeoutFn) => setTimeoutFn(cb, 0);
        }
      })();
      exports.globalThisShim = (() => {
        if (typeof self !== "undefined") {
          return self;
        } else if (typeof window !== "undefined") {
          return window;
        } else {
          return Function("return this")();
        }
      })();
      exports.defaultBinaryType = "arraybuffer";
      function createCookieJar() {
      }
    }
  });

  // node_modules/engine.io-client/build/cjs/util.js
  var require_util = __commonJS({
    "node_modules/engine.io-client/build/cjs/util.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.pick = pick;
      exports.installTimerFunctions = installTimerFunctions;
      exports.byteLength = byteLength;
      exports.randomString = randomString;
      var globals_node_js_1 = require_globals();
      function pick(obj, ...attr) {
        return attr.reduce((acc, k) => {
          if (obj.hasOwnProperty(k)) {
            acc[k] = obj[k];
          }
          return acc;
        }, {});
      }
      var NATIVE_SET_TIMEOUT = globals_node_js_1.globalThisShim.setTimeout;
      var NATIVE_CLEAR_TIMEOUT = globals_node_js_1.globalThisShim.clearTimeout;
      function installTimerFunctions(obj, opts) {
        if (opts.useNativeTimers) {
          obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globals_node_js_1.globalThisShim);
          obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globals_node_js_1.globalThisShim);
        } else {
          obj.setTimeoutFn = globals_node_js_1.globalThisShim.setTimeout.bind(globals_node_js_1.globalThisShim);
          obj.clearTimeoutFn = globals_node_js_1.globalThisShim.clearTimeout.bind(globals_node_js_1.globalThisShim);
        }
      }
      var BASE64_OVERHEAD = 1.33;
      function byteLength(obj) {
        if (typeof obj === "string") {
          return utf8Length(obj);
        }
        return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
      }
      function utf8Length(str) {
        let c = 0, length = 0;
        for (let i = 0, l = str.length; i < l; i++) {
          c = str.charCodeAt(i);
          if (c < 128) {
            length += 1;
          } else if (c < 2048) {
            length += 2;
          } else if (c < 55296 || c >= 57344) {
            length += 3;
          } else {
            i++;
            length += 4;
          }
        }
        return length;
      }
      function randomString() {
        return Date.now().toString(36).substring(3) + Math.random().toString(36).substring(2, 5);
      }
    }
  });

  // node_modules/engine.io-client/build/cjs/contrib/parseqs.js
  var require_parseqs = __commonJS({
    "node_modules/engine.io-client/build/cjs/contrib/parseqs.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.encode = encode;
      exports.decode = decode;
      function encode(obj) {
        let str = "";
        for (let i in obj) {
          if (obj.hasOwnProperty(i)) {
            if (str.length)
              str += "&";
            str += encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]);
          }
        }
        return str;
      }
      function decode(qs) {
        let qry = {};
        let pairs = qs.split("&");
        for (let i = 0, l = pairs.length; i < l; i++) {
          let pair = pairs[i].split("=");
          qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
        return qry;
      }
    }
  });

  // node_modules/engine.io-client/node_modules/ms/index.js
  var require_ms = __commonJS({
    "node_modules/engine.io-client/node_modules/ms/index.js"(exports, module) {
      var s = 1e3;
      var m = s * 60;
      var h = m * 60;
      var d = h * 24;
      var w = d * 7;
      var y = d * 365.25;
      module.exports = function(val, options) {
        options = options || {};
        var type = typeof val;
        if (type === "string" && val.length > 0) {
          return parse(val);
        } else if (type === "number" && isFinite(val)) {
          return options.long ? fmtLong(val) : fmtShort(val);
        }
        throw new Error(
          "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
        );
      };
      function parse(str) {
        str = String(str);
        if (str.length > 100) {
          return;
        }
        var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
          str
        );
        if (!match) {
          return;
        }
        var n = parseFloat(match[1]);
        var type = (match[2] || "ms").toLowerCase();
        switch (type) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return n * y;
          case "weeks":
          case "week":
          case "w":
            return n * w;
          case "days":
          case "day":
          case "d":
            return n * d;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return n * h;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return n * m;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return n * s;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return n;
          default:
            return void 0;
        }
      }
      function fmtShort(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return Math.round(ms / d) + "d";
        }
        if (msAbs >= h) {
          return Math.round(ms / h) + "h";
        }
        if (msAbs >= m) {
          return Math.round(ms / m) + "m";
        }
        if (msAbs >= s) {
          return Math.round(ms / s) + "s";
        }
        return ms + "ms";
      }
      function fmtLong(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return plural(ms, msAbs, d, "day");
        }
        if (msAbs >= h) {
          return plural(ms, msAbs, h, "hour");
        }
        if (msAbs >= m) {
          return plural(ms, msAbs, m, "minute");
        }
        if (msAbs >= s) {
          return plural(ms, msAbs, s, "second");
        }
        return ms + " ms";
      }
      function plural(ms, msAbs, n, name) {
        var isPlural = msAbs >= n * 1.5;
        return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
      }
    }
  });

  // node_modules/engine.io-client/node_modules/debug/src/common.js
  var require_common = __commonJS({
    "node_modules/engine.io-client/node_modules/debug/src/common.js"(exports, module) {
      function setup(env) {
        createDebug.debug = createDebug;
        createDebug.default = createDebug;
        createDebug.coerce = coerce;
        createDebug.disable = disable;
        createDebug.enable = enable;
        createDebug.enabled = enabled;
        createDebug.humanize = require_ms();
        createDebug.destroy = destroy;
        Object.keys(env).forEach((key) => {
          createDebug[key] = env[key];
        });
        createDebug.names = [];
        createDebug.skips = [];
        createDebug.formatters = {};
        function selectColor(namespace) {
          let hash = 0;
          for (let i = 0; i < namespace.length; i++) {
            hash = (hash << 5) - hash + namespace.charCodeAt(i);
            hash |= 0;
          }
          return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
        }
        createDebug.selectColor = selectColor;
        function createDebug(namespace) {
          let prevTime;
          let enableOverride = null;
          let namespacesCache;
          let enabledCache;
          function debug(...args) {
            if (!debug.enabled) {
              return;
            }
            const self2 = debug;
            const curr = Number(/* @__PURE__ */ new Date());
            const ms = curr - (prevTime || curr);
            self2.diff = ms;
            self2.prev = prevTime;
            self2.curr = curr;
            prevTime = curr;
            args[0] = createDebug.coerce(args[0]);
            if (typeof args[0] !== "string") {
              args.unshift("%O");
            }
            let index = 0;
            args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
              if (match === "%%") {
                return "%";
              }
              index++;
              const formatter = createDebug.formatters[format];
              if (typeof formatter === "function") {
                const val = args[index];
                match = formatter.call(self2, val);
                args.splice(index, 1);
                index--;
              }
              return match;
            });
            createDebug.formatArgs.call(self2, args);
            const logFn = self2.log || createDebug.log;
            logFn.apply(self2, args);
          }
          debug.namespace = namespace;
          debug.useColors = createDebug.useColors();
          debug.color = createDebug.selectColor(namespace);
          debug.extend = extend;
          debug.destroy = createDebug.destroy;
          Object.defineProperty(debug, "enabled", {
            enumerable: true,
            configurable: false,
            get: () => {
              if (enableOverride !== null) {
                return enableOverride;
              }
              if (namespacesCache !== createDebug.namespaces) {
                namespacesCache = createDebug.namespaces;
                enabledCache = createDebug.enabled(namespace);
              }
              return enabledCache;
            },
            set: (v) => {
              enableOverride = v;
            }
          });
          if (typeof createDebug.init === "function") {
            createDebug.init(debug);
          }
          return debug;
        }
        function extend(namespace, delimiter) {
          const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
          newDebug.log = this.log;
          return newDebug;
        }
        function enable(namespaces) {
          createDebug.save(namespaces);
          createDebug.namespaces = namespaces;
          createDebug.names = [];
          createDebug.skips = [];
          const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
          for (const ns of split) {
            if (ns[0] === "-") {
              createDebug.skips.push(ns.slice(1));
            } else {
              createDebug.names.push(ns);
            }
          }
        }
        function matchesTemplate(search, template) {
          let searchIndex = 0;
          let templateIndex = 0;
          let starIndex = -1;
          let matchIndex = 0;
          while (searchIndex < search.length) {
            if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
              if (template[templateIndex] === "*") {
                starIndex = templateIndex;
                matchIndex = searchIndex;
                templateIndex++;
              } else {
                searchIndex++;
                templateIndex++;
              }
            } else if (starIndex !== -1) {
              templateIndex = starIndex + 1;
              matchIndex++;
              searchIndex = matchIndex;
            } else {
              return false;
            }
          }
          while (templateIndex < template.length && template[templateIndex] === "*") {
            templateIndex++;
          }
          return templateIndex === template.length;
        }
        function disable() {
          const namespaces = [
            ...createDebug.names,
            ...createDebug.skips.map((namespace) => "-" + namespace)
          ].join(",");
          createDebug.enable("");
          return namespaces;
        }
        function enabled(name) {
          for (const skip of createDebug.skips) {
            if (matchesTemplate(name, skip)) {
              return false;
            }
          }
          for (const ns of createDebug.names) {
            if (matchesTemplate(name, ns)) {
              return true;
            }
          }
          return false;
        }
        function coerce(val) {
          if (val instanceof Error) {
            return val.stack || val.message;
          }
          return val;
        }
        function destroy() {
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
        createDebug.enable(createDebug.load());
        return createDebug;
      }
      module.exports = setup;
    }
  });

  // node_modules/engine.io-client/node_modules/debug/src/browser.js
  var require_browser = __commonJS({
    "node_modules/engine.io-client/node_modules/debug/src/browser.js"(exports, module) {
      exports.formatArgs = formatArgs;
      exports.save = save;
      exports.load = load;
      exports.useColors = useColors;
      exports.storage = localstorage();
      exports.destroy = /* @__PURE__ */ (() => {
        let warned = false;
        return () => {
          if (!warned) {
            warned = true;
            console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
          }
        };
      })();
      exports.colors = [
        "#0000CC",
        "#0000FF",
        "#0033CC",
        "#0033FF",
        "#0066CC",
        "#0066FF",
        "#0099CC",
        "#0099FF",
        "#00CC00",
        "#00CC33",
        "#00CC66",
        "#00CC99",
        "#00CCCC",
        "#00CCFF",
        "#3300CC",
        "#3300FF",
        "#3333CC",
        "#3333FF",
        "#3366CC",
        "#3366FF",
        "#3399CC",
        "#3399FF",
        "#33CC00",
        "#33CC33",
        "#33CC66",
        "#33CC99",
        "#33CCCC",
        "#33CCFF",
        "#6600CC",
        "#6600FF",
        "#6633CC",
        "#6633FF",
        "#66CC00",
        "#66CC33",
        "#9900CC",
        "#9900FF",
        "#9933CC",
        "#9933FF",
        "#99CC00",
        "#99CC33",
        "#CC0000",
        "#CC0033",
        "#CC0066",
        "#CC0099",
        "#CC00CC",
        "#CC00FF",
        "#CC3300",
        "#CC3333",
        "#CC3366",
        "#CC3399",
        "#CC33CC",
        "#CC33FF",
        "#CC6600",
        "#CC6633",
        "#CC9900",
        "#CC9933",
        "#CCCC00",
        "#CCCC33",
        "#FF0000",
        "#FF0033",
        "#FF0066",
        "#FF0099",
        "#FF00CC",
        "#FF00FF",
        "#FF3300",
        "#FF3333",
        "#FF3366",
        "#FF3399",
        "#FF33CC",
        "#FF33FF",
        "#FF6600",
        "#FF6633",
        "#FF9900",
        "#FF9933",
        "#FFCC00",
        "#FFCC33"
      ];
      function useColors() {
        if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
          return true;
        }
        if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
          return false;
        }
        let m;
        return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
        typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
        // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
        typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
        typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
      }
      function formatArgs(args) {
        args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
        if (!this.useColors) {
          return;
        }
        const c = "color: " + this.color;
        args.splice(1, 0, c, "color: inherit");
        let index = 0;
        let lastC = 0;
        args[0].replace(/%[a-zA-Z%]/g, (match) => {
          if (match === "%%") {
            return;
          }
          index++;
          if (match === "%c") {
            lastC = index;
          }
        });
        args.splice(lastC, 0, c);
      }
      exports.log = console.debug || console.log || (() => {
      });
      function save(namespaces) {
        try {
          if (namespaces) {
            exports.storage.setItem("debug", namespaces);
          } else {
            exports.storage.removeItem("debug");
          }
        } catch (error) {
        }
      }
      function load() {
        let r;
        try {
          r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
        } catch (error) {
        }
        if (!r && typeof process !== "undefined" && "env" in process) {
          r = process.env.DEBUG;
        }
        return r;
      }
      function localstorage() {
        try {
          return localStorage;
        } catch (error) {
        }
      }
      module.exports = require_common()(exports);
      var { formatters } = module.exports;
      formatters.j = function(v) {
        try {
          return JSON.stringify(v);
        } catch (error) {
          return "[UnexpectedJSONParseError]: " + error.message;
        }
      };
    }
  });

  // node_modules/engine.io-client/build/cjs/transport.js
  var require_transport = __commonJS({
    "node_modules/engine.io-client/build/cjs/transport.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Transport = exports.TransportError = void 0;
      var engine_io_parser_1 = require_cjs();
      var component_emitter_1 = require_cjs2();
      var util_js_1 = require_util();
      var parseqs_js_1 = require_parseqs();
      var debug_1 = __importDefault(require_browser());
      var debug = (0, debug_1.default)("engine.io-client:transport");
      var TransportError = class extends Error {
        constructor(reason, description, context) {
          super(reason);
          this.description = description;
          this.context = context;
          this.type = "TransportError";
        }
      };
      exports.TransportError = TransportError;
      var Transport = class extends component_emitter_1.Emitter {
        /**
         * Transport abstract constructor.
         *
         * @param {Object} opts - options
         * @protected
         */
        constructor(opts) {
          super();
          this.writable = false;
          (0, util_js_1.installTimerFunctions)(this, opts);
          this.opts = opts;
          this.query = opts.query;
          this.socket = opts.socket;
          this.supportsBinary = !opts.forceBase64;
        }
        /**
         * Emits an error.
         *
         * @param {String} reason
         * @param description
         * @param context - the error context
         * @return {Transport} for chaining
         * @protected
         */
        onError(reason, description, context) {
          super.emitReserved("error", new TransportError(reason, description, context));
          return this;
        }
        /**
         * Opens the transport.
         */
        open() {
          this.readyState = "opening";
          this.doOpen();
          return this;
        }
        /**
         * Closes the transport.
         */
        close() {
          if (this.readyState === "opening" || this.readyState === "open") {
            this.doClose();
            this.onClose();
          }
          return this;
        }
        /**
         * Sends multiple packets.
         *
         * @param {Array} packets
         */
        send(packets) {
          if (this.readyState === "open") {
            this.write(packets);
          } else {
            debug("transport is not open, discarding packets");
          }
        }
        /**
         * Called upon open
         *
         * @protected
         */
        onOpen() {
          this.readyState = "open";
          this.writable = true;
          super.emitReserved("open");
        }
        /**
         * Called with data.
         *
         * @param {String} data
         * @protected
         */
        onData(data) {
          const packet = (0, engine_io_parser_1.decodePacket)(data, this.socket.binaryType);
          this.onPacket(packet);
        }
        /**
         * Called with a decoded packet.
         *
         * @protected
         */
        onPacket(packet) {
          super.emitReserved("packet", packet);
        }
        /**
         * Called upon close.
         *
         * @protected
         */
        onClose(details) {
          this.readyState = "closed";
          super.emitReserved("close", details);
        }
        /**
         * Pauses the transport, in order not to lose packets during an upgrade.
         *
         * @param onPause
         */
        pause(onPause) {
        }
        createUri(schema, query = {}) {
          return schema + "://" + this._hostname() + this._port() + this.opts.path + this._query(query);
        }
        _hostname() {
          const hostname = this.opts.hostname;
          return hostname.indexOf(":") === -1 ? hostname : "[" + hostname + "]";
        }
        _port() {
          if (this.opts.port && (this.opts.secure && Number(this.opts.port) !== 443 || !this.opts.secure && Number(this.opts.port) !== 80)) {
            return ":" + this.opts.port;
          } else {
            return "";
          }
        }
        _query(query) {
          const encodedQuery = (0, parseqs_js_1.encode)(query);
          return encodedQuery.length ? "?" + encodedQuery : "";
        }
      };
      exports.Transport = Transport;
    }
  });

  // node_modules/engine.io-client/build/cjs/transports/polling.js
  var require_polling = __commonJS({
    "node_modules/engine.io-client/build/cjs/transports/polling.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Polling = void 0;
      var transport_js_1 = require_transport();
      var util_js_1 = require_util();
      var engine_io_parser_1 = require_cjs();
      var debug_1 = __importDefault(require_browser());
      var debug = (0, debug_1.default)("engine.io-client:polling");
      var Polling = class extends transport_js_1.Transport {
        constructor() {
          super(...arguments);
          this._polling = false;
        }
        get name() {
          return "polling";
        }
        /**
         * Opens the socket (triggers polling). We write a PING message to determine
         * when the transport is open.
         *
         * @protected
         */
        doOpen() {
          this._poll();
        }
        /**
         * Pauses polling.
         *
         * @param {Function} onPause - callback upon buffers are flushed and transport is paused
         * @package
         */
        pause(onPause) {
          this.readyState = "pausing";
          const pause = () => {
            debug("paused");
            this.readyState = "paused";
            onPause();
          };
          if (this._polling || !this.writable) {
            let total = 0;
            if (this._polling) {
              debug("we are currently polling - waiting to pause");
              total++;
              this.once("pollComplete", function() {
                debug("pre-pause polling complete");
                --total || pause();
              });
            }
            if (!this.writable) {
              debug("we are currently writing - waiting to pause");
              total++;
              this.once("drain", function() {
                debug("pre-pause writing complete");
                --total || pause();
              });
            }
          } else {
            pause();
          }
        }
        /**
         * Starts polling cycle.
         *
         * @private
         */
        _poll() {
          debug("polling");
          this._polling = true;
          this.doPoll();
          this.emitReserved("poll");
        }
        /**
         * Overloads onData to detect payloads.
         *
         * @protected
         */
        onData(data) {
          debug("polling got data %s", data);
          const callback = (packet) => {
            if ("opening" === this.readyState && packet.type === "open") {
              this.onOpen();
            }
            if ("close" === packet.type) {
              this.onClose({ description: "transport closed by the server" });
              return false;
            }
            this.onPacket(packet);
          };
          (0, engine_io_parser_1.decodePayload)(data, this.socket.binaryType).forEach(callback);
          if ("closed" !== this.readyState) {
            this._polling = false;
            this.emitReserved("pollComplete");
            if ("open" === this.readyState) {
              this._poll();
            } else {
              debug('ignoring poll - transport state "%s"', this.readyState);
            }
          }
        }
        /**
         * For polling, send a close packet.
         *
         * @protected
         */
        doClose() {
          const close = () => {
            debug("writing close packet");
            this.write([{ type: "close" }]);
          };
          if ("open" === this.readyState) {
            debug("transport open - closing");
            close();
          } else {
            debug("transport not open - deferring close");
            this.once("open", close);
          }
        }
        /**
         * Writes a packets payload.
         *
         * @param {Array} packets - data packets
         * @protected
         */
        write(packets) {
          this.writable = false;
          (0, engine_io_parser_1.encodePayload)(packets, (data) => {
            this.doWrite(data, () => {
              this.writable = true;
              this.emitReserved("drain");
            });
          });
        }
        /**
         * Generates uri for connection.
         *
         * @private
         */
        uri() {
          const schema = this.opts.secure ? "https" : "http";
          const query = this.query || {};
          if (false !== this.opts.timestampRequests) {
            query[this.opts.timestampParam] = (0, util_js_1.randomString)();
          }
          if (!this.supportsBinary && !query.sid) {
            query.b64 = 1;
          }
          return this.createUri(schema, query);
        }
      };
      exports.Polling = Polling;
    }
  });

  // node_modules/engine.io-client/build/cjs/contrib/has-cors.js
  var require_has_cors = __commonJS({
    "node_modules/engine.io-client/build/cjs/contrib/has-cors.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.hasCORS = void 0;
      var value = false;
      try {
        value = typeof XMLHttpRequest !== "undefined" && "withCredentials" in new XMLHttpRequest();
      } catch (err) {
      }
      exports.hasCORS = value;
    }
  });

  // node_modules/engine.io-client/build/cjs/transports/polling-xhr.js
  var require_polling_xhr = __commonJS({
    "node_modules/engine.io-client/build/cjs/transports/polling-xhr.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.XHR = exports.Request = exports.BaseXHR = void 0;
      var polling_js_1 = require_polling();
      var component_emitter_1 = require_cjs2();
      var util_js_1 = require_util();
      var globals_node_js_1 = require_globals();
      var has_cors_js_1 = require_has_cors();
      var debug_1 = __importDefault(require_browser());
      var debug = (0, debug_1.default)("engine.io-client:polling");
      function empty() {
      }
      var BaseXHR = class extends polling_js_1.Polling {
        /**
         * XHR Polling constructor.
         *
         * @param {Object} opts
         * @package
         */
        constructor(opts) {
          super(opts);
          if (typeof location !== "undefined") {
            const isSSL = "https:" === location.protocol;
            let port = location.port;
            if (!port) {
              port = isSSL ? "443" : "80";
            }
            this.xd = typeof location !== "undefined" && opts.hostname !== location.hostname || port !== opts.port;
          }
        }
        /**
         * Sends data.
         *
         * @param {String} data to send.
         * @param {Function} called upon flush.
         * @private
         */
        doWrite(data, fn) {
          const req = this.request({
            method: "POST",
            data
          });
          req.on("success", fn);
          req.on("error", (xhrStatus, context) => {
            this.onError("xhr post error", xhrStatus, context);
          });
        }
        /**
         * Starts a poll cycle.
         *
         * @private
         */
        doPoll() {
          debug("xhr poll");
          const req = this.request();
          req.on("data", this.onData.bind(this));
          req.on("error", (xhrStatus, context) => {
            this.onError("xhr poll error", xhrStatus, context);
          });
          this.pollXhr = req;
        }
      };
      exports.BaseXHR = BaseXHR;
      var Request = class _Request extends component_emitter_1.Emitter {
        /**
         * Request constructor
         *
         * @param {Object} options
         * @package
         */
        constructor(createRequest, uri, opts) {
          super();
          this.createRequest = createRequest;
          (0, util_js_1.installTimerFunctions)(this, opts);
          this._opts = opts;
          this._method = opts.method || "GET";
          this._uri = uri;
          this._data = void 0 !== opts.data ? opts.data : null;
          this._create();
        }
        /**
         * Creates the XHR object and sends the request.
         *
         * @private
         */
        _create() {
          var _a;
          const opts = (0, util_js_1.pick)(this._opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
          opts.xdomain = !!this._opts.xd;
          const xhr = this._xhr = this.createRequest(opts);
          try {
            debug("xhr open %s: %s", this._method, this._uri);
            xhr.open(this._method, this._uri, true);
            try {
              if (this._opts.extraHeaders) {
                xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
                for (let i in this._opts.extraHeaders) {
                  if (this._opts.extraHeaders.hasOwnProperty(i)) {
                    xhr.setRequestHeader(i, this._opts.extraHeaders[i]);
                  }
                }
              }
            } catch (e) {
            }
            if ("POST" === this._method) {
              try {
                xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
              } catch (e) {
              }
            }
            try {
              xhr.setRequestHeader("Accept", "*/*");
            } catch (e) {
            }
            (_a = this._opts.cookieJar) === null || _a === void 0 ? void 0 : _a.addCookies(xhr);
            if ("withCredentials" in xhr) {
              xhr.withCredentials = this._opts.withCredentials;
            }
            if (this._opts.requestTimeout) {
              xhr.timeout = this._opts.requestTimeout;
            }
            xhr.onreadystatechange = () => {
              var _a2;
              if (xhr.readyState === 3) {
                (_a2 = this._opts.cookieJar) === null || _a2 === void 0 ? void 0 : _a2.parseCookies(
                  // @ts-ignore
                  xhr.getResponseHeader("set-cookie")
                );
              }
              if (4 !== xhr.readyState)
                return;
              if (200 === xhr.status || 1223 === xhr.status) {
                this._onLoad();
              } else {
                this.setTimeoutFn(() => {
                  this._onError(typeof xhr.status === "number" ? xhr.status : 0);
                }, 0);
              }
            };
            debug("xhr data %s", this._data);
            xhr.send(this._data);
          } catch (e) {
            this.setTimeoutFn(() => {
              this._onError(e);
            }, 0);
            return;
          }
          if (typeof document !== "undefined") {
            this._index = _Request.requestsCount++;
            _Request.requests[this._index] = this;
          }
        }
        /**
         * Called upon error.
         *
         * @private
         */
        _onError(err) {
          this.emitReserved("error", err, this._xhr);
          this._cleanup(true);
        }
        /**
         * Cleans up house.
         *
         * @private
         */
        _cleanup(fromError) {
          if ("undefined" === typeof this._xhr || null === this._xhr) {
            return;
          }
          this._xhr.onreadystatechange = empty;
          if (fromError) {
            try {
              this._xhr.abort();
            } catch (e) {
            }
          }
          if (typeof document !== "undefined") {
            delete _Request.requests[this._index];
          }
          this._xhr = null;
        }
        /**
         * Called upon load.
         *
         * @private
         */
        _onLoad() {
          const data = this._xhr.responseText;
          if (data !== null) {
            this.emitReserved("data", data);
            this.emitReserved("success");
            this._cleanup();
          }
        }
        /**
         * Aborts the request.
         *
         * @package
         */
        abort() {
          this._cleanup();
        }
      };
      exports.Request = Request;
      Request.requestsCount = 0;
      Request.requests = {};
      if (typeof document !== "undefined") {
        if (typeof attachEvent === "function") {
          attachEvent("onunload", unloadHandler);
        } else if (typeof addEventListener === "function") {
          const terminationEvent = "onpagehide" in globals_node_js_1.globalThisShim ? "pagehide" : "unload";
          addEventListener(terminationEvent, unloadHandler, false);
        }
      }
      function unloadHandler() {
        for (let i in Request.requests) {
          if (Request.requests.hasOwnProperty(i)) {
            Request.requests[i].abort();
          }
        }
      }
      var hasXHR2 = (function() {
        const xhr = newRequest({
          xdomain: false
        });
        return xhr && xhr.responseType !== null;
      })();
      var XHR = class extends BaseXHR {
        constructor(opts) {
          super(opts);
          const forceBase64 = opts && opts.forceBase64;
          this.supportsBinary = hasXHR2 && !forceBase64;
        }
        request(opts = {}) {
          Object.assign(opts, { xd: this.xd }, this.opts);
          return new Request(newRequest, this.uri(), opts);
        }
      };
      exports.XHR = XHR;
      function newRequest(opts) {
        const xdomain = opts.xdomain;
        try {
          if ("undefined" !== typeof XMLHttpRequest && (!xdomain || has_cors_js_1.hasCORS)) {
            return new XMLHttpRequest();
          }
        } catch (e) {
        }
        if (!xdomain) {
          try {
            return new globals_node_js_1.globalThisShim[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
          } catch (e) {
          }
        }
      }
    }
  });

  // node_modules/engine.io-client/build/cjs/transports/websocket.js
  var require_websocket = __commonJS({
    "node_modules/engine.io-client/build/cjs/transports/websocket.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.WS = exports.BaseWS = void 0;
      var transport_js_1 = require_transport();
      var util_js_1 = require_util();
      var engine_io_parser_1 = require_cjs();
      var globals_node_js_1 = require_globals();
      var debug_1 = __importDefault(require_browser());
      var debug = (0, debug_1.default)("engine.io-client:websocket");
      var isReactNative = typeof navigator !== "undefined" && typeof navigator.product === "string" && navigator.product.toLowerCase() === "reactnative";
      var BaseWS = class extends transport_js_1.Transport {
        get name() {
          return "websocket";
        }
        doOpen() {
          const uri = this.uri();
          const protocols = this.opts.protocols;
          const opts = isReactNative ? {} : (0, util_js_1.pick)(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
          if (this.opts.extraHeaders) {
            opts.headers = this.opts.extraHeaders;
          }
          try {
            this.ws = this.createSocket(uri, protocols, opts);
          } catch (err) {
            return this.emitReserved("error", err);
          }
          this.ws.binaryType = this.socket.binaryType;
          this.addEventListeners();
        }
        /**
         * Adds event listeners to the socket
         *
         * @private
         */
        addEventListeners() {
          this.ws.onopen = () => {
            if (this.opts.autoUnref) {
              this.ws._socket.unref();
            }
            this.onOpen();
          };
          this.ws.onclose = (closeEvent) => this.onClose({
            description: "websocket connection closed",
            context: closeEvent
          });
          this.ws.onmessage = (ev) => this.onData(ev.data);
          this.ws.onerror = (e) => this.onError("websocket error", e);
        }
        write(packets) {
          this.writable = false;
          for (let i = 0; i < packets.length; i++) {
            const packet = packets[i];
            const lastPacket = i === packets.length - 1;
            (0, engine_io_parser_1.encodePacket)(packet, this.supportsBinary, (data) => {
              try {
                this.doWrite(packet, data);
              } catch (e) {
                debug("websocket closed before onclose event");
              }
              if (lastPacket) {
                (0, globals_node_js_1.nextTick)(() => {
                  this.writable = true;
                  this.emitReserved("drain");
                }, this.setTimeoutFn);
              }
            });
          }
        }
        doClose() {
          if (typeof this.ws !== "undefined") {
            this.ws.onerror = () => {
            };
            this.ws.close();
            this.ws = null;
          }
        }
        /**
         * Generates uri for connection.
         *
         * @private
         */
        uri() {
          const schema = this.opts.secure ? "wss" : "ws";
          const query = this.query || {};
          if (this.opts.timestampRequests) {
            query[this.opts.timestampParam] = (0, util_js_1.randomString)();
          }
          if (!this.supportsBinary) {
            query.b64 = 1;
          }
          return this.createUri(schema, query);
        }
      };
      exports.BaseWS = BaseWS;
      var WebSocketCtor = globals_node_js_1.globalThisShim.WebSocket || globals_node_js_1.globalThisShim.MozWebSocket;
      var WS = class extends BaseWS {
        createSocket(uri, protocols, opts) {
          return !isReactNative ? protocols ? new WebSocketCtor(uri, protocols) : new WebSocketCtor(uri) : new WebSocketCtor(uri, protocols, opts);
        }
        doWrite(_packet, data) {
          this.ws.send(data);
        }
      };
      exports.WS = WS;
    }
  });

  // node_modules/engine.io-client/build/cjs/transports/webtransport.js
  var require_webtransport = __commonJS({
    "node_modules/engine.io-client/build/cjs/transports/webtransport.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.WT = void 0;
      var transport_js_1 = require_transport();
      var globals_node_js_1 = require_globals();
      var engine_io_parser_1 = require_cjs();
      var debug_1 = __importDefault(require_browser());
      var debug = (0, debug_1.default)("engine.io-client:webtransport");
      var WT = class extends transport_js_1.Transport {
        get name() {
          return "webtransport";
        }
        doOpen() {
          try {
            this._transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
          } catch (err) {
            return this.emitReserved("error", err);
          }
          this._transport.closed.then(() => {
            debug("transport closed gracefully");
            this.onClose();
          }).catch((err) => {
            debug("transport closed due to %s", err);
            this.onError("webtransport error", err);
          });
          this._transport.ready.then(() => {
            this._transport.createBidirectionalStream().then((stream) => {
              const decoderStream = (0, engine_io_parser_1.createPacketDecoderStream)(Number.MAX_SAFE_INTEGER, this.socket.binaryType);
              const reader = stream.readable.pipeThrough(decoderStream).getReader();
              const encoderStream = (0, engine_io_parser_1.createPacketEncoderStream)();
              encoderStream.readable.pipeTo(stream.writable);
              this._writer = encoderStream.writable.getWriter();
              const read = () => {
                reader.read().then(({ done, value }) => {
                  if (done) {
                    debug("session is closed");
                    return;
                  }
                  debug("received chunk: %o", value);
                  this.onPacket(value);
                  read();
                }).catch((err) => {
                  debug("an error occurred while reading: %s", err);
                });
              };
              read();
              const packet = { type: "open" };
              if (this.query.sid) {
                packet.data = `{"sid":"${this.query.sid}"}`;
              }
              this._writer.write(packet).then(() => this.onOpen());
            });
          });
        }
        write(packets) {
          this.writable = false;
          for (let i = 0; i < packets.length; i++) {
            const packet = packets[i];
            const lastPacket = i === packets.length - 1;
            this._writer.write(packet).then(() => {
              if (lastPacket) {
                (0, globals_node_js_1.nextTick)(() => {
                  this.writable = true;
                  this.emitReserved("drain");
                }, this.setTimeoutFn);
              }
            });
          }
        }
        doClose() {
          var _a;
          (_a = this._transport) === null || _a === void 0 ? void 0 : _a.close();
        }
      };
      exports.WT = WT;
    }
  });

  // node_modules/engine.io-client/build/cjs/transports/index.js
  var require_transports = __commonJS({
    "node_modules/engine.io-client/build/cjs/transports/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.transports = void 0;
      var polling_xhr_node_js_1 = require_polling_xhr();
      var websocket_node_js_1 = require_websocket();
      var webtransport_js_1 = require_webtransport();
      exports.transports = {
        websocket: websocket_node_js_1.WS,
        webtransport: webtransport_js_1.WT,
        polling: polling_xhr_node_js_1.XHR
      };
    }
  });

  // node_modules/engine.io-client/build/cjs/contrib/parseuri.js
  var require_parseuri = __commonJS({
    "node_modules/engine.io-client/build/cjs/contrib/parseuri.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.parse = parse;
      var re = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
      var parts = [
        "source",
        "protocol",
        "authority",
        "userInfo",
        "user",
        "password",
        "host",
        "port",
        "relative",
        "path",
        "directory",
        "file",
        "query",
        "anchor"
      ];
      function parse(str) {
        if (str.length > 8e3) {
          throw "URI too long";
        }
        const src = str, b = str.indexOf("["), e = str.indexOf("]");
        if (b != -1 && e != -1) {
          str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ";") + str.substring(e, str.length);
        }
        let m = re.exec(str || ""), uri = {}, i = 14;
        while (i--) {
          uri[parts[i]] = m[i] || "";
        }
        if (b != -1 && e != -1) {
          uri.source = src;
          uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ":");
          uri.authority = uri.authority.replace("[", "").replace("]", "").replace(/;/g, ":");
          uri.ipv6uri = true;
        }
        uri.pathNames = pathNames(uri, uri["path"]);
        uri.queryKey = queryKey(uri, uri["query"]);
        return uri;
      }
      function pathNames(obj, path) {
        const regx = /\/{2,9}/g, names = path.replace(regx, "/").split("/");
        if (path.slice(0, 1) == "/" || path.length === 0) {
          names.splice(0, 1);
        }
        if (path.slice(-1) == "/") {
          names.splice(names.length - 1, 1);
        }
        return names;
      }
      function queryKey(uri, query) {
        const data = {};
        query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function($0, $1, $2) {
          if ($1) {
            data[$1] = $2;
          }
        });
        return data;
      }
    }
  });

  // node_modules/engine.io-client/build/cjs/socket.js
  var require_socket = __commonJS({
    "node_modules/engine.io-client/build/cjs/socket.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Socket = exports.SocketWithUpgrade = exports.SocketWithoutUpgrade = void 0;
      var index_js_1 = require_transports();
      var util_js_1 = require_util();
      var parseqs_js_1 = require_parseqs();
      var parseuri_js_1 = require_parseuri();
      var component_emitter_1 = require_cjs2();
      var engine_io_parser_1 = require_cjs();
      var globals_node_js_1 = require_globals();
      var debug_1 = __importDefault(require_browser());
      var debug = (0, debug_1.default)("engine.io-client:socket");
      var withEventListeners = typeof addEventListener === "function" && typeof removeEventListener === "function";
      var OFFLINE_EVENT_LISTENERS = [];
      if (withEventListeners) {
        addEventListener("offline", () => {
          debug("closing %d connection(s) because the network was lost", OFFLINE_EVENT_LISTENERS.length);
          OFFLINE_EVENT_LISTENERS.forEach((listener) => listener());
        }, false);
      }
      var SocketWithoutUpgrade = class _SocketWithoutUpgrade extends component_emitter_1.Emitter {
        /**
         * Socket constructor.
         *
         * @param {String|Object} uri - uri or options
         * @param {Object} opts - options
         */
        constructor(uri, opts) {
          super();
          this.binaryType = globals_node_js_1.defaultBinaryType;
          this.writeBuffer = [];
          this._prevBufferLen = 0;
          this._pingInterval = -1;
          this._pingTimeout = -1;
          this._maxPayload = -1;
          this._pingTimeoutTime = Infinity;
          if (uri && "object" === typeof uri) {
            opts = uri;
            uri = null;
          }
          if (uri) {
            const parsedUri = (0, parseuri_js_1.parse)(uri);
            opts.hostname = parsedUri.host;
            opts.secure = parsedUri.protocol === "https" || parsedUri.protocol === "wss";
            opts.port = parsedUri.port;
            if (parsedUri.query)
              opts.query = parsedUri.query;
          } else if (opts.host) {
            opts.hostname = (0, parseuri_js_1.parse)(opts.host).host;
          }
          (0, util_js_1.installTimerFunctions)(this, opts);
          this.secure = null != opts.secure ? opts.secure : typeof location !== "undefined" && "https:" === location.protocol;
          if (opts.hostname && !opts.port) {
            opts.port = this.secure ? "443" : "80";
          }
          this.hostname = opts.hostname || (typeof location !== "undefined" ? location.hostname : "localhost");
          this.port = opts.port || (typeof location !== "undefined" && location.port ? location.port : this.secure ? "443" : "80");
          this.transports = [];
          this._transportsByName = {};
          opts.transports.forEach((t) => {
            const transportName = t.prototype.name;
            this.transports.push(transportName);
            this._transportsByName[transportName] = t;
          });
          this.opts = Object.assign({
            path: "/engine.io",
            agent: false,
            withCredentials: false,
            upgrade: true,
            timestampParam: "t",
            rememberUpgrade: false,
            addTrailingSlash: true,
            rejectUnauthorized: true,
            perMessageDeflate: {
              threshold: 1024
            },
            transportOptions: {},
            closeOnBeforeunload: false
          }, opts);
          this.opts.path = this.opts.path.replace(/\/$/, "") + (this.opts.addTrailingSlash ? "/" : "");
          if (typeof this.opts.query === "string") {
            this.opts.query = (0, parseqs_js_1.decode)(this.opts.query);
          }
          if (withEventListeners) {
            if (this.opts.closeOnBeforeunload) {
              this._beforeunloadEventListener = () => {
                if (this.transport) {
                  this.transport.removeAllListeners();
                  this.transport.close();
                }
              };
              addEventListener("beforeunload", this._beforeunloadEventListener, false);
            }
            if (this.hostname !== "localhost") {
              debug("adding listener for the 'offline' event");
              this._offlineEventListener = () => {
                this._onClose("transport close", {
                  description: "network connection lost"
                });
              };
              OFFLINE_EVENT_LISTENERS.push(this._offlineEventListener);
            }
          }
          if (this.opts.withCredentials) {
            this._cookieJar = (0, globals_node_js_1.createCookieJar)();
          }
          this._open();
        }
        /**
         * Creates transport of the given type.
         *
         * @param {String} name - transport name
         * @return {Transport}
         * @private
         */
        createTransport(name) {
          debug('creating transport "%s"', name);
          const query = Object.assign({}, this.opts.query);
          query.EIO = engine_io_parser_1.protocol;
          query.transport = name;
          if (this.id)
            query.sid = this.id;
          const opts = Object.assign({}, this.opts, {
            query,
            socket: this,
            hostname: this.hostname,
            secure: this.secure,
            port: this.port
          }, this.opts.transportOptions[name]);
          debug("options: %j", opts);
          return new this._transportsByName[name](opts);
        }
        /**
         * Initializes transport to use and starts probe.
         *
         * @private
         */
        _open() {
          if (this.transports.length === 0) {
            this.setTimeoutFn(() => {
              this.emitReserved("error", "No transports available");
            }, 0);
            return;
          }
          const transportName = this.opts.rememberUpgrade && _SocketWithoutUpgrade.priorWebsocketSuccess && this.transports.indexOf("websocket") !== -1 ? "websocket" : this.transports[0];
          this.readyState = "opening";
          const transport = this.createTransport(transportName);
          transport.open();
          this.setTransport(transport);
        }
        /**
         * Sets the current transport. Disables the existing one (if any).
         *
         * @private
         */
        setTransport(transport) {
          debug("setting transport %s", transport.name);
          if (this.transport) {
            debug("clearing existing transport %s", this.transport.name);
            this.transport.removeAllListeners();
          }
          this.transport = transport;
          transport.on("drain", this._onDrain.bind(this)).on("packet", this._onPacket.bind(this)).on("error", this._onError.bind(this)).on("close", (reason) => this._onClose("transport close", reason));
        }
        /**
         * Called when connection is deemed open.
         *
         * @private
         */
        onOpen() {
          debug("socket open");
          this.readyState = "open";
          _SocketWithoutUpgrade.priorWebsocketSuccess = "websocket" === this.transport.name;
          this.emitReserved("open");
          this.flush();
        }
        /**
         * Handles a packet.
         *
         * @private
         */
        _onPacket(packet) {
          if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
            debug('socket receive: type "%s", data "%s"', packet.type, packet.data);
            this.emitReserved("packet", packet);
            this.emitReserved("heartbeat");
            switch (packet.type) {
              case "open":
                this.onHandshake(JSON.parse(packet.data));
                break;
              case "ping":
                this._sendPacket("pong");
                this.emitReserved("ping");
                this.emitReserved("pong");
                this._resetPingTimeout();
                break;
              case "error":
                const err = new Error("server error");
                err.code = packet.data;
                this._onError(err);
                break;
              case "message":
                this.emitReserved("data", packet.data);
                this.emitReserved("message", packet.data);
                break;
            }
          } else {
            debug('packet received with socket readyState "%s"', this.readyState);
          }
        }
        /**
         * Called upon handshake completion.
         *
         * @param {Object} data - handshake obj
         * @private
         */
        onHandshake(data) {
          this.emitReserved("handshake", data);
          this.id = data.sid;
          this.transport.query.sid = data.sid;
          this._pingInterval = data.pingInterval;
          this._pingTimeout = data.pingTimeout;
          this._maxPayload = data.maxPayload;
          this.onOpen();
          if ("closed" === this.readyState)
            return;
          this._resetPingTimeout();
        }
        /**
         * Sets and resets ping timeout timer based on server pings.
         *
         * @private
         */
        _resetPingTimeout() {
          this.clearTimeoutFn(this._pingTimeoutTimer);
          const delay = this._pingInterval + this._pingTimeout;
          this._pingTimeoutTime = Date.now() + delay;
          this._pingTimeoutTimer = this.setTimeoutFn(() => {
            this._onClose("ping timeout");
          }, delay);
          if (this.opts.autoUnref) {
            this._pingTimeoutTimer.unref();
          }
        }
        /**
         * Called on `drain` event
         *
         * @private
         */
        _onDrain() {
          this.writeBuffer.splice(0, this._prevBufferLen);
          this._prevBufferLen = 0;
          if (0 === this.writeBuffer.length) {
            this.emitReserved("drain");
          } else {
            this.flush();
          }
        }
        /**
         * Flush write buffers.
         *
         * @private
         */
        flush() {
          if ("closed" !== this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
            const packets = this._getWritablePackets();
            debug("flushing %d packets in socket", packets.length);
            this.transport.send(packets);
            this._prevBufferLen = packets.length;
            this.emitReserved("flush");
          }
        }
        /**
         * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
         * long-polling)
         *
         * @private
         */
        _getWritablePackets() {
          const shouldCheckPayloadSize = this._maxPayload && this.transport.name === "polling" && this.writeBuffer.length > 1;
          if (!shouldCheckPayloadSize) {
            return this.writeBuffer;
          }
          let payloadSize = 1;
          for (let i = 0; i < this.writeBuffer.length; i++) {
            const data = this.writeBuffer[i].data;
            if (data) {
              payloadSize += (0, util_js_1.byteLength)(data);
            }
            if (i > 0 && payloadSize > this._maxPayload) {
              debug("only send %d out of %d packets", i, this.writeBuffer.length);
              return this.writeBuffer.slice(0, i);
            }
            payloadSize += 2;
          }
          debug("payload size is %d (max: %d)", payloadSize, this._maxPayload);
          return this.writeBuffer;
        }
        /**
         * Checks whether the heartbeat timer has expired but the socket has not yet been notified.
         *
         * Note: this method is private for now because it does not really fit the WebSocket API, but if we put it in the
         * `write()` method then the message would not be buffered by the Socket.IO client.
         *
         * @return {boolean}
         * @private
         */
        /* private */
        _hasPingExpired() {
          if (!this._pingTimeoutTime)
            return true;
          const hasExpired = Date.now() > this._pingTimeoutTime;
          if (hasExpired) {
            debug("throttled timer detected, scheduling connection close");
            this._pingTimeoutTime = 0;
            (0, globals_node_js_1.nextTick)(() => {
              this._onClose("ping timeout");
            }, this.setTimeoutFn);
          }
          return hasExpired;
        }
        /**
         * Sends a message.
         *
         * @param {String} msg - message.
         * @param {Object} options.
         * @param {Function} fn - callback function.
         * @return {Socket} for chaining.
         */
        write(msg, options, fn) {
          this._sendPacket("message", msg, options, fn);
          return this;
        }
        /**
         * Sends a message. Alias of {@link Socket#write}.
         *
         * @param {String} msg - message.
         * @param {Object} options.
         * @param {Function} fn - callback function.
         * @return {Socket} for chaining.
         */
        send(msg, options, fn) {
          this._sendPacket("message", msg, options, fn);
          return this;
        }
        /**
         * Sends a packet.
         *
         * @param {String} type: packet type.
         * @param {String} data.
         * @param {Object} options.
         * @param {Function} fn - callback function.
         * @private
         */
        _sendPacket(type, data, options, fn) {
          if ("function" === typeof data) {
            fn = data;
            data = void 0;
          }
          if ("function" === typeof options) {
            fn = options;
            options = null;
          }
          if ("closing" === this.readyState || "closed" === this.readyState) {
            return;
          }
          options = options || {};
          options.compress = false !== options.compress;
          const packet = {
            type,
            data,
            options
          };
          this.emitReserved("packetCreate", packet);
          this.writeBuffer.push(packet);
          if (fn)
            this.once("flush", fn);
          this.flush();
        }
        /**
         * Closes the connection.
         */
        close() {
          const close = () => {
            this._onClose("forced close");
            debug("socket closing - telling transport to close");
            this.transport.close();
          };
          const cleanupAndClose = () => {
            this.off("upgrade", cleanupAndClose);
            this.off("upgradeError", cleanupAndClose);
            close();
          };
          const waitForUpgrade = () => {
            this.once("upgrade", cleanupAndClose);
            this.once("upgradeError", cleanupAndClose);
          };
          if ("opening" === this.readyState || "open" === this.readyState) {
            this.readyState = "closing";
            if (this.writeBuffer.length) {
              this.once("drain", () => {
                if (this.upgrading) {
                  waitForUpgrade();
                } else {
                  close();
                }
              });
            } else if (this.upgrading) {
              waitForUpgrade();
            } else {
              close();
            }
          }
          return this;
        }
        /**
         * Called upon transport error
         *
         * @private
         */
        _onError(err) {
          debug("socket error %j", err);
          _SocketWithoutUpgrade.priorWebsocketSuccess = false;
          if (this.opts.tryAllTransports && this.transports.length > 1 && this.readyState === "opening") {
            debug("trying next transport");
            this.transports.shift();
            return this._open();
          }
          this.emitReserved("error", err);
          this._onClose("transport error", err);
        }
        /**
         * Called upon transport close.
         *
         * @private
         */
        _onClose(reason, description) {
          if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
            debug('socket close with reason: "%s"', reason);
            this.clearTimeoutFn(this._pingTimeoutTimer);
            this.transport.removeAllListeners("close");
            this.transport.close();
            this.transport.removeAllListeners();
            if (withEventListeners) {
              if (this._beforeunloadEventListener) {
                removeEventListener("beforeunload", this._beforeunloadEventListener, false);
              }
              if (this._offlineEventListener) {
                const i = OFFLINE_EVENT_LISTENERS.indexOf(this._offlineEventListener);
                if (i !== -1) {
                  debug("removing listener for the 'offline' event");
                  OFFLINE_EVENT_LISTENERS.splice(i, 1);
                }
              }
            }
            this.readyState = "closed";
            this.id = null;
            this.emitReserved("close", reason, description);
            this.writeBuffer = [];
            this._prevBufferLen = 0;
          }
        }
      };
      exports.SocketWithoutUpgrade = SocketWithoutUpgrade;
      SocketWithoutUpgrade.protocol = engine_io_parser_1.protocol;
      var SocketWithUpgrade = class extends SocketWithoutUpgrade {
        constructor() {
          super(...arguments);
          this._upgrades = [];
        }
        onOpen() {
          super.onOpen();
          if ("open" === this.readyState && this.opts.upgrade) {
            debug("starting upgrade probes");
            for (let i = 0; i < this._upgrades.length; i++) {
              this._probe(this._upgrades[i]);
            }
          }
        }
        /**
         * Probes a transport.
         *
         * @param {String} name - transport name
         * @private
         */
        _probe(name) {
          debug('probing transport "%s"', name);
          let transport = this.createTransport(name);
          let failed = false;
          SocketWithoutUpgrade.priorWebsocketSuccess = false;
          const onTransportOpen = () => {
            if (failed)
              return;
            debug('probe transport "%s" opened', name);
            transport.send([{ type: "ping", data: "probe" }]);
            transport.once("packet", (msg) => {
              if (failed)
                return;
              if ("pong" === msg.type && "probe" === msg.data) {
                debug('probe transport "%s" pong', name);
                this.upgrading = true;
                this.emitReserved("upgrading", transport);
                if (!transport)
                  return;
                SocketWithoutUpgrade.priorWebsocketSuccess = "websocket" === transport.name;
                debug('pausing current transport "%s"', this.transport.name);
                this.transport.pause(() => {
                  if (failed)
                    return;
                  if ("closed" === this.readyState)
                    return;
                  debug("changing transport and sending upgrade packet");
                  cleanup();
                  this.setTransport(transport);
                  transport.send([{ type: "upgrade" }]);
                  this.emitReserved("upgrade", transport);
                  transport = null;
                  this.upgrading = false;
                  this.flush();
                });
              } else {
                debug('probe transport "%s" failed', name);
                const err = new Error("probe error");
                err.transport = transport.name;
                this.emitReserved("upgradeError", err);
              }
            });
          };
          function freezeTransport() {
            if (failed)
              return;
            failed = true;
            cleanup();
            transport.close();
            transport = null;
          }
          const onerror = (err) => {
            const error = new Error("probe error: " + err);
            error.transport = transport.name;
            freezeTransport();
            debug('probe transport "%s" failed because of error: %s', name, err);
            this.emitReserved("upgradeError", error);
          };
          function onTransportClose() {
            onerror("transport closed");
          }
          function onclose() {
            onerror("socket closed");
          }
          function onupgrade(to) {
            if (transport && to.name !== transport.name) {
              debug('"%s" works - aborting "%s"', to.name, transport.name);
              freezeTransport();
            }
          }
          const cleanup = () => {
            transport.removeListener("open", onTransportOpen);
            transport.removeListener("error", onerror);
            transport.removeListener("close", onTransportClose);
            this.off("close", onclose);
            this.off("upgrading", onupgrade);
          };
          transport.once("open", onTransportOpen);
          transport.once("error", onerror);
          transport.once("close", onTransportClose);
          this.once("close", onclose);
          this.once("upgrading", onupgrade);
          if (this._upgrades.indexOf("webtransport") !== -1 && name !== "webtransport") {
            this.setTimeoutFn(() => {
              if (!failed) {
                transport.open();
              }
            }, 200);
          } else {
            transport.open();
          }
        }
        onHandshake(data) {
          this._upgrades = this._filterUpgrades(data.upgrades);
          super.onHandshake(data);
        }
        /**
         * Filters upgrades, returning only those matching client transports.
         *
         * @param {Array} upgrades - server upgrades
         * @private
         */
        _filterUpgrades(upgrades) {
          const filteredUpgrades = [];
          for (let i = 0; i < upgrades.length; i++) {
            if (~this.transports.indexOf(upgrades[i]))
              filteredUpgrades.push(upgrades[i]);
          }
          return filteredUpgrades;
        }
      };
      exports.SocketWithUpgrade = SocketWithUpgrade;
      var Socket = class extends SocketWithUpgrade {
        constructor(uri, opts = {}) {
          const o = typeof uri === "object" ? uri : opts;
          if (!o.transports || o.transports && typeof o.transports[0] === "string") {
            o.transports = (o.transports || ["polling", "websocket", "webtransport"]).map((transportName) => index_js_1.transports[transportName]).filter((t) => !!t);
          }
          super(uri, o);
        }
      };
      exports.Socket = Socket;
    }
  });

  // node_modules/engine.io-client/build/cjs/transports/polling-fetch.js
  var require_polling_fetch = __commonJS({
    "node_modules/engine.io-client/build/cjs/transports/polling-fetch.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Fetch = void 0;
      var polling_js_1 = require_polling();
      var Fetch = class extends polling_js_1.Polling {
        doPoll() {
          this._fetch().then((res) => {
            if (!res.ok) {
              return this.onError("fetch read error", res.status, res);
            }
            res.text().then((data) => this.onData(data));
          }).catch((err) => {
            this.onError("fetch read error", err);
          });
        }
        doWrite(data, callback) {
          this._fetch(data).then((res) => {
            if (!res.ok) {
              return this.onError("fetch write error", res.status, res);
            }
            callback();
          }).catch((err) => {
            this.onError("fetch write error", err);
          });
        }
        _fetch(data) {
          var _a;
          const isPost = data !== void 0;
          const headers = new Headers(this.opts.extraHeaders);
          if (isPost) {
            headers.set("content-type", "text/plain;charset=UTF-8");
          }
          (_a = this.socket._cookieJar) === null || _a === void 0 ? void 0 : _a.appendCookies(headers);
          return fetch(this.uri(), {
            method: isPost ? "POST" : "GET",
            body: isPost ? data : null,
            headers,
            credentials: this.opts.withCredentials ? "include" : "omit"
          }).then((res) => {
            var _a2;
            (_a2 = this.socket._cookieJar) === null || _a2 === void 0 ? void 0 : _a2.parseCookies(res.headers.getSetCookie());
            return res;
          });
        }
      };
      exports.Fetch = Fetch;
    }
  });

  // node_modules/engine.io-client/build/cjs/index.js
  var require_cjs3 = __commonJS({
    "node_modules/engine.io-client/build/cjs/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.WebTransport = exports.WebSocket = exports.NodeWebSocket = exports.XHR = exports.NodeXHR = exports.Fetch = exports.nextTick = exports.parse = exports.installTimerFunctions = exports.transports = exports.TransportError = exports.Transport = exports.protocol = exports.SocketWithUpgrade = exports.SocketWithoutUpgrade = exports.Socket = void 0;
      var socket_js_1 = require_socket();
      Object.defineProperty(exports, "Socket", { enumerable: true, get: function() {
        return socket_js_1.Socket;
      } });
      var socket_js_2 = require_socket();
      Object.defineProperty(exports, "SocketWithoutUpgrade", { enumerable: true, get: function() {
        return socket_js_2.SocketWithoutUpgrade;
      } });
      Object.defineProperty(exports, "SocketWithUpgrade", { enumerable: true, get: function() {
        return socket_js_2.SocketWithUpgrade;
      } });
      exports.protocol = socket_js_1.Socket.protocol;
      var transport_js_1 = require_transport();
      Object.defineProperty(exports, "Transport", { enumerable: true, get: function() {
        return transport_js_1.Transport;
      } });
      Object.defineProperty(exports, "TransportError", { enumerable: true, get: function() {
        return transport_js_1.TransportError;
      } });
      var index_js_1 = require_transports();
      Object.defineProperty(exports, "transports", { enumerable: true, get: function() {
        return index_js_1.transports;
      } });
      var util_js_1 = require_util();
      Object.defineProperty(exports, "installTimerFunctions", { enumerable: true, get: function() {
        return util_js_1.installTimerFunctions;
      } });
      var parseuri_js_1 = require_parseuri();
      Object.defineProperty(exports, "parse", { enumerable: true, get: function() {
        return parseuri_js_1.parse;
      } });
      var globals_node_js_1 = require_globals();
      Object.defineProperty(exports, "nextTick", { enumerable: true, get: function() {
        return globals_node_js_1.nextTick;
      } });
      var polling_fetch_js_1 = require_polling_fetch();
      Object.defineProperty(exports, "Fetch", { enumerable: true, get: function() {
        return polling_fetch_js_1.Fetch;
      } });
      var polling_xhr_node_js_1 = require_polling_xhr();
      Object.defineProperty(exports, "NodeXHR", { enumerable: true, get: function() {
        return polling_xhr_node_js_1.XHR;
      } });
      var polling_xhr_js_1 = require_polling_xhr();
      Object.defineProperty(exports, "XHR", { enumerable: true, get: function() {
        return polling_xhr_js_1.XHR;
      } });
      var websocket_node_js_1 = require_websocket();
      Object.defineProperty(exports, "NodeWebSocket", { enumerable: true, get: function() {
        return websocket_node_js_1.WS;
      } });
      var websocket_js_1 = require_websocket();
      Object.defineProperty(exports, "WebSocket", { enumerable: true, get: function() {
        return websocket_js_1.WS;
      } });
      var webtransport_js_1 = require_webtransport();
      Object.defineProperty(exports, "WebTransport", { enumerable: true, get: function() {
        return webtransport_js_1.WT;
      } });
    }
  });

  // node_modules/socket.io-client/node_modules/ms/index.js
  var require_ms2 = __commonJS({
    "node_modules/socket.io-client/node_modules/ms/index.js"(exports, module) {
      var s = 1e3;
      var m = s * 60;
      var h = m * 60;
      var d = h * 24;
      var w = d * 7;
      var y = d * 365.25;
      module.exports = function(val, options) {
        options = options || {};
        var type = typeof val;
        if (type === "string" && val.length > 0) {
          return parse(val);
        } else if (type === "number" && isFinite(val)) {
          return options.long ? fmtLong(val) : fmtShort(val);
        }
        throw new Error(
          "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
        );
      };
      function parse(str) {
        str = String(str);
        if (str.length > 100) {
          return;
        }
        var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
          str
        );
        if (!match) {
          return;
        }
        var n = parseFloat(match[1]);
        var type = (match[2] || "ms").toLowerCase();
        switch (type) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return n * y;
          case "weeks":
          case "week":
          case "w":
            return n * w;
          case "days":
          case "day":
          case "d":
            return n * d;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return n * h;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return n * m;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return n * s;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return n;
          default:
            return void 0;
        }
      }
      function fmtShort(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return Math.round(ms / d) + "d";
        }
        if (msAbs >= h) {
          return Math.round(ms / h) + "h";
        }
        if (msAbs >= m) {
          return Math.round(ms / m) + "m";
        }
        if (msAbs >= s) {
          return Math.round(ms / s) + "s";
        }
        return ms + "ms";
      }
      function fmtLong(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return plural(ms, msAbs, d, "day");
        }
        if (msAbs >= h) {
          return plural(ms, msAbs, h, "hour");
        }
        if (msAbs >= m) {
          return plural(ms, msAbs, m, "minute");
        }
        if (msAbs >= s) {
          return plural(ms, msAbs, s, "second");
        }
        return ms + " ms";
      }
      function plural(ms, msAbs, n, name) {
        var isPlural = msAbs >= n * 1.5;
        return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
      }
    }
  });

  // node_modules/socket.io-client/node_modules/debug/src/common.js
  var require_common2 = __commonJS({
    "node_modules/socket.io-client/node_modules/debug/src/common.js"(exports, module) {
      function setup(env) {
        createDebug.debug = createDebug;
        createDebug.default = createDebug;
        createDebug.coerce = coerce;
        createDebug.disable = disable;
        createDebug.enable = enable;
        createDebug.enabled = enabled;
        createDebug.humanize = require_ms2();
        createDebug.destroy = destroy;
        Object.keys(env).forEach((key) => {
          createDebug[key] = env[key];
        });
        createDebug.names = [];
        createDebug.skips = [];
        createDebug.formatters = {};
        function selectColor(namespace) {
          let hash = 0;
          for (let i = 0; i < namespace.length; i++) {
            hash = (hash << 5) - hash + namespace.charCodeAt(i);
            hash |= 0;
          }
          return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
        }
        createDebug.selectColor = selectColor;
        function createDebug(namespace) {
          let prevTime;
          let enableOverride = null;
          let namespacesCache;
          let enabledCache;
          function debug(...args) {
            if (!debug.enabled) {
              return;
            }
            const self2 = debug;
            const curr = Number(/* @__PURE__ */ new Date());
            const ms = curr - (prevTime || curr);
            self2.diff = ms;
            self2.prev = prevTime;
            self2.curr = curr;
            prevTime = curr;
            args[0] = createDebug.coerce(args[0]);
            if (typeof args[0] !== "string") {
              args.unshift("%O");
            }
            let index = 0;
            args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
              if (match === "%%") {
                return "%";
              }
              index++;
              const formatter = createDebug.formatters[format];
              if (typeof formatter === "function") {
                const val = args[index];
                match = formatter.call(self2, val);
                args.splice(index, 1);
                index--;
              }
              return match;
            });
            createDebug.formatArgs.call(self2, args);
            const logFn = self2.log || createDebug.log;
            logFn.apply(self2, args);
          }
          debug.namespace = namespace;
          debug.useColors = createDebug.useColors();
          debug.color = createDebug.selectColor(namespace);
          debug.extend = extend;
          debug.destroy = createDebug.destroy;
          Object.defineProperty(debug, "enabled", {
            enumerable: true,
            configurable: false,
            get: () => {
              if (enableOverride !== null) {
                return enableOverride;
              }
              if (namespacesCache !== createDebug.namespaces) {
                namespacesCache = createDebug.namespaces;
                enabledCache = createDebug.enabled(namespace);
              }
              return enabledCache;
            },
            set: (v) => {
              enableOverride = v;
            }
          });
          if (typeof createDebug.init === "function") {
            createDebug.init(debug);
          }
          return debug;
        }
        function extend(namespace, delimiter) {
          const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
          newDebug.log = this.log;
          return newDebug;
        }
        function enable(namespaces) {
          createDebug.save(namespaces);
          createDebug.namespaces = namespaces;
          createDebug.names = [];
          createDebug.skips = [];
          const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
          for (const ns of split) {
            if (ns[0] === "-") {
              createDebug.skips.push(ns.slice(1));
            } else {
              createDebug.names.push(ns);
            }
          }
        }
        function matchesTemplate(search, template) {
          let searchIndex = 0;
          let templateIndex = 0;
          let starIndex = -1;
          let matchIndex = 0;
          while (searchIndex < search.length) {
            if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
              if (template[templateIndex] === "*") {
                starIndex = templateIndex;
                matchIndex = searchIndex;
                templateIndex++;
              } else {
                searchIndex++;
                templateIndex++;
              }
            } else if (starIndex !== -1) {
              templateIndex = starIndex + 1;
              matchIndex++;
              searchIndex = matchIndex;
            } else {
              return false;
            }
          }
          while (templateIndex < template.length && template[templateIndex] === "*") {
            templateIndex++;
          }
          return templateIndex === template.length;
        }
        function disable() {
          const namespaces = [
            ...createDebug.names,
            ...createDebug.skips.map((namespace) => "-" + namespace)
          ].join(",");
          createDebug.enable("");
          return namespaces;
        }
        function enabled(name) {
          for (const skip of createDebug.skips) {
            if (matchesTemplate(name, skip)) {
              return false;
            }
          }
          for (const ns of createDebug.names) {
            if (matchesTemplate(name, ns)) {
              return true;
            }
          }
          return false;
        }
        function coerce(val) {
          if (val instanceof Error) {
            return val.stack || val.message;
          }
          return val;
        }
        function destroy() {
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
        createDebug.enable(createDebug.load());
        return createDebug;
      }
      module.exports = setup;
    }
  });

  // node_modules/socket.io-client/node_modules/debug/src/browser.js
  var require_browser2 = __commonJS({
    "node_modules/socket.io-client/node_modules/debug/src/browser.js"(exports, module) {
      exports.formatArgs = formatArgs;
      exports.save = save;
      exports.load = load;
      exports.useColors = useColors;
      exports.storage = localstorage();
      exports.destroy = /* @__PURE__ */ (() => {
        let warned = false;
        return () => {
          if (!warned) {
            warned = true;
            console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
          }
        };
      })();
      exports.colors = [
        "#0000CC",
        "#0000FF",
        "#0033CC",
        "#0033FF",
        "#0066CC",
        "#0066FF",
        "#0099CC",
        "#0099FF",
        "#00CC00",
        "#00CC33",
        "#00CC66",
        "#00CC99",
        "#00CCCC",
        "#00CCFF",
        "#3300CC",
        "#3300FF",
        "#3333CC",
        "#3333FF",
        "#3366CC",
        "#3366FF",
        "#3399CC",
        "#3399FF",
        "#33CC00",
        "#33CC33",
        "#33CC66",
        "#33CC99",
        "#33CCCC",
        "#33CCFF",
        "#6600CC",
        "#6600FF",
        "#6633CC",
        "#6633FF",
        "#66CC00",
        "#66CC33",
        "#9900CC",
        "#9900FF",
        "#9933CC",
        "#9933FF",
        "#99CC00",
        "#99CC33",
        "#CC0000",
        "#CC0033",
        "#CC0066",
        "#CC0099",
        "#CC00CC",
        "#CC00FF",
        "#CC3300",
        "#CC3333",
        "#CC3366",
        "#CC3399",
        "#CC33CC",
        "#CC33FF",
        "#CC6600",
        "#CC6633",
        "#CC9900",
        "#CC9933",
        "#CCCC00",
        "#CCCC33",
        "#FF0000",
        "#FF0033",
        "#FF0066",
        "#FF0099",
        "#FF00CC",
        "#FF00FF",
        "#FF3300",
        "#FF3333",
        "#FF3366",
        "#FF3399",
        "#FF33CC",
        "#FF33FF",
        "#FF6600",
        "#FF6633",
        "#FF9900",
        "#FF9933",
        "#FFCC00",
        "#FFCC33"
      ];
      function useColors() {
        if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
          return true;
        }
        if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
          return false;
        }
        let m;
        return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
        typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
        // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
        typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
        typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
      }
      function formatArgs(args) {
        args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
        if (!this.useColors) {
          return;
        }
        const c = "color: " + this.color;
        args.splice(1, 0, c, "color: inherit");
        let index = 0;
        let lastC = 0;
        args[0].replace(/%[a-zA-Z%]/g, (match) => {
          if (match === "%%") {
            return;
          }
          index++;
          if (match === "%c") {
            lastC = index;
          }
        });
        args.splice(lastC, 0, c);
      }
      exports.log = console.debug || console.log || (() => {
      });
      function save(namespaces) {
        try {
          if (namespaces) {
            exports.storage.setItem("debug", namespaces);
          } else {
            exports.storage.removeItem("debug");
          }
        } catch (error) {
        }
      }
      function load() {
        let r;
        try {
          r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
        } catch (error) {
        }
        if (!r && typeof process !== "undefined" && "env" in process) {
          r = process.env.DEBUG;
        }
        return r;
      }
      function localstorage() {
        try {
          return localStorage;
        } catch (error) {
        }
      }
      module.exports = require_common2()(exports);
      var { formatters } = module.exports;
      formatters.j = function(v) {
        try {
          return JSON.stringify(v);
        } catch (error) {
          return "[UnexpectedJSONParseError]: " + error.message;
        }
      };
    }
  });

  // node_modules/socket.io-client/build/cjs/url.js
  var require_url = __commonJS({
    "node_modules/socket.io-client/build/cjs/url.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.url = url;
      var engine_io_client_1 = require_cjs3();
      var debug_1 = __importDefault(require_browser2());
      var debug = (0, debug_1.default)("socket.io-client:url");
      function url(uri, path = "", loc) {
        let obj = uri;
        loc = loc || typeof location !== "undefined" && location;
        if (null == uri)
          uri = loc.protocol + "//" + loc.host;
        if (typeof uri === "string") {
          if ("/" === uri.charAt(0)) {
            if ("/" === uri.charAt(1)) {
              uri = loc.protocol + uri;
            } else {
              uri = loc.host + uri;
            }
          }
          if (!/^(https?|wss?):\/\//.test(uri)) {
            debug("protocol-less url %s", uri);
            if ("undefined" !== typeof loc) {
              uri = loc.protocol + "//" + uri;
            } else {
              uri = "https://" + uri;
            }
          }
          debug("parse %s", uri);
          obj = (0, engine_io_client_1.parse)(uri);
        }
        if (!obj.port) {
          if (/^(http|ws)$/.test(obj.protocol)) {
            obj.port = "80";
          } else if (/^(http|ws)s$/.test(obj.protocol)) {
            obj.port = "443";
          }
        }
        obj.path = obj.path || "/";
        const ipv6 = obj.host.indexOf(":") !== -1;
        const host = ipv6 ? "[" + obj.host + "]" : obj.host;
        obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
        obj.href = obj.protocol + "://" + host + (loc && loc.port === obj.port ? "" : ":" + obj.port);
        return obj;
      }
    }
  });

  // node_modules/socket.io-parser/build/cjs/is-binary.js
  var require_is_binary = __commonJS({
    "node_modules/socket.io-parser/build/cjs/is-binary.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.isBinary = isBinary;
      exports.hasBinary = hasBinary;
      var withNativeArrayBuffer = typeof ArrayBuffer === "function";
      var isView = (obj) => {
        return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj.buffer instanceof ArrayBuffer;
      };
      var toString = Object.prototype.toString;
      var withNativeBlob = typeof Blob === "function" || typeof Blob !== "undefined" && toString.call(Blob) === "[object BlobConstructor]";
      var withNativeFile = typeof File === "function" || typeof File !== "undefined" && toString.call(File) === "[object FileConstructor]";
      function isBinary(obj) {
        return withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj)) || withNativeBlob && obj instanceof Blob || withNativeFile && obj instanceof File;
      }
      function hasBinary(obj, toJSON) {
        if (!obj || typeof obj !== "object") {
          return false;
        }
        if (Array.isArray(obj)) {
          for (let i = 0, l = obj.length; i < l; i++) {
            if (hasBinary(obj[i])) {
              return true;
            }
          }
          return false;
        }
        if (isBinary(obj)) {
          return true;
        }
        if (obj.toJSON && typeof obj.toJSON === "function" && arguments.length === 1) {
          return hasBinary(obj.toJSON(), true);
        }
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
            return true;
          }
        }
        return false;
      }
    }
  });

  // node_modules/socket.io-parser/build/cjs/binary.js
  var require_binary = __commonJS({
    "node_modules/socket.io-parser/build/cjs/binary.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.deconstructPacket = deconstructPacket;
      exports.reconstructPacket = reconstructPacket;
      var is_binary_js_1 = require_is_binary();
      function deconstructPacket(packet) {
        const buffers = [];
        const packetData = packet.data;
        const pack = packet;
        pack.data = _deconstructPacket(packetData, buffers);
        pack.attachments = buffers.length;
        return { packet: pack, buffers };
      }
      function _deconstructPacket(data, buffers) {
        if (!data)
          return data;
        if ((0, is_binary_js_1.isBinary)(data)) {
          const placeholder = { _placeholder: true, num: buffers.length };
          buffers.push(data);
          return placeholder;
        } else if (Array.isArray(data)) {
          const newData = new Array(data.length);
          for (let i = 0; i < data.length; i++) {
            newData[i] = _deconstructPacket(data[i], buffers);
          }
          return newData;
        } else if (typeof data === "object" && !(data instanceof Date)) {
          const newData = {};
          for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
              newData[key] = _deconstructPacket(data[key], buffers);
            }
          }
          return newData;
        }
        return data;
      }
      function reconstructPacket(packet, buffers) {
        packet.data = _reconstructPacket(packet.data, buffers);
        delete packet.attachments;
        return packet;
      }
      function _reconstructPacket(data, buffers) {
        if (!data)
          return data;
        if (data && data._placeholder === true) {
          const isIndexValid = typeof data.num === "number" && data.num >= 0 && data.num < buffers.length;
          if (isIndexValid) {
            return buffers[data.num];
          } else {
            throw new Error("illegal attachments");
          }
        } else if (Array.isArray(data)) {
          for (let i = 0; i < data.length; i++) {
            data[i] = _reconstructPacket(data[i], buffers);
          }
        } else if (typeof data === "object") {
          for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
              data[key] = _reconstructPacket(data[key], buffers);
            }
          }
        }
        return data;
      }
    }
  });

  // node_modules/socket.io-parser/node_modules/ms/index.js
  var require_ms3 = __commonJS({
    "node_modules/socket.io-parser/node_modules/ms/index.js"(exports, module) {
      var s = 1e3;
      var m = s * 60;
      var h = m * 60;
      var d = h * 24;
      var w = d * 7;
      var y = d * 365.25;
      module.exports = function(val, options) {
        options = options || {};
        var type = typeof val;
        if (type === "string" && val.length > 0) {
          return parse(val);
        } else if (type === "number" && isFinite(val)) {
          return options.long ? fmtLong(val) : fmtShort(val);
        }
        throw new Error(
          "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
        );
      };
      function parse(str) {
        str = String(str);
        if (str.length > 100) {
          return;
        }
        var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
          str
        );
        if (!match) {
          return;
        }
        var n = parseFloat(match[1]);
        var type = (match[2] || "ms").toLowerCase();
        switch (type) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return n * y;
          case "weeks":
          case "week":
          case "w":
            return n * w;
          case "days":
          case "day":
          case "d":
            return n * d;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return n * h;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return n * m;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return n * s;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return n;
          default:
            return void 0;
        }
      }
      function fmtShort(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return Math.round(ms / d) + "d";
        }
        if (msAbs >= h) {
          return Math.round(ms / h) + "h";
        }
        if (msAbs >= m) {
          return Math.round(ms / m) + "m";
        }
        if (msAbs >= s) {
          return Math.round(ms / s) + "s";
        }
        return ms + "ms";
      }
      function fmtLong(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return plural(ms, msAbs, d, "day");
        }
        if (msAbs >= h) {
          return plural(ms, msAbs, h, "hour");
        }
        if (msAbs >= m) {
          return plural(ms, msAbs, m, "minute");
        }
        if (msAbs >= s) {
          return plural(ms, msAbs, s, "second");
        }
        return ms + " ms";
      }
      function plural(ms, msAbs, n, name) {
        var isPlural = msAbs >= n * 1.5;
        return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
      }
    }
  });

  // node_modules/socket.io-parser/node_modules/debug/src/common.js
  var require_common3 = __commonJS({
    "node_modules/socket.io-parser/node_modules/debug/src/common.js"(exports, module) {
      function setup(env) {
        createDebug.debug = createDebug;
        createDebug.default = createDebug;
        createDebug.coerce = coerce;
        createDebug.disable = disable;
        createDebug.enable = enable;
        createDebug.enabled = enabled;
        createDebug.humanize = require_ms3();
        createDebug.destroy = destroy;
        Object.keys(env).forEach((key) => {
          createDebug[key] = env[key];
        });
        createDebug.names = [];
        createDebug.skips = [];
        createDebug.formatters = {};
        function selectColor(namespace) {
          let hash = 0;
          for (let i = 0; i < namespace.length; i++) {
            hash = (hash << 5) - hash + namespace.charCodeAt(i);
            hash |= 0;
          }
          return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
        }
        createDebug.selectColor = selectColor;
        function createDebug(namespace) {
          let prevTime;
          let enableOverride = null;
          let namespacesCache;
          let enabledCache;
          function debug(...args) {
            if (!debug.enabled) {
              return;
            }
            const self2 = debug;
            const curr = Number(/* @__PURE__ */ new Date());
            const ms = curr - (prevTime || curr);
            self2.diff = ms;
            self2.prev = prevTime;
            self2.curr = curr;
            prevTime = curr;
            args[0] = createDebug.coerce(args[0]);
            if (typeof args[0] !== "string") {
              args.unshift("%O");
            }
            let index = 0;
            args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
              if (match === "%%") {
                return "%";
              }
              index++;
              const formatter = createDebug.formatters[format];
              if (typeof formatter === "function") {
                const val = args[index];
                match = formatter.call(self2, val);
                args.splice(index, 1);
                index--;
              }
              return match;
            });
            createDebug.formatArgs.call(self2, args);
            const logFn = self2.log || createDebug.log;
            logFn.apply(self2, args);
          }
          debug.namespace = namespace;
          debug.useColors = createDebug.useColors();
          debug.color = createDebug.selectColor(namespace);
          debug.extend = extend;
          debug.destroy = createDebug.destroy;
          Object.defineProperty(debug, "enabled", {
            enumerable: true,
            configurable: false,
            get: () => {
              if (enableOverride !== null) {
                return enableOverride;
              }
              if (namespacesCache !== createDebug.namespaces) {
                namespacesCache = createDebug.namespaces;
                enabledCache = createDebug.enabled(namespace);
              }
              return enabledCache;
            },
            set: (v) => {
              enableOverride = v;
            }
          });
          if (typeof createDebug.init === "function") {
            createDebug.init(debug);
          }
          return debug;
        }
        function extend(namespace, delimiter) {
          const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
          newDebug.log = this.log;
          return newDebug;
        }
        function enable(namespaces) {
          createDebug.save(namespaces);
          createDebug.namespaces = namespaces;
          createDebug.names = [];
          createDebug.skips = [];
          const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
          for (const ns of split) {
            if (ns[0] === "-") {
              createDebug.skips.push(ns.slice(1));
            } else {
              createDebug.names.push(ns);
            }
          }
        }
        function matchesTemplate(search, template) {
          let searchIndex = 0;
          let templateIndex = 0;
          let starIndex = -1;
          let matchIndex = 0;
          while (searchIndex < search.length) {
            if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
              if (template[templateIndex] === "*") {
                starIndex = templateIndex;
                matchIndex = searchIndex;
                templateIndex++;
              } else {
                searchIndex++;
                templateIndex++;
              }
            } else if (starIndex !== -1) {
              templateIndex = starIndex + 1;
              matchIndex++;
              searchIndex = matchIndex;
            } else {
              return false;
            }
          }
          while (templateIndex < template.length && template[templateIndex] === "*") {
            templateIndex++;
          }
          return templateIndex === template.length;
        }
        function disable() {
          const namespaces = [
            ...createDebug.names,
            ...createDebug.skips.map((namespace) => "-" + namespace)
          ].join(",");
          createDebug.enable("");
          return namespaces;
        }
        function enabled(name) {
          for (const skip of createDebug.skips) {
            if (matchesTemplate(name, skip)) {
              return false;
            }
          }
          for (const ns of createDebug.names) {
            if (matchesTemplate(name, ns)) {
              return true;
            }
          }
          return false;
        }
        function coerce(val) {
          if (val instanceof Error) {
            return val.stack || val.message;
          }
          return val;
        }
        function destroy() {
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
        createDebug.enable(createDebug.load());
        return createDebug;
      }
      module.exports = setup;
    }
  });

  // node_modules/socket.io-parser/node_modules/debug/src/browser.js
  var require_browser3 = __commonJS({
    "node_modules/socket.io-parser/node_modules/debug/src/browser.js"(exports, module) {
      exports.formatArgs = formatArgs;
      exports.save = save;
      exports.load = load;
      exports.useColors = useColors;
      exports.storage = localstorage();
      exports.destroy = /* @__PURE__ */ (() => {
        let warned = false;
        return () => {
          if (!warned) {
            warned = true;
            console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
          }
        };
      })();
      exports.colors = [
        "#0000CC",
        "#0000FF",
        "#0033CC",
        "#0033FF",
        "#0066CC",
        "#0066FF",
        "#0099CC",
        "#0099FF",
        "#00CC00",
        "#00CC33",
        "#00CC66",
        "#00CC99",
        "#00CCCC",
        "#00CCFF",
        "#3300CC",
        "#3300FF",
        "#3333CC",
        "#3333FF",
        "#3366CC",
        "#3366FF",
        "#3399CC",
        "#3399FF",
        "#33CC00",
        "#33CC33",
        "#33CC66",
        "#33CC99",
        "#33CCCC",
        "#33CCFF",
        "#6600CC",
        "#6600FF",
        "#6633CC",
        "#6633FF",
        "#66CC00",
        "#66CC33",
        "#9900CC",
        "#9900FF",
        "#9933CC",
        "#9933FF",
        "#99CC00",
        "#99CC33",
        "#CC0000",
        "#CC0033",
        "#CC0066",
        "#CC0099",
        "#CC00CC",
        "#CC00FF",
        "#CC3300",
        "#CC3333",
        "#CC3366",
        "#CC3399",
        "#CC33CC",
        "#CC33FF",
        "#CC6600",
        "#CC6633",
        "#CC9900",
        "#CC9933",
        "#CCCC00",
        "#CCCC33",
        "#FF0000",
        "#FF0033",
        "#FF0066",
        "#FF0099",
        "#FF00CC",
        "#FF00FF",
        "#FF3300",
        "#FF3333",
        "#FF3366",
        "#FF3399",
        "#FF33CC",
        "#FF33FF",
        "#FF6600",
        "#FF6633",
        "#FF9900",
        "#FF9933",
        "#FFCC00",
        "#FFCC33"
      ];
      function useColors() {
        if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
          return true;
        }
        if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
          return false;
        }
        let m;
        return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
        typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
        // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
        typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
        typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
      }
      function formatArgs(args) {
        args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
        if (!this.useColors) {
          return;
        }
        const c = "color: " + this.color;
        args.splice(1, 0, c, "color: inherit");
        let index = 0;
        let lastC = 0;
        args[0].replace(/%[a-zA-Z%]/g, (match) => {
          if (match === "%%") {
            return;
          }
          index++;
          if (match === "%c") {
            lastC = index;
          }
        });
        args.splice(lastC, 0, c);
      }
      exports.log = console.debug || console.log || (() => {
      });
      function save(namespaces) {
        try {
          if (namespaces) {
            exports.storage.setItem("debug", namespaces);
          } else {
            exports.storage.removeItem("debug");
          }
        } catch (error) {
        }
      }
      function load() {
        let r;
        try {
          r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
        } catch (error) {
        }
        if (!r && typeof process !== "undefined" && "env" in process) {
          r = process.env.DEBUG;
        }
        return r;
      }
      function localstorage() {
        try {
          return localStorage;
        } catch (error) {
        }
      }
      module.exports = require_common3()(exports);
      var { formatters } = module.exports;
      formatters.j = function(v) {
        try {
          return JSON.stringify(v);
        } catch (error) {
          return "[UnexpectedJSONParseError]: " + error.message;
        }
      };
    }
  });

  // node_modules/socket.io-parser/build/cjs/index.js
  var require_cjs4 = __commonJS({
    "node_modules/socket.io-parser/build/cjs/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Decoder = exports.Encoder = exports.PacketType = exports.protocol = void 0;
      exports.isPacketValid = isPacketValid;
      var component_emitter_1 = require_cjs2();
      var binary_js_1 = require_binary();
      var is_binary_js_1 = require_is_binary();
      var debug_1 = require_browser3();
      var debug = (0, debug_1.default)("socket.io-parser");
      var RESERVED_EVENTS = [
        "connect",
        // used on the client side
        "connect_error",
        // used on the client side
        "disconnect",
        // used on both sides
        "disconnecting",
        // used on the server side
        "newListener",
        // used by the Node.js EventEmitter
        "removeListener"
        // used by the Node.js EventEmitter
      ];
      exports.protocol = 5;
      var PacketType;
      (function(PacketType2) {
        PacketType2[PacketType2["CONNECT"] = 0] = "CONNECT";
        PacketType2[PacketType2["DISCONNECT"] = 1] = "DISCONNECT";
        PacketType2[PacketType2["EVENT"] = 2] = "EVENT";
        PacketType2[PacketType2["ACK"] = 3] = "ACK";
        PacketType2[PacketType2["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
        PacketType2[PacketType2["BINARY_EVENT"] = 5] = "BINARY_EVENT";
        PacketType2[PacketType2["BINARY_ACK"] = 6] = "BINARY_ACK";
      })(PacketType || (exports.PacketType = PacketType = {}));
      var Encoder = class {
        /**
         * Encoder constructor
         *
         * @param {function} replacer - custom replacer to pass down to JSON.parse
         */
        constructor(replacer) {
          this.replacer = replacer;
        }
        /**
         * Encode a packet as a single string if non-binary, or as a
         * buffer sequence, depending on packet type.
         *
         * @param {Object} obj - packet object
         */
        encode(obj) {
          debug("encoding packet %j", obj);
          if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
            if ((0, is_binary_js_1.hasBinary)(obj)) {
              return this.encodeAsBinary({
                type: obj.type === PacketType.EVENT ? PacketType.BINARY_EVENT : PacketType.BINARY_ACK,
                nsp: obj.nsp,
                data: obj.data,
                id: obj.id
              });
            }
          }
          return [this.encodeAsString(obj)];
        }
        /**
         * Encode packet as string.
         */
        encodeAsString(obj) {
          let str = "" + obj.type;
          if (obj.type === PacketType.BINARY_EVENT || obj.type === PacketType.BINARY_ACK) {
            str += obj.attachments + "-";
          }
          if (obj.nsp && "/" !== obj.nsp) {
            str += obj.nsp + ",";
          }
          if (null != obj.id) {
            str += obj.id;
          }
          if (null != obj.data) {
            str += JSON.stringify(obj.data, this.replacer);
          }
          debug("encoded %j as %s", obj, str);
          return str;
        }
        /**
         * Encode packet as 'buffer sequence' by removing blobs, and
         * deconstructing packet into object with placeholders and
         * a list of buffers.
         */
        encodeAsBinary(obj) {
          const deconstruction = (0, binary_js_1.deconstructPacket)(obj);
          const pack = this.encodeAsString(deconstruction.packet);
          const buffers = deconstruction.buffers;
          buffers.unshift(pack);
          return buffers;
        }
      };
      exports.Encoder = Encoder;
      var Decoder = class _Decoder extends component_emitter_1.Emitter {
        /**
         * Decoder constructor
         */
        constructor(opts) {
          super();
          this.opts = Object.assign({
            reviver: void 0,
            maxAttachments: 10
          }, typeof opts === "function" ? { reviver: opts } : opts);
        }
        /**
         * Decodes an encoded packet string into packet JSON.
         *
         * @param {String} obj - encoded packet
         */
        add(obj) {
          let packet;
          if (typeof obj === "string") {
            if (this.reconstructor) {
              throw new Error("got plaintext data when reconstructing a packet");
            }
            packet = this.decodeString(obj);
            const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
            if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
              packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
              this.reconstructor = new BinaryReconstructor(packet);
              if (packet.attachments === 0) {
                super.emitReserved("decoded", packet);
              }
            } else {
              super.emitReserved("decoded", packet);
            }
          } else if ((0, is_binary_js_1.isBinary)(obj) || obj.base64) {
            if (!this.reconstructor) {
              throw new Error("got binary data when not reconstructing a packet");
            } else {
              packet = this.reconstructor.takeBinaryData(obj);
              if (packet) {
                this.reconstructor = null;
                super.emitReserved("decoded", packet);
              }
            }
          } else {
            throw new Error("Unknown type: " + obj);
          }
        }
        /**
         * Decode a packet String (JSON data)
         *
         * @param {String} str
         * @return {Object} packet
         */
        decodeString(str) {
          let i = 0;
          const p = {
            type: Number(str.charAt(0))
          };
          if (PacketType[p.type] === void 0) {
            throw new Error("unknown packet type " + p.type);
          }
          if (p.type === PacketType.BINARY_EVENT || p.type === PacketType.BINARY_ACK) {
            const start = i + 1;
            while (str.charAt(++i) !== "-" && i != str.length) {
            }
            const buf = str.substring(start, i);
            if (buf != Number(buf) || str.charAt(i) !== "-") {
              throw new Error("Illegal attachments");
            }
            const n = Number(buf);
            if (!isInteger(n) || n < 0) {
              throw new Error("Illegal attachments");
            } else if (n > this.opts.maxAttachments) {
              throw new Error("too many attachments");
            }
            p.attachments = n;
          }
          if ("/" === str.charAt(i + 1)) {
            const start = i + 1;
            while (++i) {
              const c = str.charAt(i);
              if ("," === c)
                break;
              if (i === str.length)
                break;
            }
            p.nsp = str.substring(start, i);
          } else {
            p.nsp = "/";
          }
          const next = str.charAt(i + 1);
          if ("" !== next && Number(next) == next) {
            const start = i + 1;
            while (++i) {
              const c = str.charAt(i);
              if (null == c || Number(c) != c) {
                --i;
                break;
              }
              if (i === str.length)
                break;
            }
            p.id = Number(str.substring(start, i + 1));
          }
          if (str.charAt(++i)) {
            const payload = this.tryParse(str.substr(i));
            if (_Decoder.isPayloadValid(p.type, payload)) {
              p.data = payload;
            } else {
              throw new Error("invalid payload");
            }
          }
          debug("decoded %s as %j", str, p);
          return p;
        }
        tryParse(str) {
          try {
            return JSON.parse(str, this.opts.reviver);
          } catch (e) {
            return false;
          }
        }
        static isPayloadValid(type, payload) {
          switch (type) {
            case PacketType.CONNECT:
              return isObject(payload);
            case PacketType.DISCONNECT:
              return payload === void 0;
            case PacketType.CONNECT_ERROR:
              return typeof payload === "string" || isObject(payload);
            case PacketType.EVENT:
            case PacketType.BINARY_EVENT:
              return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
            case PacketType.ACK:
            case PacketType.BINARY_ACK:
              return Array.isArray(payload);
          }
        }
        /**
         * Deallocates a parser's resources
         */
        destroy() {
          if (this.reconstructor) {
            this.reconstructor.finishedReconstruction();
            this.reconstructor = null;
          }
        }
      };
      exports.Decoder = Decoder;
      var BinaryReconstructor = class {
        constructor(packet) {
          this.packet = packet;
          this.buffers = [];
          this.reconPack = packet;
        }
        /**
         * Method to be called when binary data received from connection
         * after a BINARY_EVENT packet.
         *
         * @param {Buffer | ArrayBuffer} binData - the raw binary data received
         * @return {null | Object} returns null if more binary data is expected or
         *   a reconstructed packet object if all buffers have been received.
         */
        takeBinaryData(binData) {
          this.buffers.push(binData);
          if (this.buffers.length === this.reconPack.attachments) {
            const packet = (0, binary_js_1.reconstructPacket)(this.reconPack, this.buffers);
            this.finishedReconstruction();
            return packet;
          }
          return null;
        }
        /**
         * Cleans up binary packet reconstruction variables.
         */
        finishedReconstruction() {
          this.reconPack = null;
          this.buffers = [];
        }
      };
      function isNamespaceValid(nsp) {
        return typeof nsp === "string";
      }
      var isInteger = Number.isInteger || function(value) {
        return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
      };
      function isAckIdValid(id) {
        return id === void 0 || isInteger(id);
      }
      function isObject(value) {
        return Object.prototype.toString.call(value) === "[object Object]";
      }
      function isDataValid(type, payload) {
        switch (type) {
          case PacketType.CONNECT:
            return payload === void 0 || isObject(payload);
          case PacketType.DISCONNECT:
            return payload === void 0;
          case PacketType.EVENT:
            return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
          case PacketType.ACK:
            return Array.isArray(payload);
          case PacketType.CONNECT_ERROR:
            return typeof payload === "string" || isObject(payload);
          default:
            return false;
        }
      }
      function isPacketValid(packet) {
        return isNamespaceValid(packet.nsp) && isAckIdValid(packet.id) && isDataValid(packet.type, packet.data);
      }
    }
  });

  // node_modules/socket.io-client/build/cjs/on.js
  var require_on = __commonJS({
    "node_modules/socket.io-client/build/cjs/on.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.on = on;
      function on(obj, ev, fn) {
        obj.on(ev, fn);
        return function subDestroy() {
          obj.off(ev, fn);
        };
      }
    }
  });

  // node_modules/socket.io-client/build/cjs/socket.js
  var require_socket2 = __commonJS({
    "node_modules/socket.io-client/build/cjs/socket.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Socket = void 0;
      var socket_io_parser_1 = require_cjs4();
      var on_js_1 = require_on();
      var component_emitter_1 = require_cjs2();
      var debug_1 = __importDefault(require_browser2());
      var debug = (0, debug_1.default)("socket.io-client:socket");
      var RESERVED_EVENTS = Object.freeze({
        connect: 1,
        connect_error: 1,
        disconnect: 1,
        disconnecting: 1,
        // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
        newListener: 1,
        removeListener: 1
      });
      var Socket = class extends component_emitter_1.Emitter {
        /**
         * `Socket` constructor.
         */
        constructor(io, nsp, opts) {
          super();
          this.connected = false;
          this.recovered = false;
          this.receiveBuffer = [];
          this.sendBuffer = [];
          this._queue = [];
          this._queueSeq = 0;
          this.ids = 0;
          this.acks = {};
          this.flags = {};
          this.io = io;
          this.nsp = nsp;
          if (opts && opts.auth) {
            this.auth = opts.auth;
          }
          this._opts = Object.assign({}, opts);
          if (this.io._autoConnect)
            this.open();
        }
        /**
         * Whether the socket is currently disconnected
         *
         * @example
         * const socket = io();
         *
         * socket.on("connect", () => {
         *   console.log(socket.disconnected); // false
         * });
         *
         * socket.on("disconnect", () => {
         *   console.log(socket.disconnected); // true
         * });
         */
        get disconnected() {
          return !this.connected;
        }
        /**
         * Subscribe to open, close and packet events
         *
         * @private
         */
        subEvents() {
          if (this.subs)
            return;
          const io = this.io;
          this.subs = [
            (0, on_js_1.on)(io, "open", this.onopen.bind(this)),
            (0, on_js_1.on)(io, "packet", this.onpacket.bind(this)),
            (0, on_js_1.on)(io, "error", this.onerror.bind(this)),
            (0, on_js_1.on)(io, "close", this.onclose.bind(this))
          ];
        }
        /**
         * Whether the Socket will try to reconnect when its Manager connects or reconnects.
         *
         * @example
         * const socket = io();
         *
         * console.log(socket.active); // true
         *
         * socket.on("disconnect", (reason) => {
         *   if (reason === "io server disconnect") {
         *     // the disconnection was initiated by the server, you need to manually reconnect
         *     console.log(socket.active); // false
         *   }
         *   // else the socket will automatically try to reconnect
         *   console.log(socket.active); // true
         * });
         */
        get active() {
          return !!this.subs;
        }
        /**
         * "Opens" the socket.
         *
         * @example
         * const socket = io({
         *   autoConnect: false
         * });
         *
         * socket.connect();
         */
        connect() {
          if (this.connected)
            return this;
          this.subEvents();
          if (!this.io["_reconnecting"])
            this.io.open();
          if ("open" === this.io._readyState)
            this.onopen();
          return this;
        }
        /**
         * Alias for {@link connect()}.
         */
        open() {
          return this.connect();
        }
        /**
         * Sends a `message` event.
         *
         * This method mimics the WebSocket.send() method.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
         *
         * @example
         * socket.send("hello");
         *
         * // this is equivalent to
         * socket.emit("message", "hello");
         *
         * @return self
         */
        send(...args) {
          args.unshift("message");
          this.emit.apply(this, args);
          return this;
        }
        /**
         * Override `emit`.
         * If the event is in `events`, it's emitted normally.
         *
         * @example
         * socket.emit("hello", "world");
         *
         * // all serializable datastructures are supported (no need to call JSON.stringify)
         * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
         *
         * // with an acknowledgement from the server
         * socket.emit("hello", "world", (val) => {
         *   // ...
         * });
         *
         * @return self
         */
        emit(ev, ...args) {
          var _a, _b, _c;
          if (RESERVED_EVENTS.hasOwnProperty(ev)) {
            throw new Error('"' + ev.toString() + '" is a reserved event name');
          }
          args.unshift(ev);
          if (this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) {
            this._addToQueue(args);
            return this;
          }
          const packet = {
            type: socket_io_parser_1.PacketType.EVENT,
            data: args
          };
          packet.options = {};
          packet.options.compress = this.flags.compress !== false;
          if ("function" === typeof args[args.length - 1]) {
            const id = this.ids++;
            debug("emitting packet with ack id %d", id);
            const ack = args.pop();
            this._registerAckCallback(id, ack);
            packet.id = id;
          }
          const isTransportWritable = (_b = (_a = this.io.engine) === null || _a === void 0 ? void 0 : _a.transport) === null || _b === void 0 ? void 0 : _b.writable;
          const isConnected = this.connected && !((_c = this.io.engine) === null || _c === void 0 ? void 0 : _c._hasPingExpired());
          const discardPacket = this.flags.volatile && !isTransportWritable;
          if (discardPacket) {
            debug("discard packet as the transport is not currently writable");
          } else if (isConnected) {
            this.notifyOutgoingListeners(packet);
            this.packet(packet);
          } else {
            this.sendBuffer.push(packet);
          }
          this.flags = {};
          return this;
        }
        /**
         * @private
         */
        _registerAckCallback(id, ack) {
          var _a;
          const timeout = (_a = this.flags.timeout) !== null && _a !== void 0 ? _a : this._opts.ackTimeout;
          if (timeout === void 0) {
            this.acks[id] = ack;
            return;
          }
          const timer = this.io.setTimeoutFn(() => {
            delete this.acks[id];
            for (let i = 0; i < this.sendBuffer.length; i++) {
              if (this.sendBuffer[i].id === id) {
                debug("removing packet with ack id %d from the buffer", id);
                this.sendBuffer.splice(i, 1);
              }
            }
            debug("event with ack id %d has timed out after %d ms", id, timeout);
            ack.call(this, new Error("operation has timed out"));
          }, timeout);
          const fn = (...args) => {
            this.io.clearTimeoutFn(timer);
            ack.apply(this, args);
          };
          fn.withError = true;
          this.acks[id] = fn;
        }
        /**
         * Emits an event and waits for an acknowledgement
         *
         * @example
         * // without timeout
         * const response = await socket.emitWithAck("hello", "world");
         *
         * // with a specific timeout
         * try {
         *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
         * } catch (err) {
         *   // the server did not acknowledge the event in the given delay
         * }
         *
         * @return a Promise that will be fulfilled when the server acknowledges the event
         */
        emitWithAck(ev, ...args) {
          return new Promise((resolve, reject) => {
            const fn = (arg1, arg2) => {
              return arg1 ? reject(arg1) : resolve(arg2);
            };
            fn.withError = true;
            args.push(fn);
            this.emit(ev, ...args);
          });
        }
        /**
         * Add the packet to the queue.
         * @param args
         * @private
         */
        _addToQueue(args) {
          let ack;
          if (typeof args[args.length - 1] === "function") {
            ack = args.pop();
          }
          const packet = {
            id: this._queueSeq++,
            tryCount: 0,
            pending: false,
            args,
            flags: Object.assign({ fromQueue: true }, this.flags)
          };
          args.push((err, ...responseArgs) => {
            if (packet !== this._queue[0]) {
              return debug("packet [%d] already acknowledged", packet.id);
            }
            const hasError = err !== null;
            if (hasError) {
              if (packet.tryCount > this._opts.retries) {
                debug("packet [%d] is discarded after %d tries", packet.id, packet.tryCount);
                this._queue.shift();
                if (ack) {
                  ack(err);
                }
              }
            } else {
              debug("packet [%d] was successfully sent", packet.id);
              this._queue.shift();
              if (ack) {
                ack(null, ...responseArgs);
              }
            }
            packet.pending = false;
            return this._drainQueue();
          });
          this._queue.push(packet);
          this._drainQueue();
        }
        /**
         * Send the first packet of the queue, and wait for an acknowledgement from the server.
         * @param force - whether to resend a packet that has not been acknowledged yet
         *
         * @private
         */
        _drainQueue(force = false) {
          debug("draining queue");
          if (!this.connected || this._queue.length === 0) {
            return;
          }
          const packet = this._queue[0];
          if (packet.pending && !force) {
            debug("packet [%d] has already been sent and is waiting for an ack", packet.id);
            return;
          }
          packet.pending = true;
          packet.tryCount++;
          debug("sending packet [%d] (try n\xB0%d)", packet.id, packet.tryCount);
          this.flags = packet.flags;
          this.emit.apply(this, packet.args);
        }
        /**
         * Sends a packet.
         *
         * @param packet
         * @private
         */
        packet(packet) {
          packet.nsp = this.nsp;
          this.io._packet(packet);
        }
        /**
         * Called upon engine `open`.
         *
         * @private
         */
        onopen() {
          debug("transport is open - connecting");
          if (typeof this.auth == "function") {
            this.auth((data) => {
              this._sendConnectPacket(data);
            });
          } else {
            this._sendConnectPacket(this.auth);
          }
        }
        /**
         * Sends a CONNECT packet to initiate the Socket.IO session.
         *
         * @param data
         * @private
         */
        _sendConnectPacket(data) {
          this.packet({
            type: socket_io_parser_1.PacketType.CONNECT,
            data: this._pid ? Object.assign({ pid: this._pid, offset: this._lastOffset }, data) : data
          });
        }
        /**
         * Called upon engine or manager `error`.
         *
         * @param err
         * @private
         */
        onerror(err) {
          if (!this.connected) {
            this.emitReserved("connect_error", err);
          }
        }
        /**
         * Called upon engine `close`.
         *
         * @param reason
         * @param description
         * @private
         */
        onclose(reason, description) {
          debug("close (%s)", reason);
          this.connected = false;
          delete this.id;
          this.emitReserved("disconnect", reason, description);
          this._clearAcks();
        }
        /**
         * Clears the acknowledgement handlers upon disconnection, since the client will never receive an acknowledgement from
         * the server.
         *
         * @private
         */
        _clearAcks() {
          Object.keys(this.acks).forEach((id) => {
            const isBuffered = this.sendBuffer.some((packet) => String(packet.id) === id);
            if (!isBuffered) {
              const ack = this.acks[id];
              delete this.acks[id];
              if (ack.withError) {
                ack.call(this, new Error("socket has been disconnected"));
              }
            }
          });
        }
        /**
         * Called with socket packet.
         *
         * @param packet
         * @private
         */
        onpacket(packet) {
          const sameNamespace = packet.nsp === this.nsp;
          if (!sameNamespace)
            return;
          switch (packet.type) {
            case socket_io_parser_1.PacketType.CONNECT:
              if (packet.data && packet.data.sid) {
                this.onconnect(packet.data.sid, packet.data.pid);
              } else {
                this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
              }
              break;
            case socket_io_parser_1.PacketType.EVENT:
            case socket_io_parser_1.PacketType.BINARY_EVENT:
              this.onevent(packet);
              break;
            case socket_io_parser_1.PacketType.ACK:
            case socket_io_parser_1.PacketType.BINARY_ACK:
              this.onack(packet);
              break;
            case socket_io_parser_1.PacketType.DISCONNECT:
              this.ondisconnect();
              break;
            case socket_io_parser_1.PacketType.CONNECT_ERROR:
              this.destroy();
              const err = new Error(packet.data.message);
              err.data = packet.data.data;
              this.emitReserved("connect_error", err);
              break;
          }
        }
        /**
         * Called upon a server event.
         *
         * @param packet
         * @private
         */
        onevent(packet) {
          const args = packet.data || [];
          debug("emitting event %j", args);
          if (null != packet.id) {
            debug("attaching ack callback to event");
            args.push(this.ack(packet.id));
          }
          if (this.connected) {
            this.emitEvent(args);
          } else {
            this.receiveBuffer.push(Object.freeze(args));
          }
        }
        emitEvent(args) {
          if (this._anyListeners && this._anyListeners.length) {
            const listeners = this._anyListeners.slice();
            for (const listener of listeners) {
              listener.apply(this, args);
            }
          }
          super.emit.apply(this, args);
          if (this._pid && args.length && typeof args[args.length - 1] === "string") {
            this._lastOffset = args[args.length - 1];
          }
        }
        /**
         * Produces an ack callback to emit with an event.
         *
         * @private
         */
        ack(id) {
          const self2 = this;
          let sent = false;
          return function(...args) {
            if (sent)
              return;
            sent = true;
            debug("sending ack %j", args);
            self2.packet({
              type: socket_io_parser_1.PacketType.ACK,
              id,
              data: args
            });
          };
        }
        /**
         * Called upon a server acknowledgement.
         *
         * @param packet
         * @private
         */
        onack(packet) {
          const ack = this.acks[packet.id];
          if (typeof ack !== "function") {
            debug("bad ack %s", packet.id);
            return;
          }
          delete this.acks[packet.id];
          debug("calling ack %s with %j", packet.id, packet.data);
          if (ack.withError) {
            packet.data.unshift(null);
          }
          ack.apply(this, packet.data);
        }
        /**
         * Called upon server connect.
         *
         * @private
         */
        onconnect(id, pid) {
          debug("socket connected with id %s", id);
          this.id = id;
          this.recovered = pid && this._pid === pid;
          this._pid = pid;
          this.connected = true;
          this.emitBuffered();
          this._drainQueue(true);
          this.emitReserved("connect");
        }
        /**
         * Emit buffered events (received and emitted).
         *
         * @private
         */
        emitBuffered() {
          this.receiveBuffer.forEach((args) => this.emitEvent(args));
          this.receiveBuffer = [];
          this.sendBuffer.forEach((packet) => {
            this.notifyOutgoingListeners(packet);
            this.packet(packet);
          });
          this.sendBuffer = [];
        }
        /**
         * Called upon server disconnect.
         *
         * @private
         */
        ondisconnect() {
          debug("server disconnect (%s)", this.nsp);
          this.destroy();
          this.onclose("io server disconnect");
        }
        /**
         * Called upon forced client/server side disconnections,
         * this method ensures the manager stops tracking us and
         * that reconnections don't get triggered for this.
         *
         * @private
         */
        destroy() {
          if (this.subs) {
            this.subs.forEach((subDestroy) => subDestroy());
            this.subs = void 0;
          }
          this.io["_destroy"](this);
        }
        /**
         * Disconnects the socket manually. In that case, the socket will not try to reconnect.
         *
         * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
         *
         * @example
         * const socket = io();
         *
         * socket.on("disconnect", (reason) => {
         *   // console.log(reason); prints "io client disconnect"
         * });
         *
         * socket.disconnect();
         *
         * @return self
         */
        disconnect() {
          if (this.connected) {
            debug("performing disconnect (%s)", this.nsp);
            this.packet({ type: socket_io_parser_1.PacketType.DISCONNECT });
          }
          this.destroy();
          if (this.connected) {
            this.onclose("io client disconnect");
          }
          return this;
        }
        /**
         * Alias for {@link disconnect()}.
         *
         * @return self
         */
        close() {
          return this.disconnect();
        }
        /**
         * Sets the compress flag.
         *
         * @example
         * socket.compress(false).emit("hello");
         *
         * @param compress - if `true`, compresses the sending data
         * @return self
         */
        compress(compress) {
          this.flags.compress = compress;
          return this;
        }
        /**
         * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
         * ready to send messages.
         *
         * @example
         * socket.volatile.emit("hello"); // the server may or may not receive it
         *
         * @returns self
         */
        get volatile() {
          this.flags.volatile = true;
          return this;
        }
        /**
         * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
         * given number of milliseconds have elapsed without an acknowledgement from the server:
         *
         * @example
         * socket.timeout(5000).emit("my-event", (err) => {
         *   if (err) {
         *     // the server did not acknowledge the event in the given delay
         *   }
         * });
         *
         * @returns self
         */
        timeout(timeout) {
          this.flags.timeout = timeout;
          return this;
        }
        /**
         * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
         * callback.
         *
         * @example
         * socket.onAny((event, ...args) => {
         *   console.log(`got ${event}`);
         * });
         *
         * @param listener
         */
        onAny(listener) {
          this._anyListeners = this._anyListeners || [];
          this._anyListeners.push(listener);
          return this;
        }
        /**
         * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
         * callback. The listener is added to the beginning of the listeners array.
         *
         * @example
         * socket.prependAny((event, ...args) => {
         *   console.log(`got event ${event}`);
         * });
         *
         * @param listener
         */
        prependAny(listener) {
          this._anyListeners = this._anyListeners || [];
          this._anyListeners.unshift(listener);
          return this;
        }
        /**
         * Removes the listener that will be fired when any event is emitted.
         *
         * @example
         * const catchAllListener = (event, ...args) => {
         *   console.log(`got event ${event}`);
         * }
         *
         * socket.onAny(catchAllListener);
         *
         * // remove a specific listener
         * socket.offAny(catchAllListener);
         *
         * // or remove all listeners
         * socket.offAny();
         *
         * @param listener
         */
        offAny(listener) {
          if (!this._anyListeners) {
            return this;
          }
          if (listener) {
            const listeners = this._anyListeners;
            for (let i = 0; i < listeners.length; i++) {
              if (listener === listeners[i]) {
                listeners.splice(i, 1);
                return this;
              }
            }
          } else {
            this._anyListeners = [];
          }
          return this;
        }
        /**
         * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
         * e.g. to remove listeners.
         */
        listenersAny() {
          return this._anyListeners || [];
        }
        /**
         * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
         * callback.
         *
         * Note: acknowledgements sent to the server are not included.
         *
         * @example
         * socket.onAnyOutgoing((event, ...args) => {
         *   console.log(`sent event ${event}`);
         * });
         *
         * @param listener
         */
        onAnyOutgoing(listener) {
          this._anyOutgoingListeners = this._anyOutgoingListeners || [];
          this._anyOutgoingListeners.push(listener);
          return this;
        }
        /**
         * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
         * callback. The listener is added to the beginning of the listeners array.
         *
         * Note: acknowledgements sent to the server are not included.
         *
         * @example
         * socket.prependAnyOutgoing((event, ...args) => {
         *   console.log(`sent event ${event}`);
         * });
         *
         * @param listener
         */
        prependAnyOutgoing(listener) {
          this._anyOutgoingListeners = this._anyOutgoingListeners || [];
          this._anyOutgoingListeners.unshift(listener);
          return this;
        }
        /**
         * Removes the listener that will be fired when any event is emitted.
         *
         * @example
         * const catchAllListener = (event, ...args) => {
         *   console.log(`sent event ${event}`);
         * }
         *
         * socket.onAnyOutgoing(catchAllListener);
         *
         * // remove a specific listener
         * socket.offAnyOutgoing(catchAllListener);
         *
         * // or remove all listeners
         * socket.offAnyOutgoing();
         *
         * @param [listener] - the catch-all listener (optional)
         */
        offAnyOutgoing(listener) {
          if (!this._anyOutgoingListeners) {
            return this;
          }
          if (listener) {
            const listeners = this._anyOutgoingListeners;
            for (let i = 0; i < listeners.length; i++) {
              if (listener === listeners[i]) {
                listeners.splice(i, 1);
                return this;
              }
            }
          } else {
            this._anyOutgoingListeners = [];
          }
          return this;
        }
        /**
         * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
         * e.g. to remove listeners.
         */
        listenersAnyOutgoing() {
          return this._anyOutgoingListeners || [];
        }
        /**
         * Notify the listeners for each packet sent
         *
         * @param packet
         *
         * @private
         */
        notifyOutgoingListeners(packet) {
          if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
            const listeners = this._anyOutgoingListeners.slice();
            for (const listener of listeners) {
              listener.apply(this, packet.data);
            }
          }
        }
      };
      exports.Socket = Socket;
    }
  });

  // node_modules/socket.io-client/build/cjs/contrib/backo2.js
  var require_backo2 = __commonJS({
    "node_modules/socket.io-client/build/cjs/contrib/backo2.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Backoff = Backoff;
      function Backoff(opts) {
        opts = opts || {};
        this.ms = opts.min || 100;
        this.max = opts.max || 1e4;
        this.factor = opts.factor || 2;
        this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
        this.attempts = 0;
      }
      Backoff.prototype.duration = function() {
        var ms = this.ms * Math.pow(this.factor, this.attempts++);
        if (this.jitter) {
          var rand = Math.random();
          var deviation = Math.floor(rand * this.jitter * ms);
          ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
        }
        return Math.min(ms, this.max) | 0;
      };
      Backoff.prototype.reset = function() {
        this.attempts = 0;
      };
      Backoff.prototype.setMin = function(min) {
        this.ms = min;
      };
      Backoff.prototype.setMax = function(max) {
        this.max = max;
      };
      Backoff.prototype.setJitter = function(jitter) {
        this.jitter = jitter;
      };
    }
  });

  // node_modules/socket.io-client/build/cjs/manager.js
  var require_manager = __commonJS({
    "node_modules/socket.io-client/build/cjs/manager.js"(exports) {
      "use strict";
      var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      }) : (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      }));
      var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }) : function(o, v) {
        o["default"] = v;
      });
      var __importStar = exports && exports.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Manager = void 0;
      var engine_io_client_1 = require_cjs3();
      var socket_js_1 = require_socket2();
      var parser = __importStar(require_cjs4());
      var on_js_1 = require_on();
      var backo2_js_1 = require_backo2();
      var component_emitter_1 = require_cjs2();
      var debug_1 = __importDefault(require_browser2());
      var debug = (0, debug_1.default)("socket.io-client:manager");
      var Manager = class extends component_emitter_1.Emitter {
        constructor(uri, opts) {
          var _a;
          super();
          this.nsps = {};
          this.subs = [];
          if (uri && "object" === typeof uri) {
            opts = uri;
            uri = void 0;
          }
          opts = opts || {};
          opts.path = opts.path || "/socket.io";
          this.opts = opts;
          (0, engine_io_client_1.installTimerFunctions)(this, opts);
          this.reconnection(opts.reconnection !== false);
          this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
          this.reconnectionDelay(opts.reconnectionDelay || 1e3);
          this.reconnectionDelayMax(opts.reconnectionDelayMax || 5e3);
          this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
          this.backoff = new backo2_js_1.Backoff({
            min: this.reconnectionDelay(),
            max: this.reconnectionDelayMax(),
            jitter: this.randomizationFactor()
          });
          this.timeout(null == opts.timeout ? 2e4 : opts.timeout);
          this._readyState = "closed";
          this.uri = uri;
          const _parser = opts.parser || parser;
          this.encoder = new _parser.Encoder();
          this.decoder = new _parser.Decoder();
          this._autoConnect = opts.autoConnect !== false;
          if (this._autoConnect)
            this.open();
        }
        reconnection(v) {
          if (!arguments.length)
            return this._reconnection;
          this._reconnection = !!v;
          if (!v) {
            this.skipReconnect = true;
          }
          return this;
        }
        reconnectionAttempts(v) {
          if (v === void 0)
            return this._reconnectionAttempts;
          this._reconnectionAttempts = v;
          return this;
        }
        reconnectionDelay(v) {
          var _a;
          if (v === void 0)
            return this._reconnectionDelay;
          this._reconnectionDelay = v;
          (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
          return this;
        }
        randomizationFactor(v) {
          var _a;
          if (v === void 0)
            return this._randomizationFactor;
          this._randomizationFactor = v;
          (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
          return this;
        }
        reconnectionDelayMax(v) {
          var _a;
          if (v === void 0)
            return this._reconnectionDelayMax;
          this._reconnectionDelayMax = v;
          (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
          return this;
        }
        timeout(v) {
          if (!arguments.length)
            return this._timeout;
          this._timeout = v;
          return this;
        }
        /**
         * Starts trying to reconnect if reconnection is enabled and we have not
         * started reconnecting yet
         *
         * @private
         */
        maybeReconnectOnOpen() {
          if (!this._reconnecting && this._reconnection && this.backoff.attempts === 0) {
            this.reconnect();
          }
        }
        /**
         * Sets the current transport `socket`.
         *
         * @param {Function} fn - optional, callback
         * @return self
         * @public
         */
        open(fn) {
          debug("readyState %s", this._readyState);
          if (~this._readyState.indexOf("open"))
            return this;
          debug("opening %s", this.uri);
          this.engine = new engine_io_client_1.Socket(this.uri, this.opts);
          const socket = this.engine;
          const self2 = this;
          this._readyState = "opening";
          this.skipReconnect = false;
          const openSubDestroy = (0, on_js_1.on)(socket, "open", function() {
            self2.onopen();
            fn && fn();
          });
          const onError = (err) => {
            debug("error");
            this.cleanup();
            this._readyState = "closed";
            this.emitReserved("error", err);
            if (fn) {
              fn(err);
            } else {
              this.maybeReconnectOnOpen();
            }
          };
          const errorSub = (0, on_js_1.on)(socket, "error", onError);
          if (false !== this._timeout) {
            const timeout = this._timeout;
            debug("connect attempt will timeout after %d", timeout);
            const timer = this.setTimeoutFn(() => {
              debug("connect attempt timed out after %d", timeout);
              openSubDestroy();
              onError(new Error("timeout"));
              socket.close();
            }, timeout);
            if (this.opts.autoUnref) {
              timer.unref();
            }
            this.subs.push(() => {
              this.clearTimeoutFn(timer);
            });
          }
          this.subs.push(openSubDestroy);
          this.subs.push(errorSub);
          return this;
        }
        /**
         * Alias for open()
         *
         * @return self
         * @public
         */
        connect(fn) {
          return this.open(fn);
        }
        /**
         * Called upon transport open.
         *
         * @private
         */
        onopen() {
          debug("open");
          this.cleanup();
          this._readyState = "open";
          this.emitReserved("open");
          const socket = this.engine;
          this.subs.push(
            (0, on_js_1.on)(socket, "ping", this.onping.bind(this)),
            (0, on_js_1.on)(socket, "data", this.ondata.bind(this)),
            (0, on_js_1.on)(socket, "error", this.onerror.bind(this)),
            (0, on_js_1.on)(socket, "close", this.onclose.bind(this)),
            // @ts-ignore
            (0, on_js_1.on)(this.decoder, "decoded", this.ondecoded.bind(this))
          );
        }
        /**
         * Called upon a ping.
         *
         * @private
         */
        onping() {
          this.emitReserved("ping");
        }
        /**
         * Called with data.
         *
         * @private
         */
        ondata(data) {
          try {
            this.decoder.add(data);
          } catch (e) {
            this.onclose("parse error", e);
          }
        }
        /**
         * Called when parser fully decodes a packet.
         *
         * @private
         */
        ondecoded(packet) {
          (0, engine_io_client_1.nextTick)(() => {
            this.emitReserved("packet", packet);
          }, this.setTimeoutFn);
        }
        /**
         * Called upon socket error.
         *
         * @private
         */
        onerror(err) {
          debug("error", err);
          this.emitReserved("error", err);
        }
        /**
         * Creates a new socket for the given `nsp`.
         *
         * @return {Socket}
         * @public
         */
        socket(nsp, opts) {
          let socket = this.nsps[nsp];
          if (!socket) {
            socket = new socket_js_1.Socket(this, nsp, opts);
            this.nsps[nsp] = socket;
          } else if (this._autoConnect && !socket.active) {
            socket.connect();
          }
          return socket;
        }
        /**
         * Called upon a socket close.
         *
         * @param socket
         * @private
         */
        _destroy(socket) {
          const nsps = Object.keys(this.nsps);
          for (const nsp of nsps) {
            const socket2 = this.nsps[nsp];
            if (socket2.active) {
              debug("socket %s is still active, skipping close", nsp);
              return;
            }
          }
          this._close();
        }
        /**
         * Writes a packet.
         *
         * @param packet
         * @private
         */
        _packet(packet) {
          debug("writing packet %j", packet);
          const encodedPackets = this.encoder.encode(packet);
          for (let i = 0; i < encodedPackets.length; i++) {
            this.engine.write(encodedPackets[i], packet.options);
          }
        }
        /**
         * Clean up transport subscriptions and packet buffer.
         *
         * @private
         */
        cleanup() {
          debug("cleanup");
          this.subs.forEach((subDestroy) => subDestroy());
          this.subs.length = 0;
          this.decoder.destroy();
        }
        /**
         * Close the current socket.
         *
         * @private
         */
        _close() {
          debug("disconnect");
          this.skipReconnect = true;
          this._reconnecting = false;
          this.onclose("forced close");
        }
        /**
         * Alias for close()
         *
         * @private
         */
        disconnect() {
          return this._close();
        }
        /**
         * Called when:
         *
         * - the low-level engine is closed
         * - the parser encountered a badly formatted packet
         * - all sockets are disconnected
         *
         * @private
         */
        onclose(reason, description) {
          var _a;
          debug("closed due to %s", reason);
          this.cleanup();
          (_a = this.engine) === null || _a === void 0 ? void 0 : _a.close();
          this.backoff.reset();
          this._readyState = "closed";
          this.emitReserved("close", reason, description);
          if (this._reconnection && !this.skipReconnect) {
            this.reconnect();
          }
        }
        /**
         * Attempt a reconnection.
         *
         * @private
         */
        reconnect() {
          if (this._reconnecting || this.skipReconnect)
            return this;
          const self2 = this;
          if (this.backoff.attempts >= this._reconnectionAttempts) {
            debug("reconnect failed");
            this.backoff.reset();
            this.emitReserved("reconnect_failed");
            this._reconnecting = false;
          } else {
            const delay = this.backoff.duration();
            debug("will wait %dms before reconnect attempt", delay);
            this._reconnecting = true;
            const timer = this.setTimeoutFn(() => {
              if (self2.skipReconnect)
                return;
              debug("attempting reconnect");
              this.emitReserved("reconnect_attempt", self2.backoff.attempts);
              if (self2.skipReconnect)
                return;
              self2.open((err) => {
                if (err) {
                  debug("reconnect attempt error");
                  self2._reconnecting = false;
                  self2.reconnect();
                  this.emitReserved("reconnect_error", err);
                } else {
                  debug("reconnect success");
                  self2.onreconnect();
                }
              });
            }, delay);
            if (this.opts.autoUnref) {
              timer.unref();
            }
            this.subs.push(() => {
              this.clearTimeoutFn(timer);
            });
          }
        }
        /**
         * Called upon successful reconnect.
         *
         * @private
         */
        onreconnect() {
          const attempt = this.backoff.attempts;
          this._reconnecting = false;
          this.backoff.reset();
          this.emitReserved("reconnect", attempt);
        }
      };
      exports.Manager = Manager;
    }
  });

  // node_modules/socket.io-client/build/cjs/index.js
  var require_cjs5 = __commonJS({
    "node_modules/socket.io-client/build/cjs/index.js"(exports, module) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.WebTransport = exports.WebSocket = exports.NodeWebSocket = exports.XHR = exports.NodeXHR = exports.Fetch = exports.Socket = exports.Manager = exports.protocol = void 0;
      exports.io = lookup;
      exports.connect = lookup;
      exports.default = lookup;
      var url_js_1 = require_url();
      var manager_js_1 = require_manager();
      Object.defineProperty(exports, "Manager", { enumerable: true, get: function() {
        return manager_js_1.Manager;
      } });
      var socket_js_1 = require_socket2();
      Object.defineProperty(exports, "Socket", { enumerable: true, get: function() {
        return socket_js_1.Socket;
      } });
      var debug_1 = __importDefault(require_browser2());
      var debug = (0, debug_1.default)("socket.io-client");
      var cache = {};
      function lookup(uri, opts) {
        if (typeof uri === "object") {
          opts = uri;
          uri = void 0;
        }
        opts = opts || {};
        const parsed = (0, url_js_1.url)(uri, opts.path || "/socket.io");
        const source = parsed.source;
        const id = parsed.id;
        const path = parsed.path;
        const sameNamespace = cache[id] && path in cache[id]["nsps"];
        const newConnection = opts.forceNew || opts["force new connection"] || false === opts.multiplex || sameNamespace;
        let io;
        if (newConnection) {
          debug("ignoring socket cache for %s", source);
          io = new manager_js_1.Manager(source, opts);
        } else {
          if (!cache[id]) {
            debug("new io instance for %s", source);
            cache[id] = new manager_js_1.Manager(source, opts);
          }
          io = cache[id];
        }
        if (parsed.query && !opts.query) {
          opts.query = parsed.queryKey;
        }
        return io.socket(parsed.path, opts);
      }
      Object.assign(lookup, {
        Manager: manager_js_1.Manager,
        Socket: socket_js_1.Socket,
        io: lookup,
        connect: lookup
      });
      var socket_io_parser_1 = require_cjs4();
      Object.defineProperty(exports, "protocol", { enumerable: true, get: function() {
        return socket_io_parser_1.protocol;
      } });
      var engine_io_client_1 = require_cjs3();
      Object.defineProperty(exports, "Fetch", { enumerable: true, get: function() {
        return engine_io_client_1.Fetch;
      } });
      Object.defineProperty(exports, "NodeXHR", { enumerable: true, get: function() {
        return engine_io_client_1.NodeXHR;
      } });
      Object.defineProperty(exports, "XHR", { enumerable: true, get: function() {
        return engine_io_client_1.XHR;
      } });
      Object.defineProperty(exports, "NodeWebSocket", { enumerable: true, get: function() {
        return engine_io_client_1.NodeWebSocket;
      } });
      Object.defineProperty(exports, "WebSocket", { enumerable: true, get: function() {
        return engine_io_client_1.WebSocket;
      } });
      Object.defineProperty(exports, "WebTransport", { enumerable: true, get: function() {
        return engine_io_client_1.WebTransport;
      } });
      module.exports = lookup;
    }
  });

  // lib/hive.js
  var require_hive = __commonJS({
    "lib/hive.js"(exports, module) {
      var Board = require_board();
      var AI = require_ai();
      var io = require_cjs5();
      Hive = function(opts) {
        var opts = opts || {};
        this.color = void 0;
        this.ready = false;
        this.gameId = void 0;
        this.connected;
        this.endpoint = opts.endpoint;
        this.room = opts.room;
        this.username = opts.username;
        this.usernameOpponent = void 0;
        this.board = new Board();
        this.status = "Waiting for players...";
        this.aiWorker = void 0;
        this.quietMode = false;
        this.listeners = {
          ready: [],
          resignation: []
        };
      };
      Hive.prototype.connect = function(cb) {
        if (this.room) {
          this.playOnServer(cb);
        } else {
          this.color = Board.randomColor();
          this.playAI();
        }
      };
      Hive.prototype.playAI = function() {
        this.usernameOpponent = "Computer";
        var board = this.board;
        var color = this.color;
        var _this = this;
        if (typeof window !== "undefined" && window.Worker) {
          var aiWorker = this.aiWorker = new Worker("ai.js");
          aiWorker.onmessage = function(e) {
            if (!_this.isMyTurn()) {
              board.queue.push(e.data.notation);
              board.processQueue();
            }
          };
          this.board.on("move", function(e) {
            _this.status = _this.turnStatus();
            if (!_this.isMyTurn() && !_this.quietMode) {
              aiWorker.postMessage(e.notation);
            }
          });
          this.board.on("gameover", function() {
            aiWorker.terminate();
          });
          if (color === Board.PLAYER_BLACK) {
            aiWorker.postMessage(null);
          }
        }
        this.status = this.turnStatus();
        this.ready = true;
        this.broadcast("ready", this.board);
      };
      Hive.prototype.playOnServer = function() {
        this.status = "Searching for opponent...";
        var socket = this.socket = io(this.endpoint, {
          forceNew: true,
          multiplex: false,
          query: {
            room: this.room,
            username: this.username
          }
        });
        var _this = this;
        socket.on("connect", function() {
          _this.connected = true;
          socket.on("move", function(res) {
            _this.board.queue.push(res.notation);
            _this.board.processQueue(true);
          });
          socket.on("resignation", _this.resignationHandler.bind(_this));
          _this.board.on("move", function(move) {
            _this.status = _this.turnStatus();
            if (!_this.isMyTurn()) {
              socket.emit("move", { notation: move.notation });
            }
          });
          socket.on("ready", function(res) {
            console.log("hive got ready from server to start playing", res);
            _this.gameId = res.gameId;
            _this.color = res.white === _this.username ? Board.PLAYER_WHITE : Board.PLAYER_BLACK;
            _this.usernameOpponent = res.white === _this.username ? res.black : res.white;
            _this.ready = true;
            _this.status = _this.turnStatus();
            _this.broadcast("ready", _this.board);
          });
        });
      };
      Hive.prototype.resignationHandler = function(res) {
        if (this.board.isGameover === false) {
          this.status = res.winner + " wins by resignation";
          this.board.isGameover = true;
          this.disconnect();
          this.broadcast("resignation", res);
        }
      };
      Hive.prototype.isMyTurn = function() {
        return this.board.whoseTurn() === this.color;
      };
      Hive.prototype.turnStatus = function() {
        return this.isMyTurn() ? "Your Turn" : this.usernameOpponent + "'s turn";
      };
      Hive.prototype.on = function(eventName, cb) {
        var listeners = this.listeners[eventName];
        if (listeners) {
          this.listeners[eventName].push(cb);
        } else {
          this.board.on(eventName, cb);
        }
      };
      Hive.prototype.resign = function() {
        if (this.socket) {
          this.socket.emit("resignation", {});
        } else if (this.aiWorker) {
          this.aiWorker.terminate();
          this.resignationHandler({ winner: this.usernameOpponent });
        }
      };
      Hive.prototype.disconnect = function() {
        if (this.socket) {
          this.socket.disconnect();
        }
      };
      Hive.prototype.broadcast = function(eventName, message) {
        var _this = this;
        var listeners = this.listeners[eventName];
        if (listeners) {
          this.listeners[eventName].forEach(function(listener) {
            listener.apply(_this, [message]);
          });
        } else {
          this.board.broadcast(eventName, message);
        }
      };
      module.exports = Hive;
    }
  });

  // (disabled):canvas
  var require_canvas = __commonJS({
    "(disabled):canvas"() {
    }
  });

  // (disabled):node_modules/jsdom/lib/api.js
  var require_api = __commonJS({
    "(disabled):node_modules/jsdom/lib/api.js"() {
    }
  });

  // node_modules/kinetic/kinetic.js
  var require_kinetic = __commonJS({
    "node_modules/kinetic/kinetic.js"(exports, module) {
      var Kinetic = {};
      (function(root) {
        var PI_OVER_180 = Math.PI / 180;
        Kinetic = {
          // public
          version: "5.2.0",
          // private
          stages: [],
          idCounter: 0,
          ids: {},
          names: {},
          shapes: {},
          listenClickTap: false,
          inDblClickWindow: false,
          // configurations
          enableTrace: false,
          traceArrMax: 100,
          dblClickWindow: 400,
          /**
           * Global pixel ratio configuration. KineticJS automatically detect pixel ratio of current device.
           * But you may override such property, if you want to use your value.
           * @property pixelRatio
           * @default undefined
           * @memberof Kinetic
           * @example
           * Kinetic.pixelRatio = 1;
           */
          pixelRatio: void 0,
          /**
           * Drag distance property. If you start to drag a node you may want to wait until pointer is moved to some distance from start point,
           * only then start dragging.
           * @property dragDistance
           * @default 0
           * @memberof Kinetic
           * @example
           * Kinetic.dragDistance = 10;
           */
          dragDistance: 0,
          /**
           * Use degree values for angle properties. You may set this property to false if you want to use radiant values.
           * @property angleDeg
           * @default true
           * @memberof Kinetic
           * @example
           * node.rotation(45); // 45 degrees
           * Kinetic.angleDeg = false;
           * node.rotation(Math.PI / 2); // PI/2 radian
           */
          angleDeg: true,
          /**
          * Show different warnings about errors or wrong API usage
          * @property showWarnings
          * @default true
          * @memberof Kinetic
          * @example
          * Kinetic.showWarnings = false;
          */
          showWarnings: true,
          /**
           * @namespace Filters
           * @memberof Kinetic
           */
          Filters: {},
          /**
              * Node constructor. Nodes are entities that can be transformed, layered,
              * and have bound events. The stage, layers, groups, and shapes all extend Node.
              * @constructor
              * @memberof Kinetic
              * @abstract
              * @param {Object} config
              * @param {Number} [config.x]
          * @param {Number} [config.y]
          * @param {Number} [config.width]
          * @param {Number} [config.height]
          * @param {Boolean} [config.visible]
          * @param {Boolean} [config.listening] whether or not the node is listening for events
          * @param {String} [config.id] unique id
          * @param {String} [config.name] non-unique name
          * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
          * @param {Object} [config.scale] set scale
          * @param {Number} [config.scaleX] set scale x
          * @param {Number} [config.scaleY] set scale y
          * @param {Number} [config.rotation] rotation in degrees
          * @param {Object} [config.offset] offset from center point and rotation point
          * @param {Number} [config.offsetX] set offset x
          * @param {Number} [config.offsetY] set offset y
          * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
          *  the entire stage by dragging any portion of the stage
          * @param {Number} [config.dragDistance]
          * @param {Function} [config.dragBoundFunc]
              */
          Node: function(config) {
            this._init(config);
          },
          /**
              * Shape constructor.  Shapes are primitive objects such as rectangles,
              *  circles, text, lines, etc.
              * @constructor
              * @memberof Kinetic
              * @augments Kinetic.Node
              * @param {Object} config
              * @param {String} [config.fill] fill color
          * @param {Integer} [config.fillRed] set fill red component
          * @param {Integer} [config.fillGreen] set fill green component
          * @param {Integer} [config.fillBlue] set fill blue component
          * @param {Integer} [config.fillAlpha] set fill alpha component
          * @param {Image} [config.fillPatternImage] fill pattern image
          * @param {Number} [config.fillPatternX]
          * @param {Number} [config.fillPatternY]
          * @param {Object} [config.fillPatternOffset] object with x and y component
          * @param {Number} [config.fillPatternOffsetX] 
          * @param {Number} [config.fillPatternOffsetY] 
          * @param {Object} [config.fillPatternScale] object with x and y component
          * @param {Number} [config.fillPatternScaleX]
          * @param {Number} [config.fillPatternScaleY]
          * @param {Number} [config.fillPatternRotation]
          * @param {String} [config.fillPatternRepeat] can be "repeat", "repeat-x", "repeat-y", or "no-repeat".  The default is "no-repeat"
          * @param {Object} [config.fillLinearGradientStartPoint] object with x and y component
          * @param {Number} [config.fillLinearGradientStartPointX]
          * @param {Number} [config.fillLinearGradientStartPointY]
          * @param {Object} [config.fillLinearGradientEndPoint] object with x and y component
          * @param {Number} [config.fillLinearGradientEndPointX]
          * @param {Number} [config.fillLinearGradientEndPointY]
          * @param {Array} [config.fillLinearGradientColorStops] array of color stops
          * @param {Object} [config.fillRadialGradientStartPoint] object with x and y component
          * @param {Number} [config.fillRadialGradientStartPointX]
          * @param {Number} [config.fillRadialGradientStartPointY]
          * @param {Object} [config.fillRadialGradientEndPoint] object with x and y component
          * @param {Number} [config.fillRadialGradientEndPointX] 
          * @param {Number} [config.fillRadialGradientEndPointY] 
          * @param {Number} [config.fillRadialGradientStartRadius]
          * @param {Number} [config.fillRadialGradientEndRadius]
          * @param {Array} [config.fillRadialGradientColorStops] array of color stops
          * @param {Boolean} [config.fillEnabled] flag which enables or disables the fill.  The default value is true
          * @param {String} [config.fillPriority] can be color, linear-gradient, radial-graident, or pattern.  The default value is color.  The fillPriority property makes it really easy to toggle between different fill types.  For example, if you want to toggle between a fill color style and a fill pattern style, simply set the fill property and the fillPattern properties, and then use setFillPriority('color') to render the shape with a color fill, or use setFillPriority('pattern') to render the shape with the pattern fill configuration
          * @param {String} [config.stroke] stroke color
          * @param {Integer} [config.strokeRed] set stroke red component
          * @param {Integer} [config.strokeGreen] set stroke green component
          * @param {Integer} [config.strokeBlue] set stroke blue component
          * @param {Integer} [config.strokeAlpha] set stroke alpha component
          * @param {Number} [config.strokeWidth] stroke width
          * @param {Boolean} [config.strokeScaleEnabled] flag which enables or disables stroke scale.  The default is true
          * @param {Boolean} [config.strokeEnabled] flag which enables or disables the stroke.  The default value is true
          * @param {String} [config.lineJoin] can be miter, round, or bevel.  The default
          *  is miter
          * @param {String} [config.lineCap] can be butt, round, or sqare.  The default
          *  is butt
          * @param {String} [config.shadowColor]
          * @param {Integer} [config.shadowRed] set shadow color red component
          * @param {Integer} [config.shadowGreen] set shadow color green component
          * @param {Integer} [config.shadowBlue] set shadow color blue component
          * @param {Integer} [config.shadowAlpha] set shadow color alpha component
          * @param {Number} [config.shadowBlur]
          * @param {Object} [config.shadowOffset] object with x and y component
          * @param {Number} [config.shadowOffsetX]
          * @param {Number} [config.shadowOffsetY]
          * @param {Number} [config.shadowOpacity] shadow opacity.  Can be any real number
          *  between 0 and 1
          * @param {Boolean} [config.shadowEnabled] flag which enables or disables the shadow.  The default value is true
          * @param {Array} [config.dash]
          * @param {Boolean} [config.dashEnabled] flag which enables or disables the dashArray.  The default value is true
              * @param {Number} [config.x]
          * @param {Number} [config.y]
          * @param {Number} [config.width]
          * @param {Number} [config.height]
          * @param {Boolean} [config.visible]
          * @param {Boolean} [config.listening] whether or not the node is listening for events
          * @param {String} [config.id] unique id
          * @param {String} [config.name] non-unique name
          * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
          * @param {Object} [config.scale] set scale
          * @param {Number} [config.scaleX] set scale x
          * @param {Number} [config.scaleY] set scale y
          * @param {Number} [config.rotation] rotation in degrees
          * @param {Object} [config.offset] offset from center point and rotation point
          * @param {Number} [config.offsetX] set offset x
          * @param {Number} [config.offsetY] set offset y
          * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
          *  the entire stage by dragging any portion of the stage
          * @param {Number} [config.dragDistance]
          * @param {Function} [config.dragBoundFunc]
              * @example
              * var customShape = new Kinetic.Shape({
              *   x: 5,
              *   y: 10,
              *   fill: 'red',
              *   // a Kinetic.Canvas renderer is passed into the drawFunc function
              *   drawFunc: function(context) {
              *     context.beginPath();
              *     context.moveTo(200, 50);
              *     context.lineTo(420, 80);
              *     context.quadraticCurveTo(300, 100, 260, 170);
              *     context.closePath();
              *     context.fillStrokeShape(this);
              *   }
              *});
              */
          Shape: function(config) {
            this.__init(config);
          },
          /**
                   * Container constructor.&nbsp; Containers are used to contain nodes or other containers
                   * @constructor
                   * @memberof Kinetic
                   * @augments Kinetic.Node
                   * @abstract
                   * @param {Object} config
                   * @param {Number} [config.x]
               * @param {Number} [config.y]
               * @param {Number} [config.width]
               * @param {Number} [config.height]
               * @param {Boolean} [config.visible]
               * @param {Boolean} [config.listening] whether or not the node is listening for events
               * @param {String} [config.id] unique id
               * @param {String} [config.name] non-unique name
               * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
               * @param {Object} [config.scale] set scale
               * @param {Number} [config.scaleX] set scale x
               * @param {Number} [config.scaleY] set scale y
               * @param {Number} [config.rotation] rotation in degrees
               * @param {Object} [config.offset] offset from center point and rotation point
               * @param {Number} [config.offsetX] set offset x
               * @param {Number} [config.offsetY] set offset y
               * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
               *  the entire stage by dragging any portion of the stage
               * @param {Number} [config.dragDistance]
               * @param {Function} [config.dragBoundFunc]
                   * * @param {Object} [config.clip] set clip
               * @param {Number} [config.clipX] set clip x
               * @param {Number} [config.clipY] set clip y
               * @param {Number} [config.clipWidth] set clip width
               * @param {Number} [config.clipHeight] set clip height
          
                   */
          Container: function(config) {
            this.__init(config);
          },
          /**
              * Stage constructor.  A stage is used to contain multiple layers
              * @constructor
              * @memberof Kinetic
              * @augments Kinetic.Container
              * @param {Object} config
              * @param {String|Element} config.container Container id or DOM element
              * @param {Number} [config.x]
          * @param {Number} [config.y]
          * @param {Number} [config.width]
          * @param {Number} [config.height]
          * @param {Boolean} [config.visible]
          * @param {Boolean} [config.listening] whether or not the node is listening for events
          * @param {String} [config.id] unique id
          * @param {String} [config.name] non-unique name
          * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
          * @param {Object} [config.scale] set scale
          * @param {Number} [config.scaleX] set scale x
          * @param {Number} [config.scaleY] set scale y
          * @param {Number} [config.rotation] rotation in degrees
          * @param {Object} [config.offset] offset from center point and rotation point
          * @param {Number} [config.offsetX] set offset x
          * @param {Number} [config.offsetY] set offset y
          * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
          *  the entire stage by dragging any portion of the stage
          * @param {Number} [config.dragDistance]
          * @param {Function} [config.dragBoundFunc]
              * @example
              * var stage = new Kinetic.Stage({
              *   width: 500,
              *   height: 800,
              *   container: 'containerId'
              * });
              */
          Stage: function(config) {
            this.___init(config);
          },
          /**
                   * BaseLayer constructor. 
                   * @constructor
                   * @memberof Kinetic
                   * @augments Kinetic.Container
                   * @param {Object} config
                   * @param {Boolean} [config.clearBeforeDraw] set this property to false if you don't want
                   * to clear the canvas before each layer draw.  The default value is true.
                   * @param {Number} [config.x]
               * @param {Number} [config.y]
               * @param {Number} [config.width]
               * @param {Number} [config.height]
               * @param {Boolean} [config.visible]
               * @param {Boolean} [config.listening] whether or not the node is listening for events
               * @param {String} [config.id] unique id
               * @param {String} [config.name] non-unique name
               * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
               * @param {Object} [config.scale] set scale
               * @param {Number} [config.scaleX] set scale x
               * @param {Number} [config.scaleY] set scale y
               * @param {Number} [config.rotation] rotation in degrees
               * @param {Object} [config.offset] offset from center point and rotation point
               * @param {Number} [config.offsetX] set offset x
               * @param {Number} [config.offsetY] set offset y
               * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
               *  the entire stage by dragging any portion of the stage
               * @param {Number} [config.dragDistance]
               * @param {Function} [config.dragBoundFunc]
                   * * @param {Object} [config.clip] set clip
               * @param {Number} [config.clipX] set clip x
               * @param {Number} [config.clipY] set clip y
               * @param {Number} [config.clipWidth] set clip width
               * @param {Number} [config.clipHeight] set clip height
          
                   * @example
                   * var layer = new Kinetic.Layer();
                   */
          BaseLayer: function(config) {
            this.___init(config);
          },
          /**
                   * Layer constructor.  Layers are tied to their own canvas element and are used
                   * to contain groups or shapes.
                   * @constructor
                   * @memberof Kinetic
                   * @augments Kinetic.BaseLayer
                   * @param {Object} config
                   * @param {Boolean} [config.clearBeforeDraw] set this property to false if you don't want
                   * to clear the canvas before each layer draw.  The default value is true.
                   * @param {Number} [config.x]
               * @param {Number} [config.y]
               * @param {Number} [config.width]
               * @param {Number} [config.height]
               * @param {Boolean} [config.visible]
               * @param {Boolean} [config.listening] whether or not the node is listening for events
               * @param {String} [config.id] unique id
               * @param {String} [config.name] non-unique name
               * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
               * @param {Object} [config.scale] set scale
               * @param {Number} [config.scaleX] set scale x
               * @param {Number} [config.scaleY] set scale y
               * @param {Number} [config.rotation] rotation in degrees
               * @param {Object} [config.offset] offset from center point and rotation point
               * @param {Number} [config.offsetX] set offset x
               * @param {Number} [config.offsetY] set offset y
               * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
               *  the entire stage by dragging any portion of the stage
               * @param {Number} [config.dragDistance]
               * @param {Function} [config.dragBoundFunc]
                   * * @param {Object} [config.clip] set clip
               * @param {Number} [config.clipX] set clip x
               * @param {Number} [config.clipY] set clip y
               * @param {Number} [config.clipWidth] set clip width
               * @param {Number} [config.clipHeight] set clip height
          
                   * @example
                   * var layer = new Kinetic.Layer();
                   */
          Layer: function(config) {
            this.____init(config);
          },
          /**
                   * FastLayer constructor. Layers are tied to their own canvas element and are used
                   * to contain shapes only.  If you don't need node nesting, mouse and touch interactions,
                   * or event pub/sub, you should use FastLayer instead of Layer to create your layers.
                   * It renders about 2x faster than normal layers.
                   * @constructor
                   * @memberof Kinetic
                   * @augments Kinetic.BaseLayer
                   * @param {Object} config
                   * @param {Boolean} [config.clearBeforeDraw] set this property to false if you don't want
                   * to clear the canvas before each layer draw.  The default value is true.
                   * @param {Boolean} [config.visible]
                   * @param {String} [config.id] unique id
                   * @param {String} [config.name] non-unique name
                   * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
                   * * @param {Object} [config.clip] set clip
               * @param {Number} [config.clipX] set clip x
               * @param {Number} [config.clipY] set clip y
               * @param {Number} [config.clipWidth] set clip width
               * @param {Number} [config.clipHeight] set clip height
          
                   * @example
                   * var layer = new Kinetic.FastLayer();
                   */
          FastLayer: function(config) {
            this.____init(config);
          },
          /**
                   * Group constructor.  Groups are used to contain shapes or other groups.
                   * @constructor
                   * @memberof Kinetic
                   * @augments Kinetic.Container
                   * @param {Object} config
                   * @param {Number} [config.x]
               * @param {Number} [config.y]
               * @param {Number} [config.width]
               * @param {Number} [config.height]
               * @param {Boolean} [config.visible]
               * @param {Boolean} [config.listening] whether or not the node is listening for events
               * @param {String} [config.id] unique id
               * @param {String} [config.name] non-unique name
               * @param {Number} [config.opacity] determines node opacity.  Can be any number between 0 and 1
               * @param {Object} [config.scale] set scale
               * @param {Number} [config.scaleX] set scale x
               * @param {Number} [config.scaleY] set scale y
               * @param {Number} [config.rotation] rotation in degrees
               * @param {Object} [config.offset] offset from center point and rotation point
               * @param {Number} [config.offsetX] set offset x
               * @param {Number} [config.offsetY] set offset y
               * @param {Boolean} [config.draggable] makes the node draggable.  When stages are draggable, you can drag and drop
               *  the entire stage by dragging any portion of the stage
               * @param {Number} [config.dragDistance]
               * @param {Function} [config.dragBoundFunc]
                   * * @param {Object} [config.clip] set clip
               * @param {Number} [config.clipX] set clip x
               * @param {Number} [config.clipY] set clip y
               * @param {Number} [config.clipWidth] set clip width
               * @param {Number} [config.clipHeight] set clip height
          
                   * @example
                   * var group = new Kinetic.Group();
                   */
          Group: function(config) {
            this.___init(config);
          },
          /**
           * returns whether or not drag and drop is currently active
           * @method
           * @memberof Kinetic
           */
          isDragging: function() {
            var dd = Kinetic.DD;
            if (dd) {
              return dd.isDragging;
            } else {
              return false;
            }
          },
          /**
          * returns whether or not a drag and drop operation is ready, but may
          *  not necessarily have started
          * @method
          * @memberof Kinetic
          */
          isDragReady: function() {
            var dd = Kinetic.DD;
            if (dd) {
              return !!dd.node;
            } else {
              return false;
            }
          },
          _addId: function(node, id) {
            if (id !== void 0) {
              this.ids[id] = node;
            }
          },
          _removeId: function(id) {
            if (id !== void 0) {
              delete this.ids[id];
            }
          },
          _addName: function(node, name) {
            if (name !== void 0) {
              var names = name.split(/\s/g);
              for (var n = 0; n < names.length; n++) {
                var subname = names[n];
                if (subname) {
                  if (this.names[subname] === void 0) {
                    this.names[subname] = [];
                  }
                  this.names[subname].push(node);
                }
              }
            }
          },
          _removeName: function(name, _id) {
            if (name !== void 0) {
              var nodes = this.names[name];
              if (nodes !== void 0) {
                for (var n = 0; n < nodes.length; n++) {
                  var no = nodes[n];
                  if (no._id === _id) {
                    nodes.splice(n, 1);
                  }
                }
                if (nodes.length === 0) {
                  delete this.names[name];
                }
              }
            }
          },
          getAngle: function(angle) {
            return this.angleDeg ? angle * PI_OVER_180 : angle;
          },
          _parseUA: function(userAgent) {
            var ua = userAgent.toLowerCase(), match = /(chrome)[ \/]([\w.]+)/.exec(ua) || /(webkit)[ \/]([\w.]+)/.exec(ua) || /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) || /(msie) ([\w.]+)/.exec(ua) || ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) || [], mobile = !!userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i), ieMobile = !!userAgent.match(/IEMobile/i);
            return {
              browser: match[1] || "",
              version: match[2] || "0",
              // adding mobile flab
              mobile,
              ieMobile
              // If this is true (i.e., WP8), then Kinetic touch events are executed instead of equivalent Kinetic mouse events
            };
          },
          // user agent  
          UA: void 0
        };
        Kinetic.UA = Kinetic._parseUA(root.navigator && root.navigator.userAgent || "");
      })(exports);
      (function(root, factory) {
        if (typeof exports === "object") {
          var KineticJS = factory();
          if (globalThis.window === globalThis) {
            Kinetic.document = globalThis.document;
            Kinetic.window = globalThis;
          } else {
            var Canvas = require_canvas();
            var jsdom = require_api().jsdom;
            Kinetic.document = jsdom("<!DOCTYPE html><html><head></head><body></body></html>");
            Kinetic.window = Kinetic.document.createWindow();
            Kinetic.window.Image = Canvas.Image;
            Kinetic._nodeCanvas = Canvas;
          }
          Kinetic.root = root;
          module.exports = KineticJS;
          return;
        } else if (typeof define === "function" && define.amd) {
          define(factory);
        }
        Kinetic.document = document;
        Kinetic.window = window;
        Kinetic.root = root;
      })(exports, function() {
        return Kinetic;
      });
      (function() {
        Kinetic.Collection = function() {
          var args = [].slice.call(arguments), length = args.length, i = 0;
          this.length = length;
          for (; i < length; i++) {
            this[i] = args[i];
          }
          return this;
        };
        Kinetic.Collection.prototype = [];
        Kinetic.Collection.prototype.each = function(func) {
          for (var n = 0; n < this.length; n++) {
            func(this[n], n);
          }
        };
        Kinetic.Collection.prototype.toArray = function() {
          var arr = [], len = this.length, n;
          for (n = 0; n < len; n++) {
            arr.push(this[n]);
          }
          return arr;
        };
        Kinetic.Collection.toCollection = function(arr) {
          var collection = new Kinetic.Collection(), len = arr.length, n;
          for (n = 0; n < len; n++) {
            collection.push(arr[n]);
          }
          return collection;
        };
        Kinetic.Collection._mapMethod = function(methodName) {
          Kinetic.Collection.prototype[methodName] = function() {
            var len = this.length, i;
            var args = [].slice.call(arguments);
            for (i = 0; i < len; i++) {
              this[i][methodName].apply(this[i], args);
            }
            return this;
          };
        };
        Kinetic.Collection.mapMethods = function(constructor) {
          var prot = constructor.prototype;
          for (var methodName in prot) {
            Kinetic.Collection._mapMethod(methodName);
          }
        };
        Kinetic.Transform = function(m) {
          this.m = m && m.slice() || [1, 0, 0, 1, 0, 0];
        };
        Kinetic.Transform.prototype = {
          /**
           * Copy Kinetic.Transform object
           * @method
           * @memberof Kinetic.Transform.prototype
           * @returns {Kinetic.Transform}
           */
          copy: function() {
            return new Kinetic.Transform(this.m);
          },
          /**
           * Transform point
           * @method
           * @memberof Kinetic.Transform.prototype
           * @param {Object} point 2D point(x, y)
           * @returns {Object} 2D point(x, y)
           */
          point: function(point) {
            var m = this.m;
            return {
              x: m[0] * point.x + m[2] * point.y + m[4],
              y: m[1] * point.x + m[3] * point.y + m[5]
            };
          },
          /**
           * Apply translation
           * @method
           * @memberof Kinetic.Transform.prototype
           * @param {Number} x
           * @param {Number} y
           * @returns {Kinetic.Transform}
           */
          translate: function(x, y) {
            this.m[4] += this.m[0] * x + this.m[2] * y;
            this.m[5] += this.m[1] * x + this.m[3] * y;
            return this;
          },
          /**
           * Apply scale
           * @method
           * @memberof Kinetic.Transform.prototype
           * @param {Number} sx
           * @param {Number} sy
           * @returns {Kinetic.Transform}
           */
          scale: function(sx, sy) {
            this.m[0] *= sx;
            this.m[1] *= sx;
            this.m[2] *= sy;
            this.m[3] *= sy;
            return this;
          },
          /**
           * Apply rotation
           * @method
           * @memberof Kinetic.Transform.prototype
           * @param {Number} rad  Angle in radians
           * @returns {Kinetic.Transform}
           */
          rotate: function(rad) {
            var c = Math.cos(rad);
            var s = Math.sin(rad);
            var m11 = this.m[0] * c + this.m[2] * s;
            var m12 = this.m[1] * c + this.m[3] * s;
            var m21 = this.m[0] * -s + this.m[2] * c;
            var m22 = this.m[1] * -s + this.m[3] * c;
            this.m[0] = m11;
            this.m[1] = m12;
            this.m[2] = m21;
            this.m[3] = m22;
            return this;
          },
          /**
           * Returns the translation
           * @method
           * @memberof Kinetic.Transform.prototype
           * @returns {Object} 2D point(x, y)
           */
          getTranslation: function() {
            return {
              x: this.m[4],
              y: this.m[5]
            };
          },
          /**
           * Apply skew
           * @method
           * @memberof Kinetic.Transform.prototype
           * @param {Number} sx
           * @param {Number} sy
           * @returns {Kinetic.Transform}
           */
          skew: function(sx, sy) {
            var m11 = this.m[0] + this.m[2] * sy;
            var m12 = this.m[1] + this.m[3] * sy;
            var m21 = this.m[2] + this.m[0] * sx;
            var m22 = this.m[3] + this.m[1] * sx;
            this.m[0] = m11;
            this.m[1] = m12;
            this.m[2] = m21;
            this.m[3] = m22;
            return this;
          },
          /**
           * Transform multiplication
           * @method
           * @memberof Kinetic.Transform.prototype
           * @param {Kinetic.Transform} matrix
           * @returns {Kinetic.Transform}
           */
          multiply: function(matrix) {
            var m11 = this.m[0] * matrix.m[0] + this.m[2] * matrix.m[1];
            var m12 = this.m[1] * matrix.m[0] + this.m[3] * matrix.m[1];
            var m21 = this.m[0] * matrix.m[2] + this.m[2] * matrix.m[3];
            var m22 = this.m[1] * matrix.m[2] + this.m[3] * matrix.m[3];
            var dx = this.m[0] * matrix.m[4] + this.m[2] * matrix.m[5] + this.m[4];
            var dy = this.m[1] * matrix.m[4] + this.m[3] * matrix.m[5] + this.m[5];
            this.m[0] = m11;
            this.m[1] = m12;
            this.m[2] = m21;
            this.m[3] = m22;
            this.m[4] = dx;
            this.m[5] = dy;
            return this;
          },
          /**
           * Invert the matrix
           * @method
           * @memberof Kinetic.Transform.prototype
           * @returns {Kinetic.Transform}
           */
          invert: function() {
            var d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
            var m0 = this.m[3] * d;
            var m1 = -this.m[1] * d;
            var m2 = -this.m[2] * d;
            var m3 = this.m[0] * d;
            var m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
            var m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
            this.m[0] = m0;
            this.m[1] = m1;
            this.m[2] = m2;
            this.m[3] = m3;
            this.m[4] = m4;
            this.m[5] = m5;
            return this;
          },
          /**
           * return matrix
           * @method
           * @memberof Kinetic.Transform.prototype
           */
          getMatrix: function() {
            return this.m;
          },
          /**
           * set to absolute position via translation
           * @method
           * @memberof Kinetic.Transform.prototype
           * @returns {Kinetic.Transform}
           * @author ericdrowell
           */
          setAbsolutePosition: function(x, y) {
            var m0 = this.m[0], m1 = this.m[1], m2 = this.m[2], m3 = this.m[3], m4 = this.m[4], m5 = this.m[5], yt = (m0 * (y - m5) - m1 * (x - m4)) / (m0 * m3 - m1 * m2), xt = (x - m4 - m2 * yt) / m0;
            return this.translate(xt, yt);
          }
        };
        var CONTEXT_2D = "2d", OBJECT_ARRAY = "[object Array]", OBJECT_NUMBER = "[object Number]", OBJECT_STRING = "[object String]", PI_OVER_DEG180 = Math.PI / 180, DEG180_OVER_PI = 180 / Math.PI, HASH = "#", EMPTY_STRING = "", ZERO = "0", KINETIC_WARNING = "Kinetic warning: ", KINETIC_ERROR = "Kinetic error: ", RGB_PAREN = "rgb(", COLORS = {
          aqua: [0, 255, 255],
          lime: [0, 255, 0],
          silver: [192, 192, 192],
          black: [0, 0, 0],
          maroon: [128, 0, 0],
          teal: [0, 128, 128],
          blue: [0, 0, 255],
          navy: [0, 0, 128],
          white: [255, 255, 255],
          fuchsia: [255, 0, 255],
          olive: [128, 128, 0],
          yellow: [255, 255, 0],
          orange: [255, 165, 0],
          gray: [128, 128, 128],
          purple: [128, 0, 128],
          green: [0, 128, 0],
          red: [255, 0, 0],
          pink: [255, 192, 203],
          cyan: [0, 255, 255],
          transparent: [255, 255, 255, 0]
        }, RGB_REGEX = /rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)/;
        Kinetic.Util = {
          /*
           * cherry-picked utilities from underscore.js
           */
          _isElement: function(obj) {
            return !!(obj && obj.nodeType == 1);
          },
          _isFunction: function(obj) {
            return !!(obj && obj.constructor && obj.call && obj.apply);
          },
          _isObject: function(obj) {
            return !!obj && obj.constructor == Object;
          },
          _isArray: function(obj) {
            return Object.prototype.toString.call(obj) == OBJECT_ARRAY;
          },
          _isNumber: function(obj) {
            return Object.prototype.toString.call(obj) == OBJECT_NUMBER;
          },
          _isString: function(obj) {
            return Object.prototype.toString.call(obj) == OBJECT_STRING;
          },
          // Returns a function, that, when invoked, will only be triggered at most once
          // during a given window of time. Normally, the throttled function will run
          // as much as it can, without ever going more than once per `wait` duration;
          // but if you'd like to disable the execution on the leading edge, pass
          // `{leading: false}`. To disable execution on the trailing edge, ditto.
          _throttle: function(func, wait, opts) {
            var context, args, result;
            var timeout = null;
            var previous = 0;
            var options = opts || {};
            var later = function() {
              previous = options.leading === false ? 0 : (/* @__PURE__ */ new Date()).getTime();
              timeout = null;
              result = func.apply(context, args);
              context = args = null;
            };
            return function() {
              var now = (/* @__PURE__ */ new Date()).getTime();
              if (!previous && options.leading === false) {
                previous = now;
              }
              var remaining = wait - (now - previous);
              context = this;
              args = arguments;
              if (remaining <= 0) {
                clearTimeout(timeout);
                timeout = null;
                previous = now;
                result = func.apply(context, args);
                context = args = null;
              } else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(later, remaining);
              }
              return result;
            };
          },
          /*
           * other utils
           */
          _hasMethods: function(obj) {
            var names = [], key;
            for (key in obj) {
              if (this._isFunction(obj[key])) {
                names.push(key);
              }
            }
            return names.length > 0;
          },
          createCanvasElement: function() {
            var canvas = Kinetic.document.createElement("canvas");
            try {
              canvas.style = canvas.style || {};
            } catch (e) {
            }
            return canvas;
          },
          isBrowser: function() {
            return typeof exports !== "object";
          },
          _isInDocument: function(el) {
            while (el = el.parentNode) {
              if (el == Kinetic.document) {
                return true;
              }
            }
            return false;
          },
          _simplifyArray: function(arr) {
            var retArr = [], len = arr.length, util = Kinetic.Util, n, val;
            for (n = 0; n < len; n++) {
              val = arr[n];
              if (util._isNumber(val)) {
                val = Math.round(val * 1e3) / 1e3;
              } else if (!util._isString(val)) {
                val = val.toString();
              }
              retArr.push(val);
            }
            return retArr;
          },
          /*
           * arg can be an image object or image data
           */
          _getImage: function(arg, callback) {
            var imageObj, canvas;
            if (!arg) {
              callback(null);
            } else if (this._isElement(arg)) {
              callback(arg);
            } else if (this._isString(arg)) {
              imageObj = new Kinetic.window.Image();
              imageObj.onload = function() {
                callback(imageObj);
              };
              imageObj.src = arg;
            } else if (arg.data) {
              canvas = Kinetic.Util.createCanvasElement();
              canvas.width = arg.width;
              canvas.height = arg.height;
              var _context = canvas.getContext(CONTEXT_2D);
              _context.putImageData(arg, 0, 0);
              this._getImage(canvas.toDataURL(), callback);
            } else {
              callback(null);
            }
          },
          _getRGBAString: function(obj) {
            var red = obj.red || 0, green = obj.green || 0, blue = obj.blue || 0, alpha = obj.alpha || 1;
            return [
              "rgba(",
              red,
              ",",
              green,
              ",",
              blue,
              ",",
              alpha,
              ")"
            ].join(EMPTY_STRING);
          },
          _rgbToHex: function(r, g, b) {
            return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
          },
          _hexToRgb: function(hex) {
            hex = hex.replace(HASH, EMPTY_STRING);
            var bigint = parseInt(hex, 16);
            return {
              r: bigint >> 16 & 255,
              g: bigint >> 8 & 255,
              b: bigint & 255
            };
          },
          /**
           * return random hex color
           * @method
           * @memberof Kinetic.Util.prototype
           */
          getRandomColor: function() {
            var randColor = (Math.random() * 16777215 << 0).toString(16);
            while (randColor.length < 6) {
              randColor = ZERO + randColor;
            }
            return HASH + randColor;
          },
          /**
           * return value with default fallback
           * @method
           * @memberof Kinetic.Util.prototype
           */
          get: function(val, def) {
            if (val === void 0) {
              return def;
            } else {
              return val;
            }
          },
          /**
           * get RGB components of a color
           * @method
           * @memberof Kinetic.Util.prototype
           * @param {String} color
           * @example
           * // each of the following examples return {r:0, g:0, b:255}
           * var rgb = Kinetic.Util.getRGB('blue');
           * var rgb = Kinetic.Util.getRGB('#0000ff');
           * var rgb = Kinetic.Util.getRGB('rgb(0,0,255)');
           */
          getRGB: function(color) {
            var rgb;
            if (color in COLORS) {
              rgb = COLORS[color];
              return {
                r: rgb[0],
                g: rgb[1],
                b: rgb[2]
              };
            } else if (color[0] === HASH) {
              return this._hexToRgb(color.substring(1));
            } else if (color.substr(0, 4) === RGB_PAREN) {
              rgb = RGB_REGEX.exec(color.replace(/ /g, ""));
              return {
                r: parseInt(rgb[1], 10),
                g: parseInt(rgb[2], 10),
                b: parseInt(rgb[3], 10)
              };
            } else {
              return {
                r: 0,
                g: 0,
                b: 0
              };
            }
          },
          // o1 takes precedence over o2
          _merge: function(o1, o2) {
            var retObj = this._clone(o2);
            for (var key in o1) {
              if (this._isObject(o1[key])) {
                retObj[key] = this._merge(o1[key], retObj[key]);
              } else {
                retObj[key] = o1[key];
              }
            }
            return retObj;
          },
          cloneObject: function(obj) {
            var retObj = {};
            for (var key in obj) {
              if (this._isObject(obj[key])) {
                retObj[key] = this.cloneObject(obj[key]);
              } else if (this._isArray(obj[key])) {
                retObj[key] = this.cloneArray(obj[key]);
              } else {
                retObj[key] = obj[key];
              }
            }
            return retObj;
          },
          cloneArray: function(arr) {
            return arr.slice(0);
          },
          _degToRad: function(deg) {
            return deg * PI_OVER_DEG180;
          },
          _radToDeg: function(rad) {
            return rad * DEG180_OVER_PI;
          },
          _capitalize: function(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
          },
          error: function(str) {
            throw new Error(KINETIC_ERROR + str);
          },
          warn: function(str) {
            if (Kinetic.root.console && console.warn && Kinetic.showWarnings) {
              console.warn(KINETIC_WARNING + str);
            }
          },
          extend: function(child, parent) {
            function ctor() {
              this.constructor = child;
            }
            ctor.prototype = parent.prototype;
            var old_proto = child.prototype;
            child.prototype = new ctor();
            for (var key in old_proto) {
              if (old_proto.hasOwnProperty(key)) {
                child.prototype[key] = old_proto[key];
              }
            }
            child.__super__ = parent.prototype;
          },
          /**
           * adds methods to a constructor prototype
           * @method
           * @memberof Kinetic.Util.prototype
           * @param {Function} constructor
           * @param {Object} methods
           */
          addMethods: function(constructor, methods) {
            var key;
            for (key in methods) {
              constructor.prototype[key] = methods[key];
            }
          },
          _getControlPoints: function(x0, y0, x1, y1, x2, y2, t) {
            var d01 = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2)), d12 = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)), fa = t * d01 / (d01 + d12), fb = t * d12 / (d01 + d12), p1x = x1 - fa * (x2 - x0), p1y = y1 - fa * (y2 - y0), p2x = x1 + fb * (x2 - x0), p2y = y1 + fb * (y2 - y0);
            return [p1x, p1y, p2x, p2y];
          },
          _expandPoints: function(p, tension) {
            var len = p.length, allPoints = [], n, cp;
            for (n = 2; n < len - 2; n += 2) {
              cp = Kinetic.Util._getControlPoints(p[n - 2], p[n - 1], p[n], p[n + 1], p[n + 2], p[n + 3], tension);
              allPoints.push(cp[0]);
              allPoints.push(cp[1]);
              allPoints.push(p[n]);
              allPoints.push(p[n + 1]);
              allPoints.push(cp[2]);
              allPoints.push(cp[3]);
            }
            return allPoints;
          },
          _removeLastLetter: function(str) {
            return str.substring(0, str.length - 1);
          }
        };
      })();
      (function() {
        var canvas = Kinetic.Util.createCanvasElement(), context = canvas.getContext("2d"), _pixelRatio = Kinetic.UA.mobile ? (function() {
          var devicePixelRatio = window.devicePixelRatio || 1, backingStoreRatio = context.webkitBackingStorePixelRatio || context.mozBackingStorePixelRatio || context.msBackingStorePixelRatio || context.oBackingStorePixelRatio || context.backingStorePixelRatio || 1;
          return devicePixelRatio / backingStoreRatio;
        })() : 1;
        Kinetic.Canvas = function(config) {
          this.init(config);
        };
        Kinetic.Canvas.prototype = {
          init: function(config) {
            var conf = config || {};
            var pixelRatio = conf.pixelRatio || Kinetic.pixelRatio || _pixelRatio;
            this.pixelRatio = pixelRatio;
            this._canvas = Kinetic.Util.createCanvasElement();
            this._canvas.style.padding = 0;
            this._canvas.style.margin = 0;
            this._canvas.style.border = 0;
            this._canvas.style.background = "transparent";
            this._canvas.style.position = "absolute";
            this._canvas.style.top = 0;
            this._canvas.style.left = 0;
          },
          /**
           * get canvas context
           * @method
           * @memberof Kinetic.Canvas.prototype
           * @returns {CanvasContext} context
           */
          getContext: function() {
            return this.context;
          },
          /**
           * get pixel ratio
           * @method
           * @memberof Kinetic.Canvas.prototype
           * @returns {Number} pixel ratio
           */
          getPixelRatio: function() {
            return this.pixelRatio;
          },
          /**
           * get pixel ratio
           * @method
           * @memberof Kinetic.Canvas.prototype
           * @param {Number} pixelRatio KineticJS automatically handles pixel ratio adustments in order to render crisp drawings 
           *  on all devices. Most desktops, low end tablets, and low end phones, have device pixel ratios
           *  of 1.  Some high end tablets and phones, like iPhones and iPads (not the mini) have a device pixel ratio 
           *  of 2.  Some Macbook Pros, and iMacs also have a device pixel ratio of 2.  Some high end Android devices have pixel 
           *  ratios of 2 or 3.  Some browsers like Firefox allow you to configure the pixel ratio of the viewport.  Unless otherwise
           *  specificed, the pixel ratio will be defaulted to the actual device pixel ratio.  You can override the device pixel
           *  ratio for special situations, or, if you don't want the pixel ratio to be taken into account, you can set it to 1.
           */
          setPixelRatio: function(pixelRatio) {
            this.pixelRatio = pixelRatio;
            this.setSize(this.getWidth(), this.getHeight());
          },
          /**
           * set width
           * @method
           * @memberof Kinetic.Canvas.prototype
           * @param {Number} width
           */
          setWidth: function(width) {
            this.width = this._canvas.width = width * this.pixelRatio;
            this._canvas.style.width = width + "px";
          },
          /**
           * set height
           * @method
           * @memberof Kinetic.Canvas.prototype
           * @param {Number} height
           */
          setHeight: function(height) {
            this.height = this._canvas.height = height * this.pixelRatio;
            this._canvas.style.height = height + "px";
          },
          /**
           * get width
           * @method
           * @memberof Kinetic.Canvas.prototype
           * @returns {Number} width
           */
          getWidth: function() {
            return this.width;
          },
          /**
           * get height
           * @method
           * @memberof Kinetic.Canvas.prototype
           * @returns {Number} height
           */
          getHeight: function() {
            return this.height;
          },
          /**
           * set size
           * @method
           * @memberof Kinetic.Canvas.prototype
           * @param {Number} width
           * @param {Number} height
           */
          setSize: function(width, height) {
            this.setWidth(width);
            this.setHeight(height);
          },
          /**
           * to data url
           * @method
           * @memberof Kinetic.Canvas.prototype
           * @param {String} mimeType
           * @param {Number} quality between 0 and 1 for jpg mime types
           * @returns {String} data url string
           */
          toDataURL: function(mimeType, quality) {
            try {
              return this._canvas.toDataURL(mimeType, quality);
            } catch (e) {
              try {
                return this._canvas.toDataURL();
              } catch (err) {
                Kinetic.Util.warn("Unable to get data URL. " + err.message);
                return "";
              }
            }
          }
        };
        Kinetic.SceneCanvas = function(config) {
          var conf = config || {};
          var width = conf.width || 0, height = conf.height || 0;
          Kinetic.Canvas.call(this, conf);
          this.context = new Kinetic.SceneContext(this);
          this.setSize(width, height);
        };
        Kinetic.SceneCanvas.prototype = {
          setWidth: function(width) {
            var pixelRatio = this.pixelRatio, _context = this.getContext()._context;
            Kinetic.Canvas.prototype.setWidth.call(this, width);
            _context.scale(pixelRatio, pixelRatio);
          },
          setHeight: function(height) {
            var pixelRatio = this.pixelRatio, _context = this.getContext()._context;
            Kinetic.Canvas.prototype.setHeight.call(this, height);
            _context.scale(pixelRatio, pixelRatio);
          }
        };
        Kinetic.Util.extend(Kinetic.SceneCanvas, Kinetic.Canvas);
        Kinetic.HitCanvas = function(config) {
          var conf = config || {};
          var width = conf.width || 0, height = conf.height || 0;
          Kinetic.Canvas.call(this, conf);
          this.context = new Kinetic.HitContext(this);
          this.setSize(width, height);
          this.hitCanvas = true;
        };
        Kinetic.Util.extend(Kinetic.HitCanvas, Kinetic.Canvas);
      })();
      (function() {
        var COMMA = ",", OPEN_PAREN = "(", CLOSE_PAREN = ")", OPEN_PAREN_BRACKET = "([", CLOSE_BRACKET_PAREN = "])", SEMICOLON = ";", DOUBLE_PAREN = "()", EQUALS = "=", CONTEXT_METHODS = [
          "arc",
          "arcTo",
          "beginPath",
          "bezierCurveTo",
          "clearRect",
          "clip",
          "closePath",
          "createLinearGradient",
          "createPattern",
          "createRadialGradient",
          "drawImage",
          "fill",
          "fillText",
          "getImageData",
          "createImageData",
          "lineTo",
          "moveTo",
          "putImageData",
          "quadraticCurveTo",
          "rect",
          "restore",
          "rotate",
          "save",
          "scale",
          "setLineDash",
          "setTransform",
          "stroke",
          "strokeText",
          "transform",
          "translate"
        ];
        Kinetic.Context = function(canvas) {
          this.init(canvas);
        };
        Kinetic.Context.prototype = {
          init: function(canvas) {
            this.canvas = canvas;
            this._context = canvas._canvas.getContext("2d");
            if (Kinetic.enableTrace) {
              this.traceArr = [];
              this._enableTrace();
            }
          },
          /**
           * fill shape
           * @method
           * @memberof Kinetic.Context.prototype
           * @param {Kinetic.Shape} shape
           */
          fillShape: function(shape) {
            if (shape.getFillEnabled()) {
              this._fill(shape);
            }
          },
          /**
           * stroke shape
           * @method
           * @memberof Kinetic.Context.prototype
           * @param {Kinetic.Shape} shape
           */
          strokeShape: function(shape) {
            if (shape.getStrokeEnabled()) {
              this._stroke(shape);
            }
          },
          /**
           * fill then stroke
           * @method
           * @memberof Kinetic.Context.prototype
           * @param {Kinetic.Shape} shape
           */
          fillStrokeShape: function(shape) {
            var fillEnabled = shape.getFillEnabled();
            if (fillEnabled) {
              this._fill(shape);
            }
            if (shape.getStrokeEnabled()) {
              this._stroke(shape);
            }
          },
          /**
           * get context trace if trace is enabled
           * @method
           * @memberof Kinetic.Context.prototype
           * @param {Boolean} relaxed if false, return strict context trace, which includes method names, method parameters
           *  properties, and property values.  If true, return relaxed context trace, which only returns method names and
           *  properites.
           * @returns {String}
           */
          getTrace: function(relaxed) {
            var traceArr = this.traceArr, len = traceArr.length, str = "", n, trace, method, args;
            for (n = 0; n < len; n++) {
              trace = traceArr[n];
              method = trace.method;
              if (method) {
                args = trace.args;
                str += method;
                if (relaxed) {
                  str += DOUBLE_PAREN;
                } else {
                  if (Kinetic.Util._isArray(args[0])) {
                    str += OPEN_PAREN_BRACKET + args.join(COMMA) + CLOSE_BRACKET_PAREN;
                  } else {
                    str += OPEN_PAREN + args.join(COMMA) + CLOSE_PAREN;
                  }
                }
              } else {
                str += trace.property;
                if (!relaxed) {
                  str += EQUALS + trace.val;
                }
              }
              str += SEMICOLON;
            }
            return str;
          },
          /**
           * clear trace if trace is enabled
           * @method
           * @memberof Kinetic.Context.prototype
           */
          clearTrace: function() {
            this.traceArr = [];
          },
          _trace: function(str) {
            var traceArr = this.traceArr, len;
            traceArr.push(str);
            len = traceArr.length;
            if (len >= Kinetic.traceArrMax) {
              traceArr.shift();
            }
          },
          /**
           * reset canvas context transform
           * @method
           * @memberof Kinetic.Context.prototype
           */
          reset: function() {
            var pixelRatio = this.getCanvas().getPixelRatio();
            this.setTransform(1 * pixelRatio, 0, 0, 1 * pixelRatio, 0, 0);
          },
          /**
           * get canvas
           * @method
           * @memberof Kinetic.Context.prototype
           * @returns {Kinetic.Canvas}
           */
          getCanvas: function() {
            return this.canvas;
          },
          /**
           * clear canvas
           * @method
           * @memberof Kinetic.Context.prototype
           * @param {Object} [bounds]
           * @param {Number} [bounds.x]
           * @param {Number} [bounds.y]
           * @param {Number} [bounds.width]
           * @param {Number} [bounds.height]
           */
          clear: function(bounds) {
            var canvas = this.getCanvas();
            if (bounds) {
              this.clearRect(bounds.x || 0, bounds.y || 0, bounds.width || 0, bounds.height || 0);
            } else {
              this.clearRect(0, 0, canvas.getWidth(), canvas.getHeight());
            }
          },
          _applyLineCap: function(shape) {
            var lineCap = shape.getLineCap();
            if (lineCap) {
              this.setAttr("lineCap", lineCap);
            }
          },
          _applyOpacity: function(shape) {
            var absOpacity = shape.getAbsoluteOpacity();
            if (absOpacity !== 1) {
              this.setAttr("globalAlpha", absOpacity);
            }
          },
          _applyLineJoin: function(shape) {
            var lineJoin = shape.getLineJoin();
            if (lineJoin) {
              this.setAttr("lineJoin", lineJoin);
            }
          },
          setAttr: function(attr, val) {
            this._context[attr] = val;
          },
          // context pass through methods
          arc: function() {
            var a = arguments;
            this._context.arc(a[0], a[1], a[2], a[3], a[4], a[5]);
          },
          beginPath: function() {
            this._context.beginPath();
          },
          bezierCurveTo: function() {
            var a = arguments;
            this._context.bezierCurveTo(a[0], a[1], a[2], a[3], a[4], a[5]);
          },
          clearRect: function() {
            var a = arguments;
            this._context.clearRect(a[0], a[1], a[2], a[3]);
          },
          clip: function() {
            this._context.clip();
          },
          closePath: function() {
            this._context.closePath();
          },
          createImageData: function() {
            var a = arguments;
            if (a.length === 2) {
              return this._context.createImageData(a[0], a[1]);
            } else if (a.length === 1) {
              return this._context.createImageData(a[0]);
            }
          },
          createLinearGradient: function() {
            var a = arguments;
            return this._context.createLinearGradient(a[0], a[1], a[2], a[3]);
          },
          createPattern: function() {
            var a = arguments;
            return this._context.createPattern(a[0], a[1]);
          },
          createRadialGradient: function() {
            var a = arguments;
            return this._context.createRadialGradient(a[0], a[1], a[2], a[3], a[4], a[5]);
          },
          drawImage: function() {
            var a = arguments, _context = this._context;
            if (a.length === 3) {
              _context.drawImage(a[0], a[1], a[2]);
            } else if (a.length === 5) {
              _context.drawImage(a[0], a[1], a[2], a[3], a[4]);
            } else if (a.length === 9) {
              _context.drawImage(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
            }
          },
          fill: function() {
            this._context.fill();
          },
          fillText: function() {
            var a = arguments;
            this._context.fillText(a[0], a[1], a[2]);
          },
          getImageData: function() {
            var a = arguments;
            return this._context.getImageData(a[0], a[1], a[2], a[3]);
          },
          lineTo: function() {
            var a = arguments;
            this._context.lineTo(a[0], a[1]);
          },
          moveTo: function() {
            var a = arguments;
            this._context.moveTo(a[0], a[1]);
          },
          rect: function() {
            var a = arguments;
            this._context.rect(a[0], a[1], a[2], a[3]);
          },
          putImageData: function() {
            var a = arguments;
            this._context.putImageData(a[0], a[1], a[2]);
          },
          quadraticCurveTo: function() {
            var a = arguments;
            this._context.quadraticCurveTo(a[0], a[1], a[2], a[3]);
          },
          restore: function() {
            this._context.restore();
          },
          rotate: function() {
            var a = arguments;
            this._context.rotate(a[0]);
          },
          save: function() {
            this._context.save();
          },
          scale: function() {
            var a = arguments;
            this._context.scale(a[0], a[1]);
          },
          setLineDash: function() {
            var a = arguments, _context = this._context;
            if (this._context.setLineDash) {
              _context.setLineDash(a[0]);
            } else if ("mozDash" in _context) {
              _context.mozDash = a[0];
            } else if ("webkitLineDash" in _context) {
              _context.webkitLineDash = a[0];
            }
          },
          setTransform: function() {
            var a = arguments;
            this._context.setTransform(a[0], a[1], a[2], a[3], a[4], a[5]);
          },
          stroke: function() {
            this._context.stroke();
          },
          strokeText: function() {
            var a = arguments;
            this._context.strokeText(a[0], a[1], a[2]);
          },
          transform: function() {
            var a = arguments;
            this._context.transform(a[0], a[1], a[2], a[3], a[4], a[5]);
          },
          translate: function() {
            var a = arguments;
            this._context.translate(a[0], a[1]);
          },
          _enableTrace: function() {
            var that = this, len = CONTEXT_METHODS.length, _simplifyArray = Kinetic.Util._simplifyArray, origSetter = this.setAttr, n, args;
            var func = function(methodName) {
              var origMethod = that[methodName], ret;
              that[methodName] = function() {
                args = _simplifyArray(Array.prototype.slice.call(arguments, 0));
                ret = origMethod.apply(that, arguments);
                that._trace({
                  method: methodName,
                  args
                });
                return ret;
              };
            };
            for (n = 0; n < len; n++) {
              func(CONTEXT_METHODS[n]);
            }
            that.setAttr = function() {
              origSetter.apply(that, arguments);
              that._trace({
                property: arguments[0],
                val: arguments[1]
              });
            };
          }
        };
        Kinetic.SceneContext = function(canvas) {
          Kinetic.Context.call(this, canvas);
        };
        Kinetic.SceneContext.prototype = {
          _fillColor: function(shape) {
            var fill = shape.fill() || Kinetic.Util._getRGBAString({
              red: shape.fillRed(),
              green: shape.fillGreen(),
              blue: shape.fillBlue(),
              alpha: shape.fillAlpha()
            });
            this.setAttr("fillStyle", fill);
            shape._fillFunc(this);
          },
          _fillPattern: function(shape) {
            var fillPatternImage = shape.getFillPatternImage(), fillPatternX = shape.getFillPatternX(), fillPatternY = shape.getFillPatternY(), fillPatternScale = shape.getFillPatternScale(), fillPatternRotation = Kinetic.getAngle(shape.getFillPatternRotation()), fillPatternOffset = shape.getFillPatternOffset(), fillPatternRepeat = shape.getFillPatternRepeat();
            if (fillPatternX || fillPatternY) {
              this.translate(fillPatternX || 0, fillPatternY || 0);
            }
            if (fillPatternRotation) {
              this.rotate(fillPatternRotation);
            }
            if (fillPatternScale) {
              this.scale(fillPatternScale.x, fillPatternScale.y);
            }
            if (fillPatternOffset) {
              this.translate(-1 * fillPatternOffset.x, -1 * fillPatternOffset.y);
            }
            this.setAttr("fillStyle", this.createPattern(fillPatternImage, fillPatternRepeat || "repeat"));
            this.fill();
          },
          _fillLinearGradient: function(shape) {
            var start = shape.getFillLinearGradientStartPoint(), end = shape.getFillLinearGradientEndPoint(), colorStops = shape.getFillLinearGradientColorStops(), grd = this.createLinearGradient(start.x, start.y, end.x, end.y);
            if (colorStops) {
              for (var n = 0; n < colorStops.length; n += 2) {
                grd.addColorStop(colorStops[n], colorStops[n + 1]);
              }
              this.setAttr("fillStyle", grd);
              this.fill();
            }
          },
          _fillRadialGradient: function(shape) {
            var start = shape.getFillRadialGradientStartPoint(), end = shape.getFillRadialGradientEndPoint(), startRadius = shape.getFillRadialGradientStartRadius(), endRadius = shape.getFillRadialGradientEndRadius(), colorStops = shape.getFillRadialGradientColorStops(), grd = this.createRadialGradient(start.x, start.y, startRadius, end.x, end.y, endRadius);
            for (var n = 0; n < colorStops.length; n += 2) {
              grd.addColorStop(colorStops[n], colorStops[n + 1]);
            }
            this.setAttr("fillStyle", grd);
            this.fill();
          },
          _fill: function(shape) {
            var hasColor = shape.fill() || shape.fillRed() || shape.fillGreen() || shape.fillBlue(), hasPattern = shape.getFillPatternImage(), hasLinearGradient = shape.getFillLinearGradientColorStops(), hasRadialGradient = shape.getFillRadialGradientColorStops(), fillPriority = shape.getFillPriority();
            if (hasColor && fillPriority === "color") {
              this._fillColor(shape);
            } else if (hasPattern && fillPriority === "pattern") {
              this._fillPattern(shape);
            } else if (hasLinearGradient && fillPriority === "linear-gradient") {
              this._fillLinearGradient(shape);
            } else if (hasRadialGradient && fillPriority === "radial-gradient") {
              this._fillRadialGradient(shape);
            } else if (hasColor) {
              this._fillColor(shape);
            } else if (hasPattern) {
              this._fillPattern(shape);
            } else if (hasLinearGradient) {
              this._fillLinearGradient(shape);
            } else if (hasRadialGradient) {
              this._fillRadialGradient(shape);
            }
          },
          _stroke: function(shape) {
            var dash = shape.dash(), strokeScaleEnabled = shape.getStrokeScaleEnabled();
            if (shape.hasStroke()) {
              if (!strokeScaleEnabled) {
                this.save();
                this.setTransform(1, 0, 0, 1, 0, 0);
              }
              this._applyLineCap(shape);
              if (dash && shape.dashEnabled()) {
                this.setLineDash(dash);
              }
              this.setAttr("lineWidth", shape.strokeWidth());
              this.setAttr("strokeStyle", shape.stroke() || Kinetic.Util._getRGBAString({
                red: shape.strokeRed(),
                green: shape.strokeGreen(),
                blue: shape.strokeBlue(),
                alpha: shape.strokeAlpha()
              }));
              shape._strokeFunc(this);
              if (!strokeScaleEnabled) {
                this.restore();
              }
            }
          },
          _applyShadow: function(shape) {
            var util = Kinetic.Util, absOpacity = shape.getAbsoluteOpacity(), color = util.get(shape.getShadowColor(), "black"), blur = util.get(shape.getShadowBlur(), 5), shadowOpacity = util.get(shape.getShadowOpacity(), 1), offset = util.get(shape.getShadowOffset(), {
              x: 0,
              y: 0
            });
            if (shadowOpacity) {
              this.setAttr("globalAlpha", shadowOpacity * absOpacity);
            }
            this.setAttr("shadowColor", color);
            this.setAttr("shadowBlur", blur);
            this.setAttr("shadowOffsetX", offset.x);
            this.setAttr("shadowOffsetY", offset.y);
          }
        };
        Kinetic.Util.extend(Kinetic.SceneContext, Kinetic.Context);
        Kinetic.HitContext = function(canvas) {
          Kinetic.Context.call(this, canvas);
        };
        Kinetic.HitContext.prototype = {
          _fill: function(shape) {
            this.save();
            this.setAttr("fillStyle", shape.colorKey);
            shape._fillFuncHit(this);
            this.restore();
          },
          _stroke: function(shape) {
            if (shape.hasStroke()) {
              this._applyLineCap(shape);
              this.setAttr("lineWidth", shape.strokeWidth());
              this.setAttr("strokeStyle", shape.colorKey);
              shape._strokeFuncHit(this);
            }
          }
        };
        Kinetic.Util.extend(Kinetic.HitContext, Kinetic.Context);
      })();
      (function() {
        var GET = "get", RGB = "RGB", SET = "set";
        Kinetic.Factory = {
          addGetterSetter: function(constructor, attr, def, validator, after) {
            this.addGetter(constructor, attr, def);
            this.addSetter(constructor, attr, validator, after);
            this.addOverloadedGetterSetter(constructor, attr);
          },
          addGetter: function(constructor, attr, def) {
            var method = GET + Kinetic.Util._capitalize(attr);
            constructor.prototype[method] = function() {
              var val = this.attrs[attr];
              return val === void 0 ? def : val;
            };
          },
          addSetter: function(constructor, attr, validator, after) {
            var method = SET + Kinetic.Util._capitalize(attr);
            constructor.prototype[method] = function(val) {
              if (validator) {
                val = validator.call(this, val);
              }
              this._setAttr(attr, val);
              if (after) {
                after.call(this);
              }
              return this;
            };
          },
          addComponentsGetterSetter: function(constructor, attr, components, validator, after) {
            var len = components.length, capitalize = Kinetic.Util._capitalize, getter = GET + capitalize(attr), setter = SET + capitalize(attr), n, component;
            constructor.prototype[getter] = function() {
              var ret = {};
              for (n = 0; n < len; n++) {
                component = components[n];
                ret[component] = this.getAttr(attr + capitalize(component));
              }
              return ret;
            };
            constructor.prototype[setter] = function(val) {
              var oldVal = this.attrs[attr], key;
              if (validator) {
                val = validator.call(this, val);
              }
              for (key in val) {
                this._setAttr(attr + capitalize(key), val[key]);
              }
              this._fireChangeEvent(attr, oldVal, val);
              if (after) {
                after.call(this);
              }
              return this;
            };
            this.addOverloadedGetterSetter(constructor, attr);
          },
          addOverloadedGetterSetter: function(constructor, attr) {
            var capitalizedAttr = Kinetic.Util._capitalize(attr), setter = SET + capitalizedAttr, getter = GET + capitalizedAttr;
            constructor.prototype[attr] = function() {
              if (arguments.length) {
                this[setter](arguments[0]);
                return this;
              } else {
                return this[getter]();
              }
            };
          },
          backCompat: function(constructor, methods) {
            var key;
            for (key in methods) {
              constructor.prototype[key] = constructor.prototype[methods[key]];
            }
          },
          afterSetFilter: function() {
            this._filterUpToDate = false;
          }
        };
        Kinetic.Validators = {
          /**
           * @return {number}
           */
          RGBComponent: function(val) {
            if (val > 255) {
              return 255;
            } else if (val < 0) {
              return 0;
            } else {
              return Math.round(val);
            }
          },
          alphaComponent: function(val) {
            if (val > 1) {
              return 1;
            } else if (val < 1e-4) {
              return 1e-4;
            } else {
              return val;
            }
          }
        };
      })();
      (function() {
        var ABSOLUTE_OPACITY = "absoluteOpacity", ABSOLUTE_TRANSFORM = "absoluteTransform", CHANGE = "Change", CHILDREN = "children", DOT = ".", EMPTY_STRING = "", GET = "get", ID = "id", KINETIC = "kinetic", LISTENING = "listening", MOUSEENTER = "mouseenter", MOUSELEAVE = "mouseleave", NAME = "name", SET = "set", SHAPE = "Shape", SPACE = " ", STAGE = "stage", TRANSFORM = "transform", UPPER_STAGE = "Stage", VISIBLE = "visible", CLONE_BLACK_LIST = ["id"], TRANSFORM_CHANGE_STR = [
          "xChange.kinetic",
          "yChange.kinetic",
          "scaleXChange.kinetic",
          "scaleYChange.kinetic",
          "skewXChange.kinetic",
          "skewYChange.kinetic",
          "rotationChange.kinetic",
          "offsetXChange.kinetic",
          "offsetYChange.kinetic",
          "transformsEnabledChange.kinetic"
        ].join(SPACE);
        Kinetic.Util.addMethods(Kinetic.Node, {
          _init: function(config) {
            var that = this;
            this._id = Kinetic.idCounter++;
            this.eventListeners = {};
            this.attrs = {};
            this._cache = {};
            this._filterUpToDate = false;
            this.setAttrs(config);
            this.on(TRANSFORM_CHANGE_STR, function() {
              this._clearCache(TRANSFORM);
              that._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
            });
            this.on("visibleChange.kinetic", function() {
              that._clearSelfAndDescendantCache(VISIBLE);
            });
            this.on("listeningChange.kinetic", function() {
              that._clearSelfAndDescendantCache(LISTENING);
            });
            this.on("opacityChange.kinetic", function() {
              that._clearSelfAndDescendantCache(ABSOLUTE_OPACITY);
            });
          },
          _clearCache: function(attr) {
            if (attr) {
              delete this._cache[attr];
            } else {
              this._cache = {};
            }
          },
          _getCache: function(attr, privateGetter) {
            var cache = this._cache[attr];
            if (cache === void 0) {
              this._cache[attr] = privateGetter.call(this);
            }
            return this._cache[attr];
          },
          /*
           * when the logic for a cached result depends on ancestor propagation, use this
           * method to clear self and children cache
           */
          _clearSelfAndDescendantCache: function(attr) {
            this._clearCache(attr);
            if (this.children) {
              this.getChildren().each(function(node) {
                node._clearSelfAndDescendantCache(attr);
              });
            }
          },
          /**
          * clear cached canvas
          * @method
          * @memberof Kinetic.Node.prototype
          * @returns {Kinetic.Node}
          * @example
          * node.clearCache();
          */
          clearCache: function() {
            delete this._cache.canvas;
            this._filterUpToDate = false;
            return this;
          },
          /**
          * cache node to improve drawing performance, apply filters, or create more accurate
          *  hit regions
          * @method
          * @memberof Kinetic.Node.prototype
          * @param {Object} config
          * @param {Number} [config.x]
          * @param {Number} [config.y]
          * @param {Number} [config.width]
          * @param {Number} [config.height]
          * @param {Boolean} [config.drawBorder] when set to true, a red border will be drawn around the cached
          *  region for debugging purposes
          * @returns {Kinetic.Node}
          * @example
          * // cache a shape with the x,y position of the bounding box at the center and
          * // the width and height of the bounding box equal to the width and height of
          * // the shape obtained from shape.width() and shape.height()
          * image.cache();
          *
          * // cache a node and define the bounding box position and size
          * node.cache({
          *   x: -30,
          *   y: -30,
          *   width: 100,
          *   height: 200
          * });
          *
          * // cache a node and draw a red border around the bounding box
          * // for debugging purposes
          * node.cache({
          *   x: -30,
          *   y: -30,
          *   width: 100,
          *   height: 200,
          *   drawBorder: true
          * });
          */
          cache: function(config) {
            var conf = config || {}, x = conf.x || 0, y = conf.y || 0, width = conf.width || this.width(), height = conf.height || this.height(), drawBorder = conf.drawBorder || false;
            if (width === 0 || height === 0) {
              Kinetic.Util.warn("Width or height of caching configuration equals 0. Cache is ignored.");
              return;
            }
            var cachedSceneCanvas = new Kinetic.SceneCanvas({
              pixelRatio: 1,
              width,
              height
            }), cachedFilterCanvas = new Kinetic.SceneCanvas({
              pixelRatio: 1,
              width,
              height
            }), cachedHitCanvas = new Kinetic.HitCanvas({
              width,
              height
            }), sceneContext = cachedSceneCanvas.getContext(), hitContext = cachedHitCanvas.getContext();
            cachedHitCanvas.isCache = true;
            this.clearCache();
            sceneContext.save();
            hitContext.save();
            if (drawBorder) {
              sceneContext.save();
              sceneContext.beginPath();
              sceneContext.rect(0, 0, width, height);
              sceneContext.closePath();
              sceneContext.setAttr("strokeStyle", "red");
              sceneContext.setAttr("lineWidth", 5);
              sceneContext.stroke();
              sceneContext.restore();
            }
            sceneContext.translate(x * -1, y * -1);
            hitContext.translate(x * -1, y * -1);
            if (this.nodeType === "Shape") {
              sceneContext.translate(this.x() * -1, this.y() * -1);
              hitContext.translate(this.x() * -1, this.y() * -1);
            }
            this.drawScene(cachedSceneCanvas, this);
            this.drawHit(cachedHitCanvas, this);
            sceneContext.restore();
            hitContext.restore();
            this._cache.canvas = {
              scene: cachedSceneCanvas,
              filter: cachedFilterCanvas,
              hit: cachedHitCanvas
            };
            return this;
          },
          _drawCachedSceneCanvas: function(context) {
            context.save();
            this.getLayer()._applyTransform(this, context);
            context._applyOpacity(this);
            context.drawImage(this._getCachedSceneCanvas()._canvas, 0, 0);
            context.restore();
          },
          _getCachedSceneCanvas: function() {
            var filters = this.filters(), cachedCanvas = this._cache.canvas, sceneCanvas = cachedCanvas.scene, filterCanvas = cachedCanvas.filter, filterContext = filterCanvas.getContext(), len, imageData, n, filter;
            if (filters) {
              if (!this._filterUpToDate) {
                try {
                  len = filters.length;
                  filterContext.clear();
                  filterContext.drawImage(sceneCanvas._canvas, 0, 0);
                  imageData = filterContext.getImageData(0, 0, filterCanvas.getWidth(), filterCanvas.getHeight());
                  for (n = 0; n < len; n++) {
                    filter = filters[n];
                    filter.call(this, imageData);
                    filterContext.putImageData(imageData, 0, 0);
                  }
                } catch (e) {
                  Kinetic.Util.warn("Unable to apply filter. " + e.message);
                }
                this._filterUpToDate = true;
              }
              return filterCanvas;
            } else {
              return sceneCanvas;
            }
          },
          _drawCachedHitCanvas: function(context) {
            var cachedCanvas = this._cache.canvas, hitCanvas = cachedCanvas.hit;
            context.save();
            this.getLayer()._applyTransform(this, context);
            context.drawImage(hitCanvas._canvas, 0, 0);
            context.restore();
          },
          /**
           * bind events to the node. KineticJS supports mouseover, mousemove,
           *  mouseout, mouseenter, mouseleave, mousedown, mouseup, mousewheel, click, dblclick, touchstart, touchmove,
           *  touchend, tap, dbltap, dragstart, dragmove, and dragend events. The Kinetic Stage supports
           *  contentMouseover, contentMousemove, contentMouseout, contentMousedown, contentMouseup,
           *  contentClick, contentDblclick, contentTouchstart, contentTouchmove, contentTouchend, contentTap,
           *  and contentDblTap.  Pass in a string of events delimmited by a space to bind multiple events at once
           *  such as 'mousedown mouseup mousemove'. Include a namespace to bind an
           *  event by name such as 'click.foobar'.
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {String} evtStr e.g. 'click', 'mousedown touchstart', 'mousedown.foo touchstart.foo'
           * @param {Function} handler The handler function is passed an event object
           * @returns {Kinetic.Node}
           * @example
           * // add click listener
           * node.on('click', function() {
           *   console.log('you clicked me!');
           * });
           *
           * // get the target node
           * node.on('click', function(evt) {
           *   console.log(evt.target);
           * });
           *
           * // stop event propagation
           * node.on('click', function(evt) {
           *   evt.cancelBubble = true;
           * });
           *
           * // bind multiple listeners
           * node.on('click touchstart', function() {
           *   console.log('you clicked/touched me!');
           * });
           *
           * // namespace listener
           * node.on('click.foo', function() {
           *   console.log('you clicked/touched me!');
           * });
           *
           * // get the event type
           * node.on('click tap', function(evt) {
           *   var eventType = evt.type;
           * });
           *
           * // get native event object
           * node.on('click tap', function(evt) {
           *   var nativeEvent = evt.evt;
           * });
           *
           * // for change events, get the old and new val
           * node.on('xChange', function(evt) {
           *   var oldVal = evt.oldVal;
           *   var newVal = evt.newVal;
           * });
           */
          on: function(evtStr, handler) {
            var events = evtStr.split(SPACE), len = events.length, n, event, parts, baseEvent, name;
            for (n = 0; n < len; n++) {
              event = events[n];
              parts = event.split(DOT);
              baseEvent = parts[0];
              name = parts[1] || EMPTY_STRING;
              if (!this.eventListeners[baseEvent]) {
                this.eventListeners[baseEvent] = [];
              }
              this.eventListeners[baseEvent].push({
                name,
                handler
              });
            }
            return this;
          },
          /**
           * remove event bindings from the node. Pass in a string of
           *  event types delimmited by a space to remove multiple event
           *  bindings at once such as 'mousedown mouseup mousemove'.
           *  include a namespace to remove an event binding by name
           *  such as 'click.foobar'. If you only give a name like '.foobar',
           *  all events in that namespace will be removed.
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {String} evtStr e.g. 'click', 'mousedown touchstart', '.foobar'
           * @returns {Kinetic.Node}
           * @example
           * // remove listener
           * node.off('click');
           *
           * // remove multiple listeners
           * node.off('click touchstart');
           *
           * // remove listener by name
           * node.off('click.foo');
           */
          off: function(evtStr) {
            var events = (evtStr || "").split(SPACE), len = events.length, n, t, event, parts, baseEvent, name;
            if (!evtStr) {
              for (t in this.eventListeners) {
                this._off(t);
              }
            }
            for (n = 0; n < len; n++) {
              event = events[n];
              parts = event.split(DOT);
              baseEvent = parts[0];
              name = parts[1];
              if (baseEvent) {
                if (this.eventListeners[baseEvent]) {
                  this._off(baseEvent, name);
                }
              } else {
                for (t in this.eventListeners) {
                  this._off(t, name);
                }
              }
            }
            return this;
          },
          // some event aliases for third party integration like HammerJS
          dispatchEvent: function(evt) {
            var e = {
              target: this,
              type: evt.type,
              evt
            };
            this.fire(evt.type, e);
          },
          addEventListener: function(type, handler) {
            this.on(type, function(evt) {
              handler.call(this, evt.evt);
            });
          },
          removeEventListener: function(type) {
            this.off(type);
          },
          /**
           * remove self from parent, but don't destroy
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Kinetic.Node}
           * @example
           * node.remove();
           */
          remove: function() {
            var parent = this.getParent();
            if (parent && parent.children) {
              parent.children.splice(this.index, 1);
              parent._setChildrenIndices();
              delete this.parent;
            }
            this._clearSelfAndDescendantCache(STAGE);
            this._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
            this._clearSelfAndDescendantCache(VISIBLE);
            this._clearSelfAndDescendantCache(LISTENING);
            this._clearSelfAndDescendantCache(ABSOLUTE_OPACITY);
            return this;
          },
          /**
           * remove and destroy self
           * @method
           * @memberof Kinetic.Node.prototype
           * @example
           * node.destroy();
           */
          destroy: function() {
            Kinetic._removeId(this.getId());
            Kinetic._removeName(this.getName(), this._id);
            this.remove();
          },
          /**
           * get attr
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {String} attr
           * @returns {Integer|String|Object|Array}
           * @example
           * var x = node.getAttr('x');
           */
          getAttr: function(attr) {
            var method = GET + Kinetic.Util._capitalize(attr);
            if (Kinetic.Util._isFunction(this[method])) {
              return this[method]();
            } else {
              return this.attrs[attr];
            }
          },
          /**
          * get ancestors
          * @method
          * @memberof Kinetic.Node.prototype
          * @returns {Kinetic.Collection}
          * @example
          * shape.getAncestors().each(function(node) {
          *   console.log(node.getId());
          * })
          */
          getAncestors: function() {
            var parent = this.getParent(), ancestors = new Kinetic.Collection();
            while (parent) {
              ancestors.push(parent);
              parent = parent.getParent();
            }
            return ancestors;
          },
          /**
           * get attrs object literal
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Object}
           */
          getAttrs: function() {
            return this.attrs || {};
          },
          /**
           * set multiple attrs at once using an object literal
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {Object} config object containing key value pairs
           * @returns {Kinetic.Node}
           * @example
           * node.setAttrs({
           *   x: 5,
           *   fill: 'red'
           * });
           */
          setAttrs: function(config) {
            var key, method;
            if (config) {
              for (key in config) {
                if (key === CHILDREN || config[key] instanceof Kinetic.Node) {
                } else {
                  method = SET + Kinetic.Util._capitalize(key);
                  if (Kinetic.Util._isFunction(this[method])) {
                    this[method](config[key]);
                  } else {
                    this._setAttr(key, config[key]);
                  }
                }
              }
            }
            return this;
          },
          /**
           * determine if node is listening for events by taking into account ancestors.
           *
           * Parent    | Self      | isListening
           * listening | listening | 
           * ----------+-----------+------------
           * T         | T         | T 
           * T         | F         | F
           * F         | T         | T 
           * F         | F         | F
           * ----------+-----------+------------
           * T         | I         | T
           * F         | I         | F
           * I         | I         | T
           *
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Boolean}
           */
          isListening: function() {
            return this._getCache(LISTENING, this._isListening);
          },
          _isListening: function() {
            var listening = this.getListening(), parent = this.getParent();
            if (listening === "inherit") {
              if (parent) {
                return parent.isListening();
              } else {
                return true;
              }
            } else {
              return listening;
            }
          },
          /**
                   * determine if node is visible by taking into account ancestors.
                   *
                   * Parent    | Self      | isVisible
                   * visible   | visible   | 
                   * ----------+-----------+------------
                   * T         | T         | T 
                   * T         | F         | F
                   * F         | T         | T 
                   * F         | F         | F
                   * ----------+-----------+------------
                   * T         | I         | T
                   * F         | I         | F
                   * I         | I         | T
          
                   * @method
                   * @memberof Kinetic.Node.prototype
                   * @returns {Boolean}
                   */
          isVisible: function() {
            return this._getCache(VISIBLE, this._isVisible);
          },
          _isVisible: function() {
            var visible = this.getVisible(), parent = this.getParent();
            if (visible === "inherit") {
              if (parent) {
                return parent.isVisible();
              } else {
                return true;
              }
            } else {
              return visible;
            }
          },
          /**
           * determine if listening is enabled by taking into account descendants.  If self or any children
           * have _isListeningEnabled set to true, then self also has listening enabled.
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Boolean}
           */
          shouldDrawHit: function(canvas) {
            var layer = this.getLayer();
            return canvas && canvas.isCache || layer && layer.hitGraphEnabled() && this.isListening() && this.isVisible();
          },
          /**
           * show node
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Kinetic.Node}
           */
          show: function() {
            this.setVisible(true);
            return this;
          },
          /**
           * hide node.  Hidden nodes are no longer detectable
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Kinetic.Node}
           */
          hide: function() {
            this.setVisible(false);
            return this;
          },
          /**
           * get zIndex relative to the node's siblings who share the same parent
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Integer}
           */
          getZIndex: function() {
            return this.index || 0;
          },
          /**
           * get absolute z-index which takes into account sibling
           *  and ancestor indices
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Integer}
           */
          getAbsoluteZIndex: function() {
            var depth = this.getDepth(), that = this, index = 0, nodes, len, n, child;
            function addChildren(children) {
              nodes = [];
              len = children.length;
              for (n = 0; n < len; n++) {
                child = children[n];
                index++;
                if (child.nodeType !== SHAPE) {
                  nodes = nodes.concat(child.getChildren().toArray());
                }
                if (child._id === that._id) {
                  n = len;
                }
              }
              if (nodes.length > 0 && nodes[0].getDepth() <= depth) {
                addChildren(nodes);
              }
            }
            if (that.nodeType !== UPPER_STAGE) {
              addChildren(that.getStage().getChildren());
            }
            return index;
          },
          /**
           * get node depth in node tree.  Returns an integer.
           *  e.g. Stage depth will always be 0.  Layers will always be 1.  Groups and Shapes will always
           *  be >= 2
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Integer}
           */
          getDepth: function() {
            var depth = 0, parent = this.parent;
            while (parent) {
              depth++;
              parent = parent.parent;
            }
            return depth;
          },
          setPosition: function(pos) {
            this.setX(pos.x);
            this.setY(pos.y);
            return this;
          },
          getPosition: function() {
            return {
              x: this.getX(),
              y: this.getY()
            };
          },
          /**
           * get absolute position relative to the top left corner of the stage container div
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Object}
           */
          getAbsolutePosition: function() {
            var absoluteMatrix = this.getAbsoluteTransform().getMatrix(), absoluteTransform = new Kinetic.Transform(), offset = this.offset();
            absoluteTransform.m = absoluteMatrix.slice();
            absoluteTransform.translate(offset.x, offset.y);
            return absoluteTransform.getTranslation();
          },
          /**
           * set absolute position
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {Object} pos
           * @param {Number} pos.x
           * @param {Number} pos.y
           * @returns {Kinetic.Node}
           */
          setAbsolutePosition: function(pos) {
            var origTrans = this._clearTransform(), it;
            this.attrs.x = origTrans.x;
            this.attrs.y = origTrans.y;
            delete origTrans.x;
            delete origTrans.y;
            it = this.getAbsoluteTransform();
            it.invert();
            it.translate(pos.x, pos.y);
            pos = {
              x: this.attrs.x + it.getTranslation().x,
              y: this.attrs.y + it.getTranslation().y
            };
            this.setPosition({ x: pos.x, y: pos.y });
            this._setTransform(origTrans);
            return this;
          },
          _setTransform: function(trans) {
            var key;
            for (key in trans) {
              this.attrs[key] = trans[key];
            }
            this._clearCache(TRANSFORM);
            this._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
          },
          _clearTransform: function() {
            var trans = {
              x: this.getX(),
              y: this.getY(),
              rotation: this.getRotation(),
              scaleX: this.getScaleX(),
              scaleY: this.getScaleY(),
              offsetX: this.getOffsetX(),
              offsetY: this.getOffsetY(),
              skewX: this.getSkewX(),
              skewY: this.getSkewY()
            };
            this.attrs.x = 0;
            this.attrs.y = 0;
            this.attrs.rotation = 0;
            this.attrs.scaleX = 1;
            this.attrs.scaleY = 1;
            this.attrs.offsetX = 0;
            this.attrs.offsetY = 0;
            this.attrs.skewX = 0;
            this.attrs.skewY = 0;
            this._clearCache(TRANSFORM);
            this._clearSelfAndDescendantCache(ABSOLUTE_TRANSFORM);
            return trans;
          },
          /**
           * move node by an amount relative to its current position
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {Object} change
           * @param {Number} change.x
           * @param {Number} change.y
           * @returns {Kinetic.Node}
           * @example
           * // move node in x direction by 1px and y direction by 2px
           * node.move({
           *   x: 1,
           *   y: 2)
           * });
           */
          move: function(change) {
            var changeX = change.x, changeY = change.y, x = this.getX(), y = this.getY();
            if (changeX !== void 0) {
              x += changeX;
            }
            if (changeY !== void 0) {
              y += changeY;
            }
            this.setPosition({ x, y });
            return this;
          },
          _eachAncestorReverse: function(func, top) {
            var family = [], parent = this.getParent(), len, n;
            if (top && top._id === this._id) {
              func(this);
              return true;
            }
            family.unshift(this);
            while (parent && (!top || parent._id !== top._id)) {
              family.unshift(parent);
              parent = parent.parent;
            }
            len = family.length;
            for (n = 0; n < len; n++) {
              func(family[n]);
            }
          },
          /**
           * rotate node by an amount in degrees relative to its current rotation
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {Number} theta
           * @returns {Kinetic.Node}
           */
          rotate: function(theta) {
            this.setRotation(this.getRotation() + theta);
            return this;
          },
          /**
           * move node to the top of its siblings
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Boolean}
           */
          moveToTop: function() {
            if (!this.parent) {
              Kinetic.Util.warn("Node has no parent. moveToTop function is ignored.");
              return;
            }
            var index = this.index;
            this.parent.children.splice(index, 1);
            this.parent.children.push(this);
            this.parent._setChildrenIndices();
            return true;
          },
          /**
           * move node up
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Boolean}
           */
          moveUp: function() {
            if (!this.parent) {
              Kinetic.Util.warn("Node has no parent. moveUp function is ignored.");
              return;
            }
            var index = this.index, len = this.parent.getChildren().length;
            if (index < len - 1) {
              this.parent.children.splice(index, 1);
              this.parent.children.splice(index + 1, 0, this);
              this.parent._setChildrenIndices();
              return true;
            }
            return false;
          },
          /**
           * move node down
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Boolean}
           */
          moveDown: function() {
            if (!this.parent) {
              Kinetic.Util.warn("Node has no parent. moveDown function is ignored.");
              return;
            }
            var index = this.index;
            if (index > 0) {
              this.parent.children.splice(index, 1);
              this.parent.children.splice(index - 1, 0, this);
              this.parent._setChildrenIndices();
              return true;
            }
            return false;
          },
          /**
           * move node to the bottom of its siblings
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Boolean}
           */
          moveToBottom: function() {
            if (!this.parent) {
              Kinetic.Util.warn("Node has no parent. moveToBottom function is ignored.");
              return;
            }
            var index = this.index;
            if (index > 0) {
              this.parent.children.splice(index, 1);
              this.parent.children.unshift(this);
              this.parent._setChildrenIndices();
              return true;
            }
            return false;
          },
          /**
           * set zIndex relative to siblings
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {Integer} zIndex
           * @returns {Kinetic.Node}
           */
          setZIndex: function(zIndex) {
            if (!this.parent) {
              Kinetic.Util.warn("Node has no parent. zIndex parameter is ignored.");
              return;
            }
            var index = this.index;
            this.parent.children.splice(index, 1);
            this.parent.children.splice(zIndex, 0, this);
            this.parent._setChildrenIndices();
            return this;
          },
          /**
           * get absolute opacity
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Number}
           */
          getAbsoluteOpacity: function() {
            return this._getCache(ABSOLUTE_OPACITY, this._getAbsoluteOpacity);
          },
          _getAbsoluteOpacity: function() {
            var absOpacity = this.getOpacity();
            if (this.getParent()) {
              absOpacity *= this.getParent().getAbsoluteOpacity();
            }
            return absOpacity;
          },
          /**
           * move node to another container
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {Container} newContainer
           * @returns {Kinetic.Node}
           * @example
           * // move node from current layer into layer2
           * node.moveTo(layer2);
           */
          moveTo: function(newContainer) {
            if (this.getParent() !== newContainer) {
              this.remove();
              newContainer.add(this);
            }
            return this;
          },
          /**
           * convert Node into an object for serialization.  Returns an object.
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Object}
           */
          toObject: function() {
            var type = Kinetic.Util, obj = {}, attrs = this.getAttrs(), key, val, getter, defaultValue;
            obj.attrs = {};
            for (key in attrs) {
              val = attrs[key];
              if (!type._isFunction(val) && !type._isElement(val) && !(type._isObject(val) && type._hasMethods(val))) {
                getter = this[key];
                delete attrs[key];
                defaultValue = getter ? getter.call(this) : null;
                attrs[key] = val;
                if (defaultValue !== val) {
                  obj.attrs[key] = val;
                }
              }
            }
            obj.className = this.getClassName();
            return obj;
          },
          /**
           * convert Node into a JSON string.  Returns a JSON string.
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {String}}
           */
          toJSON: function() {
            return JSON.stringify(this.toObject());
          },
          /**
           * get parent container
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Kinetic.Node}
           */
          getParent: function() {
            return this.parent;
          },
          /**
           * get layer ancestor
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Kinetic.Layer}
           */
          getLayer: function() {
            var parent = this.getParent();
            return parent ? parent.getLayer() : null;
          },
          /**
           * get stage ancestor
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Kinetic.Stage}
           */
          getStage: function() {
            return this._getCache(STAGE, this._getStage);
          },
          _getStage: function() {
            var parent = this.getParent();
            if (parent) {
              return parent.getStage();
            } else {
              return void 0;
            }
          },
          /**
           * fire event
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {String} eventType event type.  can be a regular event, like click, mouseover, or mouseout, or it can be a custom event, like myCustomEvent
           * @param {Event} [evt] event object
           * @param {Boolean} [bubble] setting the value to false, or leaving it undefined, will result in the event
           *  not bubbling.  Setting the value to true will result in the event bubbling.
           * @returns {Kinetic.Node}
           * @example
           * // manually fire click event
           * node.fire('click');
           *
           * // fire custom event
           * node.fire('foo');
           *
           * // fire custom event with custom event object
           * node.fire('foo', {
           *   bar: 10
           * });
           *
           * // fire click event that bubbles
           * node.fire('click', null, true);
           */
          fire: function(eventType, evt, bubble) {
            if (bubble) {
              this._fireAndBubble(eventType, evt || {});
            } else {
              this._fire(eventType, evt || {});
            }
            return this;
          },
          /**
           * get absolute transform of the node which takes into
           *  account its ancestor transforms
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Kinetic.Transform}
           */
          getAbsoluteTransform: function(top) {
            if (top) {
              return this._getAbsoluteTransform(top);
            } else {
              return this._getCache(ABSOLUTE_TRANSFORM, this._getAbsoluteTransform);
            }
          },
          _getAbsoluteTransform: function(top) {
            var at = new Kinetic.Transform(), transformsEnabled, trans;
            this._eachAncestorReverse(function(node) {
              transformsEnabled = node.transformsEnabled();
              trans = node.getTransform();
              if (transformsEnabled === "all") {
                at.multiply(trans);
              } else if (transformsEnabled === "position") {
                at.translate(node.x(), node.y());
              }
            }, top);
            return at;
          },
          /**
           * get transform of the node
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Kinetic.Transform}
           */
          getTransform: function() {
            return this._getCache(TRANSFORM, this._getTransform);
          },
          _getTransform: function() {
            var m = new Kinetic.Transform(), x = this.getX(), y = this.getY(), rotation = Kinetic.getAngle(this.getRotation()), scaleX = this.getScaleX(), scaleY = this.getScaleY(), skewX = this.getSkewX(), skewY = this.getSkewY(), offsetX = this.getOffsetX(), offsetY = this.getOffsetY();
            if (x !== 0 || y !== 0) {
              m.translate(x, y);
            }
            if (rotation !== 0) {
              m.rotate(rotation);
            }
            if (skewX !== 0 || skewY !== 0) {
              m.skew(skewX, skewY);
            }
            if (scaleX !== 1 || scaleY !== 1) {
              m.scale(scaleX, scaleY);
            }
            if (offsetX !== 0 || offsetY !== 0) {
              m.translate(-1 * offsetX, -1 * offsetY);
            }
            return m;
          },
          /**
           * clone node.  Returns a new Node instance with identical attributes.  You can also override
           *  the node properties with an object literal, enabling you to use an existing node as a template
           *  for another node
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {Object} obj override attrs
           * @returns {Kinetic.Node}
           * @example
           * // simple clone
           * var clone = node.clone();
           *
           * // clone a node and override the x position
           * var clone = rect.clone({
           *   x: 5
           * });
           */
          clone: function(obj) {
            var className = this.getClassName(), attrs = Kinetic.Util.cloneObject(this.attrs), key, allListeners, len, n, listener;
            for (var i in CLONE_BLACK_LIST) {
              var blockAttr = CLONE_BLACK_LIST[i];
              delete attrs[blockAttr];
            }
            for (key in obj) {
              attrs[key] = obj[key];
            }
            var node = new Kinetic[className](attrs);
            for (key in this.eventListeners) {
              allListeners = this.eventListeners[key];
              len = allListeners.length;
              for (n = 0; n < len; n++) {
                listener = allListeners[n];
                if (listener.name.indexOf(KINETIC) < 0) {
                  if (!node.eventListeners[key]) {
                    node.eventListeners[key] = [];
                  }
                  node.eventListeners[key].push(listener);
                }
              }
            }
            return node;
          },
          /**
           * Creates a composite data URL. If MIME type is not
           * specified, then "image/png" will result. For "image/jpeg", specify a quality
           * level as quality (range 0.0 - 1.0)
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {Object} config
           * @param {String} [config.mimeType] can be "image/png" or "image/jpeg".
           *  "image/png" is the default
           * @param {Number} [config.x] x position of canvas section
           * @param {Number} [config.y] y position of canvas section
           * @param {Number} [config.width] width of canvas section
           * @param {Number} [config.height] height of canvas section
           * @param {Number} [config.quality] jpeg quality.  If using an "image/jpeg" mimeType,
           *  you can specify the quality from 0 to 1, where 0 is very poor quality and 1
           *  is very high quality
           * @returns {String}
           */
          toDataURL: function(config) {
            config = config || {};
            var mimeType = config.mimeType || null, quality = config.quality || null, stage = this.getStage(), x = config.x || 0, y = config.y || 0, canvas = new Kinetic.SceneCanvas({
              width: config.width || this.getWidth() || (stage ? stage.getWidth() : 0),
              height: config.height || this.getHeight() || (stage ? stage.getHeight() : 0),
              pixelRatio: 1
            }), context = canvas.getContext();
            context.save();
            if (x || y) {
              context.translate(-1 * x, -1 * y);
            }
            this.drawScene(canvas);
            context.restore();
            return canvas.toDataURL(mimeType, quality);
          },
          /**
           * converts node into an image.  Since the toImage
           *  method is asynchronous, a callback is required.  toImage is most commonly used
           *  to cache complex drawings as an image so that they don't have to constantly be redrawn
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {Object} config
           * @param {Function} config.callback function executed when the composite has completed
           * @param {String} [config.mimeType] can be "image/png" or "image/jpeg".
           *  "image/png" is the default
           * @param {Number} [config.x] x position of canvas section
           * @param {Number} [config.y] y position of canvas section
           * @param {Number} [config.width] width of canvas section
           * @param {Number} [config.height] height of canvas section
           * @param {Number} [config.quality] jpeg quality.  If using an "image/jpeg" mimeType,
           *  you can specify the quality from 0 to 1, where 0 is very poor quality and 1
           *  is very high quality
           * @example
           * var image = node.toImage({
           *   callback: function(img) {
           *     // do stuff with img
           *   }
           * });
           */
          toImage: function(config) {
            Kinetic.Util._getImage(this.toDataURL(config), function(img) {
              config.callback(img);
            });
          },
          setSize: function(size) {
            this.setWidth(size.width);
            this.setHeight(size.height);
            return this;
          },
          getSize: function() {
            return {
              width: this.getWidth(),
              height: this.getHeight()
            };
          },
          getWidth: function() {
            return this.attrs.width || 0;
          },
          getHeight: function() {
            return this.attrs.height || 0;
          },
          /**
           * get class name, which may return Stage, Layer, Group, or shape class names like Rect, Circle, Text, etc.
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {String}
           */
          getClassName: function() {
            return this.className || this.nodeType;
          },
          /**
           * get the node type, which may return Stage, Layer, Group, or Node
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {String}
           */
          getType: function() {
            return this.nodeType;
          },
          getDragDistance: function() {
            if (this.attrs.dragDistance !== void 0) {
              return this.attrs.dragDistance;
            } else if (this.parent) {
              return this.parent.getDragDistance();
            } else {
              return Kinetic.dragDistance;
            }
          },
          _get: function(selector) {
            return this.className === selector || this.nodeType === selector ? [this] : [];
          },
          _off: function(type, name) {
            var evtListeners = this.eventListeners[type], i, evtName;
            for (i = 0; i < evtListeners.length; i++) {
              evtName = evtListeners[i].name;
              if ((evtName !== "kinetic" || name === "kinetic") && (!name || evtName === name)) {
                evtListeners.splice(i, 1);
                if (evtListeners.length === 0) {
                  delete this.eventListeners[type];
                  break;
                }
                i--;
              }
            }
          },
          _fireChangeEvent: function(attr, oldVal, newVal) {
            this._fire(attr + CHANGE, {
              oldVal,
              newVal
            });
          },
          setId: function(id) {
            var oldId = this.getId();
            Kinetic._removeId(oldId);
            Kinetic._addId(this, id);
            this._setAttr(ID, id);
            return this;
          },
          setName: function(name) {
            var oldName = this.getName();
            Kinetic._removeName(oldName, this._id);
            Kinetic._addName(this, name);
            this._setAttr(NAME, name);
            return this;
          },
          /**
           * set attr
           * @method
           * @memberof Kinetic.Node.prototype
           * @param {String} attr
           * @param {*} val
           * @returns {Kinetic.Node}
           * @example
           * node.setAttr('x', 5);
           */
          setAttr: function(attr, val) {
            var method = SET + Kinetic.Util._capitalize(attr), func = this[method];
            if (Kinetic.Util._isFunction(func)) {
              func.call(this, val);
            } else {
              this._setAttr(attr, val);
            }
            return this;
          },
          _setAttr: function(key, val) {
            var oldVal;
            if (val !== void 0) {
              oldVal = this.attrs[key];
              this.attrs[key] = val;
              this._fireChangeEvent(key, oldVal, val);
            }
          },
          _setComponentAttr: function(key, component, val) {
            var oldVal;
            if (val !== void 0) {
              oldVal = this.attrs[key];
              if (!oldVal) {
                this.attrs[key] = this.getAttr(key);
              }
              this.attrs[key][component] = val;
              this._fireChangeEvent(key, oldVal, val);
            }
          },
          _fireAndBubble: function(eventType, evt, compareShape) {
            var okayToRun = true;
            if (evt && this.nodeType === SHAPE) {
              evt.target = this;
            }
            if (eventType === MOUSEENTER && compareShape && (this._id === compareShape._id || this.isAncestorOf && this.isAncestorOf(compareShape))) {
              okayToRun = false;
            } else if (eventType === MOUSELEAVE && compareShape && (this._id === compareShape._id || this.isAncestorOf && this.isAncestorOf(compareShape))) {
              okayToRun = false;
            }
            if (okayToRun) {
              this._fire(eventType, evt);
              var stopBubble = (eventType === MOUSEENTER || eventType === MOUSELEAVE) && (compareShape && compareShape.isAncestorOf && compareShape.isAncestorOf(this) || !!(compareShape && compareShape.isAncestorOf));
              if (evt && !evt.cancelBubble && this.parent && this.parent.isListening() && !stopBubble) {
                if (compareShape && compareShape.parent) {
                  this._fireAndBubble.call(this.parent, eventType, evt, compareShape.parent);
                } else {
                  this._fireAndBubble.call(this.parent, eventType, evt);
                }
              }
            }
          },
          _fire: function(eventType, evt) {
            var events = this.eventListeners[eventType], i;
            evt.type = eventType;
            if (events) {
              for (i = 0; i < events.length; i++) {
                events[i].handler.call(this, evt);
              }
            }
          },
          /**
           * draw both scene and hit graphs.  If the node being drawn is the stage, all of the layers will be cleared and redrawn
           * @method
           * @memberof Kinetic.Node.prototype
           * @returns {Kinetic.Node}
           */
          draw: function() {
            this.drawScene();
            this.drawHit();
            return this;
          }
        });
        Kinetic.Node.create = function(json, container) {
          return this._createNode(JSON.parse(json), container);
        };
        Kinetic.Node._createNode = function(obj, container) {
          var className = Kinetic.Node.prototype.getClassName.call(obj), children = obj.children, no, len, n;
          if (container) {
            obj.attrs.container = container;
          }
          no = new Kinetic[className](obj.attrs);
          if (children) {
            len = children.length;
            for (n = 0; n < len; n++) {
              no.add(this._createNode(children[n]));
            }
          }
          return no;
        };
        Kinetic.Factory.addOverloadedGetterSetter(Kinetic.Node, "position");
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "x", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "y", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "opacity", 1);
        Kinetic.Factory.addGetter(Kinetic.Node, "name");
        Kinetic.Factory.addOverloadedGetterSetter(Kinetic.Node, "name");
        Kinetic.Factory.addGetter(Kinetic.Node, "id");
        Kinetic.Factory.addOverloadedGetterSetter(Kinetic.Node, "id");
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "rotation", 0);
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Node, "scale", ["x", "y"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "scaleX", 1);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "scaleY", 1);
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Node, "skew", ["x", "y"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "skewX", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "skewY", 0);
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Node, "offset", ["x", "y"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "offsetX", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "offsetY", 0);
        Kinetic.Factory.addSetter(Kinetic.Node, "dragDistance");
        Kinetic.Factory.addOverloadedGetterSetter(Kinetic.Node, "dragDistance");
        Kinetic.Factory.addSetter(Kinetic.Node, "width", 0);
        Kinetic.Factory.addOverloadedGetterSetter(Kinetic.Node, "width");
        Kinetic.Factory.addSetter(Kinetic.Node, "height", 0);
        Kinetic.Factory.addOverloadedGetterSetter(Kinetic.Node, "height");
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "listening", "inherit");
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "filters", void 0, function(val) {
          this._filterUpToDate = false;
          return val;
        });
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "visible", "inherit");
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "transformsEnabled", "all");
        Kinetic.Factory.addOverloadedGetterSetter(Kinetic.Node, "size");
        Kinetic.Factory.backCompat(Kinetic.Node, {
          rotateDeg: "rotate",
          setRotationDeg: "setRotation",
          getRotationDeg: "getRotation"
        });
        Kinetic.Collection.mapMethods(Kinetic.Node);
      })();
      (function() {
        Kinetic.Filters.Grayscale = function(imageData) {
          var data = imageData.data, len = data.length, i, brightness;
          for (i = 0; i < len; i += 4) {
            brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
            data[i] = brightness;
            data[i + 1] = brightness;
            data[i + 2] = brightness;
          }
        };
      })();
      (function() {
        Kinetic.Filters.Brighten = function(imageData) {
          var brightness = this.brightness() * 255, data = imageData.data, len = data.length, i;
          for (i = 0; i < len; i += 4) {
            data[i] += brightness;
            data[i + 1] += brightness;
            data[i + 2] += brightness;
          }
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "brightness", 0, null, Kinetic.Factory.afterSetFilter);
      })();
      (function() {
        Kinetic.Filters.Invert = function(imageData) {
          var data = imageData.data, len = data.length, i;
          for (i = 0; i < len; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
          }
        };
      })();
      (function() {
        function BlurStack() {
          this.r = 0;
          this.g = 0;
          this.b = 0;
          this.a = 0;
          this.next = null;
        }
        var mul_table = [
          512,
          512,
          456,
          512,
          328,
          456,
          335,
          512,
          405,
          328,
          271,
          456,
          388,
          335,
          292,
          512,
          454,
          405,
          364,
          328,
          298,
          271,
          496,
          456,
          420,
          388,
          360,
          335,
          312,
          292,
          273,
          512,
          482,
          454,
          428,
          405,
          383,
          364,
          345,
          328,
          312,
          298,
          284,
          271,
          259,
          496,
          475,
          456,
          437,
          420,
          404,
          388,
          374,
          360,
          347,
          335,
          323,
          312,
          302,
          292,
          282,
          273,
          265,
          512,
          497,
          482,
          468,
          454,
          441,
          428,
          417,
          405,
          394,
          383,
          373,
          364,
          354,
          345,
          337,
          328,
          320,
          312,
          305,
          298,
          291,
          284,
          278,
          271,
          265,
          259,
          507,
          496,
          485,
          475,
          465,
          456,
          446,
          437,
          428,
          420,
          412,
          404,
          396,
          388,
          381,
          374,
          367,
          360,
          354,
          347,
          341,
          335,
          329,
          323,
          318,
          312,
          307,
          302,
          297,
          292,
          287,
          282,
          278,
          273,
          269,
          265,
          261,
          512,
          505,
          497,
          489,
          482,
          475,
          468,
          461,
          454,
          447,
          441,
          435,
          428,
          422,
          417,
          411,
          405,
          399,
          394,
          389,
          383,
          378,
          373,
          368,
          364,
          359,
          354,
          350,
          345,
          341,
          337,
          332,
          328,
          324,
          320,
          316,
          312,
          309,
          305,
          301,
          298,
          294,
          291,
          287,
          284,
          281,
          278,
          274,
          271,
          268,
          265,
          262,
          259,
          257,
          507,
          501,
          496,
          491,
          485,
          480,
          475,
          470,
          465,
          460,
          456,
          451,
          446,
          442,
          437,
          433,
          428,
          424,
          420,
          416,
          412,
          408,
          404,
          400,
          396,
          392,
          388,
          385,
          381,
          377,
          374,
          370,
          367,
          363,
          360,
          357,
          354,
          350,
          347,
          344,
          341,
          338,
          335,
          332,
          329,
          326,
          323,
          320,
          318,
          315,
          312,
          310,
          307,
          304,
          302,
          299,
          297,
          294,
          292,
          289,
          287,
          285,
          282,
          280,
          278,
          275,
          273,
          271,
          269,
          267,
          265,
          263,
          261,
          259
        ];
        var shg_table = [
          9,
          11,
          12,
          13,
          13,
          14,
          14,
          15,
          15,
          15,
          15,
          16,
          16,
          16,
          16,
          17,
          17,
          17,
          17,
          17,
          17,
          17,
          18,
          18,
          18,
          18,
          18,
          18,
          18,
          18,
          18,
          19,
          19,
          19,
          19,
          19,
          19,
          19,
          19,
          19,
          19,
          19,
          19,
          19,
          19,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          20,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          21,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          22,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          23,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24,
          24
        ];
        function filterGaussBlurRGBA(imageData, radius) {
          var pixels = imageData.data, width = imageData.width, height = imageData.height;
          var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum, a_sum, r_out_sum, g_out_sum, b_out_sum, a_out_sum, r_in_sum, g_in_sum, b_in_sum, a_in_sum, pr, pg, pb, pa, rbs;
          var div = radius + radius + 1, widthMinus1 = width - 1, heightMinus1 = height - 1, radiusPlus1 = radius + 1, sumFactor = radiusPlus1 * (radiusPlus1 + 1) / 2, stackStart = new BlurStack(), stackEnd = null, stack = stackStart, stackIn = null, stackOut = null, mul_sum = mul_table[radius], shg_sum = shg_table[radius];
          for (i = 1; i < div; i++) {
            stack = stack.next = new BlurStack();
            if (i == radiusPlus1) {
              stackEnd = stack;
            }
          }
          stack.next = stackStart;
          yw = yi = 0;
          for (y = 0; y < height; y++) {
            r_in_sum = g_in_sum = b_in_sum = a_in_sum = r_sum = g_sum = b_sum = a_sum = 0;
            r_out_sum = radiusPlus1 * (pr = pixels[yi]);
            g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
            b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
            a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);
            r_sum += sumFactor * pr;
            g_sum += sumFactor * pg;
            b_sum += sumFactor * pb;
            a_sum += sumFactor * pa;
            stack = stackStart;
            for (i = 0; i < radiusPlus1; i++) {
              stack.r = pr;
              stack.g = pg;
              stack.b = pb;
              stack.a = pa;
              stack = stack.next;
            }
            for (i = 1; i < radiusPlus1; i++) {
              p = yi + ((widthMinus1 < i ? widthMinus1 : i) << 2);
              r_sum += (stack.r = pr = pixels[p]) * (rbs = radiusPlus1 - i);
              g_sum += (stack.g = pg = pixels[p + 1]) * rbs;
              b_sum += (stack.b = pb = pixels[p + 2]) * rbs;
              a_sum += (stack.a = pa = pixels[p + 3]) * rbs;
              r_in_sum += pr;
              g_in_sum += pg;
              b_in_sum += pb;
              a_in_sum += pa;
              stack = stack.next;
            }
            stackIn = stackStart;
            stackOut = stackEnd;
            for (x = 0; x < width; x++) {
              pixels[yi + 3] = pa = a_sum * mul_sum >> shg_sum;
              if (pa !== 0) {
                pa = 255 / pa;
                pixels[yi] = (r_sum * mul_sum >> shg_sum) * pa;
                pixels[yi + 1] = (g_sum * mul_sum >> shg_sum) * pa;
                pixels[yi + 2] = (b_sum * mul_sum >> shg_sum) * pa;
              } else {
                pixels[yi] = pixels[yi + 1] = pixels[yi + 2] = 0;
              }
              r_sum -= r_out_sum;
              g_sum -= g_out_sum;
              b_sum -= b_out_sum;
              a_sum -= a_out_sum;
              r_out_sum -= stackIn.r;
              g_out_sum -= stackIn.g;
              b_out_sum -= stackIn.b;
              a_out_sum -= stackIn.a;
              p = yw + ((p = x + radius + 1) < widthMinus1 ? p : widthMinus1) << 2;
              r_in_sum += stackIn.r = pixels[p];
              g_in_sum += stackIn.g = pixels[p + 1];
              b_in_sum += stackIn.b = pixels[p + 2];
              a_in_sum += stackIn.a = pixels[p + 3];
              r_sum += r_in_sum;
              g_sum += g_in_sum;
              b_sum += b_in_sum;
              a_sum += a_in_sum;
              stackIn = stackIn.next;
              r_out_sum += pr = stackOut.r;
              g_out_sum += pg = stackOut.g;
              b_out_sum += pb = stackOut.b;
              a_out_sum += pa = stackOut.a;
              r_in_sum -= pr;
              g_in_sum -= pg;
              b_in_sum -= pb;
              a_in_sum -= pa;
              stackOut = stackOut.next;
              yi += 4;
            }
            yw += width;
          }
          for (x = 0; x < width; x++) {
            g_in_sum = b_in_sum = a_in_sum = r_in_sum = g_sum = b_sum = a_sum = r_sum = 0;
            yi = x << 2;
            r_out_sum = radiusPlus1 * (pr = pixels[yi]);
            g_out_sum = radiusPlus1 * (pg = pixels[yi + 1]);
            b_out_sum = radiusPlus1 * (pb = pixels[yi + 2]);
            a_out_sum = radiusPlus1 * (pa = pixels[yi + 3]);
            r_sum += sumFactor * pr;
            g_sum += sumFactor * pg;
            b_sum += sumFactor * pb;
            a_sum += sumFactor * pa;
            stack = stackStart;
            for (i = 0; i < radiusPlus1; i++) {
              stack.r = pr;
              stack.g = pg;
              stack.b = pb;
              stack.a = pa;
              stack = stack.next;
            }
            yp = width;
            for (i = 1; i <= radius; i++) {
              yi = yp + x << 2;
              r_sum += (stack.r = pr = pixels[yi]) * (rbs = radiusPlus1 - i);
              g_sum += (stack.g = pg = pixels[yi + 1]) * rbs;
              b_sum += (stack.b = pb = pixels[yi + 2]) * rbs;
              a_sum += (stack.a = pa = pixels[yi + 3]) * rbs;
              r_in_sum += pr;
              g_in_sum += pg;
              b_in_sum += pb;
              a_in_sum += pa;
              stack = stack.next;
              if (i < heightMinus1) {
                yp += width;
              }
            }
            yi = x;
            stackIn = stackStart;
            stackOut = stackEnd;
            for (y = 0; y < height; y++) {
              p = yi << 2;
              pixels[p + 3] = pa = a_sum * mul_sum >> shg_sum;
              if (pa > 0) {
                pa = 255 / pa;
                pixels[p] = (r_sum * mul_sum >> shg_sum) * pa;
                pixels[p + 1] = (g_sum * mul_sum >> shg_sum) * pa;
                pixels[p + 2] = (b_sum * mul_sum >> shg_sum) * pa;
              } else {
                pixels[p] = pixels[p + 1] = pixels[p + 2] = 0;
              }
              r_sum -= r_out_sum;
              g_sum -= g_out_sum;
              b_sum -= b_out_sum;
              a_sum -= a_out_sum;
              r_out_sum -= stackIn.r;
              g_out_sum -= stackIn.g;
              b_out_sum -= stackIn.b;
              a_out_sum -= stackIn.a;
              p = x + ((p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1) * width << 2;
              r_sum += r_in_sum += stackIn.r = pixels[p];
              g_sum += g_in_sum += stackIn.g = pixels[p + 1];
              b_sum += b_in_sum += stackIn.b = pixels[p + 2];
              a_sum += a_in_sum += stackIn.a = pixels[p + 3];
              stackIn = stackIn.next;
              r_out_sum += pr = stackOut.r;
              g_out_sum += pg = stackOut.g;
              b_out_sum += pb = stackOut.b;
              a_out_sum += pa = stackOut.a;
              r_in_sum -= pr;
              g_in_sum -= pg;
              b_in_sum -= pb;
              a_in_sum -= pa;
              stackOut = stackOut.next;
              yi += width;
            }
          }
        }
        Kinetic.Filters.Blur = function Blur(imageData) {
          var radius = Math.round(this.blurRadius());
          if (radius > 0) {
            filterGaussBlurRGBA(imageData, radius);
          }
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "blurRadius", 0, null, Kinetic.Factory.afterSetFilter);
      })();
      (function() {
        function pixelAt(idata, x, y) {
          var idx = (y * idata.width + x) * 4;
          var d = [];
          d.push(idata.data[idx++], idata.data[idx++], idata.data[idx++], idata.data[idx++]);
          return d;
        }
        function rgbDistance(p1, p2) {
          return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2) + Math.pow(p1[2] - p2[2], 2));
        }
        function rgbMean(pTab) {
          var m = [0, 0, 0];
          for (var i = 0; i < pTab.length; i++) {
            m[0] += pTab[i][0];
            m[1] += pTab[i][1];
            m[2] += pTab[i][2];
          }
          m[0] /= pTab.length;
          m[1] /= pTab.length;
          m[2] /= pTab.length;
          return m;
        }
        function backgroundMask(idata, threshold) {
          var rgbv_no = pixelAt(idata, 0, 0);
          var rgbv_ne = pixelAt(idata, idata.width - 1, 0);
          var rgbv_so = pixelAt(idata, 0, idata.height - 1);
          var rgbv_se = pixelAt(idata, idata.width - 1, idata.height - 1);
          var thres = threshold || 10;
          if (rgbDistance(rgbv_no, rgbv_ne) < thres && rgbDistance(rgbv_ne, rgbv_se) < thres && rgbDistance(rgbv_se, rgbv_so) < thres && rgbDistance(rgbv_so, rgbv_no) < thres) {
            var mean = rgbMean([rgbv_ne, rgbv_no, rgbv_se, rgbv_so]);
            var mask = [];
            for (var i = 0; i < idata.width * idata.height; i++) {
              var d = rgbDistance(mean, [idata.data[i * 4], idata.data[i * 4 + 1], idata.data[i * 4 + 2]]);
              mask[i] = d < thres ? 0 : 255;
            }
            return mask;
          }
        }
        function applyMask(idata, mask) {
          for (var i = 0; i < idata.width * idata.height; i++) {
            idata.data[4 * i + 3] = mask[i];
          }
        }
        function erodeMask(mask, sw, sh) {
          var weights = [1, 1, 1, 1, 0, 1, 1, 1, 1];
          var side = Math.round(Math.sqrt(weights.length));
          var halfSide = Math.floor(side / 2);
          var maskResult = [];
          for (var y = 0; y < sh; y++) {
            for (var x = 0; x < sw; x++) {
              var so = y * sw + x;
              var a = 0;
              for (var cy = 0; cy < side; cy++) {
                for (var cx = 0; cx < side; cx++) {
                  var scy = y + cy - halfSide;
                  var scx = x + cx - halfSide;
                  if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                    var srcOff = scy * sw + scx;
                    var wt = weights[cy * side + cx];
                    a += mask[srcOff] * wt;
                  }
                }
              }
              maskResult[so] = a === 255 * 8 ? 255 : 0;
            }
          }
          return maskResult;
        }
        function dilateMask(mask, sw, sh) {
          var weights = [1, 1, 1, 1, 1, 1, 1, 1, 1];
          var side = Math.round(Math.sqrt(weights.length));
          var halfSide = Math.floor(side / 2);
          var maskResult = [];
          for (var y = 0; y < sh; y++) {
            for (var x = 0; x < sw; x++) {
              var so = y * sw + x;
              var a = 0;
              for (var cy = 0; cy < side; cy++) {
                for (var cx = 0; cx < side; cx++) {
                  var scy = y + cy - halfSide;
                  var scx = x + cx - halfSide;
                  if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                    var srcOff = scy * sw + scx;
                    var wt = weights[cy * side + cx];
                    a += mask[srcOff] * wt;
                  }
                }
              }
              maskResult[so] = a >= 255 * 4 ? 255 : 0;
            }
          }
          return maskResult;
        }
        function smoothEdgeMask(mask, sw, sh) {
          var weights = [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9];
          var side = Math.round(Math.sqrt(weights.length));
          var halfSide = Math.floor(side / 2);
          var maskResult = [];
          for (var y = 0; y < sh; y++) {
            for (var x = 0; x < sw; x++) {
              var so = y * sw + x;
              var a = 0;
              for (var cy = 0; cy < side; cy++) {
                for (var cx = 0; cx < side; cx++) {
                  var scy = y + cy - halfSide;
                  var scx = x + cx - halfSide;
                  if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                    var srcOff = scy * sw + scx;
                    var wt = weights[cy * side + cx];
                    a += mask[srcOff] * wt;
                  }
                }
              }
              maskResult[so] = a;
            }
          }
          return maskResult;
        }
        Kinetic.Filters.Mask = function(imageData) {
          var threshold = this.threshold(), mask = backgroundMask(imageData, threshold);
          if (mask) {
            mask = erodeMask(mask, imageData.width, imageData.height);
            mask = dilateMask(mask, imageData.width, imageData.height);
            mask = smoothEdgeMask(mask, imageData.width, imageData.height);
            applyMask(imageData, mask);
          }
          return imageData;
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "threshold", 0, null, Kinetic.Factory.afterSetFilter);
      })();
      (function() {
        Kinetic.Filters.RGB = function(imageData) {
          var data = imageData.data, nPixels = data.length, red = this.red(), green = this.green(), blue = this.blue(), i, brightness;
          for (i = 0; i < nPixels; i += 4) {
            brightness = (0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2]) / 255;
            data[i] = brightness * red;
            data[i + 1] = brightness * green;
            data[i + 2] = brightness * blue;
            data[i + 3] = data[i + 3];
          }
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "red", 0, function(val) {
          this._filterUpToDate = false;
          if (val > 255) {
            return 255;
          } else if (val < 0) {
            return 0;
          } else {
            return Math.round(val);
          }
        });
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "green", 0, function(val) {
          this._filterUpToDate = false;
          if (val > 255) {
            return 255;
          } else if (val < 0) {
            return 0;
          } else {
            return Math.round(val);
          }
        });
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "blue", 0, Kinetic.Validators.RGBComponent, Kinetic.Factory.afterSetFilter);
      })();
      (function() {
        Kinetic.Filters.HSV = function(imageData) {
          var data = imageData.data, nPixels = data.length, v = Math.pow(2, this.value()), s = Math.pow(2, this.saturation()), h = Math.abs(this.hue() + 360) % 360, i;
          var vsu = v * s * Math.cos(h * Math.PI / 180), vsw = v * s * Math.sin(h * Math.PI / 180);
          var rr = 0.299 * v + 0.701 * vsu + 0.167 * vsw, rg = 0.587 * v - 0.587 * vsu + 0.33 * vsw, rb = 0.114 * v - 0.114 * vsu - 0.497 * vsw;
          var gr = 0.299 * v - 0.299 * vsu - 0.328 * vsw, gg = 0.587 * v + 0.413 * vsu + 0.035 * vsw, gb = 0.114 * v - 0.114 * vsu + 0.293 * vsw;
          var br = 0.299 * v - 0.3 * vsu + 1.25 * vsw, bg = 0.587 * v - 0.586 * vsu - 1.05 * vsw, bb = 0.114 * v + 0.886 * vsu - 0.2 * vsw;
          var r, g, b, a;
          for (i = 0; i < nPixels; i += 4) {
            r = data[i + 0];
            g = data[i + 1];
            b = data[i + 2];
            a = data[i + 3];
            data[i + 0] = rr * r + rg * g + rb * b;
            data[i + 1] = gr * r + gg * g + gb * b;
            data[i + 2] = br * r + bg * g + bb * b;
            data[i + 3] = a;
          }
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "hue", 0, null, Kinetic.Factory.afterSetFilter);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "saturation", 0, null, Kinetic.Factory.afterSetFilter);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "value", 0, null, Kinetic.Factory.afterSetFilter);
      })();
      (function() {
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "hue", 0, null, Kinetic.Factory.afterSetFilter);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "saturation", 0, null, Kinetic.Factory.afterSetFilter);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "luminance", 0, null, Kinetic.Factory.afterSetFilter);
        Kinetic.Filters.HSL = function(imageData) {
          var data = imageData.data, nPixels = data.length, v = 1, s = Math.pow(2, this.saturation()), h = Math.abs(this.hue() + 360) % 360, l = this.luminance() * 127, i;
          var vsu = v * s * Math.cos(h * Math.PI / 180), vsw = v * s * Math.sin(h * Math.PI / 180);
          var rr = 0.299 * v + 0.701 * vsu + 0.167 * vsw, rg = 0.587 * v - 0.587 * vsu + 0.33 * vsw, rb = 0.114 * v - 0.114 * vsu - 0.497 * vsw;
          var gr = 0.299 * v - 0.299 * vsu - 0.328 * vsw, gg = 0.587 * v + 0.413 * vsu + 0.035 * vsw, gb = 0.114 * v - 0.114 * vsu + 0.293 * vsw;
          var br = 0.299 * v - 0.3 * vsu + 1.25 * vsw, bg = 0.587 * v - 0.586 * vsu - 1.05 * vsw, bb = 0.114 * v + 0.886 * vsu - 0.2 * vsw;
          var r, g, b, a;
          for (i = 0; i < nPixels; i += 4) {
            r = data[i + 0];
            g = data[i + 1];
            b = data[i + 2];
            a = data[i + 3];
            data[i + 0] = rr * r + rg * g + rb * b + l;
            data[i + 1] = gr * r + gg * g + gb * b + l;
            data[i + 2] = br * r + bg * g + bb * b + l;
            data[i + 3] = a;
          }
        };
      })();
      (function() {
        Kinetic.Filters.Emboss = function(imageData) {
          var strength = this.embossStrength() * 10, greyLevel = this.embossWhiteLevel() * 255, direction = this.embossDirection(), blend = this.embossBlend(), dirY = 0, dirX = 0, data = imageData.data, w = imageData.width, h = imageData.height, w4 = w * 4, y = h;
          switch (direction) {
            case "top-left":
              dirY = -1;
              dirX = -1;
              break;
            case "top":
              dirY = -1;
              dirX = 0;
              break;
            case "top-right":
              dirY = -1;
              dirX = 1;
              break;
            case "right":
              dirY = 0;
              dirX = 1;
              break;
            case "bottom-right":
              dirY = 1;
              dirX = 1;
              break;
            case "bottom":
              dirY = 1;
              dirX = 0;
              break;
            case "bottom-left":
              dirY = 1;
              dirX = -1;
              break;
            case "left":
              dirY = 0;
              dirX = -1;
              break;
          }
          do {
            var offsetY = (y - 1) * w4;
            var otherY = dirY;
            if (y + otherY < 1) {
              otherY = 0;
            }
            if (y + otherY > h) {
              otherY = 0;
            }
            var offsetYOther = (y - 1 + otherY) * w * 4;
            var x = w;
            do {
              var offset = offsetY + (x - 1) * 4;
              var otherX = dirX;
              if (x + otherX < 1) {
                otherX = 0;
              }
              if (x + otherX > w) {
                otherX = 0;
              }
              var offsetOther = offsetYOther + (x - 1 + otherX) * 4;
              var dR = data[offset] - data[offsetOther];
              var dG = data[offset + 1] - data[offsetOther + 1];
              var dB = data[offset + 2] - data[offsetOther + 2];
              var dif = dR;
              var absDif = dif > 0 ? dif : -dif;
              var absG = dG > 0 ? dG : -dG;
              var absB = dB > 0 ? dB : -dB;
              if (absG > absDif) {
                dif = dG;
              }
              if (absB > absDif) {
                dif = dB;
              }
              dif *= strength;
              if (blend) {
                var r = data[offset] + dif;
                var g = data[offset + 1] + dif;
                var b = data[offset + 2] + dif;
                data[offset] = r > 255 ? 255 : r < 0 ? 0 : r;
                data[offset + 1] = g > 255 ? 255 : g < 0 ? 0 : g;
                data[offset + 2] = b > 255 ? 255 : b < 0 ? 0 : b;
              } else {
                var grey = greyLevel - dif;
                if (grey < 0) {
                  grey = 0;
                } else if (grey > 255) {
                  grey = 255;
                }
                data[offset] = data[offset + 1] = data[offset + 2] = grey;
              }
            } while (--x);
          } while (--y);
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "embossStrength", 0.5, null, Kinetic.Factory.afterSetFilter);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "embossWhiteLevel", 0.5, null, Kinetic.Factory.afterSetFilter);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "embossDirection", "top-left", null, Kinetic.Factory.afterSetFilter);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "embossBlend", false, null, Kinetic.Factory.afterSetFilter);
      })();
      (function() {
        function remap(fromValue, fromMin, fromMax, toMin, toMax) {
          var fromRange = fromMax - fromMin, toRange = toMax - toMin, toValue;
          if (fromRange === 0) {
            return toMin + toRange / 2;
          }
          if (toRange === 0) {
            return toMin;
          }
          toValue = (fromValue - fromMin) / fromRange;
          toValue = toRange * toValue + toMin;
          return toValue;
        }
        Kinetic.Filters.Enhance = function(imageData) {
          var data = imageData.data, nSubPixels = data.length, rMin = data[0], rMax = rMin, r, gMin = data[1], gMax = gMin, g, bMin = data[2], bMax = bMin, b, i;
          var enhanceAmount = this.enhance();
          if (enhanceAmount === 0) {
            return;
          }
          for (i = 0; i < nSubPixels; i += 4) {
            r = data[i + 0];
            if (r < rMin) {
              rMin = r;
            } else if (r > rMax) {
              rMax = r;
            }
            g = data[i + 1];
            if (g < gMin) {
              gMin = g;
            } else if (g > gMax) {
              gMax = g;
            }
            b = data[i + 2];
            if (b < bMin) {
              bMin = b;
            } else if (b > bMax) {
              bMax = b;
            }
          }
          if (rMax === rMin) {
            rMax = 255;
            rMin = 0;
          }
          if (gMax === gMin) {
            gMax = 255;
            gMin = 0;
          }
          if (bMax === bMin) {
            bMax = 255;
            bMin = 0;
          }
          var rMid, rGoalMax, rGoalMin, gMid, gGoalMax, gGoalMin, bMid, bGoalMax, bGoalMin;
          if (enhanceAmount > 0) {
            rGoalMax = rMax + enhanceAmount * (255 - rMax);
            rGoalMin = rMin - enhanceAmount * (rMin - 0);
            gGoalMax = gMax + enhanceAmount * (255 - gMax);
            gGoalMin = gMin - enhanceAmount * (gMin - 0);
            bGoalMax = bMax + enhanceAmount * (255 - bMax);
            bGoalMin = bMin - enhanceAmount * (bMin - 0);
          } else {
            rMid = (rMax + rMin) * 0.5;
            rGoalMax = rMax + enhanceAmount * (rMax - rMid);
            rGoalMin = rMin + enhanceAmount * (rMin - rMid);
            gMid = (gMax + gMin) * 0.5;
            gGoalMax = gMax + enhanceAmount * (gMax - gMid);
            gGoalMin = gMin + enhanceAmount * (gMin - gMid);
            bMid = (bMax + bMin) * 0.5;
            bGoalMax = bMax + enhanceAmount * (bMax - bMid);
            bGoalMin = bMin + enhanceAmount * (bMin - bMid);
          }
          for (i = 0; i < nSubPixels; i += 4) {
            data[i + 0] = remap(data[i + 0], rMin, rMax, rGoalMin, rGoalMax);
            data[i + 1] = remap(data[i + 1], gMin, gMax, gGoalMin, gGoalMax);
            data[i + 2] = remap(data[i + 2], bMin, bMax, bGoalMin, bGoalMax);
          }
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "enhance", 0, null, Kinetic.Factory.afterSetFilter);
      })();
      (function() {
        Kinetic.Filters.Posterize = function(imageData) {
          var levels = Math.round(this.levels() * 254) + 1, data = imageData.data, len = data.length, scale = 255 / levels, i;
          for (i = 0; i < len; i += 1) {
            data[i] = Math.floor(data[i] / scale) * scale;
          }
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "levels", 0.5, null, Kinetic.Factory.afterSetFilter);
      })();
      (function() {
        Kinetic.Filters.Noise = function(imageData) {
          var amount = this.noise() * 255, data = imageData.data, nPixels = data.length, half = amount / 2, i;
          for (i = 0; i < nPixels; i += 4) {
            data[i + 0] += half - 2 * half * Math.random();
            data[i + 1] += half - 2 * half * Math.random();
            data[i + 2] += half - 2 * half * Math.random();
          }
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "noise", 0.2, null, Kinetic.Factory.afterSetFilter);
      })();
      (function() {
        Kinetic.Filters.Pixelate = function(imageData) {
          var pixelSize = Math.ceil(this.pixelSize()), width = imageData.width, height = imageData.height, x, y, i, red, green, blue, alpha, nBinsX = Math.ceil(width / pixelSize), nBinsY = Math.ceil(height / pixelSize), xBinStart, xBinEnd, yBinStart, yBinEnd, xBin, yBin, pixelsInBin;
          imageData = imageData.data;
          for (xBin = 0; xBin < nBinsX; xBin += 1) {
            for (yBin = 0; yBin < nBinsY; yBin += 1) {
              red = 0;
              green = 0;
              blue = 0;
              alpha = 0;
              xBinStart = xBin * pixelSize;
              xBinEnd = xBinStart + pixelSize;
              yBinStart = yBin * pixelSize;
              yBinEnd = yBinStart + pixelSize;
              pixelsInBin = 0;
              for (x = xBinStart; x < xBinEnd; x += 1) {
                if (x >= width) {
                  continue;
                }
                for (y = yBinStart; y < yBinEnd; y += 1) {
                  if (y >= height) {
                    continue;
                  }
                  i = (width * y + x) * 4;
                  red += imageData[i + 0];
                  green += imageData[i + 1];
                  blue += imageData[i + 2];
                  alpha += imageData[i + 3];
                  pixelsInBin += 1;
                }
              }
              red = red / pixelsInBin;
              green = green / pixelsInBin;
              blue = blue / pixelsInBin;
              for (x = xBinStart; x < xBinEnd; x += 1) {
                if (x >= width) {
                  continue;
                }
                for (y = yBinStart; y < yBinEnd; y += 1) {
                  if (y >= height) {
                    continue;
                  }
                  i = (width * y + x) * 4;
                  imageData[i + 0] = red;
                  imageData[i + 1] = green;
                  imageData[i + 2] = blue;
                  imageData[i + 3] = alpha;
                }
              }
            }
          }
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "pixelSize", 8, null, Kinetic.Factory.afterSetFilter);
      })();
      (function() {
        Kinetic.Filters.Threshold = function(imageData) {
          var level = this.threshold() * 255, data = imageData.data, len = data.length, i;
          for (i = 0; i < len; i += 1) {
            data[i] = data[i] < level ? 0 : 255;
          }
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "threshold", 0.5, null, Kinetic.Factory.afterSetFilter);
      })();
      (function() {
        Kinetic.Filters.Sepia = function(imageData) {
          var data = imageData.data, w = imageData.width, y = imageData.height, w4 = w * 4, offsetY, x, offset, or, og, ob, r, g, b;
          do {
            offsetY = (y - 1) * w4;
            x = w;
            do {
              offset = offsetY + (x - 1) * 4;
              or = data[offset];
              og = data[offset + 1];
              ob = data[offset + 2];
              r = or * 0.393 + og * 0.769 + ob * 0.189;
              g = or * 0.349 + og * 0.686 + ob * 0.168;
              b = or * 0.272 + og * 0.534 + ob * 0.131;
              data[offset] = r > 255 ? 255 : r;
              data[offset + 1] = g > 255 ? 255 : g;
              data[offset + 2] = b > 255 ? 255 : b;
              data[offset + 3] = data[offset + 3];
            } while (--x);
          } while (--y);
        };
      })();
      (function() {
        Kinetic.Filters.Solarize = function(imageData) {
          var data = imageData.data, w = imageData.width, h = imageData.height, w4 = w * 4, y = h;
          do {
            var offsetY = (y - 1) * w4;
            var x = w;
            do {
              var offset = offsetY + (x - 1) * 4;
              var r = data[offset];
              var g = data[offset + 1];
              var b = data[offset + 2];
              if (r > 127) {
                r = 255 - r;
              }
              if (g > 127) {
                g = 255 - g;
              }
              if (b > 127) {
                b = 255 - b;
              }
              data[offset] = r;
              data[offset + 1] = g;
              data[offset + 2] = b;
            } while (--x);
          } while (--y);
        };
      })();
      (function() {
        var ToPolar = function(src, dst, opt) {
          var srcPixels = src.data, dstPixels = dst.data, xSize = src.width, ySize = src.height, xMid = opt.polarCenterX || xSize / 2, yMid = opt.polarCenterY || ySize / 2, i, x, y, r = 0, g = 0, b = 0, a = 0;
          var rad, rMax = Math.sqrt(xMid * xMid + yMid * yMid);
          x = xSize - xMid;
          y = ySize - yMid;
          rad = Math.sqrt(x * x + y * y);
          rMax = rad > rMax ? rad : rMax;
          var rSize = ySize, tSize = xSize, radius, theta;
          var conversion = 360 / tSize * Math.PI / 180, sin, cos;
          for (theta = 0; theta < tSize; theta += 1) {
            sin = Math.sin(theta * conversion);
            cos = Math.cos(theta * conversion);
            for (radius = 0; radius < rSize; radius += 1) {
              x = Math.floor(xMid + rMax * radius / rSize * cos);
              y = Math.floor(yMid + rMax * radius / rSize * sin);
              i = (y * xSize + x) * 4;
              r = srcPixels[i + 0];
              g = srcPixels[i + 1];
              b = srcPixels[i + 2];
              a = srcPixels[i + 3];
              i = (theta + radius * xSize) * 4;
              dstPixels[i + 0] = r;
              dstPixels[i + 1] = g;
              dstPixels[i + 2] = b;
              dstPixels[i + 3] = a;
            }
          }
        };
        var FromPolar = function(src, dst, opt) {
          var srcPixels = src.data, dstPixels = dst.data, xSize = src.width, ySize = src.height, xMid = opt.polarCenterX || xSize / 2, yMid = opt.polarCenterY || ySize / 2, i, x, y, dx, dy, r = 0, g = 0, b = 0, a = 0;
          var rad, rMax = Math.sqrt(xMid * xMid + yMid * yMid);
          x = xSize - xMid;
          y = ySize - yMid;
          rad = Math.sqrt(x * x + y * y);
          rMax = rad > rMax ? rad : rMax;
          var rSize = ySize, tSize = xSize, radius, theta, phaseShift = opt.polarRotation || 0;
          var x1, y1;
          for (x = 0; x < xSize; x += 1) {
            for (y = 0; y < ySize; y += 1) {
              dx = x - xMid;
              dy = y - yMid;
              radius = Math.sqrt(dx * dx + dy * dy) * rSize / rMax;
              theta = (Math.atan2(dy, dx) * 180 / Math.PI + 360 + phaseShift) % 360;
              theta = theta * tSize / 360;
              x1 = Math.floor(theta);
              y1 = Math.floor(radius);
              i = (y1 * xSize + x1) * 4;
              r = srcPixels[i + 0];
              g = srcPixels[i + 1];
              b = srcPixels[i + 2];
              a = srcPixels[i + 3];
              i = (y * xSize + x) * 4;
              dstPixels[i + 0] = r;
              dstPixels[i + 1] = g;
              dstPixels[i + 2] = b;
              dstPixels[i + 3] = a;
            }
          }
        };
        var tempCanvas = Kinetic.Util.createCanvasElement();
        Kinetic.Filters.Kaleidoscope = function(imageData) {
          var xSize = imageData.width, ySize = imageData.height;
          var x, y, xoff, i, r, g, b, a, srcPos, dstPos;
          var power = Math.round(this.kaleidoscopePower());
          var angle = Math.round(this.kaleidoscopeAngle());
          var offset = Math.floor(xSize * (angle % 360) / 360);
          if (power < 1) {
            return;
          }
          tempCanvas.width = xSize;
          tempCanvas.height = ySize;
          var scratchData = tempCanvas.getContext("2d").getImageData(0, 0, xSize, ySize);
          ToPolar(imageData, scratchData, {
            polarCenterX: xSize / 2,
            polarCenterY: ySize / 2
          });
          var minSectionSize = xSize / Math.pow(2, power);
          while (minSectionSize <= 8) {
            minSectionSize = minSectionSize * 2;
            power -= 1;
          }
          minSectionSize = Math.ceil(minSectionSize);
          var sectionSize = minSectionSize;
          var xStart = 0, xEnd = sectionSize, xDelta = 1;
          if (offset + minSectionSize > xSize) {
            xStart = sectionSize;
            xEnd = 0;
            xDelta = -1;
          }
          for (y = 0; y < ySize; y += 1) {
            for (x = xStart; x !== xEnd; x += xDelta) {
              xoff = Math.round(x + offset) % xSize;
              srcPos = (xSize * y + xoff) * 4;
              r = scratchData.data[srcPos + 0];
              g = scratchData.data[srcPos + 1];
              b = scratchData.data[srcPos + 2];
              a = scratchData.data[srcPos + 3];
              dstPos = (xSize * y + x) * 4;
              scratchData.data[dstPos + 0] = r;
              scratchData.data[dstPos + 1] = g;
              scratchData.data[dstPos + 2] = b;
              scratchData.data[dstPos + 3] = a;
            }
          }
          for (y = 0; y < ySize; y += 1) {
            sectionSize = Math.floor(minSectionSize);
            for (i = 0; i < power; i += 1) {
              for (x = 0; x < sectionSize + 1; x += 1) {
                srcPos = (xSize * y + x) * 4;
                r = scratchData.data[srcPos + 0];
                g = scratchData.data[srcPos + 1];
                b = scratchData.data[srcPos + 2];
                a = scratchData.data[srcPos + 3];
                dstPos = (xSize * y + sectionSize * 2 - x - 1) * 4;
                scratchData.data[dstPos + 0] = r;
                scratchData.data[dstPos + 1] = g;
                scratchData.data[dstPos + 2] = b;
                scratchData.data[dstPos + 3] = a;
              }
              sectionSize *= 2;
            }
          }
          FromPolar(scratchData, imageData, { polarRotation: 0 });
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "kaleidoscopePower", 2, null, Kinetic.Factory.afterSetFilter);
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "kaleidoscopeAngle", 0, null, Kinetic.Factory.afterSetFilter);
      })();
      (function() {
        var BATCH_DRAW_STOP_TIME_DIFF = 500;
        var now = (function() {
          if (Kinetic.root.performance && Kinetic.root.performance.now) {
            return function() {
              return Kinetic.root.performance.now();
            };
          } else {
            return function() {
              return (/* @__PURE__ */ new Date()).getTime();
            };
          }
        })();
        var RAF = (function() {
          return Kinetic.root.requestAnimationFrame || Kinetic.root.webkitRequestAnimationFrame || Kinetic.root.mozRequestAnimationFrame || Kinetic.root.oRequestAnimationFrame || Kinetic.root.msRequestAnimationFrame || FRAF;
        })();
        function FRAF(callback) {
          setTimeout(callback, 1e3 / 60);
        }
        function requestAnimFrame() {
          return RAF.apply(Kinetic.root, arguments);
        }
        Kinetic.Animation = function(func, layers) {
          var Anim = Kinetic.Animation;
          this.func = func;
          this.setLayers(layers);
          this.id = Anim.animIdCounter++;
          this.frame = {
            time: 0,
            timeDiff: 0,
            lastTime: now()
          };
        };
        Kinetic.Animation.prototype = {
          /**
           * set layers to be redrawn on each animation frame
           * @method
           * @memberof Kinetic.Animation.prototype
           * @param {Kinetic.Layer|Array} [layers] layer(s) to be redrawn.&nbsp; Can be a layer, an array of layers, or null.  Not specifying a node will result in no redraw.
           */
          setLayers: function(layers) {
            var lays = [];
            if (!layers) {
              lays = [];
            } else if (layers.length > 0) {
              lays = layers;
            } else {
              lays = [layers];
            }
            this.layers = lays;
          },
          /**
           * get layers
           * @method
           * @memberof Kinetic.Animation.prototype
           */
          getLayers: function() {
            return this.layers;
          },
          /**
           * add layer.  Returns true if the layer was added, and false if it was not
           * @method
           * @memberof Kinetic.Animation.prototype
           * @param {Kinetic.Layer} layer
           */
          addLayer: function(layer) {
            var layers = this.layers, len, n;
            if (layers) {
              len = layers.length;
              for (n = 0; n < len; n++) {
                if (layers[n]._id === layer._id) {
                  return false;
                }
              }
            } else {
              this.layers = [];
            }
            this.layers.push(layer);
            return true;
          },
          /**
           * determine if animation is running or not.  returns true or false
           * @method
           * @memberof Kinetic.Animation.prototype
           */
          isRunning: function() {
            var a = Kinetic.Animation, animations = a.animations, len = animations.length, n;
            for (n = 0; n < len; n++) {
              if (animations[n].id === this.id) {
                return true;
              }
            }
            return false;
          },
          /**
           * start animation
           * @method
           * @memberof Kinetic.Animation.prototype
           */
          start: function() {
            var Anim = Kinetic.Animation;
            this.stop();
            this.frame.timeDiff = 0;
            this.frame.lastTime = now();
            Anim._addAnimation(this);
          },
          /**
           * stop animation
           * @method
           * @memberof Kinetic.Animation.prototype
           */
          stop: function() {
            Kinetic.Animation._removeAnimation(this);
          },
          _updateFrameObject: function(time) {
            this.frame.timeDiff = time - this.frame.lastTime;
            this.frame.lastTime = time;
            this.frame.time += this.frame.timeDiff;
            this.frame.frameRate = 1e3 / this.frame.timeDiff;
          }
        };
        Kinetic.Animation.animations = [];
        Kinetic.Animation.animIdCounter = 0;
        Kinetic.Animation.animRunning = false;
        Kinetic.Animation._addAnimation = function(anim) {
          this.animations.push(anim);
          this._handleAnimation();
        };
        Kinetic.Animation._removeAnimation = function(anim) {
          var id = anim.id, animations = this.animations, len = animations.length, n;
          for (n = 0; n < len; n++) {
            if (animations[n].id === id) {
              this.animations.splice(n, 1);
              break;
            }
          }
        };
        Kinetic.Animation._runFrames = function() {
          var layerHash = {}, animations = this.animations, anim, layers, func, n, i, layersLen, layer, key, needRedraw;
          for (n = 0; n < animations.length; n++) {
            anim = animations[n];
            layers = anim.layers;
            func = anim.func;
            anim._updateFrameObject(now());
            layersLen = layers.length;
            if (func) {
              needRedraw = func.call(anim, anim.frame) !== false;
            } else {
              needRedraw = true;
            }
            if (needRedraw) {
              for (i = 0; i < layersLen; i++) {
                layer = layers[i];
                if (layer._id !== void 0) {
                  layerHash[layer._id] = layer;
                }
              }
            }
          }
          for (key in layerHash) {
            layerHash[key].draw();
          }
        };
        Kinetic.Animation._animationLoop = function() {
          var Anim = Kinetic.Animation;
          if (Anim.animations.length) {
            requestAnimFrame(Anim._animationLoop);
            Anim._runFrames();
          } else {
            Anim.animRunning = false;
          }
        };
        Kinetic.Animation._handleAnimation = function() {
          var that = this;
          if (!this.animRunning) {
            this.animRunning = true;
            that._animationLoop();
          }
        };
        var moveTo = Kinetic.Node.prototype.moveTo;
        Kinetic.Node.prototype.moveTo = function(container) {
          moveTo.call(this, container);
        };
        Kinetic.BaseLayer.prototype.batchDraw = function() {
          var that = this, Anim = Kinetic.Animation;
          if (!this.batchAnim) {
            this.batchAnim = new Anim(function() {
              if (that.lastBatchDrawTime && now() - that.lastBatchDrawTime > BATCH_DRAW_STOP_TIME_DIFF) {
                that.batchAnim.stop();
              }
            }, this);
          }
          this.lastBatchDrawTime = now();
          if (!this.batchAnim.isRunning()) {
            this.draw();
            this.batchAnim.start();
          }
        };
        Kinetic.Stage.prototype.batchDraw = function() {
          this.getChildren().each(function(layer) {
            layer.batchDraw();
          });
        };
      })(exports);
      (function() {
        var blacklist = {
          node: 1,
          duration: 1,
          easing: 1,
          onFinish: 1,
          yoyo: 1
        }, PAUSED = 1, PLAYING = 2, REVERSING = 3, idCounter = 0;
        Kinetic.Tween = function(config) {
          var that = this, node = config.node, nodeId = node._id, duration, easing = config.easing || Kinetic.Easings.Linear, yoyo = !!config.yoyo, key;
          if (typeof config.duration === "undefined") {
            duration = 1;
          } else if (config.duration === 0) {
            duration = 1e-3;
          } else {
            duration = config.duration;
          }
          this.node = node;
          this._id = idCounter++;
          this.anim = new Kinetic.Animation(function() {
            that.tween.onEnterFrame();
          }, node.getLayer() || (node instanceof Kinetic.Stage ? node.getLayers() : null));
          this.tween = new Tween(key, function(i) {
            that._tweenFunc(i);
          }, easing, 0, 1, duration * 1e3, yoyo);
          this._addListeners();
          if (!Kinetic.Tween.attrs[nodeId]) {
            Kinetic.Tween.attrs[nodeId] = {};
          }
          if (!Kinetic.Tween.attrs[nodeId][this._id]) {
            Kinetic.Tween.attrs[nodeId][this._id] = {};
          }
          if (!Kinetic.Tween.tweens[nodeId]) {
            Kinetic.Tween.tweens[nodeId] = {};
          }
          for (key in config) {
            if (blacklist[key] === void 0) {
              this._addAttr(key, config[key]);
            }
          }
          this.reset();
          this.onFinish = config.onFinish;
          this.onReset = config.onReset;
        };
        Kinetic.Tween.attrs = {};
        Kinetic.Tween.tweens = {};
        Kinetic.Tween.prototype = {
          _addAttr: function(key, end) {
            var node = this.node, nodeId = node._id, start, diff, tweenId, n, len;
            tweenId = Kinetic.Tween.tweens[nodeId][key];
            if (tweenId) {
              delete Kinetic.Tween.attrs[nodeId][tweenId][key];
            }
            start = node.getAttr(key);
            if (Kinetic.Util._isArray(end)) {
              diff = [];
              len = end.length;
              for (n = 0; n < len; n++) {
                diff.push(end[n] - start[n]);
              }
            } else {
              diff = end - start;
            }
            Kinetic.Tween.attrs[nodeId][this._id][key] = {
              start,
              diff
            };
            Kinetic.Tween.tweens[nodeId][key] = this._id;
          },
          _tweenFunc: function(i) {
            var node = this.node, attrs = Kinetic.Tween.attrs[node._id][this._id], key, attr, start, diff, newVal, n, len;
            for (key in attrs) {
              attr = attrs[key];
              start = attr.start;
              diff = attr.diff;
              if (Kinetic.Util._isArray(start)) {
                newVal = [];
                len = start.length;
                for (n = 0; n < len; n++) {
                  newVal.push(start[n] + diff[n] * i);
                }
              } else {
                newVal = start + diff * i;
              }
              node.setAttr(key, newVal);
            }
          },
          _addListeners: function() {
            var that = this;
            this.tween.onPlay = function() {
              that.anim.start();
            };
            this.tween.onReverse = function() {
              that.anim.start();
            };
            this.tween.onPause = function() {
              that.anim.stop();
            };
            this.tween.onFinish = function() {
              if (that.onFinish) {
                that.onFinish();
              }
            };
            this.tween.onReset = function() {
              if (that.onReset) {
                that.onReset();
              }
            };
          },
          /**
           * play
           * @method
           * @memberof Kinetic.Tween.prototype
           * @returns {Tween}
           */
          play: function() {
            this.tween.play();
            return this;
          },
          /**
           * reverse
           * @method
           * @memberof Kinetic.Tween.prototype
           * @returns {Tween}
           */
          reverse: function() {
            this.tween.reverse();
            return this;
          },
          /**
           * reset
           * @method
           * @memberof Kinetic.Tween.prototype
           * @returns {Tween}
           */
          reset: function() {
            this.tween.reset();
            return this;
          },
          /**
           * seek
           * @method
           * @memberof Kinetic.Tween.prototype
           * @param {Integer} t time in seconds between 0 and the duration
           * @returns {Tween}
           */
          seek: function(t) {
            this.tween.seek(t * 1e3);
            return this;
          },
          /**
           * pause
           * @method
           * @memberof Kinetic.Tween.prototype
           * @returns {Tween}
           */
          pause: function() {
            this.tween.pause();
            return this;
          },
          /**
           * finish
           * @method
           * @memberof Kinetic.Tween.prototype
           * @returns {Tween}
           */
          finish: function() {
            this.tween.finish();
            return this;
          },
          /**
           * destroy
           * @method
           * @memberof Kinetic.Tween.prototype
           */
          destroy: function() {
            var nodeId = this.node._id, thisId = this._id, attrs = Kinetic.Tween.tweens[nodeId], key;
            this.pause();
            for (key in attrs) {
              delete Kinetic.Tween.tweens[nodeId][key];
            }
            delete Kinetic.Tween.attrs[nodeId][thisId];
          }
        };
        var Tween = function(prop, propFunc, func, begin, finish, duration, yoyo) {
          this.prop = prop;
          this.propFunc = propFunc;
          this.begin = begin;
          this._pos = begin;
          this.duration = duration;
          this._change = 0;
          this.prevPos = 0;
          this.yoyo = yoyo;
          this._time = 0;
          this._position = 0;
          this._startTime = 0;
          this._finish = 0;
          this.func = func;
          this._change = finish - this.begin;
          this.pause();
        };
        Tween.prototype = {
          fire: function(str) {
            var handler = this[str];
            if (handler) {
              handler();
            }
          },
          setTime: function(t) {
            if (t > this.duration) {
              if (this.yoyo) {
                this._time = this.duration;
                this.reverse();
              } else {
                this.finish();
              }
            } else if (t < 0) {
              if (this.yoyo) {
                this._time = 0;
                this.play();
              } else {
                this.reset();
              }
            } else {
              this._time = t;
              this.update();
            }
          },
          getTime: function() {
            return this._time;
          },
          setPosition: function(p) {
            this.prevPos = this._pos;
            this.propFunc(p);
            this._pos = p;
          },
          getPosition: function(t) {
            if (t === void 0) {
              t = this._time;
            }
            return this.func(t, this.begin, this._change, this.duration);
          },
          play: function() {
            this.state = PLAYING;
            this._startTime = this.getTimer() - this._time;
            this.onEnterFrame();
            this.fire("onPlay");
          },
          reverse: function() {
            this.state = REVERSING;
            this._time = this.duration - this._time;
            this._startTime = this.getTimer() - this._time;
            this.onEnterFrame();
            this.fire("onReverse");
          },
          seek: function(t) {
            this.pause();
            this._time = t;
            this.update();
            this.fire("onSeek");
          },
          reset: function() {
            this.pause();
            this._time = 0;
            this.update();
            this.fire("onReset");
          },
          finish: function() {
            this.pause();
            this._time = this.duration;
            this.update();
            this.fire("onFinish");
          },
          update: function() {
            this.setPosition(this.getPosition(this._time));
          },
          onEnterFrame: function() {
            var t = this.getTimer() - this._startTime;
            if (this.state === PLAYING) {
              this.setTime(t);
            } else if (this.state === REVERSING) {
              this.setTime(this.duration - t);
            }
          },
          pause: function() {
            this.state = PAUSED;
            this.fire("onPause");
          },
          getTimer: function() {
            return (/* @__PURE__ */ new Date()).getTime();
          }
        };
        Kinetic.Easings = {
          /**
          * back ease in
          * @function
          * @memberof Kinetic.Easings
          */
          "BackEaseIn": function(t, b, c, d) {
            var s = 1.70158;
            return c * (t /= d) * t * ((s + 1) * t - s) + b;
          },
          /**
          * back ease out
          * @function
          * @memberof Kinetic.Easings
          */
          "BackEaseOut": function(t, b, c, d) {
            var s = 1.70158;
            return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
          },
          /**
          * back ease in out
          * @function
          * @memberof Kinetic.Easings
          */
          "BackEaseInOut": function(t, b, c, d) {
            var s = 1.70158;
            if ((t /= d / 2) < 1) {
              return c / 2 * (t * t * (((s *= 1.525) + 1) * t - s)) + b;
            }
            return c / 2 * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2) + b;
          },
          /**
          * elastic ease in
          * @function
          * @memberof Kinetic.Easings
          */
          "ElasticEaseIn": function(t, b, c, d, a, p) {
            var s = 0;
            if (t === 0) {
              return b;
            }
            if ((t /= d) == 1) {
              return b + c;
            }
            if (!p) {
              p = d * 0.3;
            }
            if (!a || a < Math.abs(c)) {
              a = c;
              s = p / 4;
            } else {
              s = p / (2 * Math.PI) * Math.asin(c / a);
            }
            return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
          },
          /**
          * elastic ease out
          * @function
          * @memberof Kinetic.Easings
          */
          "ElasticEaseOut": function(t, b, c, d, a, p) {
            var s = 0;
            if (t === 0) {
              return b;
            }
            if ((t /= d) == 1) {
              return b + c;
            }
            if (!p) {
              p = d * 0.3;
            }
            if (!a || a < Math.abs(c)) {
              a = c;
              s = p / 4;
            } else {
              s = p / (2 * Math.PI) * Math.asin(c / a);
            }
            return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
          },
          /**
          * elastic ease in out
          * @function
          * @memberof Kinetic.Easings
          */
          "ElasticEaseInOut": function(t, b, c, d, a, p) {
            var s = 0;
            if (t === 0) {
              return b;
            }
            if ((t /= d / 2) == 2) {
              return b + c;
            }
            if (!p) {
              p = d * (0.3 * 1.5);
            }
            if (!a || a < Math.abs(c)) {
              a = c;
              s = p / 4;
            } else {
              s = p / (2 * Math.PI) * Math.asin(c / a);
            }
            if (t < 1) {
              return -0.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
            }
            return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * 0.5 + c + b;
          },
          /**
          * bounce ease out
          * @function
          * @memberof Kinetic.Easings
          */
          "BounceEaseOut": function(t, b, c, d) {
            if ((t /= d) < 1 / 2.75) {
              return c * (7.5625 * t * t) + b;
            } else if (t < 2 / 2.75) {
              return c * (7.5625 * (t -= 1.5 / 2.75) * t + 0.75) + b;
            } else if (t < 2.5 / 2.75) {
              return c * (7.5625 * (t -= 2.25 / 2.75) * t + 0.9375) + b;
            } else {
              return c * (7.5625 * (t -= 2.625 / 2.75) * t + 0.984375) + b;
            }
          },
          /**
          * bounce ease in
          * @function
          * @memberof Kinetic.Easings
          */
          "BounceEaseIn": function(t, b, c, d) {
            return c - Kinetic.Easings.BounceEaseOut(d - t, 0, c, d) + b;
          },
          /**
          * bounce ease in out
          * @function
          * @memberof Kinetic.Easings
          */
          "BounceEaseInOut": function(t, b, c, d) {
            if (t < d / 2) {
              return Kinetic.Easings.BounceEaseIn(t * 2, 0, c, d) * 0.5 + b;
            } else {
              return Kinetic.Easings.BounceEaseOut(t * 2 - d, 0, c, d) * 0.5 + c * 0.5 + b;
            }
          },
          /**
          * ease in
          * @function
          * @memberof Kinetic.Easings
          */
          "EaseIn": function(t, b, c, d) {
            return c * (t /= d) * t + b;
          },
          /**
          * ease out
          * @function
          * @memberof Kinetic.Easings
          */
          "EaseOut": function(t, b, c, d) {
            return -c * (t /= d) * (t - 2) + b;
          },
          /**
          * ease in out
          * @function
          * @memberof Kinetic.Easings
          */
          "EaseInOut": function(t, b, c, d) {
            if ((t /= d / 2) < 1) {
              return c / 2 * t * t + b;
            }
            return -c / 2 * (--t * (t - 2) - 1) + b;
          },
          /**
          * strong ease in
          * @function
          * @memberof Kinetic.Easings
          */
          "StrongEaseIn": function(t, b, c, d) {
            return c * (t /= d) * t * t * t * t + b;
          },
          /**
          * strong ease out
          * @function
          * @memberof Kinetic.Easings
          */
          "StrongEaseOut": function(t, b, c, d) {
            return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
          },
          /**
          * strong ease in out
          * @function
          * @memberof Kinetic.Easings
          */
          "StrongEaseInOut": function(t, b, c, d) {
            if ((t /= d / 2) < 1) {
              return c / 2 * t * t * t * t * t + b;
            }
            return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
          },
          /**
          * linear
          * @function
          * @memberof Kinetic.Easings
          */
          "Linear": function(t, b, c, d) {
            return c * t / d + b;
          }
        };
      })();
      (function() {
        Kinetic.DD = {
          // properties
          anim: new Kinetic.Animation(function() {
            var b = this.dirty;
            this.dirty = false;
            return b;
          }),
          isDragging: false,
          justDragged: false,
          offset: {
            x: 0,
            y: 0
          },
          node: null,
          // methods
          _drag: function(evt) {
            var dd = Kinetic.DD, node = dd.node;
            if (node) {
              if (!dd.isDragging) {
                var pos = node.getStage().getPointerPosition();
                var dragDistance = node.dragDistance();
                var distance = Math.max(
                  Math.abs(pos.x - dd.startPointerPos.x),
                  Math.abs(pos.y - dd.startPointerPos.y)
                );
                if (distance < dragDistance) {
                  return;
                }
              }
              node._setDragPosition(evt);
              if (!dd.isDragging) {
                dd.isDragging = true;
                node.fire("dragstart", {
                  type: "dragstart",
                  target: node,
                  evt
                }, true);
              }
              node.fire("dragmove", {
                type: "dragmove",
                target: node,
                evt
              }, true);
            }
          },
          _endDragBefore: function(evt) {
            var dd = Kinetic.DD, node = dd.node, nodeType, layer;
            if (node) {
              nodeType = node.nodeType;
              layer = node.getLayer();
              dd.anim.stop();
              if (dd.isDragging) {
                dd.isDragging = false;
                dd.justDragged = true;
                Kinetic.listenClickTap = false;
                if (evt) {
                  evt.dragEndNode = node;
                }
              }
              delete dd.node;
              (layer || node).draw();
            }
          },
          _endDragAfter: function(evt) {
            evt = evt || {};
            var dragEndNode = evt.dragEndNode;
            if (evt && dragEndNode) {
              dragEndNode.fire("dragend", {
                type: "dragend",
                target: dragEndNode,
                evt
              }, true);
            }
          }
        };
        Kinetic.Node.prototype.startDrag = function() {
          var dd = Kinetic.DD, stage = this.getStage(), layer = this.getLayer(), pos = stage.getPointerPosition(), ap = this.getAbsolutePosition();
          if (pos) {
            if (dd.node) {
              dd.node.stopDrag();
            }
            dd.node = this;
            dd.startPointerPos = pos;
            dd.offset.x = pos.x - ap.x;
            dd.offset.y = pos.y - ap.y;
            dd.anim.setLayers(layer || this.getLayers());
            dd.anim.start();
            this._setDragPosition();
          }
        };
        Kinetic.Node.prototype._setDragPosition = function(evt) {
          var dd = Kinetic.DD, pos = this.getStage().getPointerPosition(), dbf = this.getDragBoundFunc();
          if (!pos) {
            return;
          }
          var newNodePos = {
            x: pos.x - dd.offset.x,
            y: pos.y - dd.offset.y
          };
          if (dbf !== void 0) {
            newNodePos = dbf.call(this, newNodePos, evt);
          }
          this.setAbsolutePosition(newNodePos);
          if (!this._lastPos || this._lastPos.x !== newNodePos.x || this._lastPos.y !== newNodePos.y) {
            dd.anim.dirty = true;
          }
          this._lastPos = newNodePos;
        };
        Kinetic.Node.prototype.stopDrag = function() {
          var dd = Kinetic.DD, evt = {};
          dd._endDragBefore(evt);
          dd._endDragAfter(evt);
        };
        Kinetic.Node.prototype.setDraggable = function(draggable) {
          this._setAttr("draggable", draggable);
          this._dragChange();
        };
        var origDestroy = Kinetic.Node.prototype.destroy;
        Kinetic.Node.prototype.destroy = function() {
          var dd = Kinetic.DD;
          if (dd.node && dd.node._id === this._id) {
            this.stopDrag();
          }
          origDestroy.call(this);
        };
        Kinetic.Node.prototype.isDragging = function() {
          var dd = Kinetic.DD;
          return !!(dd.node && dd.node._id === this._id && dd.isDragging);
        };
        Kinetic.Node.prototype._listenDrag = function() {
          var that = this;
          this._dragCleanup();
          if (this.getClassName() === "Stage") {
            this.on("contentMousedown.kinetic contentTouchstart.kinetic", function(evt) {
              if (!Kinetic.DD.node) {
                that.startDrag(evt);
              }
            });
          } else {
            this.on("mousedown.kinetic touchstart.kinetic", function(evt) {
              if (evt.evt.button === 1 || evt.evt.button === 2) {
                return;
              }
              if (!Kinetic.DD.node) {
                that.startDrag(evt);
              }
            });
          }
        };
        Kinetic.Node.prototype._dragChange = function() {
          if (this.attrs.draggable) {
            this._listenDrag();
          } else {
            this._dragCleanup();
            var stage = this.getStage();
            var dd = Kinetic.DD;
            if (stage && dd.node && dd.node._id === this._id) {
              dd.node.stopDrag();
            }
          }
        };
        Kinetic.Node.prototype._dragCleanup = function() {
          if (this.getClassName() === "Stage") {
            this.off("contentMousedown.kinetic");
            this.off("contentTouchstart.kinetic");
          } else {
            this.off("mousedown.kinetic");
            this.off("touchstart.kinetic");
          }
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Node, "dragBoundFunc");
        Kinetic.Factory.addGetter(Kinetic.Node, "draggable", false);
        Kinetic.Factory.addOverloadedGetterSetter(Kinetic.Node, "draggable");
        var html = Kinetic.document.documentElement;
        html.addEventListener("mouseup", Kinetic.DD._endDragBefore, true);
        html.addEventListener("touchend", Kinetic.DD._endDragBefore, true);
        html.addEventListener("mouseup", Kinetic.DD._endDragAfter, false);
        html.addEventListener("touchend", Kinetic.DD._endDragAfter, false);
      })();
      (function() {
        Kinetic.Util.addMethods(Kinetic.Container, {
          __init: function(config) {
            this.children = new Kinetic.Collection();
            Kinetic.Node.call(this, config);
          },
          /**
           * returns a {@link Kinetic.Collection} of direct descendant nodes
           * @method
           * @memberof Kinetic.Container.prototype
           * @param {Function} [filterFunc] filter function
           * @returns {Kinetic.Collection}
           * @example
           * // get all children
           * var children = layer.getChildren();
           *
           * // get only circles
           * var circles = layer.getChildren(function(node){
           *    return node.getClassName() === 'Circle';
           * });
           */
          getChildren: function(filterFunc) {
            if (!filterFunc) {
              return this.children;
            } else {
              var results = new Kinetic.Collection();
              this.children.each(function(child) {
                if (filterFunc(child)) {
                  results.push(child);
                }
              });
              return results;
            }
          },
          /**
           * determine if node has children
           * @method
           * @memberof Kinetic.Container.prototype
           * @returns {Boolean}
           */
          hasChildren: function() {
            return this.getChildren().length > 0;
          },
          /**
           * remove all children
           * @method
           * @memberof Kinetic.Container.prototype
           */
          removeChildren: function() {
            var children = Kinetic.Collection.toCollection(this.children);
            var child;
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              delete child.parent;
              child.index = 0;
              if (child.hasChildren()) {
                child.removeChildren();
              }
              child.remove();
            }
            children = null;
            this.children = new Kinetic.Collection();
            return this;
          },
          /**
           * destroy all children
           * @method
           * @memberof Kinetic.Container.prototype
           */
          destroyChildren: function() {
            var children = Kinetic.Collection.toCollection(this.children);
            var child;
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              delete child.parent;
              child.index = 0;
              child.destroy();
            }
            children = null;
            this.children = new Kinetic.Collection();
            return this;
          },
          /**
           * Add node or nodes to container.
           * @method
           * @memberof Kinetic.Container.prototype
           * @param {...Kinetic.Node} child
           * @returns {Container}
           * @example
           * layer.add(shape1, shape2, shape3);
           */
          add: function(child) {
            if (arguments.length > 1) {
              for (var i = 0; i < arguments.length; i++) {
                this.add(arguments[i]);
              }
              return this;
            }
            if (child.getParent()) {
              child.moveTo(this);
              return this;
            }
            var children = this.children;
            this._validateAdd(child);
            child.index = children.length;
            child.parent = this;
            children.push(child);
            this._fire("add", {
              child
            });
            if (child.isDragging()) {
              Kinetic.DD.anim.setLayers(child.getLayer());
            }
            return this;
          },
          destroy: function() {
            if (this.hasChildren()) {
              this.destroyChildren();
            }
            Kinetic.Node.prototype.destroy.call(this);
          },
          /**
           * return a {@link Kinetic.Collection} of nodes that match the selector.  Use '#' for id selections
           * and '.' for name selections.  You can also select by type or class name. Pass multiple selectors
           * separated by a space.
           * @method
           * @memberof Kinetic.Container.prototype
           * @param {String} selector
           * @returns {Collection}
           * @example
           * // select node with id foo
           * var node = stage.find('#foo');
           *
           * // select nodes with name bar inside layer
           * var nodes = layer.find('.bar');
           *
           * // select all groups inside layer
           * var nodes = layer.find('Group');
           *
           * // select all rectangles inside layer
           * var nodes = layer.find('Rect');
           *
           * // select node with an id of foo or a name of bar inside layer
           * var nodes = layer.find('#foo, .bar');
           */
          find: function(selector) {
            var retArr = [], selectorArr = selector.replace(/ /g, "").split(","), len = selectorArr.length, n, i, sel, arr, node, children, clen;
            for (n = 0; n < len; n++) {
              sel = selectorArr[n];
              if (sel.charAt(0) === "#") {
                node = this._getNodeById(sel.slice(1));
                if (node) {
                  retArr.push(node);
                }
              } else if (sel.charAt(0) === ".") {
                arr = this._getNodesByName(sel.slice(1));
                retArr = retArr.concat(arr);
              } else {
                children = this.getChildren();
                clen = children.length;
                for (i = 0; i < clen; i++) {
                  retArr = retArr.concat(children[i]._get(sel));
                }
              }
            }
            return Kinetic.Collection.toCollection(retArr);
          },
          _getNodeById: function(key) {
            var node = Kinetic.ids[key];
            if (node !== void 0 && this.isAncestorOf(node)) {
              return node;
            }
            return null;
          },
          _getNodesByName: function(key) {
            var arr = Kinetic.names[key] || [];
            return this._getDescendants(arr);
          },
          _get: function(selector) {
            var retArr = Kinetic.Node.prototype._get.call(this, selector);
            var children = this.getChildren();
            var len = children.length;
            for (var n = 0; n < len; n++) {
              retArr = retArr.concat(children[n]._get(selector));
            }
            return retArr;
          },
          // extenders
          toObject: function() {
            var obj = Kinetic.Node.prototype.toObject.call(this);
            obj.children = [];
            var children = this.getChildren();
            var len = children.length;
            for (var n = 0; n < len; n++) {
              var child = children[n];
              obj.children.push(child.toObject());
            }
            return obj;
          },
          _getDescendants: function(arr) {
            var retArr = [];
            var len = arr.length;
            for (var n = 0; n < len; n++) {
              var node = arr[n];
              if (this.isAncestorOf(node)) {
                retArr.push(node);
              }
            }
            return retArr;
          },
          /**
           * determine if node is an ancestor
           * of descendant
           * @method
           * @memberof Kinetic.Container.prototype
           * @param {Kinetic.Node} node
           */
          isAncestorOf: function(node) {
            var parent = node.getParent();
            while (parent) {
              if (parent._id === this._id) {
                return true;
              }
              parent = parent.getParent();
            }
            return false;
          },
          clone: function(obj) {
            var node = Kinetic.Node.prototype.clone.call(this, obj);
            this.getChildren().each(function(no) {
              node.add(no.clone());
            });
            return node;
          },
          /**
           * get all shapes that intersect a point.  Note: because this method must clear a temporary
           * canvas and redraw every shape inside the container, it should only be used for special sitations
           * because it performs very poorly.  Please use the {@link Kinetic.Stage#getIntersection} method if at all possible
           * because it performs much better
           * @method
           * @memberof Kinetic.Container.prototype
           * @param {Object} pos
           * @param {Number} pos.x
           * @param {Number} pos.y
           * @returns {Array} array of shapes
           */
          getAllIntersections: function(pos) {
            var arr = [];
            this.find("Shape").each(function(shape) {
              if (shape.isVisible() && shape.intersects(pos)) {
                arr.push(shape);
              }
            });
            return arr;
          },
          _setChildrenIndices: function() {
            this.children.each(function(child, n) {
              child.index = n;
            });
          },
          drawScene: function(can, top) {
            var layer = this.getLayer(), canvas = can || layer && layer.getCanvas(), context = canvas && canvas.getContext(), cachedCanvas = this._cache.canvas, cachedSceneCanvas = cachedCanvas && cachedCanvas.scene;
            if (this.isVisible()) {
              if (cachedSceneCanvas) {
                this._drawCachedSceneCanvas(context);
              } else {
                this._drawChildren(canvas, "drawScene", top);
              }
            }
            return this;
          },
          drawHit: function(can, top) {
            var layer = this.getLayer(), canvas = can || layer && layer.hitCanvas, context = canvas && canvas.getContext(), cachedCanvas = this._cache.canvas, cachedHitCanvas = cachedCanvas && cachedCanvas.hit;
            if (this.shouldDrawHit(canvas)) {
              if (layer) {
                layer.clearHitCache();
              }
              if (cachedHitCanvas) {
                this._drawCachedHitCanvas(context);
              } else {
                this._drawChildren(canvas, "drawHit", top);
              }
            }
            return this;
          },
          _drawChildren: function(canvas, drawMethod, top) {
            var layer = this.getLayer(), context = canvas && canvas.getContext(), clipWidth = this.getClipWidth(), clipHeight = this.getClipHeight(), hasClip = clipWidth && clipHeight, clipX, clipY;
            if (hasClip && layer) {
              clipX = this.getClipX();
              clipY = this.getClipY();
              context.save();
              layer._applyTransform(this, context);
              context.beginPath();
              context.rect(clipX, clipY, clipWidth, clipHeight);
              context.clip();
              context.reset();
            }
            this.children.each(function(child) {
              child[drawMethod](canvas, top);
            });
            if (hasClip) {
              context.restore();
            }
          },
          shouldDrawHit: function(canvas) {
            var layer = this.getLayer();
            var dd = Kinetic.DD;
            var layerUnderDrag = dd && Kinetic.isDragging() && Kinetic.DD.anim.getLayers().indexOf(layer) !== -1;
            return canvas && canvas.isCache || layer && layer.hitGraphEnabled() && this.isVisible() && !layerUnderDrag;
          }
        });
        Kinetic.Util.extend(Kinetic.Container, Kinetic.Node);
        Kinetic.Container.prototype.get = Kinetic.Container.prototype.find;
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Container, "clip", ["x", "y", "width", "height"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Container, "clipX");
        Kinetic.Factory.addGetterSetter(Kinetic.Container, "clipY");
        Kinetic.Factory.addGetterSetter(Kinetic.Container, "clipWidth");
        Kinetic.Factory.addGetterSetter(Kinetic.Container, "clipHeight");
        Kinetic.Collection.mapMethods(Kinetic.Container);
      })();
      (function() {
        var HAS_SHADOW = "hasShadow";
        function _fillFunc(context) {
          context.fill();
        }
        function _strokeFunc(context) {
          context.stroke();
        }
        function _fillFuncHit(context) {
          context.fill();
        }
        function _strokeFuncHit(context) {
          context.stroke();
        }
        function _clearHasShadowCache() {
          this._clearCache(HAS_SHADOW);
        }
        Kinetic.Util.addMethods(Kinetic.Shape, {
          __init: function(config) {
            this.nodeType = "Shape";
            this._fillFunc = _fillFunc;
            this._strokeFunc = _strokeFunc;
            this._fillFuncHit = _fillFuncHit;
            this._strokeFuncHit = _strokeFuncHit;
            var shapes = Kinetic.shapes;
            var key;
            while (true) {
              key = Kinetic.Util.getRandomColor();
              if (key && !(key in shapes)) {
                break;
              }
            }
            this.colorKey = key;
            shapes[key] = this;
            Kinetic.Node.call(this, config);
            this.on("shadowColorChange.kinetic shadowBlurChange.kinetic shadowOffsetChange.kinetic shadowOpacityChange.kinetic shadowEnabledChange.kinetic", _clearHasShadowCache);
          },
          hasChildren: function() {
            return false;
          },
          getChildren: function() {
            return [];
          },
          /**
           * get canvas context tied to the layer
           * @method
           * @memberof Kinetic.Shape.prototype
           * @returns {Kinetic.Context}
           */
          getContext: function() {
            return this.getLayer().getContext();
          },
          /**
           * get canvas renderer tied to the layer.  Note that this returns a canvas renderer, not a canvas element
           * @method
           * @memberof Kinetic.Shape.prototype
           * @returns {Kinetic.Canvas}
           */
          getCanvas: function() {
            return this.getLayer().getCanvas();
          },
          /**
           * returns whether or not a shadow will be rendered
           * @method
           * @memberof Kinetic.Shape.prototype
           * @returns {Boolean}
           */
          hasShadow: function() {
            return this._getCache(HAS_SHADOW, this._hasShadow);
          },
          _hasShadow: function() {
            return this.getShadowEnabled() && (this.getShadowOpacity() !== 0 && !!(this.getShadowColor() || this.getShadowBlur() || this.getShadowOffsetX() || this.getShadowOffsetY()));
          },
          /**
           * returns whether or not the shape will be filled
           * @method
           * @memberof Kinetic.Shape.prototype
           * @returns {Boolean}
           */
          hasFill: function() {
            return !!(this.getFill() || this.getFillPatternImage() || this.getFillLinearGradientColorStops() || this.getFillRadialGradientColorStops());
          },
          /**
           * returns whether or not the shape will be stroked
           * @method
           * @memberof Kinetic.Shape.prototype
           * @returns {Boolean}
           */
          hasStroke: function() {
            return !!(this.stroke() || this.strokeRed() || this.strokeGreen() || this.strokeBlue());
          },
          /**
           * determines if point is in the shape, regardless if other shapes are on top of it.  Note: because
           *  this method clears a temporary canvas and then redraws the shape, it performs very poorly if executed many times
           *  consecutively.  Please use the {@link Kinetic.Stage#getIntersection} method if at all possible
           *  because it performs much better
           * @method
           * @memberof Kinetic.Shape.prototype
           * @param {Object} point 
           * @param {Number} point.x
           * @param {Number} point.y
           * @returns {Boolean}
           */
          intersects: function(point) {
            var stage = this.getStage(), bufferHitCanvas = stage.bufferHitCanvas, p;
            bufferHitCanvas.getContext().clear();
            this.drawScene(bufferHitCanvas);
            p = bufferHitCanvas.context.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data;
            return p[3] > 0;
          },
          // extends Node.prototype.destroy 
          destroy: function() {
            Kinetic.Node.prototype.destroy.call(this);
            delete Kinetic.shapes[this.colorKey];
          },
          _useBufferCanvas: function() {
            return (this.hasShadow() || this.getAbsoluteOpacity() !== 1) && this.hasFill() && this.hasStroke() && this.getStage();
          },
          drawScene: function(can, top) {
            var layer = this.getLayer(), canvas = can || layer.getCanvas(), context = canvas.getContext(), cachedCanvas = this._cache.canvas, drawFunc = this.sceneFunc(), hasShadow = this.hasShadow(), stage, bufferCanvas, bufferContext;
            if (this.isVisible()) {
              if (cachedCanvas) {
                this._drawCachedSceneCanvas(context);
              } else if (drawFunc) {
                context.save();
                if (this._useBufferCanvas()) {
                  stage = this.getStage();
                  bufferCanvas = stage.bufferCanvas;
                  bufferContext = bufferCanvas.getContext();
                  bufferContext.clear();
                  bufferContext.save();
                  bufferContext._applyLineJoin(this);
                  if (layer) {
                    layer._applyTransform(this, bufferContext, top);
                  } else {
                    var m = this.getAbsoluteTransform(top).getMatrix();
                    context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
                  }
                  drawFunc.call(this, bufferContext);
                  bufferContext.restore();
                  if (hasShadow && !canvas.hitCanvas) {
                    context.save();
                    context._applyShadow(this);
                    context.drawImage(bufferCanvas._canvas, 0, 0);
                    context.restore();
                  }
                  context._applyOpacity(this);
                  context.drawImage(bufferCanvas._canvas, 0, 0);
                } else {
                  context._applyLineJoin(this);
                  if (layer) {
                    layer._applyTransform(this, context, top);
                  } else {
                    var o = this.getAbsoluteTransform(top).getMatrix();
                    context.transform(o[0], o[1], o[2], o[3], o[4], o[5]);
                  }
                  if (hasShadow && !canvas.hitCanvas) {
                    context.save();
                    context._applyShadow(this);
                    drawFunc.call(this, context);
                    context.restore();
                  }
                  context._applyOpacity(this);
                  drawFunc.call(this, context);
                }
                context.restore();
              }
            }
            return this;
          },
          drawHit: function(can, top) {
            var layer = this.getLayer(), canvas = can || layer.hitCanvas, context = canvas.getContext(), drawFunc = this.hitFunc() || this.sceneFunc(), cachedCanvas = this._cache.canvas, cachedHitCanvas = cachedCanvas && cachedCanvas.hit;
            if (this.shouldDrawHit(canvas)) {
              if (layer) {
                layer.clearHitCache();
              }
              if (cachedHitCanvas) {
                this._drawCachedHitCanvas(context);
              } else if (drawFunc) {
                context.save();
                context._applyLineJoin(this);
                if (layer) {
                  layer._applyTransform(this, context, top);
                } else {
                  var m = this.getAbsoluteTransform(top).getMatrix();
                  context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
                }
                drawFunc.call(this, context);
                context.restore();
              }
            }
            return this;
          },
          /**
          * draw hit graph using the cached scene canvas
          * @method
          * @memberof Kinetic.Shape.prototype
          * @param {Integer} alphaThreshold alpha channel threshold that determines whether or not
          *  a pixel should be drawn onto the hit graph.  Must be a value between 0 and 255.  
          *  The default is 0
          * @returns {Kinetic.Shape}
          * @example
          * shape.cache();
          * shape.drawHitFromCache();
          */
          drawHitFromCache: function(alphaThreshold) {
            var threshold = alphaThreshold || 0, cachedCanvas = this._cache.canvas, sceneCanvas = this._getCachedSceneCanvas(), sceneContext = sceneCanvas.getContext(), hitCanvas = cachedCanvas.hit, hitContext = hitCanvas.getContext(), width = sceneCanvas.getWidth(), height = sceneCanvas.getHeight(), sceneImageData, sceneData, hitImageData, hitData, len, rgbColorKey, i, alpha;
            hitContext.clear();
            try {
              sceneImageData = sceneContext.getImageData(0, 0, width, height);
              sceneData = sceneImageData.data;
              hitImageData = hitContext.getImageData(0, 0, width, height);
              hitData = hitImageData.data;
              len = sceneData.length;
              rgbColorKey = Kinetic.Util._hexToRgb(this.colorKey);
              for (i = 0; i < len; i += 4) {
                alpha = sceneData[i + 3];
                if (alpha > threshold) {
                  hitData[i] = rgbColorKey.r;
                  hitData[i + 1] = rgbColorKey.g;
                  hitData[i + 2] = rgbColorKey.b;
                  hitData[i + 3] = 255;
                }
              }
              hitContext.putImageData(hitImageData, 0, 0);
            } catch (e) {
              Kinetic.Util.warn("Unable to draw hit graph from cached scene canvas. " + e.message);
            }
            return this;
          }
        });
        Kinetic.Util.extend(Kinetic.Shape, Kinetic.Node);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "stroke");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "strokeRed", 0, Kinetic.Validators.RGBComponent);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "strokeGreen", 0, Kinetic.Validators.RGBComponent);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "strokeBlue", 0, Kinetic.Validators.RGBComponent);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "strokeAlpha", 1, Kinetic.Validators.alphaComponent);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "strokeWidth", 2);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "lineJoin");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "lineCap");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "sceneFunc");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "hitFunc");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "dash");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "shadowColor");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "shadowRed", 0, Kinetic.Validators.RGBComponent);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "shadowGreen", 0, Kinetic.Validators.RGBComponent);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "shadowBlue", 0, Kinetic.Validators.RGBComponent);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "shadowAlpha", 1, Kinetic.Validators.alphaComponent);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "shadowBlur");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "shadowOpacity");
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Shape, "shadowOffset", ["x", "y"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "shadowOffsetX", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "shadowOffsetY", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillPatternImage");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fill");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillRed", 0, Kinetic.Validators.RGBComponent);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillGreen", 0, Kinetic.Validators.RGBComponent);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillBlue", 0, Kinetic.Validators.RGBComponent);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillAlpha", 1, Kinetic.Validators.alphaComponent);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillPatternX", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillPatternY", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillLinearGradientColorStops");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillRadialGradientStartRadius", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillRadialGradientEndRadius", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillRadialGradientColorStops");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillPatternRepeat", "repeat");
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillEnabled", true);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "strokeEnabled", true);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "shadowEnabled", true);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "dashEnabled", true);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "strokeScaleEnabled", true);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillPriority", "color");
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Shape, "fillPatternOffset", ["x", "y"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillPatternOffsetX", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillPatternOffsetY", 0);
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Shape, "fillPatternScale", ["x", "y"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillPatternScaleX", 1);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillPatternScaleY", 1);
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Shape, "fillLinearGradientStartPoint", ["x", "y"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillLinearGradientStartPointX", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillLinearGradientStartPointY", 0);
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Shape, "fillLinearGradientEndPoint", ["x", "y"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillLinearGradientEndPointX", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillLinearGradientEndPointY", 0);
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Shape, "fillRadialGradientStartPoint", ["x", "y"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillRadialGradientStartPointX", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillRadialGradientStartPointY", 0);
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Shape, "fillRadialGradientEndPoint", ["x", "y"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillRadialGradientEndPointX", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillRadialGradientEndPointY", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Shape, "fillPatternRotation", 0);
        Kinetic.Factory.backCompat(Kinetic.Shape, {
          dashArray: "dash",
          getDashArray: "getDash",
          setDashArray: "getDash",
          drawFunc: "sceneFunc",
          getDrawFunc: "getSceneFunc",
          setDrawFunc: "setSceneFunc",
          drawHitFunc: "hitFunc",
          getDrawHitFunc: "getHitFunc",
          setDrawHitFunc: "setHitFunc"
        });
        Kinetic.Collection.mapMethods(Kinetic.Shape);
      })();
      (function() {
        var STAGE = "Stage", STRING = "string", PX = "px", MOUSEOUT = "mouseout", MOUSELEAVE = "mouseleave", MOUSEOVER = "mouseover", MOUSEENTER = "mouseenter", MOUSEMOVE = "mousemove", MOUSEDOWN = "mousedown", MOUSEUP = "mouseup", CLICK = "click", DBL_CLICK = "dblclick", TOUCHSTART = "touchstart", TOUCHEND = "touchend", TAP = "tap", DBL_TAP = "dbltap", TOUCHMOVE = "touchmove", DOMMOUSESCROLL = "DOMMouseScroll", MOUSEWHEEL = "mousewheel", WHEEL = "wheel", CONTENT_MOUSEOUT = "contentMouseout", CONTENT_MOUSEOVER = "contentMouseover", CONTENT_MOUSEMOVE = "contentMousemove", CONTENT_MOUSEDOWN = "contentMousedown", CONTENT_MOUSEUP = "contentMouseup", CONTENT_CLICK = "contentClick", CONTENT_DBL_CLICK = "contentDblclick", CONTENT_TOUCHSTART = "contentTouchstart", CONTENT_TOUCHEND = "contentTouchend", CONTENT_DBL_TAP = "contentDbltap", CONTENT_TOUCHMOVE = "contentTouchmove", DIV = "div", RELATIVE = "relative", INLINE_BLOCK = "inline-block", KINETICJS_CONTENT = "kineticjs-content", SPACE = " ", UNDERSCORE = "_", CONTAINER = "container", EMPTY_STRING = "", EVENTS = [MOUSEDOWN, MOUSEMOVE, MOUSEUP, MOUSEOUT, TOUCHSTART, TOUCHMOVE, TOUCHEND, MOUSEOVER, DOMMOUSESCROLL, MOUSEWHEEL, WHEEL], eventsLength = EVENTS.length;
        function addEvent(ctx, eventName) {
          ctx.content.addEventListener(eventName, function(evt) {
            ctx[UNDERSCORE + eventName](evt);
          }, false);
        }
        Kinetic.Util.addMethods(Kinetic.Stage, {
          ___init: function(config) {
            this.nodeType = STAGE;
            Kinetic.Container.call(this, config);
            this._id = Kinetic.idCounter++;
            this._buildDOM();
            this._bindContentEvents();
            this._enableNestedTransforms = false;
            Kinetic.stages.push(this);
          },
          _validateAdd: function(child) {
            if (child.getType() !== "Layer") {
              Kinetic.Util.error("You may only add layers to the stage.");
            }
          },
          /**
           * set container dom element which contains the stage wrapper div element
           * @method
           * @memberof Kinetic.Stage.prototype
           * @param {DomElement} container can pass in a dom element or id string
           */
          setContainer: function(container) {
            if (typeof container === STRING) {
              var id = container;
              container = Kinetic.document.getElementById(container);
              if (!container) {
                throw "Can not find container in document with id " + id;
              }
            }
            this._setAttr(CONTAINER, container);
            return this;
          },
          shouldDrawHit: function() {
            return true;
          },
          draw: function() {
            Kinetic.Node.prototype.draw.call(this);
            return this;
          },
          /**
           * draw layer scene graphs
           * @name draw
           * @method
           * @memberof Kinetic.Stage.prototype
           */
          /**
           * draw layer hit graphs
           * @name drawHit
           * @method
           * @memberof Kinetic.Stage.prototype
           */
          /**
           * set height
           * @method
           * @memberof Kinetic.Stage.prototype
           * @param {Number} height
           */
          setHeight: function(height) {
            Kinetic.Node.prototype.setHeight.call(this, height);
            this._resizeDOM();
            return this;
          },
          /**
           * set width
           * @method
           * @memberof Kinetic.Stage.prototype
           * @param {Number} width
           */
          setWidth: function(width) {
            Kinetic.Node.prototype.setWidth.call(this, width);
            this._resizeDOM();
            return this;
          },
          /**
           * clear all layers
           * @method
           * @memberof Kinetic.Stage.prototype
           */
          clear: function() {
            var layers = this.children, len = layers.length, n;
            for (n = 0; n < len; n++) {
              layers[n].clear();
            }
            return this;
          },
          clone: function(obj) {
            if (!obj) {
              obj = {};
            }
            obj.container = Kinetic.document.createElement(DIV);
            return Kinetic.Container.prototype.clone.call(this, obj);
          },
          /**
           * destroy stage
           * @method
           * @memberof Kinetic.Stage.prototype
           */
          destroy: function() {
            var content = this.content;
            Kinetic.Container.prototype.destroy.call(this);
            if (content && Kinetic.Util._isInDocument(content)) {
              this.getContainer().removeChild(content);
            }
            var index = Kinetic.stages.indexOf(this);
            if (index > -1) {
              Kinetic.stages.splice(index, 1);
            }
          },
          /**
           * get pointer position which can be a touch position or mouse position
           * @method
           * @memberof Kinetic.Stage.prototype
           * @returns {Object}
           */
          getPointerPosition: function() {
            return this.pointerPos;
          },
          getStage: function() {
            return this;
          },
          /**
           * get stage content div element which has the
           *  the class name "kineticjs-content"
           * @method
           * @memberof Kinetic.Stage.prototype
           */
          getContent: function() {
            return this.content;
          },
          /**
           * Creates a composite data URL and requires a callback because the composite is generated asynchronously.
           * @method
           * @memberof Kinetic.Stage.prototype
           * @param {Object} config
           * @param {Function} config.callback function executed when the composite has completed
           * @param {String} [config.mimeType] can be "image/png" or "image/jpeg".
           *  "image/png" is the default
           * @param {Number} [config.x] x position of canvas section
           * @param {Number} [config.y] y position of canvas section
           * @param {Number} [config.width] width of canvas section
           * @param {Number} [config.height] height of canvas section
           * @param {Number} [config.quality] jpeg quality.  If using an "image/jpeg" mimeType,
           *  you can specify the quality from 0 to 1, where 0 is very poor quality and 1
           *  is very high quality
           */
          toDataURL: function(config) {
            config = config || {};
            var mimeType = config.mimeType || null, quality = config.quality || null, x = config.x || 0, y = config.y || 0, canvas = new Kinetic.SceneCanvas({
              width: config.width || this.getWidth(),
              height: config.height || this.getHeight(),
              pixelRatio: 1
            }), _context = canvas.getContext()._context, layers = this.children;
            if (x || y) {
              _context.translate(-1 * x, -1 * y);
            }
            function drawLayer(n) {
              var layer = layers[n], layerUrl = layer.toDataURL(), imageObj = new Kinetic.window.Image();
              imageObj.onload = function() {
                _context.drawImage(imageObj, 0, 0);
                if (n < layers.length - 1) {
                  drawLayer(n + 1);
                } else {
                  config.callback(canvas.toDataURL(mimeType, quality));
                }
              };
              imageObj.src = layerUrl;
            }
            drawLayer(0);
          },
          /**
           * converts stage into an image.
           * @method
           * @memberof Kinetic.Stage.prototype
           * @param {Object} config
           * @param {Function} config.callback function executed when the composite has completed
           * @param {String} [config.mimeType] can be "image/png" or "image/jpeg".
           *  "image/png" is the default
           * @param {Number} [config.x] x position of canvas section
           * @param {Number} [config.y] y position of canvas section
           * @param {Number} [config.width] width of canvas section
           * @param {Number} [config.height] height of canvas section
           * @param {Number} [config.quality] jpeg quality.  If using an "image/jpeg" mimeType,
           *  you can specify the quality from 0 to 1, where 0 is very poor quality and 1
           *  is very high quality
           */
          toImage: function(config) {
            var cb = config.callback;
            config.callback = function(dataUrl) {
              Kinetic.Util._getImage(dataUrl, function(img) {
                cb(img);
              });
            };
            this.toDataURL(config);
          },
          /**
           * get visible intersection shape. This is the preferred
           *  method for determining if a point intersects a shape or not
           * @method
           * @memberof Kinetic.Stage.prototype
           * @param {Object} pos
           * @param {Number} pos.x
           * @param {Number} pos.y
           * @returns {Kinetic.Shape}
           */
          getIntersection: function(pos) {
            var layers = this.getChildren(), len = layers.length, end = len - 1, n, shape;
            for (n = end; n >= 0; n--) {
              shape = layers[n].getIntersection(pos);
              if (shape) {
                return shape;
              }
            }
            return null;
          },
          _resizeDOM: function() {
            if (this.content) {
              var width = this.getWidth(), height = this.getHeight(), layers = this.getChildren(), len = layers.length, n, layer;
              this.content.style.width = width + PX;
              this.content.style.height = height + PX;
              this.bufferCanvas.setSize(width, height);
              this.bufferHitCanvas.setSize(width, height);
              for (n = 0; n < len; n++) {
                layer = layers[n];
                layer.setSize(width, height);
                layer.draw();
              }
            }
          },
          /**
           * add layer or layers to stage
           * @method
           * @memberof Kinetic.Stage.prototype
           * @param {...Kinetic.Layer} layer
           * @example
           * stage.add(layer1, layer2, layer3);
           */
          add: function(layer) {
            if (arguments.length > 1) {
              for (var i = 0; i < arguments.length; i++) {
                this.add(arguments[i]);
              }
              return;
            }
            Kinetic.Container.prototype.add.call(this, layer);
            layer._setCanvasSize(this.width(), this.height());
            layer.draw();
            this.content.appendChild(layer.canvas._canvas);
            return this;
          },
          getParent: function() {
            return null;
          },
          getLayer: function() {
            return null;
          },
          /**
           * returns a {@link Kinetic.Collection} of layers
           * @method
           * @memberof Kinetic.Stage.prototype
           */
          getLayers: function() {
            return this.getChildren();
          },
          _bindContentEvents: function() {
            for (var n = 0; n < eventsLength; n++) {
              addEvent(this, EVENTS[n]);
            }
          },
          _mouseover: function(evt) {
            if (!Kinetic.UA.mobile) {
              this._setPointerPosition(evt);
              this._fire(CONTENT_MOUSEOVER, { evt });
            }
          },
          _mouseout: function(evt) {
            if (!Kinetic.UA.mobile) {
              this._setPointerPosition(evt);
              var targetShape = this.targetShape;
              if (targetShape && !Kinetic.isDragging()) {
                targetShape._fireAndBubble(MOUSEOUT, { evt });
                targetShape._fireAndBubble(MOUSELEAVE, { evt });
                this.targetShape = null;
              }
              this.pointerPos = void 0;
              this._fire(CONTENT_MOUSEOUT, { evt });
            }
          },
          _mousemove: function(evt) {
            if (Kinetic.UA.ieMobile) {
              return this._touchmove(evt);
            }
            if ((typeof evt.webkitMovementX !== "undefined" || typeof evt.webkitMovementY !== "undefined") && evt.webkitMovementY === 0 && evt.webkitMovementX === 0) {
              return;
            }
            if (Kinetic.UA.mobile) {
              return;
            }
            this._setPointerPosition(evt);
            var dd = Kinetic.DD, shape;
            if (!Kinetic.isDragging()) {
              shape = this.getIntersection(this.getPointerPosition());
              if (shape && shape.isListening()) {
                if (!Kinetic.isDragging() && (!this.targetShape || this.targetShape._id !== shape._id)) {
                  if (this.targetShape) {
                    this.targetShape._fireAndBubble(MOUSEOUT, { evt }, shape);
                    this.targetShape._fireAndBubble(MOUSELEAVE, { evt }, shape);
                  }
                  shape._fireAndBubble(MOUSEOVER, { evt }, this.targetShape);
                  shape._fireAndBubble(MOUSEENTER, { evt }, this.targetShape);
                  this.targetShape = shape;
                } else {
                  shape._fireAndBubble(MOUSEMOVE, { evt });
                }
              } else {
                if (this.targetShape && !Kinetic.isDragging()) {
                  this.targetShape._fireAndBubble(MOUSEOUT, { evt });
                  this.targetShape._fireAndBubble(MOUSELEAVE, { evt });
                  this.targetShape = null;
                }
              }
              this._fire(CONTENT_MOUSEMOVE, { evt });
            }
            if (dd) {
              dd._drag(evt);
            }
            if (evt.preventDefault) {
              evt.preventDefault();
            }
          },
          _mousedown: function(evt) {
            if (Kinetic.UA.ieMobile) {
              return this._touchstart(evt);
            }
            if (!Kinetic.UA.mobile) {
              this._setPointerPosition(evt);
              var shape = this.getIntersection(this.getPointerPosition());
              Kinetic.listenClickTap = true;
              if (shape && shape.isListening()) {
                this.clickStartShape = shape;
                shape._fireAndBubble(MOUSEDOWN, { evt });
              }
              this._fire(CONTENT_MOUSEDOWN, { evt });
            }
            if (evt.preventDefault) {
              evt.preventDefault();
            }
          },
          _mouseup: function(evt) {
            if (Kinetic.UA.ieMobile) {
              return this._touchend(evt);
            }
            if (!Kinetic.UA.mobile) {
              this._setPointerPosition(evt);
              var shape = this.getIntersection(this.getPointerPosition()), clickStartShape = this.clickStartShape, fireDblClick = false, dd = Kinetic.DD;
              if (Kinetic.inDblClickWindow) {
                fireDblClick = true;
                Kinetic.inDblClickWindow = false;
              } else if (!dd || !dd.justDragged) {
                Kinetic.inDblClickWindow = true;
              } else if (dd) {
                dd.justDragged = false;
              }
              setTimeout(function() {
                Kinetic.inDblClickWindow = false;
              }, Kinetic.dblClickWindow);
              if (shape && shape.isListening()) {
                shape._fireAndBubble(MOUSEUP, { evt });
                if (Kinetic.listenClickTap && clickStartShape && clickStartShape._id === shape._id) {
                  shape._fireAndBubble(CLICK, { evt });
                  if (fireDblClick) {
                    shape._fireAndBubble(DBL_CLICK, { evt });
                  }
                }
              }
              this._fire(CONTENT_MOUSEUP, { evt });
              if (Kinetic.listenClickTap) {
                this._fire(CONTENT_CLICK, { evt });
                if (fireDblClick) {
                  this._fire(CONTENT_DBL_CLICK, { evt });
                }
              }
              Kinetic.listenClickTap = false;
            }
            if (evt.preventDefault) {
              evt.preventDefault();
            }
          },
          _touchstart: function(evt) {
            this._setPointerPosition(evt);
            var shape = this.getIntersection(this.getPointerPosition());
            Kinetic.listenClickTap = true;
            if (shape && shape.isListening()) {
              this.tapStartShape = shape;
              shape._fireAndBubble(TOUCHSTART, { evt });
              if (shape.isListening() && evt.preventDefault) {
                evt.preventDefault();
              }
            }
            this._fire(CONTENT_TOUCHSTART, { evt });
          },
          _touchend: function(evt) {
            this._setPointerPosition(evt);
            var shape = this.getIntersection(this.getPointerPosition()), fireDblClick = false;
            if (Kinetic.inDblClickWindow) {
              fireDblClick = true;
              Kinetic.inDblClickWindow = false;
            } else {
              Kinetic.inDblClickWindow = true;
            }
            setTimeout(function() {
              Kinetic.inDblClickWindow = false;
            }, Kinetic.dblClickWindow);
            if (shape && shape.isListening()) {
              shape._fireAndBubble(TOUCHEND, { evt });
              if (Kinetic.listenClickTap && shape._id === this.tapStartShape._id) {
                shape._fireAndBubble(TAP, { evt });
                if (fireDblClick) {
                  shape._fireAndBubble(DBL_TAP, { evt });
                }
              }
              if (shape.isListening() && evt.preventDefault) {
                evt.preventDefault();
              }
            }
            if (Kinetic.listenClickTap) {
              this._fire(CONTENT_TOUCHEND, { evt });
              if (fireDblClick) {
                this._fire(CONTENT_DBL_TAP, { evt });
              }
            }
            Kinetic.listenClickTap = false;
          },
          _touchmove: function(evt) {
            this._setPointerPosition(evt);
            var dd = Kinetic.DD, shape;
            if (!Kinetic.isDragging()) {
              shape = this.getIntersection(this.getPointerPosition());
              if (shape && shape.isListening()) {
                shape._fireAndBubble(TOUCHMOVE, { evt });
                if (shape.isListening() && evt.preventDefault) {
                  evt.preventDefault();
                }
              }
              this._fire(CONTENT_TOUCHMOVE, { evt });
            }
            if (dd) {
              dd._drag(evt);
              if (Kinetic.isDragging()) {
                evt.preventDefault();
              }
            }
          },
          _DOMMouseScroll: function(evt) {
            this._mousewheel(evt);
          },
          _mousewheel: function(evt) {
            this._setPointerPosition(evt);
            var shape = this.getIntersection(this.getPointerPosition());
            if (shape && shape.isListening()) {
              shape._fireAndBubble(MOUSEWHEEL, { evt });
            }
          },
          _wheel: function(evt) {
            this._mousewheel(evt);
          },
          _setPointerPosition: function(evt) {
            var contentPosition = this._getContentPosition(), offsetX = evt.offsetX, clientX = evt.clientX, x = null, y = null, touch;
            evt = evt ? evt : window.event;
            if (evt.touches !== void 0) {
              if (evt.touches.length > 0) {
                touch = evt.touches[0];
                x = touch.clientX - contentPosition.left;
                y = touch.clientY - contentPosition.top;
              }
            } else {
              if (offsetX !== void 0) {
                x = offsetX;
                y = evt.offsetY;
              } else if (Kinetic.UA.browser === "mozilla") {
                x = evt.layerX;
                y = evt.layerY;
              } else if (clientX !== void 0 && contentPosition) {
                x = clientX - contentPosition.left;
                y = evt.clientY - contentPosition.top;
              }
            }
            if (x !== null && y !== null) {
              this.pointerPos = {
                x,
                y
              };
            }
          },
          _getContentPosition: function() {
            var rect = this.content.getBoundingClientRect ? this.content.getBoundingClientRect() : { top: 0, left: 0 };
            return {
              top: rect.top,
              left: rect.left
            };
          },
          _buildDOM: function() {
            var container = this.getContainer();
            if (!container) {
              if (Kinetic.Util.isBrowser()) {
                throw "Stage has no container. A container is required.";
              } else {
                container = Kinetic.document.createElement(DIV);
              }
            }
            container.innerHTML = EMPTY_STRING;
            this.content = Kinetic.document.createElement(DIV);
            this.content.style.position = RELATIVE;
            this.content.style.display = INLINE_BLOCK;
            this.content.className = KINETICJS_CONTENT;
            this.content.setAttribute("role", "presentation");
            container.appendChild(this.content);
            this.bufferCanvas = new Kinetic.SceneCanvas({
              pixelRatio: 1
            });
            this.bufferHitCanvas = new Kinetic.HitCanvas();
            this._resizeDOM();
          },
          _onContent: function(typesStr, handler) {
            var types = typesStr.split(SPACE), len = types.length, n, baseEvent;
            for (n = 0; n < len; n++) {
              baseEvent = types[n];
              this.content.addEventListener(baseEvent, handler, false);
            }
          },
          // currently cache function is now working for stage, because stage has no its own canvas element
          // TODO: may be it is better to cache all children layers?
          cache: function() {
            Kinetic.Util.warn("Cache function is not allowed for stage. You may use cache only for layers, groups and shapes.");
          },
          clearCache: function() {
          }
        });
        Kinetic.Util.extend(Kinetic.Stage, Kinetic.Container);
        Kinetic.Factory.addGetter(Kinetic.Stage, "container");
        Kinetic.Factory.addOverloadedGetterSetter(Kinetic.Stage, "container");
      })();
      (function() {
        Kinetic.Util.addMethods(Kinetic.BaseLayer, {
          ___init: function(config) {
            this.nodeType = "Layer";
            Kinetic.Container.call(this, config);
          },
          createPNGStream: function() {
            return this.canvas._canvas.createPNGStream();
          },
          /**
           * get layer canvas
           * @method
           * @memberof Kinetic.BaseLayer.prototype
           */
          getCanvas: function() {
            return this.canvas;
          },
          /**
           * get layer hit canvas
           * @method
           * @memberof Kinetic.BaseLayer.prototype
           */
          getHitCanvas: function() {
            return this.hitCanvas;
          },
          /**
           * get layer canvas context
           * @method
           * @memberof Kinetic.BaseLayer.prototype
           */
          getContext: function() {
            return this.getCanvas().getContext();
          },
          /**
           * clear scene and hit canvas contexts tied to the layer
           * @method
           * @memberof Kinetic.BaseLayer.prototype
           * @param {Object} [bounds]
           * @param {Number} [bounds.x]
           * @param {Number} [bounds.y]
           * @param {Number} [bounds.width]
           * @param {Number} [bounds.height]
           * @example
           * layer.clear();
           * layer.clear({
           *   x : 0,
           *   y : 0,
           *   width : 100,
           *   height : 100
           * });
           */
          clear: function(bounds) {
            this.getContext().clear(bounds);
            this.getHitCanvas().getContext().clear(bounds);
            return this;
          },
          clearHitCache: function() {
            this._hitImageData = void 0;
          },
          // extend Node.prototype.setZIndex
          setZIndex: function(index) {
            Kinetic.Node.prototype.setZIndex.call(this, index);
            var stage = this.getStage();
            if (stage) {
              stage.content.removeChild(this.getCanvas()._canvas);
              if (index < stage.getChildren().length - 1) {
                stage.content.insertBefore(this.getCanvas()._canvas, stage.getChildren()[index + 1].getCanvas()._canvas);
              } else {
                stage.content.appendChild(this.getCanvas()._canvas);
              }
            }
            return this;
          },
          // extend Node.prototype.moveToTop
          moveToTop: function() {
            Kinetic.Node.prototype.moveToTop.call(this);
            var stage = this.getStage();
            if (stage) {
              stage.content.removeChild(this.getCanvas()._canvas);
              stage.content.appendChild(this.getCanvas()._canvas);
            }
          },
          // extend Node.prototype.moveUp
          moveUp: function() {
            if (Kinetic.Node.prototype.moveUp.call(this)) {
              var stage = this.getStage();
              if (stage) {
                stage.content.removeChild(this.getCanvas()._canvas);
                if (this.index < stage.getChildren().length - 1) {
                  stage.content.insertBefore(this.getCanvas()._canvas, stage.getChildren()[this.index + 1].getCanvas()._canvas);
                } else {
                  stage.content.appendChild(this.getCanvas()._canvas);
                }
              }
            }
          },
          // extend Node.prototype.moveDown
          moveDown: function() {
            if (Kinetic.Node.prototype.moveDown.call(this)) {
              var stage = this.getStage();
              if (stage) {
                var children = stage.getChildren();
                stage.content.removeChild(this.getCanvas()._canvas);
                stage.content.insertBefore(this.getCanvas()._canvas, children[this.index + 1].getCanvas()._canvas);
              }
            }
          },
          // extend Node.prototype.moveToBottom
          moveToBottom: function() {
            if (Kinetic.Node.prototype.moveToBottom.call(this)) {
              var stage = this.getStage();
              if (stage) {
                var children = stage.getChildren();
                stage.content.removeChild(this.getCanvas()._canvas);
                stage.content.insertBefore(this.getCanvas()._canvas, children[1].getCanvas()._canvas);
              }
            }
          },
          getLayer: function() {
            return this;
          },
          remove: function() {
            var _canvas = this.getCanvas()._canvas;
            Kinetic.Node.prototype.remove.call(this);
            if (_canvas && _canvas.parentNode && Kinetic.Util._isInDocument(_canvas)) {
              _canvas.parentNode.removeChild(_canvas);
            }
            return this;
          },
          getStage: function() {
            return this.parent;
          },
          setSize: function(width, height) {
            this.canvas.setSize(width, height);
          },
          /**
           * get/set width of layer.getter return width of stage. setter doing nothing.
           * if you want change width use `stage.width(value);`
           * @name width
           * @method
           * @memberof Kinetic.BaseLayer.prototype
           * @returns {Number}
           * @example
           * var width = layer.width();
           */
          getWidth: function() {
            if (this.parent) {
              return this.parent.getWidth();
            }
          },
          setWidth: function() {
            Kinetic.Util.warn('Can not change width of layer. Use "stage.width(value)" function instead.');
          },
          /**
           * get/set height of layer.getter return height of stage. setter doing nothing.
           * if you want change height use `stage.height(value);`
           * @name height
           * @method
           * @memberof Kinetic.BaseLayer.prototype
           * @returns {Number}
           * @example
           * var height = layer.height();
           */
          getHeight: function() {
            if (this.parent) {
              return this.parent.getHeight();
            }
          },
          setHeight: function() {
            Kinetic.Util.warn('Can not change height of layer. Use "stage.height(value)" function instead.');
          }
        });
        Kinetic.Util.extend(Kinetic.BaseLayer, Kinetic.Container);
        Kinetic.Factory.addGetterSetter(Kinetic.BaseLayer, "clearBeforeDraw", true);
        Kinetic.Collection.mapMethods(Kinetic.BaseLayer);
      })();
      (function() {
        var HASH = "#", BEFORE_DRAW = "beforeDraw", DRAW = "draw", INTERSECTION_OFFSETS = [
          { x: 0, y: 0 },
          // 0
          { x: -1, y: 0 },
          // 1
          { x: -1, y: -1 },
          // 2
          { x: 0, y: -1 },
          // 3
          { x: 1, y: -1 },
          // 4
          { x: 1, y: 0 },
          // 5
          { x: 1, y: 1 },
          // 6
          { x: 0, y: 1 },
          // 7
          { x: -1, y: 1 }
          // 8
        ], INTERSECTION_OFFSETS_LEN = INTERSECTION_OFFSETS.length;
        Kinetic.Util.addMethods(Kinetic.Layer, {
          ____init: function(config) {
            this.nodeType = "Layer";
            this.canvas = new Kinetic.SceneCanvas();
            this.hitCanvas = new Kinetic.HitCanvas();
            Kinetic.BaseLayer.call(this, config);
          },
          _setCanvasSize: function(width, height) {
            this.canvas.setSize(width, height);
            this.hitCanvas.setSize(width, height);
          },
          _validateAdd: function(child) {
            var type = child.getType();
            if (type !== "Group" && type !== "Shape") {
              Kinetic.Util.error("You may only add groups and shapes to a layer.");
            }
          },
          /**
           * get visible intersection shape. This is the preferred
           * method for determining if a point intersects a shape or not
           * @method
           * @memberof Kinetic.Layer.prototype
           * @param {Object} pos
           * @param {Number} pos.x
           * @param {Number} pos.y
           * @returns {Kinetic.Shape}
           */
          getIntersection: function(pos) {
            var obj, i, intersectionOffset, shape;
            if (this.hitGraphEnabled() && this.isVisible()) {
              var spiralSearchDistance = 1;
              var continueSearch = false;
              while (true) {
                for (i = 0; i < INTERSECTION_OFFSETS_LEN; i++) {
                  intersectionOffset = INTERSECTION_OFFSETS[i];
                  obj = this._getIntersection({
                    x: pos.x + intersectionOffset.x * spiralSearchDistance,
                    y: pos.y + intersectionOffset.y * spiralSearchDistance
                  });
                  shape = obj.shape;
                  if (shape) {
                    return shape;
                  } else if (obj.antialiased) {
                    continueSearch = true;
                  }
                }
                if (continueSearch) {
                  spiralSearchDistance += 1;
                } else {
                  return;
                }
              }
            } else {
              return null;
            }
          },
          _getImageData: function(x, y) {
            var width = this.hitCanvas.width || 1, height = this.hitCanvas.height || 1, index = Math.round(y) * width + Math.round(x);
            if (!this._hitImageData) {
              this._hitImageData = this.hitCanvas.context.getImageData(0, 0, width, height);
            }
            return [
              this._hitImageData.data[4 * index + 0],
              // Red
              this._hitImageData.data[4 * index + 1],
              // Green
              this._hitImageData.data[4 * index + 2],
              // Blue
              this._hitImageData.data[4 * index + 3]
              // Alpha
            ];
          },
          _getIntersection: function(pos) {
            var p = this.hitCanvas.context.getImageData(pos.x, pos.y, 1, 1).data, p3 = p[3], colorKey, shape;
            if (p3 === 255) {
              colorKey = Kinetic.Util._rgbToHex(p[0], p[1], p[2]);
              shape = Kinetic.shapes[HASH + colorKey];
              return {
                shape
              };
            } else if (p3 > 0) {
              return {
                antialiased: true
              };
            } else {
              return {};
            }
          },
          drawScene: function(can, top) {
            var layer = this.getLayer(), canvas = can || layer && layer.getCanvas();
            this._fire(BEFORE_DRAW, {
              node: this
            });
            if (this.getClearBeforeDraw()) {
              canvas.getContext().clear();
            }
            Kinetic.Container.prototype.drawScene.call(this, canvas, top);
            this._fire(DRAW, {
              node: this
            });
            return this;
          },
          // the apply transform method is handled by the Layer and FastLayer class
          // because it is up to the layer to decide if an absolute or relative transform
          // should be used
          _applyTransform: function(shape, context, top) {
            var m = shape.getAbsoluteTransform(top).getMatrix();
            context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
          },
          drawHit: function(can, top) {
            var layer = this.getLayer(), canvas = can || layer && layer.hitCanvas;
            if (layer && layer.getClearBeforeDraw()) {
              layer.getHitCanvas().getContext().clear();
            }
            Kinetic.Container.prototype.drawHit.call(this, canvas, top);
            this.imageData = null;
            return this;
          },
          /**
           * clear scene and hit canvas contexts tied to the layer
           * @method
           * @memberof Kinetic.Layer.prototype
           * @param {Object} [bounds]
           * @param {Number} [bounds.x]
           * @param {Number} [bounds.y]
           * @param {Number} [bounds.width]
           * @param {Number} [bounds.height]
           * @example
           * layer.clear();
           * layer.clear({
           *   x : 0,
           *   y : 0,
           *   width : 100,
           *   height : 100
           * });
           */
          clear: function(bounds) {
            this.getContext().clear(bounds);
            this.getHitCanvas().getContext().clear(bounds);
            this.imageData = null;
            return this;
          },
          // extend Node.prototype.setVisible
          setVisible: function(visible) {
            Kinetic.Node.prototype.setVisible.call(this, visible);
            if (visible) {
              this.getCanvas()._canvas.style.display = "block";
              this.hitCanvas._canvas.style.display = "block";
            } else {
              this.getCanvas()._canvas.style.display = "none";
              this.hitCanvas._canvas.style.display = "none";
            }
            return this;
          },
          /**
           * enable hit graph
           * @name enableHitGraph
           * @method
           * @memberof Kinetic.Layer.prototype
           * @returns {Layer}
           */
          enableHitGraph: function() {
            this.setHitGraphEnabled(true);
            return this;
          },
          /**
           * disable hit graph
           * @name disableHitGraph
           * @method
           * @memberof Kinetic.Layer.prototype
           * @returns {Layer}
           */
          disableHitGraph: function() {
            this.setHitGraphEnabled(false);
            return this;
          },
          setSize: function(width, height) {
            Kinetic.BaseLayer.prototype.setSize.call(this, width, height);
            this.hitCanvas.setSize(width, height);
          }
        });
        Kinetic.Util.extend(Kinetic.Layer, Kinetic.BaseLayer);
        Kinetic.Factory.addGetterSetter(Kinetic.Layer, "hitGraphEnabled", true);
        Kinetic.Collection.mapMethods(Kinetic.Layer);
      })();
      (function() {
        Kinetic.Util.addMethods(Kinetic.FastLayer, {
          ____init: function(config) {
            this.nodeType = "Layer";
            this.canvas = new Kinetic.SceneCanvas();
            Kinetic.BaseLayer.call(this, config);
          },
          _validateAdd: function(child) {
            var type = child.getType();
            if (type !== "Shape") {
              Kinetic.Util.error("You may only add shapes to a fast layer.");
            }
          },
          _setCanvasSize: function(width, height) {
            this.canvas.setSize(width, height);
          },
          hitGraphEnabled: function() {
            return false;
          },
          getIntersection: function() {
            return null;
          },
          drawScene: function(can) {
            var layer = this.getLayer(), canvas = can || layer && layer.getCanvas();
            if (this.getClearBeforeDraw()) {
              canvas.getContext().clear();
            }
            Kinetic.Container.prototype.drawScene.call(this, canvas);
            return this;
          },
          // the apply transform method is handled by the Layer and FastLayer class
          // because it is up to the layer to decide if an absolute or relative transform
          // should be used
          _applyTransform: function(shape, context, top) {
            if (!top || top._id !== this._id) {
              var m = shape.getTransform().getMatrix();
              context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
            }
          },
          draw: function() {
            this.drawScene();
            return this;
          },
          /**
           * clear scene and hit canvas contexts tied to the layer
           * @method
           * @memberof Kinetic.FastLayer.prototype
           * @param {Object} [bounds]
           * @param {Number} [bounds.x]
           * @param {Number} [bounds.y]
           * @param {Number} [bounds.width]
           * @param {Number} [bounds.height]
           * @example
           * layer.clear();
           * layer.clear({
           *   x : 0,
           *   y : 0,
           *   width : 100,
           *   height : 100
           * });
           */
          clear: function(bounds) {
            this.getContext().clear(bounds);
            return this;
          },
          // extend Node.prototype.setVisible
          setVisible: function(visible) {
            Kinetic.Node.prototype.setVisible.call(this, visible);
            if (visible) {
              this.getCanvas()._canvas.style.display = "block";
            } else {
              this.getCanvas()._canvas.style.display = "none";
            }
            return this;
          }
        });
        Kinetic.Util.extend(Kinetic.FastLayer, Kinetic.BaseLayer);
        Kinetic.Collection.mapMethods(Kinetic.FastLayer);
      })();
      (function() {
        Kinetic.Util.addMethods(Kinetic.Group, {
          ___init: function(config) {
            this.nodeType = "Group";
            Kinetic.Container.call(this, config);
          },
          _validateAdd: function(child) {
            var type = child.getType();
            if (type !== "Group" && type !== "Shape") {
              Kinetic.Util.error("You may only add groups and shapes to groups.");
            }
          }
        });
        Kinetic.Util.extend(Kinetic.Group, Kinetic.Container);
        Kinetic.Collection.mapMethods(Kinetic.Group);
      })();
      (function() {
        Kinetic.Rect = function(config) {
          this.___init(config);
        };
        Kinetic.Rect.prototype = {
          ___init: function(config) {
            Kinetic.Shape.call(this, config);
            this.className = "Rect";
            this.sceneFunc(this._sceneFunc);
          },
          _sceneFunc: function(context) {
            var cornerRadius = this.getCornerRadius(), width = this.getWidth(), height = this.getHeight();
            context.beginPath();
            if (!cornerRadius) {
              context.rect(0, 0, width, height);
            } else {
              context.moveTo(cornerRadius, 0);
              context.lineTo(width - cornerRadius, 0);
              context.arc(width - cornerRadius, cornerRadius, cornerRadius, Math.PI * 3 / 2, 0, false);
              context.lineTo(width, height - cornerRadius);
              context.arc(width - cornerRadius, height - cornerRadius, cornerRadius, 0, Math.PI / 2, false);
              context.lineTo(cornerRadius, height);
              context.arc(cornerRadius, height - cornerRadius, cornerRadius, Math.PI / 2, Math.PI, false);
              context.lineTo(0, cornerRadius);
              context.arc(cornerRadius, cornerRadius, cornerRadius, Math.PI, Math.PI * 3 / 2, false);
            }
            context.closePath();
            context.fillStrokeShape(this);
          }
        };
        Kinetic.Util.extend(Kinetic.Rect, Kinetic.Shape);
        Kinetic.Factory.addGetterSetter(Kinetic.Rect, "cornerRadius", 0);
        Kinetic.Collection.mapMethods(Kinetic.Rect);
      })();
      (function() {
        var PIx2 = Math.PI * 2 - 1e-4, CIRCLE = "Circle";
        Kinetic.Circle = function(config) {
          this.___init(config);
        };
        Kinetic.Circle.prototype = {
          ___init: function(config) {
            Kinetic.Shape.call(this, config);
            this.className = CIRCLE;
            this.sceneFunc(this._sceneFunc);
          },
          _sceneFunc: function(context) {
            context.beginPath();
            context.arc(0, 0, this.getRadius(), 0, PIx2, false);
            context.closePath();
            context.fillStrokeShape(this);
          },
          // implements Shape.prototype.getWidth()
          getWidth: function() {
            return this.getRadius() * 2;
          },
          // implements Shape.prototype.getHeight()
          getHeight: function() {
            return this.getRadius() * 2;
          },
          // implements Shape.prototype.setWidth()
          setWidth: function(width) {
            Kinetic.Node.prototype.setWidth.call(this, width);
            if (this.radius() !== width / 2) {
              this.setRadius(width / 2);
            }
          },
          // implements Shape.prototype.setHeight()
          setHeight: function(height) {
            Kinetic.Node.prototype.setHeight.call(this, height);
            if (this.radius() !== height / 2) {
              this.setRadius(height / 2);
            }
          },
          setRadius: function(val) {
            this._setAttr("radius", val);
            this.setWidth(val * 2);
            this.setHeight(val * 2);
          }
        };
        Kinetic.Util.extend(Kinetic.Circle, Kinetic.Shape);
        Kinetic.Factory.addGetter(Kinetic.Circle, "radius", 0);
        Kinetic.Factory.addOverloadedGetterSetter(Kinetic.Circle, "radius");
        Kinetic.Collection.mapMethods(Kinetic.Circle);
      })();
      (function() {
        var PIx2 = Math.PI * 2 - 1e-4, ELLIPSE = "Ellipse";
        Kinetic.Ellipse = function(config) {
          this.___init(config);
        };
        Kinetic.Ellipse.prototype = {
          ___init: function(config) {
            Kinetic.Shape.call(this, config);
            this.className = ELLIPSE;
            this.sceneFunc(this._sceneFunc);
          },
          _sceneFunc: function(context) {
            var rx = this.getRadiusX(), ry = this.getRadiusY();
            context.beginPath();
            context.save();
            if (rx !== ry) {
              context.scale(1, ry / rx);
            }
            context.arc(0, 0, rx, 0, PIx2, false);
            context.restore();
            context.closePath();
            context.fillStrokeShape(this);
          },
          // implements Shape.prototype.getWidth()
          getWidth: function() {
            return this.getRadiusX() * 2;
          },
          // implements Shape.prototype.getHeight()
          getHeight: function() {
            return this.getRadiusY() * 2;
          },
          // implements Shape.prototype.setWidth()
          setWidth: function(width) {
            Kinetic.Node.prototype.setWidth.call(this, width);
            this.setRadius({
              x: width / 2
            });
          },
          // implements Shape.prototype.setHeight()
          setHeight: function(height) {
            Kinetic.Node.prototype.setHeight.call(this, height);
            this.setRadius({
              y: height / 2
            });
          }
        };
        Kinetic.Util.extend(Kinetic.Ellipse, Kinetic.Shape);
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Ellipse, "radius", ["x", "y"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Ellipse, "radiusX", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Ellipse, "radiusY", 0);
        Kinetic.Collection.mapMethods(Kinetic.Ellipse);
      })();
      (function() {
        var PIx2 = Math.PI * 2 - 1e-4;
        Kinetic.Ring = function(config) {
          this.___init(config);
        };
        Kinetic.Ring.prototype = {
          ___init: function(config) {
            Kinetic.Shape.call(this, config);
            this.className = "Ring";
            this.sceneFunc(this._sceneFunc);
          },
          _sceneFunc: function(context) {
            context.beginPath();
            context.arc(0, 0, this.getInnerRadius(), 0, PIx2, false);
            context.moveTo(this.getOuterRadius(), 0);
            context.arc(0, 0, this.getOuterRadius(), PIx2, 0, true);
            context.closePath();
            context.fillStrokeShape(this);
          },
          // implements Shape.prototype.getWidth()
          getWidth: function() {
            return this.getOuterRadius() * 2;
          },
          // implements Shape.prototype.getHeight()
          getHeight: function() {
            return this.getOuterRadius() * 2;
          },
          // implements Shape.prototype.setWidth()
          setWidth: function(width) {
            Kinetic.Node.prototype.setWidth.call(this, width);
            if (this.outerRadius() !== width / 2) {
              this.setOuterRadius(width / 2);
            }
          },
          // implements Shape.prototype.setHeight()
          setHeight: function(height) {
            Kinetic.Node.prototype.setHeight.call(this, height);
            if (this.outerRadius() !== height / 2) {
              this.setOuterRadius(height / 2);
            }
          },
          setOuterRadius: function(val) {
            this._setAttr("outerRadius", val);
            this.setWidth(val * 2);
            this.setHeight(val * 2);
          }
        };
        Kinetic.Util.extend(Kinetic.Ring, Kinetic.Shape);
        Kinetic.Factory.addGetterSetter(Kinetic.Ring, "innerRadius", 0);
        Kinetic.Factory.addGetter(Kinetic.Ring, "outerRadius", 0);
        Kinetic.Factory.addOverloadedGetterSetter(Kinetic.Ring, "outerRadius");
        Kinetic.Collection.mapMethods(Kinetic.Ring);
      })();
      (function() {
        Kinetic.Wedge = function(config) {
          this.___init(config);
        };
        Kinetic.Wedge.prototype = {
          ___init: function(config) {
            Kinetic.Shape.call(this, config);
            this.className = "Wedge";
            this.sceneFunc(this._sceneFunc);
          },
          _sceneFunc: function(context) {
            context.beginPath();
            context.arc(0, 0, this.getRadius(), 0, Kinetic.getAngle(this.getAngle()), this.getClockwise());
            context.lineTo(0, 0);
            context.closePath();
            context.fillStrokeShape(this);
          }
        };
        Kinetic.Util.extend(Kinetic.Wedge, Kinetic.Shape);
        Kinetic.Factory.addGetterSetter(Kinetic.Wedge, "radius", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Wedge, "angle", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Wedge, "clockwise", false);
        Kinetic.Factory.backCompat(Kinetic.Wedge, {
          angleDeg: "angle",
          getAngleDeg: "getAngle",
          setAngleDeg: "setAngle"
        });
        Kinetic.Collection.mapMethods(Kinetic.Wedge);
      })();
      (function() {
        Kinetic.Arc = function(config) {
          this.___init(config);
        };
        Kinetic.Arc.prototype = {
          ___init: function(config) {
            Kinetic.Shape.call(this, config);
            this.className = "Arc";
            this.sceneFunc(this._sceneFunc);
          },
          _sceneFunc: function(context) {
            var angle = Kinetic.getAngle(this.angle()), clockwise = this.clockwise();
            context.beginPath();
            context.arc(0, 0, this.getOuterRadius(), 0, angle, clockwise);
            context.arc(0, 0, this.getInnerRadius(), angle, 0, !clockwise);
            context.closePath();
            context.fillStrokeShape(this);
          }
        };
        Kinetic.Util.extend(Kinetic.Arc, Kinetic.Shape);
        Kinetic.Factory.addGetterSetter(Kinetic.Arc, "innerRadius", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Arc, "outerRadius", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Arc, "angle", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Arc, "clockwise", false);
        Kinetic.Collection.mapMethods(Kinetic.Arc);
      })();
      (function() {
        var IMAGE = "Image";
        Kinetic.Image = function(config) {
          this.___init(config);
        };
        Kinetic.Image.prototype = {
          ___init: function(config) {
            Kinetic.Shape.call(this, config);
            this.className = IMAGE;
            this.sceneFunc(this._sceneFunc);
            this.hitFunc(this._hitFunc);
          },
          _useBufferCanvas: function() {
            return (this.hasShadow() || this.getAbsoluteOpacity() !== 1) && this.hasStroke() && this.getStage();
          },
          _sceneFunc: function(context) {
            var width = this.getWidth(), height = this.getHeight(), image = this.getImage(), cropWidth, cropHeight, params;
            if (image) {
              cropWidth = this.getCropWidth();
              cropHeight = this.getCropHeight();
              if (cropWidth && cropHeight) {
                params = [image, this.getCropX(), this.getCropY(), cropWidth, cropHeight, 0, 0, width, height];
              } else {
                params = [image, 0, 0, width, height];
              }
            }
            if (this.hasFill() || this.hasStroke() || this.hasShadow()) {
              context.beginPath();
              context.rect(0, 0, width, height);
              context.closePath();
              context.fillStrokeShape(this);
            }
            if (image) {
              context.drawImage.apply(context, params);
            }
          },
          _hitFunc: function(context) {
            var width = this.getWidth(), height = this.getHeight();
            context.beginPath();
            context.rect(0, 0, width, height);
            context.closePath();
            context.fillStrokeShape(this);
          },
          getWidth: function() {
            var image = this.getImage();
            return this.attrs.width || (image ? image.width : 0);
          },
          getHeight: function() {
            var image = this.getImage();
            return this.attrs.height || (image ? image.height : 0);
          }
        };
        Kinetic.Util.extend(Kinetic.Image, Kinetic.Shape);
        Kinetic.Factory.addGetterSetter(Kinetic.Image, "image");
        Kinetic.Factory.addComponentsGetterSetter(Kinetic.Image, "crop", ["x", "y", "width", "height"]);
        Kinetic.Factory.addGetterSetter(Kinetic.Image, "cropX", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Image, "cropY", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Image, "cropWidth", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Image, "cropHeight", 0);
        Kinetic.Collection.mapMethods(Kinetic.Image);
      })();
      (function() {
        var AUTO = "auto", CENTER = "center", CHANGE_KINETIC = "Change.kinetic", CONTEXT_2D = "2d", DASH = "-", EMPTY_STRING = "", LEFT = "left", TEXT = "text", TEXT_UPPER = "Text", MIDDLE = "middle", NORMAL = "normal", PX_SPACE = "px ", SPACE = " ", RIGHT = "right", WORD = "word", CHAR = "char", NONE = "none", ATTR_CHANGE_LIST = ["fontFamily", "fontSize", "fontStyle", "fontVariant", "padding", "align", "lineHeight", "text", "width", "height", "wrap"], attrChangeListLen = ATTR_CHANGE_LIST.length, dummyContext = Kinetic.Util.createCanvasElement().getContext(CONTEXT_2D);
        Kinetic.Text = function(config) {
          this.___init(config);
        };
        function _fillFunc(context) {
          context.fillText(this.partialText, 0, 0);
        }
        function _strokeFunc(context) {
          context.strokeText(this.partialText, 0, 0);
        }
        Kinetic.Text.prototype = {
          ___init: function(config) {
            config = config || {};
            config.fill = config.fill || "black";
            if (config.width === void 0) {
              config.width = AUTO;
            }
            if (config.height === void 0) {
              config.height = AUTO;
            }
            Kinetic.Shape.call(this, config);
            this._fillFunc = _fillFunc;
            this._strokeFunc = _strokeFunc;
            this.className = TEXT_UPPER;
            for (var n = 0; n < attrChangeListLen; n++) {
              this.on(ATTR_CHANGE_LIST[n] + CHANGE_KINETIC, this._setTextData);
            }
            this._setTextData();
            this.sceneFunc(this._sceneFunc);
            this.hitFunc(this._hitFunc);
          },
          _sceneFunc: function(context) {
            var p = this.getPadding(), textHeight = this.getTextHeight(), lineHeightPx = this.getLineHeight() * textHeight, textArr = this.textArr, textArrLen = textArr.length, totalWidth = this.getWidth(), n;
            context.setAttr("font", this._getContextFont());
            context.setAttr("textBaseline", MIDDLE);
            context.setAttr("textAlign", LEFT);
            context.save();
            context.translate(p, 0);
            context.translate(0, p + textHeight / 2);
            for (n = 0; n < textArrLen; n++) {
              var obj = textArr[n], text = obj.text, width = obj.width;
              context.save();
              if (this.getAlign() === RIGHT) {
                context.translate(totalWidth - width - p * 2, 0);
              } else if (this.getAlign() === CENTER) {
                context.translate((totalWidth - width - p * 2) / 2, 0);
              }
              this.partialText = text;
              context.fillStrokeShape(this);
              context.restore();
              context.translate(0, lineHeightPx);
            }
            context.restore();
          },
          _hitFunc: function(context) {
            var width = this.getWidth(), height = this.getHeight();
            context.beginPath();
            context.rect(0, 0, width, height);
            context.closePath();
            context.fillStrokeShape(this);
          },
          setText: function(text) {
            var str = Kinetic.Util._isString(text) ? text : text.toString();
            this._setAttr(TEXT, str);
            return this;
          },
          /**
           * get width of text area, which includes padding
           * @method
           * @memberof Kinetic.Text.prototype
           * @returns {Number}
           */
          getWidth: function() {
            return this.attrs.width === AUTO ? this.getTextWidth() + this.getPadding() * 2 : this.attrs.width;
          },
          /**
           * get the height of the text area, which takes into account multi-line text, line heights, and padding
           * @method
           * @memberof Kinetic.Text.prototype
           * @returns {Number}
           */
          getHeight: function() {
            return this.attrs.height === AUTO ? this.getTextHeight() * this.textArr.length * this.getLineHeight() + this.getPadding() * 2 : this.attrs.height;
          },
          /**
           * get text width
           * @method
           * @memberof Kinetic.Text.prototype
           * @returns {Number}
           */
          getTextWidth: function() {
            return this.textWidth;
          },
          /**
           * get text height
           * @method
           * @memberof Kinetic.Text.prototype
           * @returns {Number}
           */
          getTextHeight: function() {
            return this.textHeight;
          },
          _getTextSize: function(text) {
            var _context = dummyContext, fontSize = this.getFontSize(), metrics;
            _context.save();
            _context.font = this._getContextFont();
            metrics = _context.measureText(text);
            _context.restore();
            return {
              width: metrics.width,
              height: parseInt(fontSize, 10)
            };
          },
          _getContextFont: function() {
            return this.getFontStyle() + SPACE + this.getFontVariant() + SPACE + this.getFontSize() + PX_SPACE + this.getFontFamily();
          },
          _addTextLine: function(line, width) {
            return this.textArr.push({ text: line, width });
          },
          _getTextWidth: function(text) {
            return dummyContext.measureText(text).width;
          },
          _setTextData: function() {
            var lines = this.getText().split("\n"), fontSize = +this.getFontSize(), textWidth = 0, lineHeightPx = this.getLineHeight() * fontSize, width = this.attrs.width, height = this.attrs.height, fixedWidth = width !== AUTO, fixedHeight = height !== AUTO, padding = this.getPadding(), maxWidth = width - padding * 2, maxHeightPx = height - padding * 2, currentHeightPx = 0, wrap = this.getWrap(), shouldWrap = wrap !== NONE, wrapAtWord = wrap !== CHAR && shouldWrap;
            this.textArr = [];
            dummyContext.save();
            dummyContext.font = this._getContextFont();
            for (var i = 0, max = lines.length; i < max; ++i) {
              var line = lines[i], lineWidth = this._getTextWidth(line);
              if (fixedWidth && lineWidth > maxWidth) {
                while (line.length > 0) {
                  var low = 0, high = line.length, match = "", matchWidth = 0;
                  while (low < high) {
                    var mid = low + high >>> 1, substr = line.slice(0, mid + 1), substrWidth = this._getTextWidth(substr);
                    if (substrWidth <= maxWidth) {
                      low = mid + 1;
                      match = substr;
                      matchWidth = substrWidth;
                    } else {
                      high = mid;
                    }
                  }
                  if (match) {
                    if (wrapAtWord) {
                      var wrapIndex = Math.max(
                        match.lastIndexOf(SPACE),
                        match.lastIndexOf(DASH)
                      ) + 1;
                      if (wrapIndex > 0) {
                        low = wrapIndex;
                        match = match.slice(0, low);
                        matchWidth = this._getTextWidth(match);
                      }
                    }
                    this._addTextLine(match, matchWidth);
                    textWidth = Math.max(textWidth, matchWidth);
                    currentHeightPx += lineHeightPx;
                    if (!shouldWrap || fixedHeight && currentHeightPx + lineHeightPx > maxHeightPx) {
                      break;
                    }
                    line = line.slice(low);
                    if (line.length > 0) {
                      lineWidth = this._getTextWidth(line);
                      if (lineWidth <= maxWidth) {
                        this._addTextLine(line, lineWidth);
                        currentHeightPx += lineHeightPx;
                        textWidth = Math.max(textWidth, lineWidth);
                        break;
                      }
                    }
                  } else {
                    break;
                  }
                }
              } else {
                this._addTextLine(line, lineWidth);
                currentHeightPx += lineHeightPx;
                textWidth = Math.max(textWidth, lineWidth);
              }
              if (fixedHeight && currentHeightPx + lineHeightPx > maxHeightPx) {
                break;
              }
            }
            dummyContext.restore();
            this.textHeight = fontSize;
            this.textWidth = textWidth;
          }
        };
        Kinetic.Util.extend(Kinetic.Text, Kinetic.Shape);
        Kinetic.Factory.addGetterSetter(Kinetic.Text, "fontFamily", "Arial");
        Kinetic.Factory.addGetterSetter(Kinetic.Text, "fontSize", 12);
        Kinetic.Factory.addGetterSetter(Kinetic.Text, "fontStyle", NORMAL);
        Kinetic.Factory.addGetterSetter(Kinetic.Text, "fontVariant", NORMAL);
        Kinetic.Factory.addGetterSetter(Kinetic.Text, "padding", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Text, "align", LEFT);
        Kinetic.Factory.addGetterSetter(Kinetic.Text, "lineHeight", 1);
        Kinetic.Factory.addGetterSetter(Kinetic.Text, "wrap", WORD);
        Kinetic.Factory.addGetter(Kinetic.Text, "text", EMPTY_STRING);
        Kinetic.Factory.addOverloadedGetterSetter(Kinetic.Text, "text");
        Kinetic.Collection.mapMethods(Kinetic.Text);
      })();
      (function() {
        Kinetic.Line = function(config) {
          this.___init(config);
        };
        Kinetic.Line.prototype = {
          ___init: function(config) {
            Kinetic.Shape.call(this, config);
            this.className = "Line";
            this.on("pointsChange.kinetic tensionChange.kinetic closedChange.kinetic", function() {
              this._clearCache("tensionPoints");
            });
            this.sceneFunc(this._sceneFunc);
          },
          _sceneFunc: function(context) {
            var points = this.getPoints(), length = points.length, tension = this.getTension(), closed = this.getClosed(), tp, len, n;
            if (!length) {
              return;
            }
            context.beginPath();
            context.moveTo(points[0], points[1]);
            if (tension !== 0 && length > 4) {
              tp = this.getTensionPoints();
              len = tp.length;
              n = closed ? 0 : 4;
              if (!closed) {
                context.quadraticCurveTo(tp[0], tp[1], tp[2], tp[3]);
              }
              while (n < len - 2) {
                context.bezierCurveTo(tp[n++], tp[n++], tp[n++], tp[n++], tp[n++], tp[n++]);
              }
              if (!closed) {
                context.quadraticCurveTo(tp[len - 2], tp[len - 1], points[length - 2], points[length - 1]);
              }
            } else {
              for (n = 2; n < length; n += 2) {
                context.lineTo(points[n], points[n + 1]);
              }
            }
            if (closed) {
              context.closePath();
              context.fillStrokeShape(this);
            } else {
              context.strokeShape(this);
            }
          },
          getTensionPoints: function() {
            return this._getCache("tensionPoints", this._getTensionPoints);
          },
          _getTensionPoints: function() {
            if (this.getClosed()) {
              return this._getTensionPointsClosed();
            } else {
              return Kinetic.Util._expandPoints(this.getPoints(), this.getTension());
            }
          },
          _getTensionPointsClosed: function() {
            var p = this.getPoints(), len = p.length, tension = this.getTension(), util = Kinetic.Util, firstControlPoints = util._getControlPoints(
              p[len - 2],
              p[len - 1],
              p[0],
              p[1],
              p[2],
              p[3],
              tension
            ), lastControlPoints = util._getControlPoints(
              p[len - 4],
              p[len - 3],
              p[len - 2],
              p[len - 1],
              p[0],
              p[1],
              tension
            ), middle = Kinetic.Util._expandPoints(p, tension), tp = [
              firstControlPoints[2],
              firstControlPoints[3]
            ].concat(middle).concat([
              lastControlPoints[0],
              lastControlPoints[1],
              p[len - 2],
              p[len - 1],
              lastControlPoints[2],
              lastControlPoints[3],
              firstControlPoints[0],
              firstControlPoints[1],
              p[0],
              p[1]
            ]);
            return tp;
          }
        };
        Kinetic.Util.extend(Kinetic.Line, Kinetic.Shape);
        Kinetic.Factory.addGetterSetter(Kinetic.Line, "closed", false);
        Kinetic.Factory.addGetterSetter(Kinetic.Line, "tension", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Line, "points", []);
        Kinetic.Collection.mapMethods(Kinetic.Line);
      })();
      (function() {
        Kinetic.Sprite = function(config) {
          this.___init(config);
        };
        Kinetic.Sprite.prototype = {
          ___init: function(config) {
            Kinetic.Shape.call(this, config);
            this.className = "Sprite";
            this._updated = true;
            var that = this;
            this.anim = new Kinetic.Animation(function() {
              var updated = that._updated;
              that._updated = false;
              return updated;
            });
            this.on("animationChange.kinetic", function() {
              this.frameIndex(0);
            });
            this.on("frameIndexChange.kinetic", function() {
              this._updated = true;
            });
            this.on("frameRateChange.kinetic", function() {
              if (!this.anim.isRunning()) {
                return;
              }
              clearInterval(this.interval);
              this._setInterval();
            });
            this.sceneFunc(this._sceneFunc);
            this.hitFunc(this._hitFunc);
          },
          _sceneFunc: function(context) {
            var anim = this.getAnimation(), index = this.frameIndex(), ix4 = index * 4, set = this.getAnimations()[anim], offsets = this.frameOffsets(), x = set[ix4 + 0], y = set[ix4 + 1], width = set[ix4 + 2], height = set[ix4 + 3], image = this.getImage();
            if (image) {
              if (offsets) {
                var offset = offsets[anim], ix2 = index * 2;
                context.drawImage(image, x, y, width, height, offset[ix2 + 0], offset[ix2 + 1], width, height);
              } else {
                context.drawImage(image, x, y, width, height, 0, 0, width, height);
              }
            }
          },
          _hitFunc: function(context) {
            var anim = this.getAnimation(), index = this.frameIndex(), ix4 = index * 4, set = this.getAnimations()[anim], offsets = this.frameOffsets(), width = set[ix4 + 2], height = set[ix4 + 3];
            context.beginPath();
            if (offsets) {
              var offset = offsets[anim];
              var ix2 = index * 2;
              context.rect(offset[ix2 + 0], offset[ix2 + 1], width, height);
            } else {
              context.rect(0, 0, width, height);
            }
            context.closePath();
            context.fillShape(this);
          },
          _useBufferCanvas: function() {
            return (this.hasShadow() || this.getAbsoluteOpacity() !== 1) && this.hasStroke();
          },
          _setInterval: function() {
            var that = this;
            this.interval = setInterval(function() {
              that._updateIndex();
            }, 1e3 / this.getFrameRate());
          },
          /**
           * start sprite animation
           * @method
           * @memberof Kinetic.Sprite.prototype
           */
          start: function() {
            var layer = this.getLayer();
            this.anim.setLayers(layer);
            this._setInterval();
            this.anim.start();
          },
          /**
           * stop sprite animation
           * @method
           * @memberof Kinetic.Sprite.prototype
           */
          stop: function() {
            this.anim.stop();
            clearInterval(this.interval);
          },
          /**
           * determine if animation of sprite is running or not.  returns true or false
           * @method
           * @memberof Kinetic.Animation.prototype
           * @returns {Boolean}
           */
          isRunning: function() {
            return this.anim.isRunning();
          },
          _updateIndex: function() {
            var index = this.frameIndex(), animation = this.getAnimation(), animations = this.getAnimations(), anim = animations[animation], len = anim.length / 4;
            if (index < len - 1) {
              this.frameIndex(index + 1);
            } else {
              this.frameIndex(0);
            }
          }
        };
        Kinetic.Util.extend(Kinetic.Sprite, Kinetic.Shape);
        Kinetic.Factory.addGetterSetter(Kinetic.Sprite, "animation");
        Kinetic.Factory.addGetterSetter(Kinetic.Sprite, "animations");
        Kinetic.Factory.addGetterSetter(Kinetic.Sprite, "frameOffsets");
        Kinetic.Factory.addGetterSetter(Kinetic.Sprite, "image");
        Kinetic.Factory.addGetterSetter(Kinetic.Sprite, "frameIndex", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Sprite, "frameRate", 17);
        Kinetic.Factory.backCompat(Kinetic.Sprite, {
          index: "frameIndex",
          getIndex: "getFrameIndex",
          setIndex: "setFrameIndex"
        });
        Kinetic.Collection.mapMethods(Kinetic.Sprite);
      })();
      (function() {
        Kinetic.Path = function(config) {
          this.___init(config);
        };
        Kinetic.Path.prototype = {
          ___init: function(config) {
            this.dataArray = [];
            var that = this;
            Kinetic.Shape.call(this, config);
            this.className = "Path";
            this.dataArray = Kinetic.Path.parsePathData(this.getData());
            this.on("dataChange.kinetic", function() {
              that.dataArray = Kinetic.Path.parsePathData(this.getData());
            });
            this.sceneFunc(this._sceneFunc);
          },
          _sceneFunc: function(context) {
            var ca = this.dataArray, closedPath = false;
            context.beginPath();
            for (var n = 0; n < ca.length; n++) {
              var c = ca[n].command;
              var p = ca[n].points;
              switch (c) {
                case "L":
                  context.lineTo(p[0], p[1]);
                  break;
                case "M":
                  context.moveTo(p[0], p[1]);
                  break;
                case "C":
                  context.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
                  break;
                case "Q":
                  context.quadraticCurveTo(p[0], p[1], p[2], p[3]);
                  break;
                case "A":
                  var cx = p[0], cy = p[1], rx = p[2], ry = p[3], theta = p[4], dTheta = p[5], psi = p[6], fs = p[7];
                  var r = rx > ry ? rx : ry;
                  var scaleX = rx > ry ? 1 : rx / ry;
                  var scaleY = rx > ry ? ry / rx : 1;
                  context.translate(cx, cy);
                  context.rotate(psi);
                  context.scale(scaleX, scaleY);
                  context.arc(0, 0, r, theta, theta + dTheta, 1 - fs);
                  context.scale(1 / scaleX, 1 / scaleY);
                  context.rotate(-psi);
                  context.translate(-cx, -cy);
                  break;
                case "z":
                  context.closePath();
                  closedPath = true;
                  break;
              }
            }
            if (closedPath) {
              context.fillStrokeShape(this);
            } else {
              context.strokeShape(this);
            }
          }
        };
        Kinetic.Util.extend(Kinetic.Path, Kinetic.Shape);
        Kinetic.Path.getLineLength = function(x1, y1, x2, y2) {
          return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
        };
        Kinetic.Path.getPointOnLine = function(dist, P1x, P1y, P2x, P2y, fromX, fromY) {
          if (fromX === void 0) {
            fromX = P1x;
          }
          if (fromY === void 0) {
            fromY = P1y;
          }
          var m = (P2y - P1y) / (P2x - P1x + 1e-8);
          var run = Math.sqrt(dist * dist / (1 + m * m));
          if (P2x < P1x) {
            run *= -1;
          }
          var rise = m * run;
          var pt;
          if (P2x === P1x) {
            pt = {
              x: fromX,
              y: fromY + rise
            };
          } else if ((fromY - P1y) / (fromX - P1x + 1e-8) === m) {
            pt = {
              x: fromX + run,
              y: fromY + rise
            };
          } else {
            var ix, iy;
            var len = this.getLineLength(P1x, P1y, P2x, P2y);
            if (len < 1e-8) {
              return void 0;
            }
            var u = (fromX - P1x) * (P2x - P1x) + (fromY - P1y) * (P2y - P1y);
            u = u / (len * len);
            ix = P1x + u * (P2x - P1x);
            iy = P1y + u * (P2y - P1y);
            var pRise = this.getLineLength(fromX, fromY, ix, iy);
            var pRun = Math.sqrt(dist * dist - pRise * pRise);
            run = Math.sqrt(pRun * pRun / (1 + m * m));
            if (P2x < P1x) {
              run *= -1;
            }
            rise = m * run;
            pt = {
              x: ix + run,
              y: iy + rise
            };
          }
          return pt;
        };
        Kinetic.Path.getPointOnCubicBezier = function(pct, P1x, P1y, P2x, P2y, P3x, P3y, P4x, P4y) {
          function CB1(t) {
            return t * t * t;
          }
          function CB2(t) {
            return 3 * t * t * (1 - t);
          }
          function CB3(t) {
            return 3 * t * (1 - t) * (1 - t);
          }
          function CB4(t) {
            return (1 - t) * (1 - t) * (1 - t);
          }
          var x = P4x * CB1(pct) + P3x * CB2(pct) + P2x * CB3(pct) + P1x * CB4(pct);
          var y = P4y * CB1(pct) + P3y * CB2(pct) + P2y * CB3(pct) + P1y * CB4(pct);
          return {
            x,
            y
          };
        };
        Kinetic.Path.getPointOnQuadraticBezier = function(pct, P1x, P1y, P2x, P2y, P3x, P3y) {
          function QB1(t) {
            return t * t;
          }
          function QB2(t) {
            return 2 * t * (1 - t);
          }
          function QB3(t) {
            return (1 - t) * (1 - t);
          }
          var x = P3x * QB1(pct) + P2x * QB2(pct) + P1x * QB3(pct);
          var y = P3y * QB1(pct) + P2y * QB2(pct) + P1y * QB3(pct);
          return {
            x,
            y
          };
        };
        Kinetic.Path.getPointOnEllipticalArc = function(cx, cy, rx, ry, theta, psi) {
          var cosPsi = Math.cos(psi), sinPsi = Math.sin(psi);
          var pt = {
            x: rx * Math.cos(theta),
            y: ry * Math.sin(theta)
          };
          return {
            x: cx + (pt.x * cosPsi - pt.y * sinPsi),
            y: cy + (pt.x * sinPsi + pt.y * cosPsi)
          };
        };
        Kinetic.Path.parsePathData = function(data) {
          if (!data) {
            return [];
          }
          var cs = data;
          var cc = ["m", "M", "l", "L", "v", "V", "h", "H", "z", "Z", "c", "C", "q", "Q", "t", "T", "s", "S", "a", "A"];
          cs = cs.replace(new RegExp(" ", "g"), ",");
          for (var n = 0; n < cc.length; n++) {
            cs = cs.replace(new RegExp(cc[n], "g"), "|" + cc[n]);
          }
          var arr = cs.split("|");
          var ca = [];
          var cpx = 0;
          var cpy = 0;
          for (n = 1; n < arr.length; n++) {
            var str = arr[n];
            var c = str.charAt(0);
            str = str.slice(1);
            str = str.replace(new RegExp(",-", "g"), "-");
            str = str.replace(new RegExp("-", "g"), ",-");
            str = str.replace(new RegExp("e,-", "g"), "e-");
            var p = str.split(",");
            if (p.length > 0 && p[0] === "") {
              p.shift();
            }
            for (var i = 0; i < p.length; i++) {
              p[i] = parseFloat(p[i]);
            }
            while (p.length > 0) {
              if (isNaN(p[0])) {
                break;
              }
              var cmd = null;
              var points = [];
              var startX = cpx, startY = cpy;
              var prevCmd, ctlPtx, ctlPty;
              var rx, ry, psi, fa, fs, x1, y1;
              switch (c) {
                // Note: Keep the lineTo's above the moveTo's in this switch
                case "l":
                  cpx += p.shift();
                  cpy += p.shift();
                  cmd = "L";
                  points.push(cpx, cpy);
                  break;
                case "L":
                  cpx = p.shift();
                  cpy = p.shift();
                  points.push(cpx, cpy);
                  break;
                // Note: lineTo handlers need to be above this point
                case "m":
                  var dx = p.shift();
                  var dy = p.shift();
                  cpx += dx;
                  cpy += dy;
                  cmd = "M";
                  if (ca.length > 2 && ca[ca.length - 1].command === "z") {
                    for (var idx = ca.length - 2; idx >= 0; idx--) {
                      if (ca[idx].command === "M") {
                        cpx = ca[idx].points[0] + dx;
                        cpy = ca[idx].points[1] + dy;
                        break;
                      }
                    }
                  }
                  points.push(cpx, cpy);
                  c = "l";
                  break;
                case "M":
                  cpx = p.shift();
                  cpy = p.shift();
                  cmd = "M";
                  points.push(cpx, cpy);
                  c = "L";
                  break;
                case "h":
                  cpx += p.shift();
                  cmd = "L";
                  points.push(cpx, cpy);
                  break;
                case "H":
                  cpx = p.shift();
                  cmd = "L";
                  points.push(cpx, cpy);
                  break;
                case "v":
                  cpy += p.shift();
                  cmd = "L";
                  points.push(cpx, cpy);
                  break;
                case "V":
                  cpy = p.shift();
                  cmd = "L";
                  points.push(cpx, cpy);
                  break;
                case "C":
                  points.push(p.shift(), p.shift(), p.shift(), p.shift());
                  cpx = p.shift();
                  cpy = p.shift();
                  points.push(cpx, cpy);
                  break;
                case "c":
                  points.push(cpx + p.shift(), cpy + p.shift(), cpx + p.shift(), cpy + p.shift());
                  cpx += p.shift();
                  cpy += p.shift();
                  cmd = "C";
                  points.push(cpx, cpy);
                  break;
                case "S":
                  ctlPtx = cpx;
                  ctlPty = cpy;
                  prevCmd = ca[ca.length - 1];
                  if (prevCmd.command === "C") {
                    ctlPtx = cpx + (cpx - prevCmd.points[2]);
                    ctlPty = cpy + (cpy - prevCmd.points[3]);
                  }
                  points.push(ctlPtx, ctlPty, p.shift(), p.shift());
                  cpx = p.shift();
                  cpy = p.shift();
                  cmd = "C";
                  points.push(cpx, cpy);
                  break;
                case "s":
                  ctlPtx = cpx;
                  ctlPty = cpy;
                  prevCmd = ca[ca.length - 1];
                  if (prevCmd.command === "C") {
                    ctlPtx = cpx + (cpx - prevCmd.points[2]);
                    ctlPty = cpy + (cpy - prevCmd.points[3]);
                  }
                  points.push(ctlPtx, ctlPty, cpx + p.shift(), cpy + p.shift());
                  cpx += p.shift();
                  cpy += p.shift();
                  cmd = "C";
                  points.push(cpx, cpy);
                  break;
                case "Q":
                  points.push(p.shift(), p.shift());
                  cpx = p.shift();
                  cpy = p.shift();
                  points.push(cpx, cpy);
                  break;
                case "q":
                  points.push(cpx + p.shift(), cpy + p.shift());
                  cpx += p.shift();
                  cpy += p.shift();
                  cmd = "Q";
                  points.push(cpx, cpy);
                  break;
                case "T":
                  ctlPtx = cpx;
                  ctlPty = cpy;
                  prevCmd = ca[ca.length - 1];
                  if (prevCmd.command === "Q") {
                    ctlPtx = cpx + (cpx - prevCmd.points[0]);
                    ctlPty = cpy + (cpy - prevCmd.points[1]);
                  }
                  cpx = p.shift();
                  cpy = p.shift();
                  cmd = "Q";
                  points.push(ctlPtx, ctlPty, cpx, cpy);
                  break;
                case "t":
                  ctlPtx = cpx;
                  ctlPty = cpy;
                  prevCmd = ca[ca.length - 1];
                  if (prevCmd.command === "Q") {
                    ctlPtx = cpx + (cpx - prevCmd.points[0]);
                    ctlPty = cpy + (cpy - prevCmd.points[1]);
                  }
                  cpx += p.shift();
                  cpy += p.shift();
                  cmd = "Q";
                  points.push(ctlPtx, ctlPty, cpx, cpy);
                  break;
                case "A":
                  rx = p.shift();
                  ry = p.shift();
                  psi = p.shift();
                  fa = p.shift();
                  fs = p.shift();
                  x1 = cpx;
                  y1 = cpy;
                  cpx = p.shift();
                  cpy = p.shift();
                  cmd = "A";
                  points = this.convertEndpointToCenterParameterization(x1, y1, cpx, cpy, fa, fs, rx, ry, psi);
                  break;
                case "a":
                  rx = p.shift();
                  ry = p.shift();
                  psi = p.shift();
                  fa = p.shift();
                  fs = p.shift();
                  x1 = cpx;
                  y1 = cpy;
                  cpx += p.shift();
                  cpy += p.shift();
                  cmd = "A";
                  points = this.convertEndpointToCenterParameterization(x1, y1, cpx, cpy, fa, fs, rx, ry, psi);
                  break;
              }
              ca.push({
                command: cmd || c,
                points,
                start: {
                  x: startX,
                  y: startY
                },
                pathLength: this.calcLength(startX, startY, cmd || c, points)
              });
            }
            if (c === "z" || c === "Z") {
              ca.push({
                command: "z",
                points: [],
                start: void 0,
                pathLength: 0
              });
            }
          }
          return ca;
        };
        Kinetic.Path.calcLength = function(x, y, cmd, points) {
          var len, p1, p2, t;
          var path = Kinetic.Path;
          switch (cmd) {
            case "L":
              return path.getLineLength(x, y, points[0], points[1]);
            case "C":
              len = 0;
              p1 = path.getPointOnCubicBezier(0, x, y, points[0], points[1], points[2], points[3], points[4], points[5]);
              for (t = 0.01; t <= 1; t += 0.01) {
                p2 = path.getPointOnCubicBezier(t, x, y, points[0], points[1], points[2], points[3], points[4], points[5]);
                len += path.getLineLength(p1.x, p1.y, p2.x, p2.y);
                p1 = p2;
              }
              return len;
            case "Q":
              len = 0;
              p1 = path.getPointOnQuadraticBezier(0, x, y, points[0], points[1], points[2], points[3]);
              for (t = 0.01; t <= 1; t += 0.01) {
                p2 = path.getPointOnQuadraticBezier(t, x, y, points[0], points[1], points[2], points[3]);
                len += path.getLineLength(p1.x, p1.y, p2.x, p2.y);
                p1 = p2;
              }
              return len;
            case "A":
              len = 0;
              var start = points[4];
              var dTheta = points[5];
              var end = points[4] + dTheta;
              var inc = Math.PI / 180;
              if (Math.abs(start - end) < inc) {
                inc = Math.abs(start - end);
              }
              p1 = path.getPointOnEllipticalArc(points[0], points[1], points[2], points[3], start, 0);
              if (dTheta < 0) {
                for (t = start - inc; t > end; t -= inc) {
                  p2 = path.getPointOnEllipticalArc(points[0], points[1], points[2], points[3], t, 0);
                  len += path.getLineLength(p1.x, p1.y, p2.x, p2.y);
                  p1 = p2;
                }
              } else {
                for (t = start + inc; t < end; t += inc) {
                  p2 = path.getPointOnEllipticalArc(points[0], points[1], points[2], points[3], t, 0);
                  len += path.getLineLength(p1.x, p1.y, p2.x, p2.y);
                  p1 = p2;
                }
              }
              p2 = path.getPointOnEllipticalArc(points[0], points[1], points[2], points[3], end, 0);
              len += path.getLineLength(p1.x, p1.y, p2.x, p2.y);
              return len;
          }
          return 0;
        };
        Kinetic.Path.convertEndpointToCenterParameterization = function(x1, y1, x2, y2, fa, fs, rx, ry, psiDeg) {
          var psi = psiDeg * (Math.PI / 180);
          var xp = Math.cos(psi) * (x1 - x2) / 2 + Math.sin(psi) * (y1 - y2) / 2;
          var yp = -1 * Math.sin(psi) * (x1 - x2) / 2 + Math.cos(psi) * (y1 - y2) / 2;
          var lambda = xp * xp / (rx * rx) + yp * yp / (ry * ry);
          if (lambda > 1) {
            rx *= Math.sqrt(lambda);
            ry *= Math.sqrt(lambda);
          }
          var f = Math.sqrt((rx * rx * (ry * ry) - rx * rx * (yp * yp) - ry * ry * (xp * xp)) / (rx * rx * (yp * yp) + ry * ry * (xp * xp)));
          if (fa === fs) {
            f *= -1;
          }
          if (isNaN(f)) {
            f = 0;
          }
          var cxp = f * rx * yp / ry;
          var cyp = f * -ry * xp / rx;
          var cx = (x1 + x2) / 2 + Math.cos(psi) * cxp - Math.sin(psi) * cyp;
          var cy = (y1 + y2) / 2 + Math.sin(psi) * cxp + Math.cos(psi) * cyp;
          var vMag = function(v2) {
            return Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
          };
          var vRatio = function(u2, v2) {
            return (u2[0] * v2[0] + u2[1] * v2[1]) / (vMag(u2) * vMag(v2));
          };
          var vAngle = function(u2, v2) {
            return (u2[0] * v2[1] < u2[1] * v2[0] ? -1 : 1) * Math.acos(vRatio(u2, v2));
          };
          var theta = vAngle([1, 0], [(xp - cxp) / rx, (yp - cyp) / ry]);
          var u = [(xp - cxp) / rx, (yp - cyp) / ry];
          var v = [(-1 * xp - cxp) / rx, (-1 * yp - cyp) / ry];
          var dTheta = vAngle(u, v);
          if (vRatio(u, v) <= -1) {
            dTheta = Math.PI;
          }
          if (vRatio(u, v) >= 1) {
            dTheta = 0;
          }
          if (fs === 0 && dTheta > 0) {
            dTheta = dTheta - 2 * Math.PI;
          }
          if (fs === 1 && dTheta < 0) {
            dTheta = dTheta + 2 * Math.PI;
          }
          return [cx, cy, rx, ry, theta, dTheta, psi, fs];
        };
        Kinetic.Factory.addGetterSetter(Kinetic.Path, "data");
        Kinetic.Collection.mapMethods(Kinetic.Path);
      })();
      (function() {
        var EMPTY_STRING = "", NORMAL = "normal";
        Kinetic.TextPath = function(config) {
          this.___init(config);
        };
        function _fillFunc(context) {
          context.fillText(this.partialText, 0, 0);
        }
        function _strokeFunc(context) {
          context.strokeText(this.partialText, 0, 0);
        }
        Kinetic.TextPath.prototype = {
          ___init: function(config) {
            var that = this;
            this.dummyCanvas = Kinetic.Util.createCanvasElement();
            this.dataArray = [];
            Kinetic.Shape.call(this, config);
            this._fillFunc = _fillFunc;
            this._strokeFunc = _strokeFunc;
            this._fillFuncHit = _fillFunc;
            this._strokeFuncHit = _strokeFunc;
            this.className = "TextPath";
            this.dataArray = Kinetic.Path.parsePathData(this.attrs.data);
            this.on("dataChange.kinetic", function() {
              that.dataArray = Kinetic.Path.parsePathData(this.attrs.data);
            });
            this.on("textChange.kinetic textStroke.kinetic textStrokeWidth.kinetic", that._setTextData);
            that._setTextData();
            this.sceneFunc(this._sceneFunc);
          },
          _sceneFunc: function(context) {
            context.setAttr("font", this._getContextFont());
            context.setAttr("textBaseline", "middle");
            context.setAttr("textAlign", "left");
            context.save();
            var glyphInfo = this.glyphInfo;
            for (var i = 0; i < glyphInfo.length; i++) {
              context.save();
              var p0 = glyphInfo[i].p0;
              context.translate(p0.x, p0.y);
              context.rotate(glyphInfo[i].rotation);
              this.partialText = glyphInfo[i].text;
              context.fillStrokeShape(this);
              context.restore();
            }
            context.restore();
          },
          /**
           * get text width in pixels
           * @method
           * @memberof Kinetic.TextPath.prototype
           */
          getTextWidth: function() {
            return this.textWidth;
          },
          /**
           * get text height in pixels
           * @method
           * @memberof Kinetic.TextPath.prototype
           */
          getTextHeight: function() {
            return this.textHeight;
          },
          /**
           * set text
           * @method
           * @memberof Kinetic.TextPath.prototype
           * @param {String} text
           */
          setText: function(text) {
            Kinetic.Text.prototype.setText.call(this, text);
          },
          _getTextSize: function(text) {
            var dummyCanvas = this.dummyCanvas;
            var _context = dummyCanvas.getContext("2d");
            _context.save();
            _context.font = this._getContextFont();
            var metrics = _context.measureText(text);
            _context.restore();
            return {
              width: metrics.width,
              height: parseInt(this.attrs.fontSize, 10)
            };
          },
          _setTextData: function() {
            var that = this;
            var size = this._getTextSize(this.attrs.text);
            this.textWidth = size.width;
            this.textHeight = size.height;
            this.glyphInfo = [];
            var charArr = this.attrs.text.split("");
            var p0, p1, pathCmd;
            var pIndex = -1;
            var currentT = 0;
            var getNextPathSegment = function() {
              currentT = 0;
              var pathData = that.dataArray;
              for (var i2 = pIndex + 1; i2 < pathData.length; i2++) {
                if (pathData[i2].pathLength > 0) {
                  pIndex = i2;
                  return pathData[i2];
                } else if (pathData[i2].command == "M") {
                  p0 = {
                    x: pathData[i2].points[0],
                    y: pathData[i2].points[1]
                  };
                }
              }
              return {};
            };
            var findSegmentToFitCharacter = function(c) {
              var glyphWidth = that._getTextSize(c).width;
              var currLen = 0;
              var attempts = 0;
              p1 = void 0;
              while (Math.abs(glyphWidth - currLen) / glyphWidth > 0.01 && attempts < 25) {
                attempts++;
                var cumulativePathLength = currLen;
                while (pathCmd === void 0) {
                  pathCmd = getNextPathSegment();
                  if (pathCmd && cumulativePathLength + pathCmd.pathLength < glyphWidth) {
                    cumulativePathLength += pathCmd.pathLength;
                    pathCmd = void 0;
                  }
                }
                if (pathCmd === {} || p0 === void 0) {
                  return void 0;
                }
                var needNewSegment = false;
                switch (pathCmd.command) {
                  case "L":
                    if (Kinetic.Path.getLineLength(p0.x, p0.y, pathCmd.points[0], pathCmd.points[1]) > glyphWidth) {
                      p1 = Kinetic.Path.getPointOnLine(glyphWidth, p0.x, p0.y, pathCmd.points[0], pathCmd.points[1], p0.x, p0.y);
                    } else {
                      pathCmd = void 0;
                    }
                    break;
                  case "A":
                    var start = pathCmd.points[4];
                    var dTheta = pathCmd.points[5];
                    var end = pathCmd.points[4] + dTheta;
                    if (currentT === 0) {
                      currentT = start + 1e-8;
                    } else if (glyphWidth > currLen) {
                      currentT += Math.PI / 180 * dTheta / Math.abs(dTheta);
                    } else {
                      currentT -= Math.PI / 360 * dTheta / Math.abs(dTheta);
                    }
                    if (dTheta < 0 && currentT < end || dTheta >= 0 && currentT > end) {
                      currentT = end;
                      needNewSegment = true;
                    }
                    p1 = Kinetic.Path.getPointOnEllipticalArc(pathCmd.points[0], pathCmd.points[1], pathCmd.points[2], pathCmd.points[3], currentT, pathCmd.points[6]);
                    break;
                  case "C":
                    if (currentT === 0) {
                      if (glyphWidth > pathCmd.pathLength) {
                        currentT = 1e-8;
                      } else {
                        currentT = glyphWidth / pathCmd.pathLength;
                      }
                    } else if (glyphWidth > currLen) {
                      currentT += (glyphWidth - currLen) / pathCmd.pathLength;
                    } else {
                      currentT -= (currLen - glyphWidth) / pathCmd.pathLength;
                    }
                    if (currentT > 1) {
                      currentT = 1;
                      needNewSegment = true;
                    }
                    p1 = Kinetic.Path.getPointOnCubicBezier(currentT, pathCmd.start.x, pathCmd.start.y, pathCmd.points[0], pathCmd.points[1], pathCmd.points[2], pathCmd.points[3], pathCmd.points[4], pathCmd.points[5]);
                    break;
                  case "Q":
                    if (currentT === 0) {
                      currentT = glyphWidth / pathCmd.pathLength;
                    } else if (glyphWidth > currLen) {
                      currentT += (glyphWidth - currLen) / pathCmd.pathLength;
                    } else {
                      currentT -= (currLen - glyphWidth) / pathCmd.pathLength;
                    }
                    if (currentT > 1) {
                      currentT = 1;
                      needNewSegment = true;
                    }
                    p1 = Kinetic.Path.getPointOnQuadraticBezier(currentT, pathCmd.start.x, pathCmd.start.y, pathCmd.points[0], pathCmd.points[1], pathCmd.points[2], pathCmd.points[3]);
                    break;
                }
                if (p1 !== void 0) {
                  currLen = Kinetic.Path.getLineLength(p0.x, p0.y, p1.x, p1.y);
                }
                if (needNewSegment) {
                  needNewSegment = false;
                  pathCmd = void 0;
                }
              }
            };
            for (var i = 0; i < charArr.length; i++) {
              findSegmentToFitCharacter(charArr[i]);
              if (p0 === void 0 || p1 === void 0) {
                break;
              }
              var width = Kinetic.Path.getLineLength(p0.x, p0.y, p1.x, p1.y);
              var kern = 0;
              var midpoint = Kinetic.Path.getPointOnLine(kern + width / 2, p0.x, p0.y, p1.x, p1.y);
              var rotation = Math.atan2(p1.y - p0.y, p1.x - p0.x);
              this.glyphInfo.push({
                transposeX: midpoint.x,
                transposeY: midpoint.y,
                text: charArr[i],
                rotation,
                p0,
                p1
              });
              p0 = p1;
            }
          }
        };
        Kinetic.TextPath.prototype._getContextFont = Kinetic.Text.prototype._getContextFont;
        Kinetic.Util.extend(Kinetic.TextPath, Kinetic.Shape);
        Kinetic.Factory.addGetterSetter(Kinetic.TextPath, "fontFamily", "Arial");
        Kinetic.Factory.addGetterSetter(Kinetic.TextPath, "fontSize", 12);
        Kinetic.Factory.addGetterSetter(Kinetic.TextPath, "fontStyle", NORMAL);
        Kinetic.Factory.addGetterSetter(Kinetic.TextPath, "fontVariant", NORMAL);
        Kinetic.Factory.addGetter(Kinetic.TextPath, "text", EMPTY_STRING);
        Kinetic.Collection.mapMethods(Kinetic.TextPath);
      })();
      (function() {
        Kinetic.RegularPolygon = function(config) {
          this.___init(config);
        };
        Kinetic.RegularPolygon.prototype = {
          ___init: function(config) {
            Kinetic.Shape.call(this, config);
            this.className = "RegularPolygon";
            this.sceneFunc(this._sceneFunc);
          },
          _sceneFunc: function(context) {
            var sides = this.attrs.sides, radius = this.attrs.radius, n, x, y;
            context.beginPath();
            context.moveTo(0, 0 - radius);
            for (n = 1; n < sides; n++) {
              x = radius * Math.sin(n * 2 * Math.PI / sides);
              y = -1 * radius * Math.cos(n * 2 * Math.PI / sides);
              context.lineTo(x, y);
            }
            context.closePath();
            context.fillStrokeShape(this);
          }
        };
        Kinetic.Util.extend(Kinetic.RegularPolygon, Kinetic.Shape);
        Kinetic.Factory.addGetterSetter(Kinetic.RegularPolygon, "radius", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.RegularPolygon, "sides", 0);
        Kinetic.Collection.mapMethods(Kinetic.RegularPolygon);
      })();
      (function() {
        Kinetic.Star = function(config) {
          this.___init(config);
        };
        Kinetic.Star.prototype = {
          ___init: function(config) {
            Kinetic.Shape.call(this, config);
            this.className = "Star";
            this.sceneFunc(this._sceneFunc);
          },
          _sceneFunc: function(context) {
            var innerRadius = this.innerRadius(), outerRadius = this.outerRadius(), numPoints = this.numPoints();
            context.beginPath();
            context.moveTo(0, 0 - outerRadius);
            for (var n = 1; n < numPoints * 2; n++) {
              var radius = n % 2 === 0 ? outerRadius : innerRadius;
              var x = radius * Math.sin(n * Math.PI / numPoints);
              var y = -1 * radius * Math.cos(n * Math.PI / numPoints);
              context.lineTo(x, y);
            }
            context.closePath();
            context.fillStrokeShape(this);
          }
        };
        Kinetic.Util.extend(Kinetic.Star, Kinetic.Shape);
        Kinetic.Factory.addGetterSetter(Kinetic.Star, "numPoints", 5);
        Kinetic.Factory.addGetterSetter(Kinetic.Star, "innerRadius", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Star, "outerRadius", 0);
        Kinetic.Collection.mapMethods(Kinetic.Star);
      })();
      (function() {
        var ATTR_CHANGE_LIST = ["fontFamily", "fontSize", "fontStyle", "padding", "lineHeight", "text"], CHANGE_KINETIC = "Change.kinetic", NONE = "none", UP = "up", RIGHT = "right", DOWN = "down", LEFT = "left", LABEL = "Label", attrChangeListLen = ATTR_CHANGE_LIST.length;
        Kinetic.Label = function(config) {
          this.____init(config);
        };
        Kinetic.Label.prototype = {
          ____init: function(config) {
            var that = this;
            Kinetic.Group.call(this, config);
            this.className = LABEL;
            this.on("add.kinetic", function(evt) {
              that._addListeners(evt.child);
              that._sync();
            });
          },
          /**
           * get Text shape for the label.  You need to access the Text shape in order to update
           * the text properties
           * @name getText
           * @method
           * @memberof Kinetic.Label.prototype
           */
          getText: function() {
            return this.find("Text")[0];
          },
          /**
           * get Tag shape for the label.  You need to access the Tag shape in order to update
           * the pointer properties and the corner radius
           * @name getTag
           * @method
           * @memberof Kinetic.Label.prototype
           */
          getTag: function() {
            return this.find("Tag")[0];
          },
          _addListeners: function(text) {
            var that = this, n;
            var func = function() {
              that._sync();
            };
            for (n = 0; n < attrChangeListLen; n++) {
              text.on(ATTR_CHANGE_LIST[n] + CHANGE_KINETIC, func);
            }
          },
          getWidth: function() {
            return this.getText().getWidth();
          },
          getHeight: function() {
            return this.getText().getHeight();
          },
          _sync: function() {
            var text = this.getText(), tag = this.getTag(), width, height, pointerDirection, pointerWidth, x, y, pointerHeight;
            if (text && tag) {
              width = text.getWidth();
              height = text.getHeight();
              pointerDirection = tag.getPointerDirection();
              pointerWidth = tag.getPointerWidth();
              pointerHeight = tag.getPointerHeight();
              x = 0;
              y = 0;
              switch (pointerDirection) {
                case UP:
                  x = width / 2;
                  y = -1 * pointerHeight;
                  break;
                case RIGHT:
                  x = width + pointerWidth;
                  y = height / 2;
                  break;
                case DOWN:
                  x = width / 2;
                  y = height + pointerHeight;
                  break;
                case LEFT:
                  x = -1 * pointerWidth;
                  y = height / 2;
                  break;
              }
              tag.setAttrs({
                x: -1 * x,
                y: -1 * y,
                width,
                height
              });
              text.setAttrs({
                x: -1 * x,
                y: -1 * y
              });
            }
          }
        };
        Kinetic.Util.extend(Kinetic.Label, Kinetic.Group);
        Kinetic.Collection.mapMethods(Kinetic.Label);
        Kinetic.Tag = function(config) {
          this.___init(config);
        };
        Kinetic.Tag.prototype = {
          ___init: function(config) {
            Kinetic.Shape.call(this, config);
            this.className = "Tag";
            this.sceneFunc(this._sceneFunc);
          },
          _sceneFunc: function(context) {
            var width = this.getWidth(), height = this.getHeight(), pointerDirection = this.getPointerDirection(), pointerWidth = this.getPointerWidth(), pointerHeight = this.getPointerHeight(), cornerRadius = this.getCornerRadius();
            context.beginPath();
            context.moveTo(0, 0);
            if (pointerDirection === UP) {
              context.lineTo((width - pointerWidth) / 2, 0);
              context.lineTo(width / 2, -1 * pointerHeight);
              context.lineTo((width + pointerWidth) / 2, 0);
            }
            if (!cornerRadius) {
              context.lineTo(width, 0);
            } else {
              context.lineTo(width - cornerRadius, 0);
              context.arc(width - cornerRadius, cornerRadius, cornerRadius, Math.PI * 3 / 2, 0, false);
            }
            if (pointerDirection === RIGHT) {
              context.lineTo(width, (height - pointerHeight) / 2);
              context.lineTo(width + pointerWidth, height / 2);
              context.lineTo(width, (height + pointerHeight) / 2);
            }
            if (!cornerRadius) {
              context.lineTo(width, height);
            } else {
              context.lineTo(width, height - cornerRadius);
              context.arc(width - cornerRadius, height - cornerRadius, cornerRadius, 0, Math.PI / 2, false);
            }
            if (pointerDirection === DOWN) {
              context.lineTo((width + pointerWidth) / 2, height);
              context.lineTo(width / 2, height + pointerHeight);
              context.lineTo((width - pointerWidth) / 2, height);
            }
            if (!cornerRadius) {
              context.lineTo(0, height);
            } else {
              context.lineTo(cornerRadius, height);
              context.arc(cornerRadius, height - cornerRadius, cornerRadius, Math.PI / 2, Math.PI, false);
            }
            if (pointerDirection === LEFT) {
              context.lineTo(0, (height + pointerHeight) / 2);
              context.lineTo(-1 * pointerWidth, height / 2);
              context.lineTo(0, (height - pointerHeight) / 2);
            }
            if (cornerRadius) {
              context.lineTo(0, cornerRadius);
              context.arc(cornerRadius, cornerRadius, cornerRadius, Math.PI, Math.PI * 3 / 2, false);
            }
            context.closePath();
            context.fillStrokeShape(this);
          }
        };
        Kinetic.Util.extend(Kinetic.Tag, Kinetic.Shape);
        Kinetic.Factory.addGetterSetter(Kinetic.Tag, "pointerDirection", NONE);
        Kinetic.Factory.addGetterSetter(Kinetic.Tag, "pointerWidth", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Tag, "pointerHeight", 0);
        Kinetic.Factory.addGetterSetter(Kinetic.Tag, "cornerRadius", 0);
        Kinetic.Collection.mapMethods(Kinetic.Tag);
      })();
      (function() {
        Kinetic.Arrow = function(config) {
          this.____init(config);
        };
        Kinetic.Arrow.prototype = {
          ____init: function(config) {
            Kinetic.Line.call(this, config);
            this.className = "Arrow";
          },
          _sceneFunc: function(ctx) {
            var PI2 = Math.PI * 2;
            var points = this.points();
            var n = points.length;
            var dx = points[n - 2] - points[n - 4];
            var dy = points[n - 1] - points[n - 3];
            var radians = (Math.atan2(dy, dx) + PI2) % PI2;
            var length = this.pointerLength();
            var width = this.pointerWidth();
            ctx.save();
            ctx.beginPath();
            ctx.translate(points[n - 2], points[n - 1]);
            ctx.rotate(radians);
            ctx.moveTo(0, 0);
            ctx.lineTo(-length, width / 2);
            ctx.lineTo(-length, -width / 2);
            ctx.closePath();
            ctx.restore();
            if (this.pointerAtBeginning()) {
              ctx.save();
              ctx.translate(points[0], points[1]);
              dx = points[2] - points[0];
              dy = points[3] - points[1];
              ctx.rotate((Math.atan2(-dy, -dx) + PI2) % PI2);
              ctx.moveTo(0, 0);
              ctx.lineTo(-10, 6);
              ctx.lineTo(-10, -6);
              ctx.closePath();
              ctx.restore();
            }
            ctx.fillStrokeShape(this);
            Kinetic.Line.prototype._sceneFunc.apply(this, arguments);
          }
        };
        Kinetic.Util.extend(Kinetic.Arrow, Kinetic.Line);
        Kinetic.Factory.addGetterSetter(Kinetic.Arrow, "pointerLength", 10);
        Kinetic.Factory.addGetterSetter(Kinetic.Arrow, "pointerWidth", 10);
        Kinetic.Factory.addGetterSetter(Kinetic.Arrow, "pointerAtBeginning", false);
        Kinetic.Collection.mapMethods(Kinetic.Arrow);
      })();
    }
  });

  // app/assets/javascripts/game/board/board-ui.js
  var require_board_ui = __commonJS({
    "app/assets/javascripts/game/board/board-ui.js"(exports, module) {
      var Kinetic = require_kinetic();
      var Board = require_board();
      UI = function(board, opts) {
        this.board = board;
        this.username = opts.username;
        this.radius = opts.radius || 23;
        this.polyWidth = this.radius * 2, this.polyHeight = this.radius * Math.sqrt(3);
        this.radiusShort = this.polyHeight / 2;
        this.padding = opts.padding || 6;
        this.container = opts.container;
        this.canvasWidth = opts.width || 800;
        this.canvasHeight = opts.height || (typeof window !== "undefined" ? Math.max(window.innerHeight - 130) : 600);
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
        this.board.on("move", this.handleMove.bind(this));
        this.board.on("rejection", this.handleRejection.bind(this));
        this.buildNotationToPixelMap(this.color === Board.PLAYER_BLACK);
        this.drawPieces();
      };
      UI.prototype.drawPieces = function() {
        this.drawPieceSet({ color: this.color, fillColor: UI.fillColors[this.color], y: this.canvasHeight - 2 * this.radius + this.padding });
        this.drawPieceSet({ color: this.colorOpponent, fillColor: UI.fillColors[this.colorOpponent], y: 0 });
      };
      UI.prototype.drawPieceSet = function(opts) {
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
            shadowColor: "black",
            shadowBlur: 2,
            shadowOffset: { x: 3, y: 3 },
            shadowOpacity: 0.5
          });
          if (typeof Image !== "undefined") {
            var img = new Image();
            poly.setImage(img);
            var _this = this;
            img.onload = function() {
              _this.stage.draw();
            };
            img.src = UI.images[opts.color][piece.type];
          }
          poly.on("dragstart", this.dragPieceStart.bind(this));
          poly.on("dragend", this.dragPieceEnd.bind(this));
          poly.attrs.resetX = poly.attrs.x;
          poly.attrs.resetY = poly.attrs.y;
          poly.hive = {};
          poly.hive.piece = piece;
          this.pieceLayer.add(poly);
        }
        this.stage.add(this.pieceLayer);
      };
      UI.prototype.xPieceTrayOffset = function() {
        return (this.canvasWidth - 11 * (this.padding + 2 * this.radius)) / 2;
      };
      UI.prototype.getMoveTypeNotationFromPoly = function(poly) {
        return poly.hive.piece.isInPlay ? "m" : "p";
      };
      UI.prototype.getZCoordFromLocation = function(location2) {
        return this.board.stackedPieces(location2).length;
      };
      UI.prototype.hiveOrigin = function() {
        var box = this.playableBoundingBox();
        var bottomRightPoint = box[2];
        return [bottomRightPoint[0] / 2, bottomRightPoint[1] / 2];
      };
      UI.prototype.playableBoundingBox = function() {
        var lowY = this.canvasHeight - 2 * (this.padding + this.radius);
        return [[0, 0], [this.canvasWidth, 0], [this.canvasWidth, lowY], [0, lowY]];
      };
      UI.prototype.nearestPolyOrigin = function(poly) {
        var min = { distance: Number.POSITIVE_INFINITY };
        var x = poly.attrs.x;
        var y = poly.attrs.y;
        for (var notation in this.notationToPixelMap) {
          if (this.notationToPixelMap.hasOwnProperty(notation)) {
            var point = this.notationToPixelMap[notation];
            var dx = x - point[0];
            var dy = y - point[1];
            var distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < min.distance) {
              min.distance = distance;
              min.point = point;
              min.notation = notation;
              min.traveler = poly;
            }
          }
        }
        return min;
      };
      UI.prototype.acceptablePolyOrigin = function(poly) {
        var point = [poly.attrs.x, poly.attrs.y];
        if (this.board.moves.length === 0 && UI.isInBox(point, this.playableBoundingBox())) {
          return { point: this.notationToPixelMap["0:-1"], notation: "0:-1", traveler: poly };
        } else {
          return this.nearestPolyOrigin(poly);
        }
      };
      UI.prototype.buildNotationToPixelMap = function(invert) {
        var direction = invert ? -1 : 1;
        this.notationToPixelMap = {};
        this.pix = {};
        var originPoint = this.hiveOrigin();
        for (var col = -5; col <= 5; col++) {
          var x = 3 / 2 * (this.radius + this.padding) * col;
          for (var row = -10; row <= 10; row++) {
            var y = (this.radiusShort + this.padding) * row * -1;
            var xIsEven = col % 2 === 0;
            var yIsEven = row % 2 === 0;
            if (xIsEven && !yIsEven || !xIsEven && yIsEven) {
              this.notationToPixelMap[col + ":" + row] = [x * direction + originPoint[0], y * direction + originPoint[1] - this.padding / 2];
            }
          }
        }
      };
      UI.isInBox = function(point, box) {
        var x = point[0];
        var y = point[1];
        var topLeftPoint = box[0];
        var bottomRightPoint = box[2];
        var leftBound = topLeftPoint[0];
        var topBound = topLeftPoint[1];
        var rightBound = bottomRightPoint[0];
        var bottomBound = bottomRightPoint[1];
        return x > leftBound && x < rightBound && y > topBound && y < bottomBound;
      };
      UI.prototype.getPolyFromPiece = function(piece) {
        return this.pieceLayer.children.filter(function(poly) {
          return poly.hive.piece == piece;
        })[0];
      };
      UI.prototype.getDestLocationFromNotation = function(notation) {
        var parts = notation.split(":");
        var point = this.notationToPixelMap[[parts[3] + ":" + parts[4]]];
        return { x: point[0], y: point[1] };
      };
      UI.prototype.getNotationFromLocation = function(location2) {
        var poly = location2.traveler;
        var color = poly.hive.piece.color === "BLACK" ? "b" : "w";
        var moveType = this.getMoveTypeNotationFromPoly(poly);
        var pieceType = Board.notationFromType(poly.hive.piece.type, poly.hive.piece.typeId);
        var destCoord = location2.notation;
        var zCoord = this.getZCoordFromLocation(destCoord);
        return color + ":" + moveType + ":" + pieceType + ":" + destCoord + ":" + zCoord;
      };
      UI.prototype.dragPieceStart = function(e) {
        var poly = e.target;
      };
      UI.prototype.dragPieceEnd = function(e) {
        var poly = e.target;
        var x = poly.attrs.resetX;
        var y = poly.attrs.resetY;
        var location2 = this.acceptablePolyOrigin(poly);
        if (location2) {
          var notation = this.getNotationFromLocation(location2);
          this.board.queue.push(notation);
          this.board.processQueue(true);
        } else {
          new Kinetic.Tween({
            node: poly,
            x: poly.attrs.resetX,
            y: poly.attrs.resetY,
            duration: 0.2
          }).play();
        }
      };
      UI.prototype.handleMove = function(e) {
        var piece = e.piece;
        var poly = this.getPolyFromPiece(piece);
        var point = this.getDestLocationFromNotation(e.notation);
        var zIndex = Board.coordsFromNotation(e.notation).z;
        poly.setWidth(this.polyWidth - zIndex * this.zScale);
        poly.attrs.resetX = point.x;
        poly.attrs.resetY = point.y;
        new Kinetic.Tween({
          node: poly,
          x: point.x,
          y: point.y,
          duration: 0.5
        }).play();
      };
      UI.prototype.handleRejection = function(e) {
        console.error(e);
        var piece = e.piece;
        var poly = this.getPolyFromPiece(piece);
        var point = this.getDestLocationFromNotation(e.notation);
        new Kinetic.Tween({
          node: poly,
          x: poly.attrs.resetX,
          y: poly.attrs.resetY,
          duration: 0.2
        }).play();
      };
      UI.images = {
        WHITE: {
          QUEEN: "images/white_queen.png",
          ANT: "images/white_ant.png",
          GRASSHOPPER: "images/white_grasshopper.png",
          BEETLE: "images/white_beetle.png",
          SPIDER: "images/white_spider.png"
        },
        BLACK: {
          QUEEN: "images/black_queen.png",
          ANT: "images/black_ant.png",
          GRASSHOPPER: "images/black_grasshopper.png",
          BEETLE: "images/black_beetle.png",
          SPIDER: "images/black_spider.png"
        }
      };
      UI.fillColors = { WHITE: "#FFFFCC", BLACK: "#000000" };
      module.exports = UI;
    }
  });

  // app/assets/javascripts/main.js
  var Hive2 = require_hive();
  var UI2 = require_board_ui();
  var currentHive;
  var currentUI;
  function $(id) {
    return document.getElementById(id);
  }
  function setDisabled(element, disabled) {
    if (!element) {
      return;
    }
    disabled = !!disabled;
    element.classList.toggle("is-disabled", disabled);
    element.setAttribute("aria-disabled", disabled ? "true" : "false");
  }
  function disposeHive() {
    if (!currentHive) {
      return;
    }
    if (currentHive.aiWorker) {
      currentHive.aiWorker.terminate();
    }
    currentHive.disconnect();
    currentHive = null;
    currentUI = null;
  }
  function updateControls() {
    var gameActive = currentHive && !currentHive.board.isGameover;
    setDisabled($("new-game-random"), gameActive);
    setDisabled($("new-game-ai"), gameActive);
    setDisabled($("resign-game"), !currentHive || currentHive.board.isGameover);
  }
  function updateStatus() {
    var statusText = currentHive ? currentHive.status : "Play Hive";
    var title = $("status-title");
    var opponent = $("board-opponent-line");
    var me = $("board-me-line");
    title.textContent = statusText;
    if (!currentHive || !currentHive.ready) {
      opponent.hidden = true;
      me.hidden = true;
      opponent.textContent = "";
      me.textContent = "";
      updateControls();
      return;
    }
    opponent.hidden = false;
    me.hidden = false;
    opponent.textContent = currentHive.usernameOpponent || "";
    me.textContent = (currentHive.username || "You") + " (Me)";
    updateControls();
  }
  function resetBoard() {
    $("board-canvas").innerHTML = "";
    currentUI = null;
  }
  function attachHive(hive) {
    currentHive = hive;
    resetBoard();
    updateStatus();
    hive.on("ready", function(board) {
      resetBoard();
      currentUI = new UI2(board, {
        container: "board-canvas",
        colCnt: 1,
        rowCnt: 6,
        radius: 32,
        padding: 5,
        color: hive.color
      });
      updateStatus();
    });
    hive.on("move", function() {
      updateStatus();
    });
    hive.on("resignation", function(results) {
      updateStatus();
      alert("Game over, " + results.winner + " wins by resignation!");
    });
    hive.on("gameover", function(results) {
      alert("Game over, " + results.winner + " wins!");
      hive.disconnect();
      updateStatus();
    });
    hive.connect();
  }
  function startAiGame() {
    disposeHive();
    attachHive(new Hive2({ username: "You" }));
  }
  function startRandomGame() {
    var username = window.prompt("Please enter your name");
    if (!username) {
      return;
    }
    disposeHive();
    attachHive(new Hive2({
      endpoint: window.location.origin,
      room: "random",
      username
    }));
  }
  function resignGame() {
    if (!currentHive || currentHive.board.isGameover) {
      return;
    }
    currentHive.resign();
  }
  function bindActions() {
    $("new-game-random").addEventListener("click", function(event) {
      event.preventDefault();
      if (event.currentTarget.classList.contains("is-disabled")) {
        return;
      }
      startRandomGame();
    });
    $("new-game-ai").addEventListener("click", function(event) {
      event.preventDefault();
      if (event.currentTarget.classList.contains("is-disabled")) {
        return;
      }
      startAiGame();
    });
    $("resign-game").addEventListener("click", function(event) {
      event.preventDefault();
      if (event.currentTarget.classList.contains("is-disabled")) {
        return;
      }
      resignGame();
    });
  }
  document.addEventListener("DOMContentLoaded", function() {
    bindActions();
    updateStatus();
  });
})();
/*! Bundled license information:

kinetic/kinetic.js:
  (**
   * Sepia Filter
   * Based on: Pixastic Lib - Sepia filter - v0.1.0
   * Copyright (c) 2008 Jacob Seidelin, jseidelin@nihilogic.dk, http://blog.nihilogic.dk/
   * @function
   * @name Sepia
   * @memberof Kinetic.Filters
   * @param {Object} imageData
   * @author Jacob Seidelin <jseidelin@nihilogic.dk>
   * @license MPL v1.1 [http://www.pixastic.com/lib/license.txt]
   * @example
   * node.cache();
   * node.filters([Kinetic.Filters.Sepia]);
   *)
*/
