var expect = require('chai').expect;
var UI = require('../app/assets/javascripts/game/board/board-ui');
var Board = require('../lib/board');
var Kinetic = require('kinetic');

describe('Board UI', function(){
  var ui, board, container;
  var document = Kinetic.document;
  
  beforeEach(function(){
    container = document.createElement('div');
    container.id = 'container';
    document.body.appendChild(container);
  });

  beforeEach(function(){
    board = new Board();
  })

  after(function(){
    document.body.removeChild(container);
  });


  describe('drawPieces', function(){

    beforeEach(function(){
      ui = new UI(board, {container: 'container', _window: document.defaultView});
    });

    it('renders 22 hexagons', function(){
      expect(ui.pieceLayer.children.length).to.eq(22);
    });

  });

  describe('playable area', function(){
    beforeEach(function(){
      ui = new UI(board, {container: 'container', width: 400, height: 600, radius: 25, padding: 5});
    });

    it('returns playable box that has width of container and height of container height - (2 (r+p) )', function(){
      expect(ui.playableBoundingBox()).to.deep.eq([[0,0],[400, 0],[400, 540],[0, 540]]);
    });


    it('has hive origin at center of playable area', function(){
      expect(ui.hiveOrigin()).to.deep.eq([200, 540/2]);
    });

  });

  describe('isInBox', function(){

    it('returns true if poly\'s coordinates are within bounding box', function(){
      expect(UI.isInBox([20,20], [[0,0],[400, 0],[400, 540],[0, 540]])).to.be.true
    });

  });

  describe('nearestPolyOrigin', function(){

    beforeEach(function(){
      ui = new UI(board, {container: 'container', width: 400, height: 600, radius: 25, padding: 5});
      ui.drawPieces();
      poly = ui.pieceLayer.children[0];
    });

    it('returns nearest origin', function(){
      poly.attrs.x = 200.00;
      poly.attrs.y = 270.00;
      var location = ui.nearestPolyOrigin(poly);
      expect(location.point[0]).to.be.closeTo(200.00, 0.01);
      expect(location.point[1]).to.be.closeTo(294.15, 0.01);
      expect(location.notation).to.be.eq('0:-1');

      poly.attrs.x = 100.00;
      poly.attrs.y = 223.00;
      location = ui.nearestPolyOrigin(poly);
      expect(location.point[0]).to.be.closeTo(110.00, 0.01);
      expect(location.point[1]).to.be.closeTo(240.85, 0.01);
      expect(location.notation).to.be.eq('-2:1');

      poly.attrs.x = 300.00;
      poly.attrs.y = 370.00;
      location = ui.nearestPolyOrigin(poly);
      expect(location.point[0]).to.be.closeTo(290.00, 0.01);
      expect(location.point[1]).to.be.closeTo(347.45, 0.01);
      expect(location.notation).to.be.eq('2:-3');
    });

  });

   describe('acceptablePolyOrigin', function(){

    beforeEach(function(){
      ui = new UI(board, {container: 'container', width: 400, height: 600, radius: 25, padding: 5});
      ui.drawPieces();
      poly = ui.pieceLayer.children[0];
      poly.attrs.x = 199.00;
      poly.attrs.y = 230.00;
    });

    describe('first move and within playable area', function(){
      it('returns 0:-1', function(){
        var location = ui.acceptablePolyOrigin(poly);
        expect(location.point[0]).to.be.closeTo(200.00, 0.01);
        expect(location.point[1]).to.be.closeTo(294.15, 0.01);
        expect(location.notation).to.be.eq('0:-1');
      });
    });

    describe('not first move', function(){

      beforeEach(function(){
        ui.board.moves.push('dummy_move');
      });

      it('returns nearest acceptable origin', function(){
        var location = ui.acceptablePolyOrigin(poly);
        expect(location.point[0]).to.be.closeTo(200.00, 0.01);
        expect(location.point[1]).to.be.closeTo(240.85, 0.01);
        expect(location.notation).to.be.eq('0:1');
      });
    });
  });

   describe('dragPieceEnd', function(){

    beforeEach(function(){
      ui = new UI(board, {container: 'container', width: 400, height: 600, radius: 25, padding: 5});
      ui.drawPieces();
      poly = ui.pieceLayer.children[0];
      poly.attrs.x = 199.00;
      poly.attrs.y = 230.00;
      ui.dragPieceEnd({target: poly})
    });

    it('moves notation through board queue', function(){
      expect(ui.board.moves.length).to.be.eq(1)
    });

  });
   
});