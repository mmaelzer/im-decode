var spawn = require('child_process').spawn;

module.exports = function decode(image, opt_dimensions, callback) {
  var knownSize = false;
  var rgba = null;
  var err = '';
  // Only used when knownSize is true
  var totalBytes = 0;


  // Two modes available, dynamic sizing of the rgba buffer or statically allocated
  if (Array.isArray(opt_dimensions) && opt_dimensions.length === 2) {
    rgba = new Buffer(opt_dimensions[0] * opt_dimensions[1] * 4);
    knownSize = true;
  } else if (typeof opt_dimensions === 'function') {
    callback = opt_dimensions;
  }
 
  // Create an imagemagick process
  var child = spawn('convert', ['-format', 'rgba', '-depth', '8', '-', 'rgba:-']);
  
  child.stdout.on('data', function (data) {
    if (knownSize) {
      data.copy(rgba, totalBytes);
      totalBytes += data.length;
    } else {
      rgba = rgba 
        ? Buffer.concat([rgba, data], rgba.length + data.length) 
        : Buffer.concat([data], data.length); 
    }     
  });

  child.stderr.on('data', function (data) {
    err += data.toString();
  });
  
  child.on('close', function (code) {
    callback((err === '' ? null : err), new Uint8Array(rgba || []));
  });
  
  child.stdin.end(image);
}