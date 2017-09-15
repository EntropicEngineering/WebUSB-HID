"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;

class ES6_Node_Wrapper {
  constructor(options) {
    if (arguments.length > 1) {
      throw Error("ES6 Node Wrapper only takes one argument, an options object")
    }
    this.options = options || {};
    this.set_global = options.set_global === true;
    this.debug = options.debug === true;
  }

  wrapper(file, name, code) {
    // From https://github.com/backspaces/asx/blob/master/bin/wraplibplus.js
    // via https://medium.com/@backspaces/es6-modules-part-2-libs-wrap-em-up-8715e116d690

    const errMsg = `wrapper failed, file: ${file} name: ${name}`;

    const debugCode = this.debug
      ? `console.log('wraplib ${file} ${name}', {self, window, module, returnVal});`
      : '';
    const inWinMsg = `wrapper: window.${name} exists; exporting it.`;

    const prefix = `// Programmatically created by wraplib.js
let result;
const win = window;
if (window.${name}) {
  console.log("${inWinMsg}");
  result = window.${name};
} else {
  const exports = {};
  const module = {};
  const window = {};
  const self = {};
  const useGlobal = ${this.set_global};
  let returnVal;
  function wrap () {
    returnVal =
`;

    const suffix = `;
    if (typeof returnVal === "boolean") returnVal = undefined;
    if (!module.exports && Object.keys(exports).length > 0)
      module.exports = exports;
  }
  wrap.call(self);
  ${debugCode}
  result = self.${name} || window.${name} || module.exports || returnVal;
  if (!result) throw Error("${errMsg}");
  if (useGlobal) win.${name} = result;
}
export default result;
`;

    return new ConcatSource(prefix, code, suffix);
  }

  apply(compiler) {
    const options = this.options;
    const name = this.names;

    compiler.plugin('compilation', (compilation) => {
      compilation.plugin("optimize-chunk-assets", (chunks, callback) => {
        chunks.forEach((chunk) => {
          chunk.files.forEach((file) => {
            compilation.assets[file] = this.wrapper(file, chunk.name, compilation.assets[file]);
          });
        });
        callback();
      });
    });
  }
}

module.exports = ES6_Node_Wrapper;
