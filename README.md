### https://playhive.herokuapp.com/

## About Hive
Hive is a tabletop game designed by John Yianni and published in 2001 by [Gen42 Games](http://gen42.com). It's a two player turn based game where the goal is to completely surround the opposing player's queen bee. Each game piece has different ways of moving around the hexagonal grid -- More information about these movements and game rules can be found here http://www.gen42.com/downloads/rules/Hive_Rules.pdf.

## Development

##### Game Engine - https://github.com/shaw3257/hive/blob/master/lib/board.js
The game engine is written in javascript with no 3rd party dependencies. It’s job is to keep game state and to emit events when moves are validated or processed.

##### AI - https://github.com/shaw3257/hive/blob/master/lib/ai.js
The AI is also written in javascript with no 3rd party dependencies and is an implementation of the minimax algorithm with alpha beta pruning. It runs on the client-side in a separate thread via the Web Worker API.

##### UI - https://github.com/shaw3257/hive/blob/master/app/assets/javascripts/game/board/board-ui.js
The UI uses the Canvas API along with Kinetic.js to render the pieces. The hexagonal grid was constructed with good ol’e fashion trigonometry.

##### Server - https://github.com/shaw3257/hive/blob/master/app/server.js
The hive server runs on Node.js through Socket.io on the Express framework. The decision to use Node.js was to potentially use the game engine on the server-side.

## Develop Locally 

##### Install Deps
``` Shell
npm install
```

##### Run Tests
``` Shell
npm test
```

##### Compile and Watch Assets
``` Shell
grunt && grunt watch
```

##### Run Server
``` Shell
node app/server.js
```

##### View in Browser
``` Shell
open http://localhost:3001
```
