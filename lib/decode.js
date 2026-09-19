var spawn = require('child_process').spawn;

/**
 *  ImageMagick 7 renamed `convert` to `magick` and deprecated the old name, so
 *  the binary is overridable rather than hardcoded. Also makes the process
 *  boundary testable without ImageMagick installed.
 */
function binary() {
  return process.env.IM_CONVERT || 'convert';
}

module.exports = function decode(image, opt_dimensions, callback) {
  var knownSize = false;
  var rgba = null;
  var err = '';
  // Only used when knownSize is true
  var totalBytes = 0;
  var finished = false;

  // Two modes available, dynamic sizing of the rgba buffer or statically allocated
  if (Array.isArray(opt_dimensions) && opt_dimensions.length === 2) {
    // Buffer.alloc, not new Buffer: the latter is deprecated, and before Node 8
    // it handed back whatever was already in memory. ImageMagick may write
    // fewer bytes than the caller's dimensions imply, and the remainder is
    // returned to them either way.
    rgba = Buffer.alloc(opt_dimensions[0] * opt_dimensions[1] * 4);
    knownSize = true;
  } else if (typeof opt_dimensions === 'function') {
    callback = opt_dimensions;
  }

  function done(error, result) {
    if (finished) return;
    finished = true;
    callback(error, result);
  }

  // Create an imagemagick process
  var child = spawn(binary(), ['-format', 'rgba', '-depth', '8', '-', 'rgba:-']);

  // Almost always ENOENT because ImageMagick is not installed. Without a
  // listener this is an unhandled 'error' event, which takes the process down
  // rather than reaching the caller.
  child.on('error', function (spawnError) {
    done(spawnError, new Uint8Array(0));
  });

  // The child can exit before its input is written, which makes the write fail
  // with EPIPE. The close or error handler is the one that reports.
  child.stdin.on('error', function () {});

  child.stdout.on('data', function (data) {
    if (knownSize) {
      // copy clamps a write that would overrun and never throws, so the
      // output was right before this too. totalBytes was not: it counted
      // bytes that had been dropped. Bounding both keeps them in agreement.
      var room = rgba.length - totalBytes;
      if (room <= 0) return;
      var take = data.length < room ? data.length : room;
      data.copy(rgba, totalBytes, 0, take);
      totalBytes += take;
    } else {
      rgba = rgba ? Buffer.concat([rgba, data]) : data;
    }
  });

  child.stderr.on('data', function (data) {
    err += data.toString();
  });

  child.on('close', function () {
    done((err === '' ? null : err), new Uint8Array(rgba || []));
  });

  child.stdin.end(image);
};
