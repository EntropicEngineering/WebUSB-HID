const path = require('path');

module.exports = {
  entry: './src/WebUSB_HID.js',
  output: {
    filename: 'webusb_hid.js',
    path: path.resolve(__dirname, 'dist')
  }
};