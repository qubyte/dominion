# dominion

Express domain middleware.

## Usage

Dominion provides both a middleware function and a function to add server instances. Dominion is
slightly atypical in that it requires references to all server instances that a worker is running.

```javascript
var dominion = require('dominion');
var express = require('express');

var app = express();

// Add at the beginning of the middleware chain.
app.use(dominion.middleware);

// Add other middleware and routes...

var server = app.listen(3000, function () {
    console.log('Server listening.');
});

dominion.addServer(server);

// Give dominion a chance to finish its job, but avoid hangs.
dominion.once('shutdown', function () {
    var killtimer = setTimeout(function () {
        process.exit(1);
    }, 5000); 

    killtimer.unref();
});
```

You may add as many servers as you like to dominion.

## Events

Events for logging and shutdown are emitted by dominion. It is assumed that you'll have your own
logging solution.

### `shutdown`

Emitted when the domain inside the middleware catches an error. You should register a listener on
this event to set a timeout to force the process to close if it is hung for whatever reason.

### `domainError`

Emitted when the domain is handling the error. It passes the request, response and error objects
respectively to the event listener for logging.

### `sendError`

If there was an error in the shutdown process in the domain middleware, then this event is
emitted, and passes the request, response and error objects respectively to the listener.
