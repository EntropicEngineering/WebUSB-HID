(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("buffer"), require("binary-parser"));
	else if(typeof define === 'function' && define.amd)
		define(["buffer", "binary-parser"], factory);
	else if(typeof exports === 'object')
		exports["webUSB_HID"] = factory(require("buffer"), require("binary-parser"));
	else
		root["webUSB_HID"] = factory(root["_"], root["_"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__, __WEBPACK_EXTERNAL_MODULE_2__) {
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
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_buffer__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_buffer___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_buffer__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_binary_parser__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_binary_parser___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_binary_parser__);
/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};


function hex(buffer) {
    Array.from(new Uint8Array(buffer), arg => "0x" + arg.toString(16).padStart(2, "0")).join(", ");
}
class USBError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'USBError';
        this.status = status;
    }
}
var HID_Class_Descriptors;
(function (HID_Class_Descriptors) {
    HID_Class_Descriptors[HID_Class_Descriptors["HID"] = 33] = "HID";
    HID_Class_Descriptors[HID_Class_Descriptors["Report"] = 34] = "Report";
    HID_Class_Descriptors[HID_Class_Descriptors["Physical"] = 35] = "Physical";
})(HID_Class_Descriptors || (HID_Class_Descriptors = {}));
function connect(...filters) {
    return __awaiter(this, void 0, void 0, function* () {
        if (filters.length === 0) {
            filters = [{ vendorId: 0x03eb }];
        }
        let device = yield navigator.usb.requestDevice({ filters });
        yield device.open();
        if (device.configuration === null)
            yield device.selectConfiguration(0);
        yield device.claimInterface(0);
        return device;
    });
}
function get_HID_class_descriptor(device, type, index, length, interface_id = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = yield device.controlTransferIn({
            requestType: WebUSB.USBRequestType.standard,
            recipient: WebUSB.USBRecipient.interface,
            request: /* GET_DESCRIPTOR */ 0x06,
            value: type * 256 + index,
            index: interface_id
        }, length);
        if (result.status !== WebUSB.USBTransferStatus.ok) {
            throw new USBError("HID descriptor transfer failed.", result.status);
        }
        else {
            return result.data;
        }
    });
}
function get_HID_descriptor(device, interface_id = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        let length = 9;
        let data = yield get_HID_class_descriptor(device, HID_Class_Descriptors.HID, 0, length, interface_id);
        let returned_length = data.getUint8(0);
        if (length < returned_length) {
            length = returned_length;
            data = yield get_HID_class_descriptor(device, HID_Class_Descriptors.HID, 0, length, interface_id);
        }
        if (data.byteLength < length) {
            throw new USBError("Invalid HID descriptor length: " + hex(data.buffer), WebUSB.USBTransferStatus.ok);
        }
        return data;
    });
}
let BCD_version = new __WEBPACK_IMPORTED_MODULE_1_binary_parser___default.a()
    .endianness(__WEBPACK_IMPORTED_MODULE_1_binary_parser___default.a.Endianness.little)
    .uint8('major')
    .bit4('minor')
    .bit4('patch');
function version(data_view) {
    return BCD_version.parse(__WEBPACK_IMPORTED_MODULE_0_buffer___default.a.from(data_view.buffer));
}
function decode_BCD(bcd_word) {
    let major = Math.floor(bcd_word / 256);
    let minor = Math.floor((bcd_word % 256) / 16);
    let patch = (bcd_word % 256) % 16;
    return [major, minor, patch];
}
let HID_descriptor = new __WEBPACK_IMPORTED_MODULE_1_binary_parser___default.a()
    .endianess(__WEBPACK_IMPORTED_MODULE_1_binary_parser___default.a.Endianness.little)
    .uint8('length')
    .uint8('type', { assert: HID_Class_Descriptors.HID })
    .nest('version', { type: BCD_version })
    .uint8('country_code')
    .uint8('count', { assert: (count) => (count > 0) })
    .array('descriptors', {
    type: new __WEBPACK_IMPORTED_MODULE_1_binary_parser___default.a()
        .endianess(__WEBPACK_IMPORTED_MODULE_1_binary_parser___default.a.Endianness.little)
        .uint8('type', { formatter: (type) => HID_Class_Descriptors[type] })
        .uint16('size'),
    length: (parsed) => parsed.count
})
    .array('extra', {
    type: 'uint8',
    readUntil: 'eof',
    assert: (array) => (array.length === 0)
});
// function parse_HID_descriptor(data_view: DataView) {
//     const descriptor: {
//         length: number | null,
//         type: number | null,
//         version: Array<number | null>,
//         country_code: number | null,
//         count: number | null,
//         descriptors: []
//     } = {
//         length: null,
//         type: null,
//         version: [null, null, null],
//         country_code: null,
//         count: null,
//         descriptors: []
//     };
//     descriptor.length = data_view.getUint8(0);
//     descriptor.type = data_view.getUint8(1);
//     if (descriptor.type !== HID_Class_Descriptors.HID) {
//         throw Error("Invalid HID bDescriptorType at byte 1: " + hex(data_view.buffer));
//     }
//     descriptor.version = decode_BCD(data_view.getUint16(2, true));
//     descriptor.country_code = data_view.getUint8(4);
//     /* TODO: Care about country code */
//     descriptor.count = data_view.getUint8(5);
//     let offset = 6;
//     while (offset < descriptor.length) {
//         try {
//             let type = HID_Class_Descriptors[data_view.getUint8(offset)];
//         } catch(e) {
//             throw Error("Invalid HID bDescriptorType at byte `{offset}`: " + hex(data_view.buffer));
//         }
//         let length = data_view.getUint16(offset + 1, true);
//         descriptor.descriptors.push([])
//     }
//     return descriptor;
// }


/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE_2__;

/***/ })
/******/ ]);
});
//# sourceMappingURL=webusb_hid.js.map