const path = require('path');
const Wrapper = require('./es6-node-wrapper');

module.exports = {
  entry: {
    buffer: './node_modules/buffer/index.js',
    binary_parser: './node_modules/binary-parser/lib/binary_parser.js'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader"
      }
    ]
  },
  resolve: {
    extensions: [".js"]
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/wrapped'),
  },
  plugins: [
    new Wrapper({
      debug: true
    })
  ]
};