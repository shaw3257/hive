var Board = require('../../../../lib/board');
var AI = require('../../../../lib/ai');

var board = new Board();
var ai = new AI(board);

onmessage = function(e){
  var notation = e.data;
  if(notation)  {
    console.log('ai-worker.js processing ', notation);
    updateBoard(notation)
  }
  var bestMove = ai.bestMove(2);
  console.log('ai-worker.js has best move being ', bestMove);
  updateBoard(bestMove.notation)
  postMessage(bestMove);
}

updateBoard = function(notation){
  board.queue.push(notation);
  board.processQueue();
}
