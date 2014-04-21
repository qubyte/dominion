var dominion = require('../');
var cluster = require('cluster');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var testEmitter = new EventEmitter();

function FakeServer() {
	'use strict';

	EventEmitter.call(this);
}

util.inherits(FakeServer, EventEmitter);

FakeServer.prototype.close = function () {
	'use strict';

	this.emit('close');
};

// Replace cluster.worker with a mock to check disconnect is called.
cluster.worker = {
	disconnect: function () {
		'use strict';

		testEmitter.emit('disconnect');
	}
};

// [todo] - Commented out code is from when this module didn't work on the master process, and made
//          assumptions about its environment. Now that it does, spoofing disconnect is broken. I
//          have in mind a new module to make testing cluster workers less of a painful experience.
//          If I get around to writing it, I'll write some additional tests to use it.
exports.middleware = {
	'The middleware should catch request errors and close.': function (test) {
		'use strict';

		test.expect(9);

		var fakeServer = new FakeServer();

		dominion.addServer(fakeServer);

		var req = new EventEmitter();

		var res = {
			send: function (code) {
				testEmitter.emit('resCode', code);
			},
			set: function (field, value) {
				test.equal(field, 'Content-Type');
				test.equal(value, 'text/plain');
			}
		};

		var next = function () {
			test.ok(true);
		};

		dominion.middleware(req, res, next);

		dominion.once('shutdown', function (reqObj, resObj, err, sendError) {
			test.equal(reqObj, req);
			test.equal(resObj, res);
			test.equal(err, 'test error');
			test.strictEqual(sendError, undefined);
		});

//		testEmitter.once('disconnect', function () {
//			test.ok(true);
//		});

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
	},

	'The middleware should catch response errors and close.': function (test) {
		'use strict';

		test.expect(9);

		var fakeServer = new FakeServer();

		dominion.addServer(fakeServer);

		var req = {};

		var res = new EventEmitter();

		res.send = function (code) {
			testEmitter.emit('resCode', code);
		};

		res.set = function (field, value) {
			test.equal(field, 'Content-Type');
			test.equal(value, 'text/plain');
		};

		var next = function () {
			test.ok(true);
		};

		dominion.middleware(req, res, next);

		dominion.once('shutdown', function (reqObj, resObj, err, sendError) {
			test.equal(reqObj, req);
			test.equal(resObj, res);
			test.equal(err, 'test error');
			test.strictEqual(sendError, undefined);
		});

//		testEmitter.once('disconnect', function () {
//			test.ok(true);
//		});

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
	},

	'A throw when trying to close should be caught.': function (test) {
		'use strict';

		test.expect(5);

		var req = new EventEmitter();

		// res is missing methods, so an uncaught exception will be thrown.
		var res = {};

		var next = function () {
			test.ok(true);
		};

		dominion.middleware(req, res, next);

		dominion.once('shutdown', function (reqObj, resObj, err, sendError) {
			test.equal(reqObj, req, 1);
			test.equal(resObj, res, 2);
			test.equal(err, 'Error message.', 3);
			test.ok(sendError instanceof Error, 4);
		});

		process.nextTick(function () {
			test.done();
		});

		req.emit('error', 'Error message.');
	}
};

exports.vanilla = {
	'The vanilla handler should catch request errors and close.': function (test) {
		'use strict';

		test.expect(9);

		var fakeServer = new FakeServer();

		dominion.addServer(fakeServer);

		var req = new EventEmitter();

		var res = {
			setHeader: function (field, value) {
				test.equal(field, 'Content-Type');
				test.equal(value, 'text/plain');
			},
			set statusCode(code) {
				test.strictEqual(code, 500);
			},
			get statusCode() { },
			end: function (code) {
				test.strictEqual(code, 'Internal Server Error');
			}
		};

		dominion.vanilla(req, res);

		dominion.once('domainError', function (reqObj, resObj, err) {
			test.equal(reqObj, req);
			test.equal(resObj, res);
			test.equal(err, 'test error');
		});

		dominion.once('shutdown', function (reqObj, resObj, err, sendError) {
			//test.equal(res.statusCode, 500);
			test.equal(reqObj, req);
			test.equal(resObj, res);
			test.equal(err, 'test error');
			test.strictEqual(sendError, undefined);
		});

//		testEmitter.once('disconnect', function () {
//			test.ok(true);
//		});

		fakeServer.once('close', function () {
			test.ok(true);
		});

		req.emit('error', 'test error');

		process.nextTick(function () {
			test.done();
		});
	},

	'The vanilla handler should catch response errors and close.': function (test) {
		'use strict';

		test.expect(8);

		var fakeServer = new FakeServer();

		dominion.addServer(fakeServer);

		var req = {};

		var res = new EventEmitter();

		res.end = function (code) {
			test.strictEqual(code, 'Internal Server Error');
		};

		res.setHeader = function (field, value) {
			test.equal(field, 'Content-Type');
			test.equal(value, 'text/plain');
		};

		dominion.vanilla(req, res);

		dominion.once('shutdown', function (reqObj, resObj, err, sendError) {
			test.equal(reqObj, req);
			test.equal(resObj, res);
			test.equal(err, 'test error');
			test.strictEqual(sendError, undefined);
		});

//		testEmitter.once('disconnect', function () {
//			test.ok(true);
//		});

		fakeServer.once('close', function () {
			test.ok(true);
		});

		res.emit('error', 'test error');

		process.nextTick(function () {
			test.done();
		});
	},

	'A throw when trying to close should be caught.': function (test) {
		'use strict';

		test.expect(4);

		var req = new EventEmitter();

		// res is missing methods, so an uncaught exception will be thrown.
		var res = {};

		dominion.vanilla(req, res);

		dominion.once('shutdown', function (reqObj, resObj, err, sendError) {
			test.equal(reqObj, req, 1);
			test.equal(resObj, res, 2);
			test.equal(err, 'Error message.', 3);
			test.ok(sendError instanceof Error, 4);
		});

		process.nextTick(function () {
			test.done();
		});

		req.emit('error', 'Error message.');
	}
};

