# dominion

[![Coverage Status](http://img.shields.io/coveralls/qubyte/dominion.svg)](https://coveralls.io/r/qubyte/dominion?branch=master)
[![Build Status](http://img.shields.io/travis/qubyte/dominion/master.svg)](https://travis-ci.org/qubyte/dominion)

[![npm](http://img.shields.io/npm/v/dominion.svg)](https://npmjs.org/dominion)
[![npm](http://img.shields.io/github/release/qubyte/dominion.svg)](https://github.com/qubyte/dominion/releases)

Domain middleware for Express and vanilla Node.js. Dominion has no production dependencies.

Dominion will attempt to gracefully close all servers registered with it when any requests using
the domain middleware throw an otherwise uncaught exception.

## Usage

Dominion provides both a middleware function and a function to add server instances. Dominion is
slightly atypical in that it requires references to all server instances that a worker is running.
This middleware must only be used on cluster worker processes. Cluster and domain are two sides of
the same coin, so this should be no surprise.

```javascript
var dominion = require('dominion');
var express = require('express');

var app = express();

// Add at the beginning of the middleware chain.
app.use(dominion.middleware);

// Add other middleware and routes...

// The server object is returned from `app.listen`.
var server = app.listen(3000, function () {
    console.log('Server listening.');
});

// Register the server object with dominion. This is required!
dominion.addServer(server);

// Give dominion a chance to finish its job, but avoid hangs.
dominion.once('shutdown', function () {
    var killtimer = setTimeout(function () {
        process.exit(1);
    }, 5000);

    killtimer.unref();
});
```

To use with vanilla Node HTTP servers, you can spoof the `vanilla` method:

```javascript
var http = require('http');
var dominion = require('dominion');

// Give dominion a chance to finish its job, but avoid hangs.
dominion.once('shutdown', function () {
    var killtimer = setTimeout(function () {
        process.exit(1);
    }, 5000);

    killtimer.unref();
});


// Create a server.
var server = http.createServer(function (req, res) {
    'use strict';

    dominion.vanilla(req, res);

    // Other handler logic...
});

// Register the server with dominion.
dominion.addServer(server);

server.listen(3000);
```

You should register all servers with dominion. If any exceptions are generated by a request or a
response, then all registered servers are closed to stop new incoming connections. You should
register a listener on the `'shutdown'` event to for the server to close after some time, in case
the server hangs.

## Methods

### `dominion.middleware(req, res, next)`

This is a traditional express middleware. If an error is caught by the domain, then it attempts to
send a 500 response and close all registered servers.

### `dominion.vanilla(req, res)`

This behaves much like the middleware, but is intended for use with vanilla Node HTTP servers.
Place at the top of your response handler.

### `dominion.addServer(server)`

Add the HTTP server object to the dominion module. All registered servers will be closed if dominion
intercepts an error. Since dominion will shut down all servers before quitting the worker process,
all should be registered.

## Events

Events for logging and shutdown are emitted by dominion. It is assumed that you'll have your own
logging solution.

### `shutdown`: `(request, response, error, sendError)`

Emitted when the domain inside the middleware catches an error. You should register a listener on
this event to set a timeout to force the process to close if it is hung for whatever reason.
Listeners will receive the arguments:

 - `request` - The request object.
 - `response` - The response object.
 - `error` - The error caught by the domain middleware.
 - `sendError` - This will be defined only if an error occurs when trying to send a response.
