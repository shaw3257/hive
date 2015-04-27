var angular = require('angular');
var Hive = require('../../../../lib/hive');

angular.module('hive').controller('gameCtrl', function($scope, userService){

  $scope.newGameAI = function(type){
    console.log('new game happened');
    $scope.hive = new Hive({ 
      username: userService.username
    });
  }

  $scope.resignGame = function(type){
    $scope.hive.resign();
  }

  $scope.newGameRandom = function(type){
    var username = prompt('Please enter your name');
    console.log('new game happened');
    var endpoint = '//' + window.location.hostname + location.port ? (':' + location.port) : ''
    $scope.hive  = new Hive({
      endpoint: endpoint,
      room: 'random',
      username: username
    });
  }

});