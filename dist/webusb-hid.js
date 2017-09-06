(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("binary-parser"));
	else if(typeof define === 'function' && define.amd)
		define(["binary-parser"], factory);
	else if(typeof exports === 'object')
		exports["webUSB_HID"] = factory(require("binary-parser"));
	else
		root["webUSB_HID"] = factory(root["_"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (immutable) */ __webpack_exports__["connect"] = connect;
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_binary_parser__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_binary_parser___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_binary_parser__);
/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */



/* Utility Functions */
function hex(buffer) {
  Array.from(new Uint8Array(buffer), arg => "0x" + arg.toString(16).padStart(2, "0")).join(", ")
}

let version = new __WEBPACK_IMPORTED_MODULE_0_binary_parser___default.a()
  .endianness('little')
  .uint8('major')
  .bit4('minor')
  .bit4('patch');

function decode_BCD(bcd_word) {
  let major = Math.floor(bcd_word / 256);
  let minor = Math.floor((bcd_word % 256) / 16);
  let patch = (bcd_word % 256) % 16;
  return [major, minor, patch];
}

async function connect(...filters) {
  if (filters.length === 0) {
    filters = [{vendorId: 0x03eb}]
  }

  let device = await navigator.usb.requestDevice({filters});

  await device.open();
  if (device.configuration === null)
    await device.selectConfiguration(0);
  await device.claimInterface(0);

  return device;
}

const HID_Class_Descriptors = {
  HID: 0x21,
  Report: 0x22,
  Physical: 0x23,
};

async function get_HID_class_descriptor(device, type, index, length, interface_id = 0) {
  /* TODO: Error handling */
  let result = await device.controlTransferIn({
    requestType: "standard",
    recipient: "interface",
    request: /* GET_DESCRIPTOR */ 0x06,
    value: type * 256 + index,
    index: interface_id
  }, length);
  return result.data;
}

async function get_HID_descriptor(device, interface_id = 0) {
  let length = 9;
  let data = await get_HID_class_descriptor(device, HID_Class_Descriptors.HID, 0, min_length, interface_id);

  let returned_length = data.getUint8(0);

  if (length < returned_length) {  /* Unlikely, but possible to have additional descriptors. */
    length = returned_length;
    data = await get_HID_class_descriptor(device, HID_Class_Descriptors.HID, 0, length, interface_id);
  }

  if (data.byteLength < length) {
    throw Error("Invalid HID descriptor length: " + hex(data.buffer));
  }

  return data;
}

function parse_HID_descriptor(data_view) {
  const descriptor = {
    length: null,
    type: null,
    version: [null, null, null],
    country_code: null,
    count: null,
    descriptors: []
  };
  descriptor.length = data_view.getUint8(0);
  descriptor.type = data_view.getUint8(1);
  if (descriptor.type !== HID_Class_Descriptors.HID) {
    throw Error("Invalid HID bDescriptorType at byte 1: " + hex(data.buffer));
  }
  descriptor.version = decode_BCD(data_view.getUint16(2, true));
  descriptor.country_code = data_view.getUint8(4);
  /* TODO: Care about country code */
  descriptor.count = data_view.getUint8(5);
  let offset = 6;
  while (offset < descriptor.length) {
    let type = data_view.getUint8(offset);
    if (!(type in HID_Class_Descriptors)) {
      throw Error("Invalid HID bDescriptorType at byte `{offset}`: " + hex(data.buffer));
    }
    let length = data_view.getUint16(offset + 1, true);
    descriptor.descriptors.push([])
  }
  return descriptor;
}


/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ })
/******/ ]);
});
//# sourceMappingURL=webusb-hid.js.map