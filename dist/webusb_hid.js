/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */
/* Typescript imports. Comment out in generated js file. */
/// <reference path="../typings/binary_parser.d.ts"/>
/// <reference path="../typings/buffer.d.ts"/>
// import Parser from 'binary-parser';
// import Buffer from 'buffer';
// import * as HID from './HID_data';
// import * as USB from './USB_data';
// import { HID_descriptor, item, languages_string_descriptor, string_descriptor } from './parsers';
// /* Browser imports. Uncomment in generated js file. */
import _Parser from './wrapped/binary_parser.js';   let Parser = _Parser.Parser;
import _Buffer from './wrapped/buffer.js';  let Buffer = _Buffer.Buffer;
import {HID_descriptor, item, languages_string_descriptor, string_descriptor} from './parsers.js';
/* binary-parser expects Buffer global object. */
window.Buffer = Buffer;
/*************
 * Utilities *
 *************/
Map.assign = function (target, ...sources) {
    for (const source of sources) {
        for (const [key, value] of source) {
            target.set(key, value);
        }
    }
    return target;
};
Map.prototype.update = function (...sources) {
    return Map.assign(this, ...sources);
};
function hex(value) {
    return "0x" + value.toString(16).padStart(2, "0");
}
function hex_buffer(buffer) {
    return Array.from(new Uint8Array(buffer), hex).join(", ");
}
class USBError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'USBTransferError';
        this.status = status;
    }
}
/******************
 * Default Export *
 ******************/
