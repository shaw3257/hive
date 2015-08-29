var angular = require('angular');
var UI = require('./board-ui');

angular.module('hive').directive('board', function(){
  
  return {

    restrict: 'A',

    scope: {
      hive: '=board'
    },

    template: 
    '<div class="board-container">' +
      '<div id="board-oppenent-line" class="player-line">{{hive.usernameOpponent}}</div>' +
      '<div id="board-canvas"></div>' +
      '<div id="board-me-line" class="player-line" ng-show="hive.ready">{{hive.username}} (Me) </div>' +
    '</div>',

    link: function($scope, element, attrs){

      $scope.$watch('hive', function(hive){

        if(!hive) return;

        element.find('board-canvas').empty();

        hive.on('ready', function(board){
          var ui = new UI(board, {
            container: 'board-canvas',
            colCnt: 1,
            rowCnt: 6,
            radius: 32,
            padding: 5,
            color: hive.color
          });
          $scope.$applyAsync();
        });

        hive.on('move', function(board){
          $scope.$applyAsync();
        });

        hive.on('resignation', function(results){
          $scope.$applyAsync(function(){
            alert('Game over, ' + results.winner + ' wins by resignation!');
          });
        });

        hive.on('gameover', function(results){
          $scope.$applyAsync(function(){
            alert('Game over, ' + results.winner + ' wins!');
            hive.disconnect();
          });
        });

        hive.connect();

      });
    }
  }
});
