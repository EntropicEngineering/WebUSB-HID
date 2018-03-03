import resolve from 'rollup-plugin-node-resolve';

export default {
  input: './dist/simpleHID.js',
  output: [{
    format: 'es',
    file: './dist/bundle.js',
    sourcemap: true,
    interop: false,
  }],
  plugins: [
    resolve()
  ]
};