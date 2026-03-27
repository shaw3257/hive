var expect = global.expect;
var Hive = require('../lib/hive');

process.env.PORT = '0';

var app = require('../app/server');

describe('Hive', function(){

  var hive_one, hive_two, server, activeHive, passiveHive;

  before(async function(){
    server = app;
    var endpoint = 'http://localhost:' + server.address().port;
    hive_one = new Hive({endpoint: endpoint, room: 'random', username: 'Shawn'});
    hive_two = new Hive({endpoint: endpoint, room: 'random', username: 'Brian'});
    var p1 = new Promise(function(resolve){
      hive_one.on('ready', function(){
        resolve();
      });
    });
    var p2 = new Promise(function(resolve) {
      hive_two.on('ready', function(){
        resolve();
      });
    });

    hive_one.connect();
    hive_two.connect();

    await Promise.all([p1, p2]);
  });

  after(async function(){
    hive_one.disconnect();
    hive_two.disconnect();
    await new Promise(function(resolve) {
      server.io.close(resolve);
    });
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

    it('updates other board', async function(){
      await new Promise(function(resolve) {
        setTimeout(resolve, 1000);
      });
      expect(passiveHive.board.moves.length).to.be.eq(1);
    });

  });

});
