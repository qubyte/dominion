var EventEmitter = require('events').EventEmitter;
var domain = require('domain');
var cluster = require('cluster');

exports = module.exports = new EventEmitter();

var servers = [];


/**
 * Middleware for use with express or general HTTP server request events. Use at the beginning of
 * the middleware stack for the best coverage with Express. or at the top of your request event
 * handler for vanilla Node HTTP servers.
 *
 * @param {Object}   req  Request object.
 * @param {Object}   res  Response object.
 * @param {Function} next Next callback function.
 */

exports.middleware = function (req, res, next) {
	'use strict';

	var d = domain.create();

	d.on('error', function (err) {
		exports.emit('shutdown');

		try {
			exports.emit('domainError', req, res, err);

			servers.slice().forEach(function (server) {
				server.close();
			});

			cluster.worker.disconnect();

			res.send(500);
		} catch (err) {
			exports.emit('sendError', req, res, err);
		}
	});

	d.add(req);
	d.add(res);

	next();
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
