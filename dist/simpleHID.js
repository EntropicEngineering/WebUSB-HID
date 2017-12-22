/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */
import 'improved-map';
import { Binary_Map, Repeat, Uint8 } from 'binary-structures';
import * as HID from './HID_data';
import * as USB from './USB_data';
import { BOS_descriptor, HID_descriptor, HID_item, languages_string_descriptor, string_descriptor, decode } from './parsers';
/*************
 * Utilities *
 *************/
function hex(value) {
    return "0x" + value.toString(16).padStart(2, "0");
}
function hex_buffer(buffer) {
    return Array.from(new Uint8Array(buffer), hex).join(", ");
}
export class USBTransferError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'USBTransferError';
        this.status = status;
    }
}
export class ConnectionError extends Error {
}
export class ReportError extends Error {
}
export class DescriptorError extends Error {
}
/******************
 * Default Export *
 ******************/
export class Device {
    constructor(...filters) {
        this._interface_id = 0;
        this._configuration_id = 1;
        this.webusb_device = undefined;
        this._HID_descriptors = new Map();
        this._BOS_descriptors = new Map();
        this._report_descriptors = new Map();
        this._physical_descriptors = new Map();
        this._reports = new Map();
        this._string_descriptors = new Map();
        this._filters = filters;
    }
    static verify_transfer(result) {
        if (result.status !== "ok") {
            throw new USBTransferError("HID descriptor transfer failed.", result.status);
        }
        else {
            return result.data;
        }
    }
    verify_connection() {
        if (this.webusb_device === undefined) {
            throw new ConnectionError("Not connected to a device.");
        }
    }
    async verify_reports(error = false) {
        if (this._reports.has(this._interface_id) &&
            this._reports.get(this._interface_id).has(1 /* Input */) &&
            this._reports.get(this._interface_id).get(1 /* Input */).size +
                this._reports.get(this._interface_id).get(2 /* Output */).size +
                this._reports.get(this._interface_id).get(3 /* Feature */).size > 0) {
            return;
        }
        else if (!error) {
            throw new ReportError("No valid reports.");
        }
        else {
            await this.build_reports();
            return this.verify_reports(true);
        }
    }
    async get_report_id(report, report_type) {
        await this.verify_reports();
        if ((report === null || report === undefined) && this._reports.get(this._interface_id).has(0)) {
            return 0;
        }
        else if (typeof report === "number" && (this._reports.get(this._interface_id).get(report_type)).has(report)) {
            return report;
        }
        else if (typeof report === "string" && (this._reports.get(this._interface_id).get(report_type)).has(report)) {
            return this._reports.get(this._interface_id).get(report_type).get(report);
        }
        else {
            throw new Error(`Invalid ${["Input", "Output", "Feature"][report_type - 1]} report: ${report}`);
        }
    }
    async get_string_descriptor(index, language_id = undefined) {
        this.verify_connection();
        if (index < 0) {
            throw new Error("Invalid string descriptor index");
        }
        if (!this._string_descriptors.has(this._interface_id)) {
            this._string_descriptors.set(this._interface_id, new Map());
            await this.get_string_descriptor(0, 0);
        }
        if (this._string_descriptors.get(this._interface_id).has(index)) {
            return this._string_descriptors.get(this._interface_id).get(index);
        }
        if (index !== 0 && language_id !== undefined && !(this._string_descriptors.get(this._interface_id).get(0).includes(language_id))) {
            throw new Error(`Unsupported language id: ${hex(language_id)}`);
        }
        if (index !== 0 && language_id === undefined) {
            language_id = this._string_descriptors.get(this._interface_id).get(0 /* String Descriptor index */)[0 /* First LANGID */];
        }
        let data = Device.verify_transfer(await this.webusb_device.controlTransferIn({
            requestType: "standard",
            recipient: "device",
            request: 6 /* GET_DESCRIPTOR */,
            value: 3 /* STRING */ * 256 + index,
            index: language_id,
        }, 255));
        let result;
        if (index === 0) {
            result = languages_string_descriptor.parse(new DataView(data.buffer)).data.LANGID;
        }
        else {
            result = string_descriptor.parse(new DataView(data.buffer)).data.string;
        }
        this._string_descriptors.get(this._interface_id).set(index, result);
        return result;
    }
    async get_BOS_descriptor() {
        this.verify_connection();
        if (this.BOS_descriptor === undefined) {
            let data = Device.verify_transfer(await this.webusb_device.controlTransferIn({
                requestType: "standard",
                recipient: "device",
                request: 6 /* GET_DESCRIPTOR */,
                value: 15 /* BOS */ * 256,
                index: 0
            }, 5 /* BOS header size */));
            let total_length = data.getUint16(2, true);
            data = Device.verify_transfer(await this.webusb_device.controlTransferIn({
                requestType: "standard",
                recipient: "device",
                request: 6 /* GET_DESCRIPTOR */,
                value: 15 /* BOS */ * 256,
                index: 0
            }, total_length));
            if (data.byteLength < total_length) {
                throw new USBTransferError(`Invalid length, ${total_length}, for BOS descriptor: ${hex_buffer(data.buffer)}`, 'ok');
            }
            this._BOS_descriptors.set(this._interface_id, this.BOS_descriptor_parser(total_length).parse(new DataView(data.buffer)).data);
        }
        return this.BOS_descriptor;
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
                throw new USBTransferError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok");
            }
            this._HID_descriptors.set(this._interface_id, this.HID_descriptor_parser(length).parse(new DataView(data.buffer)).data);
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
                throw new USBTransferError("Multiple Report descriptors specified in HID descriptor.", "ok");
            }
            else if (reports.length === 0) {
                throw new USBTransferError("Report descriptor missing from HID descriptor.", "ok");
            }
            let length = reports[0].size;
            let data = await Device.get_HID_class_descriptor(this.webusb_device, 34 /* Report */, 0, length, this._interface_id, 6 /* GET */);
            if (data.byteLength !== length) {
                throw new USBTransferError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok");
            }
            this._report_descriptors.set(this._interface_id, this.report_descriptor_parser(length).parse(new DataView(data.buffer)).data);
        }
        return this.report_descriptor;
    }
    async get_physical_descriptor(index, length = undefined) {
        this.verify_connection();
        if (this.physical_descriptor === undefined) {
            this._physical_descriptors.set(this._interface_id, []);
        }
        if (this.physical_descriptor[index] === undefined) {
            if (this.HID_descriptor === undefined) {
                await this.get_HID_descriptor();
            }
            let descriptors = this.HID_descriptor.descriptors
                .filter(({ type, size }) => type === 35 /* Physical */);
            if (descriptors.length > 1) {
                throw new USBTransferError("Multiple Physical descriptors specified in HID descriptor.", "ok");
            }
            else if (descriptors.length === 0) {
                throw new USBTransferError("Physical descriptor not present in HID descriptor.", "ok");
            }
            if (index === 0) {
                length = descriptors[0].size;
            }
            else if (length === undefined) {
                throw new Error("Undefined Physical descriptor length.");
            }
            let data = await Device.get_HID_class_descriptor(this.webusb_device, 35 /* Physical */, index, length, this._interface_id, 6 /* GET */);
            if (data.byteLength !== length) {
                throw new USBTransferError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok");
            }
            this.physical_descriptor[index] = this.physical_descriptor_parser(length).parse(new DataView(data.buffer)).data;
        }
        return this.physical_descriptor[index];
    }
    async build_reports() {
        if (this.reports === undefined) {
            if (this.report_descriptor === undefined) {
                await this.get_report_descriptor();
            }
            if (this.BOS_descriptor === undefined) {
                await this.get_BOS_descriptor();
            }
            const usage_map = new Map();
            usage_map.set("page" /* page */, null);
            usage_map.set("application" /* application */, null);
            usage_map.set("uint" /* uint */, null);
            usage_map.set("int" /* int */, null);
            usage_map.set("float" /* float */, null);
            usage_map.set("bits" /* bits */, null);
            usage_map.set("utf8" /* utf8 */, null);
            usage_map.set("object" /* object */, null);
            usage_map.set("array" /* array */, null);
            for (const descriptor of this.BOS_descriptor.capability_descriptors) {
                console.log(typeof descriptor);
                if (descriptor.hasOwnProperty('simpleHID')) {
                    const d = descriptor.simpleHID;
                    if (d.version.major > 1) {
                        throw new DescriptorError(`Incompatible WebUSB-HID version: ${d.version.major}`);
                    }
                    for (const usage of usage_map.keys()) {
                        const page = d[usage];
                        if (page !== undefined) {
                            usage_map.set(usage, page).set(page, usage);
                        }
                    }
                    break;
                }
            }
            const usage = Object.freeze(usage_map.toObject());
            // TODO: FIXME
            if (usage)
                return usage;
            const reports = new Map([
                [1 /* Input */, new Map()],
                [2 /* Output */, new Map()],
                [3 /* Feature */, new Map()]
            ]);
            /* alias `device.reports.input` to `device.report[Input]` */
            reports.set('input', reports.get(1 /* Input */));
            reports.set('output', reports.get(2 /* Output */));
            reports.set('feature', reports.get(3 /* Feature */));
            const collection_stack = [];
            const global_state_stack = [];
            let delimiter_stack = [];
            let delimited = false;
            let empty_local_state = () => new Map([['usage_stack', []], ['string_stack', []], ['designator_stack', []]]);
            const states = new Map([
                [1 /* Global */, new Map()],
                [2 /* Local */, empty_local_state()],
            ]);
            const add_raw_tags = (item) => {
                /* Strips 'type', 'tag', and 'size' from item, then adds whatever is left to the correct state table */
                states.get(item.type).update(Object.entries(item).slice(3));
            };
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
                                global_state_stack.push(new Map(states.get(1 /* Global */).entries()));
                                break;
                            case 11 /* Pop */:
                                let g = states.get(1 /* Global */);
                                let s = global_state_stack.pop() || new Map();
                                g.clear();
                                g.update(s);
                                break;
                        }
                        break;
                    case 2 /* Local */:
                        switch (item.tag) {
                            case 0 /* Usage */:
                                states.get(2 /* Local */).get('usage_stack').push(new Map(Object.entries(item).slice(3)));
                                break;
                            case 3 /* Designator_Index */:
                                states.get(2 /* Local */).get('designator_stack').push(new Map(Object.entries(item).slice(3)));
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
                                states.get(2 /* Local */).get('string_stack').push(this.get_string_descriptor(item.string_index));
                                break;
                            case 10 /* Delimiter */:
                                let delimiter = item.delimiter;
                                if (delimiter === 1 && !delimited) {
                                    delimited = true;
                                }
                                else if (delimiter === 0 && delimited) {
                                    delimiter_stack.push(states.get(2 /* Local */));
                                    states.set(2 /* Local */, empty_local_state());
                                    delimited = false;
                                } // Ignore other delimiter tags because they don't make sense.
                                break;
                        }
                        break;
                    case 0 /* Main */:
                        /* Set the state for the Main item from the Global & Local states */
                        let state = new Map();
                        if (delimiter_stack.length > 0) {
                            /* Only care about the first delimited set */
                            state.update(delimiter_stack[0]);
                            delimiter_stack = [];
                        }
                        state.update(...states.values());
                        /* Flush local state */
                        states.set(2 /* Local */, empty_local_state());
                        switch (item.tag) {
                            case 10 /* Collection */:
                                switch (item.collection) {
                                    case undefined: /* Zero bytes can be omitted */
                                    case 0:/* Physical collection */ 
                                        break;
                                    case 1:/* Application collection */ 
                                        break;
                                    case 2:/* Logical collection */ 
                                        break;
                                    case 3:/* Report collection */ 
                                        break;
                                    case 4: /* Named Array collection; I have no idea WTF this is supposed to do */
                                    case 5: /* Usage Switch collection; this application doesn't care */
                                    default:/* Reserved or Vendor collection values are ignored. */ 
                                        break;
                                }
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
            this._reports.set(this._interface_id, reports);
        }
        return this.reports;
    }
    /**************************
     * External Parser Access *
     **************************/
    /* Overwrite to use different parsers. */
    BOS_descriptor_parser(length) {
        return BOS_descriptor;
    }
    HID_descriptor_parser(length) {
        return HID_descriptor;
    }
    report_descriptor_parser(bytes) {
        return Binary_Map({ decode })
            .set('items', Repeat({ bytes }, HID_item));
    }
    /* Interpreting Physical Descriptor left as an exercise for the reader. */
    physical_descriptor_parser(bytes) {
        return Binary_Map({ decode })
            .set('bytes', Repeat({ bytes }, Uint8));
    }
    /***************************
     * Public Attribute Access *
     ***************************/
    /* Getters cannot dynamic generate missing descriptors/reports because they're inherently synchronous. */
    get interface_id() {
        return this._interface_id;
    }
    get configuration_id() {
        return this._configuration_id;
    }
    get HID_descriptor() {
        return this._HID_descriptors.get(this._interface_id);
    }
    get BOS_descriptor() {
        return this._BOS_descriptors.get(this._interface_id);
    }
    get report_descriptor() {
        return this._report_descriptors.get(this._interface_id);
    }
    get physical_descriptor() {
        return this._physical_descriptors.get(this._interface_id);
    }
    get reports() {
        let result = this._reports.get(this._interface_id);
        return result !== undefined ? Object.freeze(result.toObject()) : result;
    }
    /******************
     * Public Methods *
     ******************/
    async set_configuration_id(id) {
        this.verify_connection();
        throw Error("Not Implemented");
    }
    async set_interface_id(id) {
        this.verify_connection();
        await this.webusb_device.claimInterface(id);
        this._interface_id = id;
        await this.build_reports();
    }
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
        let report_id = await this.get_report_id(report, 3 /* Feature */);
        let length = this.reports[3 /* Feature */].report_id.byte_length;
        let result = await this.webusb_device.controlTransferIn({
            requestType: "class",
            recipient: "interface",
            request: 1 /* GET_REPORT */,
            value: 3 /* Feature */ * 256 + report_id,
            index: this._interface_id
        }, length);
        return Device.verify_transfer(result);
    }
    async set_feature(report, ...data) {
        this.verify_connection();
        throw new Error("Not Implemented");
    }
    static async get_HID_class_descriptor(device, type, index, length, interface_id, request) {
        let result = await device.controlTransferIn({
            requestType: "standard",
            recipient: "interface",
            request: request,
            value: type * 256 + index,
            index: interface_id
        }, length);
        return Device.verify_transfer(result);
    }
}
navigator.simpleHID = Device;
//# sourceMappingURL=simpleHID.js.map