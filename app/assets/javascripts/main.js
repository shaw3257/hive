var angular = require('angular');
angular.module('hive', []);

require('./user/user-service');
require('./game/game-controller');
require('./game/board/board-directive');
require('./game/board/board-ui');