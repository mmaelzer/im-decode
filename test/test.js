var test = require('node:test');
var assert = require('node:assert');
var path = require('node:path');

var decode = require('../index');

var FAKE = path.join(__dirname, 'fake-convert.js');
var IMAGE = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

/** Runs decode with the stub binary configured to emit `bytes` on stdout. */
function run(dimensions, bytes, stderr) {
  process.env.IM_CONVERT = FAKE;
  process.env.FAKE_BYTES = String(bytes);
  if (stderr) process.env.FAKE_STDERR = stderr;
  else delete process.env.FAKE_STDERR;

  return new Promise(function (resolve) {
    var args = dimensions
      ? [IMAGE, dimensions, function (err, out) { resolve({ err: err, out: out }); }]
      : [IMAGE, function (err, out) { resolve({ err: err, out: out }); }];
    decode.apply(null, args);
  });
}

test('reports a missing binary instead of crashing the process', async function () {
  process.env.IM_CONVERT = path.join(__dirname, 'definitely-not-a-binary');
  var result = await new Promise(function (resolve) {
    decode(IMAGE, function (err, out) { resolve({ err: err, out: out }); });
  });

  assert.strictEqual(result.err.code, 'ENOENT');
  assert.strictEqual(result.out.length, 0);
});

test('fills a known-size buffer exactly', async function () {
  // 2x3 pixels at 4 bytes each.
  var result = await run([2, 3], 24);
  assert.strictEqual(result.err, null);
  assert.strictEqual(result.out.length, 24);
  assert.ok(result.out.every(function (b) { return b === 0x41; }), 'all bytes written');
});

/**
 * data.copy clamps a write that would overrun and never throws, so the output
 * was already correct here. What was wrong was totalBytes, which counted bytes
 * that had been dropped. Nothing user-visible depended on it, but it made the
 * variable a lie. This pins the behaviour either way.
 */
test('clamps output that overruns the declared dimensions', async function () {
  var result = await run([2, 3], 100);
  assert.strictEqual(result.err, null);
  assert.strictEqual(result.out.length, 24, 'buffer stays the size the caller asked for');
  assert.ok(result.out.every(function (b) { return b === 0x41; }), 'filled, not truncated early');
});

test('zero-fills a known-size buffer the converter underfills', async function () {
  var result = await run([2, 3], 10);
  assert.strictEqual(result.out.length, 24);
  assert.ok(Array.prototype.slice.call(result.out, 0, 10).every(function (b) { return b === 0x41; }));
  // Buffer.alloc guarantees this; new Buffer did not before Node 8.
  assert.ok(Array.prototype.slice.call(result.out, 10).every(function (b) { return b === 0; }),
    'tail is zeroed, not whatever was in memory');
});

test('grows dynamically when no dimensions are given', async function () {
  var result = await run(null, 40);
  assert.strictEqual(result.err, null);
  assert.strictEqual(result.out.length, 40);
});

test('returns an empty array when the converter emits nothing', async function () {
  var result = await run(null, 0);
  assert.strictEqual(result.out.length, 0);
});

test('passes converter stderr through as the error', async function () {
  var result = await run(null, 0, 'no decode delegate for this image format');
  assert.match(result.err, /no decode delegate/);
});
