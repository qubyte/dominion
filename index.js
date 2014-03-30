var EventEmitter = require('events').EventEmitter;
var domain = require('domain');
var cluster = require('cluster');

exports = module.exports = new EventEmitter();

var servers = [];

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

exports.addServer = function (server) {
	'use strict';

	servers.push(server);

	server.once('close', function () {
		servers.slice(servers.indexOf(server), 1);
	});
};