export default class Device {
    constructor(...filters) {
        this._interface_id = 0;
        this._configuration_id = 1;
        this.webusb_device = undefined;
        this._HID_descriptors = [];
        this._report_descriptors = [];
        this._physical_descriptors = [];
        this._reports = [];
        this._report_names = [];
        this._string_descriptors = [];
        this._filters = filters;
    }
    verify_connection() {
        if (this.webusb_device === undefined) {
            throw Error("Not connected to a device.");
        }
    }
    static verify_transfer(result) {
        if (result.status !== "ok" /* ok */) {
            throw new USBError("HID descriptor transfer failed.", result.status);
        }
        else {
            return result.data;
        }
    }
    get_report_id(report, report_type) {
        if (report === null || report === undefined) {
            return 0;
        }
        else if (typeof report === "number" && this._reports[this._interface_id].has(report)) {
            return report;
        }
        else if (typeof report === "string" && this._report_names[this._interface_id].get(report_type).has(report)) {
            return this._report_names[this._interface_id].get(report_type).get(report);
        }
        else {
            throw new Error("Invalid report: " + report);
        }
    }
    async get_string_descriptor(index, language_id = undefined) {
        this.verify_connection();
        if (index < 0) {
            throw new Error("Invalid string descriptor index");
        }
        if (this._string_descriptors[this._interface_id] === undefined) {
            this._string_descriptors[this._interface_id] = [];
            await this.get_string_descriptor(0, 0);
        }
        if (this._string_descriptors[this._interface_id][index] !== undefined) {
            return this._string_descriptors[this._interface_id][index];
        }
        if (index !== 0 && language_id !== undefined && !(this._string_descriptors[this._interface_id][0].includes(language_id))) {
            throw new Error("Unsupported language id: " + hex(language_id));
        }
        if (index !== 0 && language_id === undefined) {
            language_id = this._string_descriptors[this._interface_id][0 /* String Descriptor index */][0 /* First LANGID */];
        }
        let data = Device.verify_transfer(await this.webusb_device.controlTransferIn({
            requestType: "standard" /* standard */,
            recipient: "device" /* device */,
            request: 6 /* GET_DESCRIPTOR */,
            value: 3 /* STRING */ * 256 + index,
            index: language_id,
        }, 255));
        let result;
        if (index === 0) {
            result = languages_string_descriptor.parse(Buffer.from(data.buffer)).LANGID;
        }
        else {
            result = string_descriptor.parse(Buffer.from(data.buffer)).string;
        }
        this._string_descriptors[this._interface_id][index] = result;
        return result;
    }
    async get_HID_descriptor() {
        this.verify_connection();
        if (this.HID_descriptor === undefined) {
            let length = 9;
            let data = await Device.get_HID_class_descriptor(this.webusb_device, 33 /* HID */, 0, length, this._interface_id, 6 /* GET */);
            let returned_length = data.getUint8(0);
            if (length < returned_length) {
                length = returned_length;
                data = await Device.get_HID_class_descriptor(this.webusb_device, 33 /* HID */, 0, length, this._interface_id, 6 /* GET */);
            }
            if (data.byteLength < length) {
                throw new USBError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok" /* ok */);
            }
            this._HID_descriptors[this._interface_id] = this.HID_descriptor_parser(length).parse(Buffer.from(data.buffer));
        }
        return this.HID_descriptor;
    }
    async get_report_descriptor() {
        this.verify_connection();
        if (this.report_descriptor === undefined) {
            if (this.HID_descriptor === undefined) {
                await this.get_HID_descriptor();
            }
            /* Get Report descriptor from HID descriptor */
            let reports = this.HID_descriptor.descriptors
                .filter(({ type, size }) => type === 34 /* Report */);
            if (reports.length > 1) {
                throw new USBError("Multiple Report descriptors specified in HID descriptor.", "ok" /* ok */);
            }
            else if (reports.length === 0) {
                throw new USBError("Report descriptor missing from HID descriptor.", "ok" /* ok */);
            }
            let length = reports[0].size;
            let data = await Device.get_HID_class_descriptor(this.webusb_device, 34 /* Report */, 0, length, this._interface_id, 6 /* GET */);
            if (data.byteLength !== length) {
                throw new USBError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok" /* ok */);
            }
            this._report_descriptors[this._interface_id] = this.report_descriptor_parser(length).parse(Buffer.from(data.buffer));
        }
        return this.report_descriptor;
    }
    async get_physical_descriptor(index, length = undefined) {
        this.verify_connection();
        if (this.physical_descriptor === undefined) {
            this._physical_descriptors[this._interface_id] = [];
        }
        if (this.physical_descriptor[index] === undefined) {
            if (this.HID_descriptor === undefined) {
                await this.get_HID_descriptor();
            }
            let descriptors = this.HID_descriptor.descriptors
                .filter(({ type, size }) => type === 35 /* Physical */);
            if (descriptors.length > 1) {
                throw new USBError("Multiple Physical descriptors specified in HID descriptor.", "ok" /* ok */);
            }
            else if (descriptors.length === 0) {
                throw new USBError("Physical descriptor not present in HID descriptor.", "ok" /* ok */);
            }
            if (index === 0) {
                length = descriptors[0].size;
            }
            else if (length === undefined) {
                throw new Error("Undefined Physical descriptor length.");
            }
            let data = await Device.get_HID_class_descriptor(this.webusb_device, 35 /* Physical */, index, length, this._interface_id, 6 /* GET */);
            if (data.byteLength !== length) {
                throw new USBError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok" /* ok */);
            }
            this.physical_descriptor[index] = this.physical_descriptor_parser(length).parse(Buffer.from(data.buffer));
        }
        return this.physical_descriptor[index];
    }
    async build_reports() {
        if (this.report_descriptor === undefined) {
            await this.get_report_descriptor();
        }
        if (this.reports === undefined) {
            const reports = new Map();
            const named_reports = new Map([
                [1 /* Input */, new Map()],
                [2 /* Output */, new Map()],
                [3 /* Feature */, new Map()],
            ]);
            const global_stack = [];
            let empty_local_state = () => new Map([['usage_stack', []], ['string_stack', []], ['designator_stack', []]]);
            let delimiter_stack = [];
            let delimited = false;
            const state = new Map([
                [1 /* Global */, new Map()],
                [2 /* Local */, empty_local_state()],
                [0 /* Main */, new Map()],
            ]);
            function add_raw_tags(item) {
                /* Strips 'type', 'tag', and 'size' from item, then adds whatever is left to the correct state table */
                state.get(item.type).update(Object.entries(item).slice(3));
            }
            const data_field_main_item_types = [8 /* Input */, 9 /* Output */, 11 /* Feature */];
            for (const item of this.report_descriptor.items) {
                switch (item.type) {
                    case 1 /* Global */:
                        switch (item.tag) {
                            case 0 /* Usage_Page */:
                            case 1 /* Logical_Minimum */:
                            case 2 /* Logical_Maximum */:
                            case 3 /* Physical_Minimum */:
                            case 4 /* Physical_Maximum */:
                            case 6 /* Unit */:
                            case 5 /* Unit_Exponent */:
                            case 7 /* Report_Size */:
                            case 8 /* Report_ID */:
                            case 9 /* Report_Count */:
                                add_raw_tags(item);
                                break;
                            case 10 /* Push */:
                                global_stack.push(new Map(state.get(1 /* Global */).entries()));
                                break;
                            case 11 /* Pop */:
                                let g = state.get(1 /* Global */);
                                let s = global_stack.pop() || new Map();
                                g.clear();
                                g.update(s);
                                break;
                        }
                        break;
                    case 2 /* Local */:
                        switch (item.tag) {
                            case 0 /* Usage */:
                                state.get(2 /* Local */).get('usage_stack').push(new Map(Object.entries(item).slice(3)));
                                break;
                            case 3 /* Designator_Index */:
                                state.get(2 /* Local */).get('designator_stack').push(new Map(Object.entries(item).slice(3)));
                                break;
                            case 1 /* Usage_Minimum */:
                            case 2 /* Usage_Maximum */:
                            case 4 /* Designator_Minimum */:
                            case 5 /* Designator_Maximum */:
                            case 8 /* String_Minimum */:
                            case 9 /* String_Maximum */:
                                add_raw_tags(item);
                                break;
                            case 7 /* String_Index */:
                                state.get(2 /* Local */).get('string_stack').push(this.get_string_descriptor(item.string_index));
                                break;
                            case 10 /* Delimiter */:
                                let delimiter = item.delimiter;
                                if (delimiter === 1 && !delimited) {
                                    delimited = true;
                                }
                                else if (delimiter === 0 && delimited) {
                                    delimiter_stack.push(state.get(2 /* Local */));
                                    state.set(2 /* Local */, empty_local_state());
                                    delimited = false;
                                } // Ignore other delimiter tags because they don't make sense.
                                break;
                        }
                        break;
                    case 0 /* Main */:
                        switch (item.tag) {
                            case 10 /* Collection */:
                                break;
                            case 12 /* End_Collection */:
                                break;
                            case 8 /* Input */:
                                break;
                            case 9 /* Output */:
                                break;
                            case 11 /* Feature */:
                                break;
                        }
                        break;
                }
            }
            this._reports[this._interface_id] = reports;
            this._report_names[this._interface_id] = named_reports;
        }
        return this.reports;
    }
    /**************************
     * External Parser Access *
     **************************/
    /* Overwrite to use different parsers. */
    HID_descriptor_parser(length) {
        return HID_descriptor;
    }
    report_descriptor_parser(length) {
        return new Parser()
            .array('items', {
            type: item,
            lengthInBytes: length
        });
    }
    /* Interpreting Physical Descriptor left as an exercise for the reader. */
    physical_descriptor_parser(length) {
        return new Parser()
            .array('bytes', {
            type: 'uint8',
            lengthInBytes: length
        });
    }
    /***************************
     * Public Attribute Access *
     ***************************/
    get interface_id() {
        return this._interface_id;
    }
    async set_interface_id(id) {
        this._interface_id = id;
        if (this.webusb_device === undefined) {
            /* Not connected, nothing to do */
            return;
        }
        await this.webusb_device.claimInterface(id);
        await this.build_reports();
    }
    get configuration_id() {
        return this._configuration_id;
    }
    async set_configuration_id(id) {
        throw Error("Not Implemented");
    }
    /* Getters cannot dynamic generate missing descriptors/reports because they're inherently synchronous. */
    get HID_descriptor() {
        return this._HID_descriptors[this._interface_id];
    }
    get report_descriptor() {
        return this._report_descriptors[this._interface_id];
    }
    get physical_descriptor() {
        return this._physical_descriptors[this._interface_id];
    }
    get reports() {
        return this._reports[this._interface_id];
    }
    get report_names() {
        return this._report_names[this._interface_id];
    }
    /******************
     * Public Methods *
     ******************/
    async connect(...filters) {
        if (this === undefined) {
            /* Instantiate class, then connect */
            return await (new Device(...filters)).connect();
        }
        if (this.webusb_device !== undefined) {
            /* Already connected */
            return this;
        }
        let device = await navigator.usb.requestDevice({ filters: [...filters, ...this._filters] });
        await device.open();
        if (device.configuration === null)
            await device.selectConfiguration(this._configuration_id);
        await device.claimInterface(this._interface_id);
        this.webusb_device = device;
        await this.build_reports();
        return this;
    }
    static async connect(...filters) {
        /* Instantiate class, then connect */
        return await (new Device(...filters)).connect();
    }
    async receive() {
        this.verify_connection();
        throw new Error("Not Implemented");
    }
    async send(report, ...data) {
        this.verify_connection();
        throw new Error("Not Implemented");
    }
    async get_feature(report) {
        this.verify_connection();
        let report_id = this.get_report_id(report, 3 /* Feature */);
        let length = this.reports.get(report_id)["length"];
        let result = await this.webusb_device.controlTransferIn({
            requestType: "class" /* class */,
            recipient: "interface" /* interface */,
            request: 1 /* GET_REPORT */,
            value: 3 /* Feature */ * 256 + report_id,
            index: this._interface_id
        }, length);
        let report_data = Device.verify_transfer(result);
        return report_data;
    }
    async set_feature(report, ...data) {
        this.verify_connection();
        throw new Error("Not Implemented");
    }
    static async get_HID_class_descriptor(device, type, index, length, interface_id, request) {
        let result = await device.controlTransferIn({
            requestType: "standard" /* standard */,
            recipient: "interface" /* interface */,
            request: request,
            value: type * 256 + index,
            index: interface_id
        }, length);
        return Device.verify_transfer(result);
    }
}
navigator.hid = Device;
//# sourceMappingURL=webusb_hid.js.map