#!/usr/bin/env node
// From https://github.com/backspaces/asx/blob/master/bin/wraplibplus.js
// via https://medium.com/@backspaces/es6-modules-part-2-libs-wrap-em-up-8715e116d690


const fs = require('fs')
const args = process.argv
const file = args[2]
// name default for path/foo.min.js is foo
const name = args[3] || file.replace(/.*\//, '').replace(/\..*/, '')
// let name = args[3]
// if (!name) {
//   name = file.replace(/.*\//, '')
//   name = name.replace(/\..*/, '')
// }
const style = args[4] || 'local' // local or global
const setGlobal = style === 'global'
const debug = true

// const useGlobal = style === 'global'
// const styleCode = style === 'global'
//   ? `window.${name} = result`
//   : ''
const errMsg = `wrapper failed, file: ${file} name: ${name}`

const debugCode = debug
  ? `console.log('wraplib ${file} ${name}', {self, window, module, returnVal})`
  : ''
const inWinMsg = // eslint-disable-line
  `wrapper: window.${name} exists; exporting it.`

const code = fs.readFileSync(file)
const wrapper = `// Programmatically created by wraplib.js
let result
const win = window
if (window.${name}) {
  console.log("${inWinMsg}")
  result = window.${name}
} else {
  const exports = {}
  const module = {}
  const window = {}
  const self = {}
  const useGlobal = ${setGlobal}
  let returnVal
  function wrap () {
    returnVal =
    ${code}
    if (typeof returnVal === "boolean") returnVal = undefined
    if (!module.exports && Object.keys(exports).length > 0)
      module.exports = exports
  }
  wrap.call(self)
  ${debugCode}
  result = self.${name} || window.${name} || module.exports || returnVal
  if (!result) throw Error("${errMsg}")
  if (useGlobal) win.${name} = result
}
export default result
`

process.stdout.write(wrapper)