const path = require('path');

module.exports = {
  entry: './src/webUSB_HID.ts',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'awesome-typescript-loader',
        exclude: /node_modules/
      },
      {
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader"
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  output: {
    filename: 'webusb_hid.js',
    path: path.resolve(__dirname, 'dist'),
    library: "webUSB_HID",
    libraryTarget: "umd"
  },
  externals: {
    "binary-parser": {
      commonjs: "binary-parser",
      commonjs2: "binary-parser",
      amd: "binary-parser",
      root: "_"
    },
    "buffer": {
      commonjs: "buffer",
      commonjs2: "buffer",
      amd: "buffer",
      root: "_"
    }
  }
};