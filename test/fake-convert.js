#!/usr/bin/env node
/**
 * Stands in for ImageMagick so the decode logic can be tested without it.
 * Emits FAKE_BYTES bytes on stdout and FAKE_STDERR on stderr, after draining
 * stdin the way the real binary does.
 */
var count = parseInt(process.env.FAKE_BYTES || '0', 10);
var errText = process.env.FAKE_STDERR || '';

var chunks = [];
process.stdin.on('data', function (c) { chunks.push(c); });
process.stdin.on('end', function () {
  if (errText) process.stderr.write(errText);
  if (count > 0) {
    process.stdout.write(Buffer.alloc(count, 0x41));
  }
  process.stdout.end();
});
