const path = require('path');
const Wrapper = require('./es6-node-wrapper');

module.exports = {
  entry: {
    'binary-structures': './node_modules/binary-structures/dist/index.js',
    'improved-map': './node_modules/improved-map/dist/improved-map.js'
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
      debug: true,
      // set_global: true
    })
  ]
};