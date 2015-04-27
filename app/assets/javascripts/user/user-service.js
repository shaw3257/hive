var angular = require('angular');
var User = function(attrs){
  this.username = attrs.username;
}

angular.module('hive').service('userService', function(){

  return new User({username: Math.random().toString(36).slice(2)});

});