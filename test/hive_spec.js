var expect = require('chai').expect;
var Hive = require('../lib/hive');
var app = require('../app/server');
var Promise = require('es6-promise').Promise;

describe('Hive', function(){

  var hive_one, hive_two, server, activeHive, passiveHive;

  before(function(done){
    server = app;
    hive_one = new Hive({endpoint: 'http://localhost:3001', room: 'random', username: 'Shawn'});
    hive_two = new Hive({endpoint: 'http://localhost:3001', room: 'random', username: 'Brian'});
    var p1 = new Promise(function(resolve, reject){
      hive_one.on('ready', function(){
        resolve();
      });
    });
    var p2 = new Promise(function(resolve, reject) {
      hive_two.on('ready', function(){
        resolve();
      });
    });

    hive_one.connect();
    hive_two.connect();

    Promise.all([p1, p2]).then(function(){ done() });
  });

  after(function(done){
    hive_one.disconnect();
    hive_two.disconnect();
    server.io.close(done);
  });

  describe('ready',function(){

    it('is connected', function(){
      expect(hive_one.connected).to.be.true
    });

    it('is ready', function(){
      expect(hive_one.ready).to.be.true
    });

    it('has colors set', function(){
      expect([hive_one.color, hive_two.color]).to.have.members(['BLACK', 'WHITE'])
    });

    it('has usernames set', function(){
      expect(hive_one.username).to.be.eq('Shawn');
      expect(hive_two.username).to.be.eq('Brian');
    });
  
  });

  describe('move', function(){
    
    before(function(){
      activeHive = hive_one.color === 'WHITE' ? hive_one : hive_two;
      passiveHive = activeHive === hive_one ? hive_two : hive_one;
      activeHive.board.queue.push('w:p:q_1:0:-1:0');
      activeHive.board.processQueue(true);
    });

    it('updates other board', function(done){
      setTimeout(function(){
        expect(passiveHive.board.moves.length).to.be.eq(1);
        done()
      }, 1000)
    });

  });

});
