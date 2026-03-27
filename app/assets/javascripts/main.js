var Hive = require('../../../lib/hive');
var UI = require('./game/board/board-ui');

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
  element.classList.toggle('is-disabled', disabled);
  element.setAttribute('aria-disabled', disabled ? 'true' : 'false');
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
  setDisabled($('new-game-random'), gameActive);
  setDisabled($('new-game-ai'), gameActive);
  setDisabled($('resign-game'), !currentHive || currentHive.board.isGameover);
}

function updateStatus() {
  var statusText = currentHive ? currentHive.status : 'Play Hive';
  var title = $('status-title');
  var opponent = $('board-opponent-line');
  var me = $('board-me-line');

  title.textContent = statusText;

  if (!currentHive || !currentHive.ready) {
    opponent.hidden = true;
    me.hidden = true;
    opponent.textContent = '';
    me.textContent = '';
    updateControls();
    return;
  }

  opponent.hidden = false;
  me.hidden = false;
  opponent.textContent = currentHive.usernameOpponent || '';
  me.textContent = (currentHive.username || 'You') + ' (Me)';
  updateControls();
}

function resetBoard() {
  $('board-canvas').innerHTML = '';
  currentUI = null;
}

function attachHive(hive) {
  currentHive = hive;
  resetBoard();
  updateStatus();

  hive.on('ready', function(board) {
    resetBoard();
    currentUI = new UI(board, {
      container: 'board-canvas',
      colCnt: 1,
      rowCnt: 6,
      radius: 32,
      padding: 5,
      color: hive.color
    });
    updateStatus();
  });

  hive.on('move', function() {
    updateStatus();
  });

  hive.on('resignation', function(results) {
    updateStatus();
    alert('Game over, ' + results.winner + ' wins by resignation!');
  });

  hive.on('gameover', function(results) {
    alert('Game over, ' + results.winner + ' wins!');
    hive.disconnect();
    updateStatus();
  });

  hive.connect();
}

function startAiGame() {
  disposeHive();
  attachHive(new Hive({ username: 'You' }));
}

function startRandomGame() {
  var username = window.prompt('Please enter your name');
  if (!username) {
    return;
  }

  disposeHive();
  attachHive(new Hive({
    endpoint: window.location.origin,
    room: 'random',
    username: username
  }));
}

function resignGame() {
  if (!currentHive || currentHive.board.isGameover) {
    return;
  }

  currentHive.resign();
}

function bindActions() {
  $('new-game-random').addEventListener('click', function(event) {
    event.preventDefault();
    if (event.currentTarget.classList.contains('is-disabled')) {
      return;
    }
    startRandomGame();
  });

  $('new-game-ai').addEventListener('click', function(event) {
    event.preventDefault();
    if (event.currentTarget.classList.contains('is-disabled')) {
      return;
    }
    startAiGame();
  });

  $('resign-game').addEventListener('click', function(event) {
    event.preventDefault();
    if (event.currentTarget.classList.contains('is-disabled')) {
      return;
    }
    resignGame();
  });
}

document.addEventListener('DOMContentLoaded', function() {
  bindActions();
  updateStatus();
});
