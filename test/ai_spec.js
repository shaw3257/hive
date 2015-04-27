var expect = require('chai').expect;
var Board = require('../lib/board');
var AI = require('../lib/ai');

describe('AI', function(){

  var ai, board;

  beforeEach(function(){
    board = new Board();
    ai = new AI(board, 'WHITE');
  });


  describe('allPossiblePlacements', function(){

    it('gives all possible placement notations for first move', function(){
      expect(ai.allPossiblePlacements('WHITE')).to.have.members([ 'w:p:q_1:0:-1:0', 'w:p:s_2:0:-1:0', 'w:p:s_3:0:-1:0', 'w:p:b_4:0:-1:0', 'w:p:b_5:0:-1:0', 'w:p:g_6:0:-1:0', 'w:p:g_7:0:-1:0', 'w:p:g_8:0:-1:0', 'w:p:a_9:0:-1:0', 'w:p:a_10:0:-1:0', 'w:p:a_11:0:-1:0' ])
    });

    it('gives all possible placement notations for second move', function(){
      board.queue = ['w:p:q_1:0:-1:0'];
      board.processQueue();
      expect(ai.allPossiblePlacements('BLACK')).to.have.members([ 'b:p:q_1:0:1:0', 'b:p:s_2:0:1:0', 'b:p:s_3:0:1:0', 'b:p:b_4:0:1:0', 'b:p:b_5:0:1:0', 'b:p:g_6:0:1:0', 'b:p:g_7:0:1:0', 'b:p:g_8:0:1:0', 'b:p:a_9:0:1:0', 'b:p:a_10:0:1:0', 'b:p:a_11:0:1:0' ])
    });

    it('gives all possible placement options after opening', function(){
      board.queue = ["w:p:q_1:0:-1:0", "b:p:q_1:0:1:0", "w:p:a_9:1:-2:0", "b:p:g_7:0:3:0"];
      board.processQueue();
      expect(ai.allPossiblePlacements('WHITE').length).to.eq(9 * 5)
    });

    it('gives only queen option when on turn 8 for black', function(){
      board.queue = ["w:p:g_7:0:-1:0", "b:p:s_2:0:1:0", "w:p:g_8:-1:-2:0", "b:p:s_3:0:3:0", "w:p:a_10:1:-2:0", "b:p:b_4:1:2:0", "w:p:q_1:-2:-3:0"];
      board.processQueue();
      console.log(ai.allPossiblePlacements('BLACK'))
      expect(ai.allPossiblePlacements('BLACK').length).to.eq(6);
    });

  });

  describe('allPossibleMovments', function(){

    it('gives all possible movement notations for all pieces', function(){
      board.queue = ["w:p:q_1:0:-1:0", "b:p:q_1:0:1:0", "w:p:a_9:1:-2:0", "b:p:g_7:0:3:0"];
      board.processQueue();
      expect(ai.allPossibleMovements('WHITE').length).to.eq(9);
    });

    it('gives all possible movement notations for all pieces 2', function(){
      board.queue = ["w:p:q_1:0:-1:0", "b:p:q_1:0:1:0", "w:p:a_9:1:-2:0", "b:p:g_7:0:3:0", "w:m:a_9:1:0:0"];
      board.processQueue();
      expect(ai.allPossibleMovements('BLACK').length).to.eq(1);
    });

    it('gives all possible movement notations when z axis', function(){
      board.queue = ["w:p:b_4:0:-1:0", "b:p:g_6:0:1:0", "w:m:b_4:0:1:1"];
      board.processQueue();
      expect(ai.allPossibleMovements('BLACK').length).to.eq(0);
    });

  });

  describe('bestMove', function(){

    it('gives best possible move for depth 1', function(){
      board.queue = ["w:p:q_1:0:-1:0", "b:p:q_1:0:1:0", "w:p:s_2:-1:-2:0", "b:p:s_2:0:3:0", "w:p:g_6:-2:-3:0"];
      board.processQueue();
      expect(ai.bestMove(1).notation).to.eq('b:m:s_2:1:-2:0');
    });

    it('gives best possible move for depth 2', function(){
      board.queue = ["w:p:q_1:0:-1:0", "b:p:q_1:0:1:0", "w:p:s_2:-1:-2:0", "b:p:s_2:0:3:0", "w:p:g_6:-2:-3:0"];
      board.processQueue();
      expect(ai.bestMove(2).notation).to.eq('b:m:s_2:1:-2:0');
    });

    it('gives best possible move for depth 3', function(){
      board.queue = ["w:p:q_1:0:-1:0", "b:p:q_1:0:1:0", "w:p:s_2:-1:-2:0", "b:p:s_2:0:3:0", "w:p:g_6:-2:-3:0"];
      board.processQueue();
      expect(ai.bestMove(3).notation).to.eq('b:m:s_2:1:-2:0');
    });
    
  });

});