im-decode
=========
  
A node.js library that leverages [ImageMagick](http://www.imagemagick.org) to turn images into RGBA arrays (Uint8Arrays).
  
  
## Install

```
npm install im-decode
```  
  
`im-decode` requires ImageMagick CLI tools to be installed. There's plenty of ways to install ImageMagick, choose what's right for you.

## Usage

```javascript
var decode = require('im-decode');
decode(imageBuffer, function(err, rgbaArray) {
  // do something
});
```

### decode(image, [dimensions], callback)
* image `Buffer`
* dimensions (optional) `Array` of dimensions in the form [w, h], i.e. [640, 480]
* callback `Function(Error, Uint8Array)`  

Returns a `Uint8Array` when provided an image as a `Buffer`. Passing in a dimensions `Array` is optional, but will provide a slight speed improvement (~7% speed increase for 640x480 images was seen in testing). The speed improvement is due to the nature of knowing the size of the end result `Buffer` vs continually creating new `Buffers` of ever increasing size. At least that's my assumption without diving into it any deeper.