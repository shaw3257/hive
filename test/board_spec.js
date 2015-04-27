var expect = require('chai').expect;
var _ = require('lodash');
var Board = require('../lib/board');
var Piece = Board.Piece;

describe('Board', function(){

  var board;
  var p1,p2,p3,p4,p5,p6, p7 ;

  beforeEach(function(){
    board = new Board();
  });

  describe('surroundings', function() {


    beforeEach(function () {
      p1 = board.hive['0:-1:0'] = _.tap(new Piece({type: 'GRASSHOPPER', color: Board.WHITE}), function (p) {
        p.location = '0:-1:0'
      });
      p2 = board.hive['0:1:0'] = _.tap(new Piece({type: 'BEETLE', color: Board.WHITE}), function (p) {
        p.location = '0:1:0'
      });
      p3 = board.hive['1:0:0'] = _.tap(new Piece({type: 'SPIDER', color: Board.WHITE}), function (p) {
        p.location = '1:0:0'
      });
      p4 = board.hive['1:-2:0'] = _.tap(new Piece({type: 'QUEEN', color: Board.WHITE}), function (p) {
        p.location = '1:-2:0'
      });
      p5 = board.hive['-1:-2:0'] = _.tap(new Piece({type: 'BEETLE', color: Board.WHITE}), function (p) {
        p.location = '-1:-2:0'
      });
      p6 = board.hive['-1:0:0'] = _.tap(new Piece({type: 'ANT', color: Board.WHITE}), function (p) {
        p.location = '-1:-0:0'
      });
      p7 = board.hive['2:-3:0'] = _.tap(new Piece({type: 'SPIDER', color: Board.WHITE}), function (p) {
        p.location = '2:-3:0'
      });
    });

    describe('surroundingPieces', function () {

      it('no filtering returns its adjacent pieces with nulls', function () {
        expect(board.surroundingPieces('0:-1:0', false)).to.eql([p2, p3, p4, undefined, p5, p6]);
        expect(board.surroundingPieces('0:1:0', false)).to.eql([undefined, undefined, p3, p1, p6, undefined]);
        expect(board.surroundingPieces('1:0:0', false)).to.eql([undefined, undefined, undefined, p4, p1, p2]);
        expect(board.surroundingPieces('1:-2:0', false)).to.eql([p3, undefined, p7, undefined, undefined, p1]);
      });

      it('filtering returns its six adjacent pieces without nulls', function () {
        expect(board.surroundingPieces('0:-1:0', true)).to.eql([p2, p3, p4, p5, p6]);
        expect(board.surroundingPieces('0:1:0', true)).to.eql([p3, p1, p6]);
        expect(board.surroundingPieces('1:0:0', true)).to.eql([p4, p1, p2]);
        expect(board.surroundingPieces('1:-2:0', true)).to.eql([p3, p7, p1]);
      });

    });

    describe('moveableLocations', function () {

      it('returns empty array when no possible move', function () {
        expect(board.moveableLocations('0:-1:0', 1)).to.be.empty;
      });

      it('returns empty adjacent spaces one movement away', function () {
        expect(board.moveableLocations('0:1:0', 1)).to.have.members(['-1:2:0', '1:2:0']);
      });

      //it.only('returns empty spaces 3 movements away', function () {
      //  expect(board.moveableLocations('0:-3:0', Number.POSITIVE_INFINITY)).to.have.members(['-1:2:0', '1:2:0']);
      //});


    });

    describe('crawlableLocations', function () {

      beforeEach(function () {
        board.hive['1:0:1'] = _.tap(new Piece({type: 'GRASSHOPPER', color: Board.WHITE}), function (p) {
          p.location = '1:0:1'
        });
        board.hive['1:0:2'] = _.tap(new Piece({type: 'GRASSHOPPER', color: Board.WHITE}), function (p) {
          p.location = '1:0:2'
        });
      });

      it('returns highest surroundingLocations plus one in the z direction', function () {
        expect(board.crawlupableLocations('0:-1:0')).to.have.members(['0:1:1', '1:0:3', '1:-2:1', '-1:-2:1', '-1:0:1']);
      });

    });

    describe('hoppableLocations', function () {

      it('returns closest empty linearly connected spaces', function () {
        expect(board.hoppableLocations('0:-1:0')).to.have.members(['0:3:0', '2:1:0', '3:-4:0', '-2:-3:0', '-2:1:0']);
      });

    });

  });

  describe('validations', function(){

    describe('validateColorTurnOrder', function(){

      beforeEach(function(){
        board = new Board();
    });

      it('validates turn order', function(){
        board.queue.push('b:p:q_1:0:-1:0');
        board.processQueue();
        expect(board.errors.length).to.be.eql(1);
        expect(board.errors[0]).to.be.eql('It is not BLACK\'s turn to play')
      });

      it('validates with correct turn order', function(){
        board.queue.push('w:p:q_1:0:-1:0');
        board.processQueue();
        expect(board.errors.length).to.be.eql(0);
      });

    });

    describe('validateLocation', function(){

      it('validates first turn location', function(){
        board.queue.push('w:p:q_1:0:0:0');
        board.processQueue();
        expect(board.errors.length).to.be.eql(1);
        board.errors = [];
      });

      it('validates second turn location', function(){
        board.queue.push('w:p:q_1:0:-1:0');
        board.queue.push('b:p:q_1:-1:1:0');
        board.processQueue();
        expect(board.errors.length).to.be.eql(1);
      });

      it('validates correctly on valid sequences', function(){
        board.queue.push('w:p:q_1:0:-1:0');
        board.queue.push('b:p:q_1:0:1:0');
        board.processQueue();
        expect(board.errors.length).to.be.eql(0);
      });

    });

    describe('validateQueenPlaced', function(){

      it('adds error when queen isn\'t out by turn 7 for white', function(){
        board.queue.push('w:p:g_8:0:-1:0')
        board.queue.push('b:p:g_8:0:1:0')
        board.queue.push('w:p:g_7:1:-2:0')
        board.queue.push('b:p:g_6:0:3:0')
        board.queue.push('w:p:g_6:-1:-2:0')
        board.queue.push('b:p:b_5:-1:4:0')
        board.queue.push('w:p:a_9:2:-5:0')
        board.processQueue();
        expect(board.errors.length).to.be.eql(1);
        expect(board.errors[0]).to.be.eql('Queen must be out within first 4 turns');
      });

      it('adds error when queen isn\'t out by turn 8 for black', function(){
        addValidSeqs(board, 7);
        board.queue.push('b:p:a_9:-1:5:0')
        board.processQueue();
        expect(board.errors.length).to.be.eql(1);
        expect(board.errors[0]).to.be.eql('Queen must be out within first 4 turns');
      });

      it('doesn\'t add error when queens are out' , function(){
        addValidSeqs(board, 8);
        board.processQueue();
        expect(board.errors.length).to.be.eql(0);
      });

    });

    describe('validatePlacement', function(){

      it('adds error if white is next to adjacent black and adjacent white', function(){
        addValidSeqs(board, 2);
        board.queue.push('w:p:g_6:1:0:0');
        board.processQueue();
        expect(board.errors.length).to.be.eql(1);
        expect(board.errors[0]).to.be.eql('Can not place piece next to adjacent opponent piece');
      });

      it('adds error if white is next to adjacent black and no white', function(){
        addValidSeqs(board, 2);
        board.queue.push('w:p:g_8:0:3:0');
        board.processQueue();
        expect(board.errors.length).to.be.eql(1);
        expect(board.errors[0]).to.be.eql('Can not place piece next to adjacent opponent piece');
      });

    });

    describe('validateMovement', function(){

      describe('queen', function(){

        it('can move one adjacent open space', function(){
          board.queue.push('w:p:b_5:0:-1:0');
          board.queue.push('b:p:g_6:0:1:0');
          board.queue.push('w:p:q_1:-1:-2:0');
          board.queue.push('b:p:q_1:0:3:0');
          board.queue.push('w:m:q_1:-1:0:0');
          board.queue.push('b:m:q_1:1:2:0');
          board.queue.push('w:m:q_1:-1:2:0');
          board.queue.push('b:m:q_1:1:0:0');
          board.queue.push('w:m:q_1:0:3:0');
          board.queue.push('b:m:q_1:1:-2:0');
          board.queue.push('w:m:q_1:1:2:0');
          board.queue.push('b:m:q_1:0:-3:0');
          board.queue.push('w:m:q_1:1:0:0');
          board.queue.push('b:m:q_1:-1:-2:0');
          board.processQueue();
          expect(board.errors.length).to.be.eql(0);
        });

        it('can not move more than one adjacent space', function(){
          board.queue.push('w:p:b_5:0:-1:0');
          board.queue.push('b:p:g_6:0:1:0');
          board.queue.push('w:p:q_1:-1:-2:0');
          board.queue.push('b:p:q_1:0:3:0');
          board.queue.push('w:m:q_1:-1:2:0');
          board.processQueue();
          expect(board.errors.length).to.be.eql(1);
        });

      });

      describe('ant', function(){

        it('can move infinitely', function(){
          board.queue = ["w:p:g_6:0:-1:0", "b:p:b_5:0:1:0", "w:p:a_9:1:-2:0", "b:p:a_10:1:2:0", "w:m:a_9:0:3:0"];
          board.processQueue();
          expect(board.errors.length).to.be.eql(0);
        });

      });

      describe('spider', function(){
        
        it('can move only 3 spaces', function(){
          board.queue = ["w:p:q_1:0:-1:0", "b:p:q_1:0:1:0", "w:p:s_3:-1:-2:0", "b:p:s_2:0:3:0", "w:p:s_2:1:-2:0", "b:p:s_3:0:5:0", "w:m:s_2:1:4:0", "b:m:s_3:-1:0:0", "w:m:s_3:-1:2:0", "b:m:s_3:1:-2:0"];
          board.processQueue();
          expect(board.errors.length).to.be.eql(0);
        });

      });

      describe('grasshopper', function(){

        it('can hop in a straight line', function(){
          board.queue = ["w:p:q_1:0:-1:0", "b:p:q_1:0:1:0", "w:p:g_8:1:-2:0", "b:p:g_8:-1:2:0", "w:p:g_6:2:-3:0", "b:p:g_7:1:2:0", "w:m:g_6:-1:0:0", "b:m:g_7:-2:-1:0", "w:m:g_8:-2:1:0", "b:m:g_8:-1:-2:0", "w:m:g_8:1:-2:0"];
          board.processQueue();
          expect(board.errors.length).to.be.eql(0);
        });

      });

      describe('beetle', function(){

        it('can crawl', function(){
          board.queue = ["w:p:q_1:0:-1:0", "b:p:g_8:0:1:0", "w:p:b_5:0:-3:0", "b:p:s_3:-1:2:0", "w:m:b_5:0:-1:1", "b:m:s_3:0:-3:0", "w:m:b_5:0:1:1"];
          board.processQueue();
          console.log(board.errors);
          expect(board.errors.length).to.be.eql(0);
        });

        it('can drop', function(){
          board.queue = ["w:p:q_1:0:-1:0", "b:p:q_1:0:1:0", "w:p:b_4:1:-2:0", "b:p:b_4:-1:2:0", "w:m:b_4:0:-1:1", "b:m:b_4:0:1:1", "w:p:b_5:1:-2:0", "b:p:b_5:0:3:0", "w:m:b_5:0:-1:2", "b:m:b_5:0:1:2", "w:m:b_5:1:-2:0"]
          board.processQueue();
          console.log(board.errors);
          expect(board.errors.length).to.be.eql(0);
        })

      });

    });

    describe('validateConnected', function(){

      it('adds errors if move results in disconnected hive', function(){
        addValidSeqs(board, 8);
        board.queue.push('w:m:g_6:0:3:0');
        board.processQueue();
        expect(board.errors.length).to.be.eql(1);
        expect(board.errors[0]).to.be.eql('This move results in a disconnected hive');
      });

    });

  });

  describe('legalPiecePlacements', function(){

    it('returns lists of possible locations per piece ablity', function(){
      board.queue = ["w:p:q_1:0:-1:0", "b:p:q_1:0:1:0", "w:p:g_6:1:-2:0", "b:p:b_5:-1:2:0", "w:p:g_7:1:-4:0", "b:p:g_7:0:3:0", "w:p:a_10:0:-5:0", "b:m:g_7:0:-3:0"];
      board.processQueue();
      var piece = board.piecesNotInPlayByColor('WHITE')[0];
      expect(board.legalPiecePlacements(piece)).to.have.members(['-1:-6:0', '0:-7:0', '1:-6:0', '2:-5:0', '2:-3:0', '2:-1:0']);
    })

  });

  describe('legalPieceMovements', function(){

    it('returns lists of possible locations per piece ablity', function(){
      board.queue = ["w:p:q_1:0:-1:0", "b:p:q_1:0:1:0", "w:p:g_6:1:-2:0", "b:p:b_5:-1:2:0", "w:p:g_7:1:-4:0", "b:p:g_7:0:3:0", "w:p:a_10:0:-5:0", "b:m:g_7:0:-3:0"];
      board.processQueue();
      var ant = board.hive['0:-5:0'];
      expect(board.legalPieceMovements(ant).length).to.be.eq(13)
    });

  });

  describe('isGameOver', function(){

    it('returns true if white or black queen is surrounded', function(){
    
    
    });

    it('returns false if white or black queen is not surrounded', function(){

    });

  });

});

VALID_SEQ = [
  'w:p:g_6:0:-1:0',
  'b:p:g_6:0:1:0',
  'w:p:g_8:1:-2:0',
  'b:p:b_4:-1:2:0',
  'w:p:q_1:1:-4:0',
  'b:p:b_5:-1:4:0',
  'w:p:a_10:0:-5:0',
  'b:p:q_1:-2:5:0'
];

function addValidSeqs(board, num){
  board.queue = board.queue.concat(VALID_SEQ.slice(0, num));
}