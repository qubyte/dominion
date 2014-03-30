var dominion = require('../');
var cluster = require('cluster');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var testEmitter = new EventEmitter();

// Replace cluster.worker with a mock to check disconnect is called.
cluster.worker = {
	disconnect: function () {
		'use strict';

		testEmitter.emit('disconnect');
	}
};

function FakeServer() {
	'use strict';

	EventEmitter.call(this);
}

util.inherits(FakeServer, EventEmitter);

FakeServer.prototype.close = function () {
	'use strict';

	this.emit('close');
};


exports['The middleware should catch request errors and disconnect.'] = function (test) {
	'use strict';

	test.expect(8);

	var fakeServer = new FakeServer();

	dominion.addServer(fakeServer);

	var req = new EventEmitter();

	var res = {
		send: function (code) {
			testEmitter.emit('resCode', code);
		}
	};

	var next = function () {
		test.ok(true);
	};

	dominion.middleware(req, res, next);

	dominion.once('domainError', function (reqObj, resObj, err) {
		test.equal(reqObj, req);
		test.equal(resObj, res);
		test.equal(err, 'test error');
	});

	dominion.once('shutdown', function () {
		test.ok(true);
	});

	testEmitter.once('disconnect', function () {
		test.ok(true);
	});

	testEmitter.once('resCode', function (code) {
		test.strictEqual(code, 500);
	});

	fakeServer.once('close', function () {
		test.ok(true);
	});

	req.emit('error', 'test error');

	process.nextTick(function () {
		test.done();
	});
};

exports['The middleware should catch response errors and disconnect.'] = function (test) {
	'use strict';

	test.expect(8);

	var fakeServer = new FakeServer();

	dominion.addServer(fakeServer);

	var req = {};

	var res = new EventEmitter();

	res.send = function (code) {
		testEmitter.emit('resCode', code);
	};

	var next = function () {
		test.ok(true);
	};

	dominion.middleware(req, res, next);

	dominion.once('domainError', function (reqObj, resObj, err) {
		test.equal(reqObj, req);
		test.equal(resObj, res);
		test.equal(err, 'test error');
	});

	dominion.once('shutdown', function () {
		test.ok(true);
	});

	testEmitter.once('disconnect', function () {
		test.ok(true);
	});

	testEmitter.once('resCode', function (code) {
		test.strictEqual(code, 500);
	});

	fakeServer.once('close', function () {
		test.ok(true);
	});

	res.emit('error', 'test error');

	process.nextTick(function () {
		test.done();
	});
};

exports['A throw when trying to close should be caught.'] = function (test) {
	'use strict';

	test.expect(5);

	// When the middleware tries to call cluster.worker.disconnect, it will throw a type error.
	cluster.worker = null;

	var req = new EventEmitter();
	var res = {};
	var next = function () {
		test.ok(true);
	};

	dominion.middleware(req, res, next);

	dominion.once('sendError', function (reqObj, resObj, err) {
		test.equal(reqObj, req);
		test.equal(resObj, res);
		test.ok(err instanceof TypeError);
	});

	dominion.once('shutdown', function () {
		test.ok(true);
	});

	process.nextTick(function () {
		test.done();
	});

	req.emit('error', 'Error message');
};
