import resolve from 'rollup-plugin-node-resolve';

export default {
  input: './dist/simpleHID.js',
  output: [{
    file: './dist/bundle.js',
    format: 'es'
  }],
  sourcemap: true,
  interop: false,
  plugins: [
    resolve()
  ]
};