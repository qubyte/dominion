var EventEmitter = require('events').EventEmitter;
var domain = require('domain');
var cluster = require('cluster');

exports = module.exports = new EventEmitter();

var servers = [];


/**
 * Middleware for use with express. Use at the beginning of the middleware stack for the best
 * coverage.
 *
 * @param {Object}   req  Request object.
 * @param {Object}   res  Response object.
 * @param {Function} next Next callback function.
 */

exports.middleware = function (req, res, next) {
	'use strict';

	var d = domain.create();

	d.on('error', function (err) {
		var sendError;

		try {
			servers.slice().forEach(function (server) {
				server.close();
			});

			cluster.worker.disconnect();

			res.set('Content-Type', 'text/plain');
			res.send(500, 'Internal Server Error');
		} catch (error) {
			sendError = error;
		} finally {
			exports.emit('shutdown', req, res, err, sendError);
		}
	});

	d.add(req);
	d.add(res);

	next();
};


/**
 * A function for use with general HTTP server request events. Use at the beginning of the request
 * handler for the best coverage with.
 *
 * @param {Object} req  Request object.
 * @param {Object} res  Response object.
 */

exports.vanilla = function (req, res) {
	/* jshint camelcase: false */

	'use strict';

	var d = domain.create();

	d.on('error', function (err) {
		var sendError;

		try {
			servers.slice().forEach(function (server) {
				server.close();
			});

			cluster.worker.disconnect();

			res.setHeader('Content-Type', 'text/plain');
			res.statusCode = 500;
			res.end('Internal Server Error');
		} catch (error) {
			sendError = error;
		} finally {
			exports.emit('shutdown', req, res, err, sendError);
		}
	});

	d.add(req);
	d.add(res);
};


/**
 * Adds server objects to the dominion register. If dominion.middleware receives an error then all
 * servers registered with this function will be closed.
 *
 * @param {Object} server An HTTP server object.
 */

exports.addServer = function (server) {
	'use strict';

	// Add the server to the register.
	servers.push(server);

	// If the server closes for any reason, remove it from the register.
	server.once('close', function () {
		servers.slice(servers.indexOf(server), 1);
	});
};
