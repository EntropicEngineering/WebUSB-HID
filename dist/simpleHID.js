/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */
import 'improved-map';
import { Binary_Array, Binary_Map, Repeat, Uint8, Padding, Uint, Int, Float, Utf8, Byte_Buffer } from 'binary-structures';
import * as HID from './HID_data';
import * as USB from './USB_data';
import { BOS_descriptor, HID_descriptor, HID_item, languages_string_descriptor, string_descriptor } from './parsers';
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
        super(message + ` Transfer Status: ${status}`);
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
        this._max_input_length = 0;
        this._report_ids = false;
        this._filters = filters;
    }
    static verify_transfer_in(result) {
        if (result.status !== "ok") {
            throw new USBTransferError("HID descriptor transfer failed.", result.status);
        }
        else {
            return result.data;
        }
    }
    static verify_transfer_out(result) {
        if (result.status !== "ok") {
            throw new USBTransferError("HID descriptor transfer failed.", result.status);
        }
        else {
            return result.bytesWritten;
        }
    }
    verify_connection() {
        if (this.webusb_device === undefined) {
            throw new ConnectionError("Not connected to a device.");
        }
    }
    async verify_reports(error = false) {
        const reports = this._reports.get(this._interface_id);
        if (reports !== undefined) {
            return reports;
        }
        else if (error) {
            throw new ReportError("No valid reports.");
        }
        else {
            await this.build_reports();
            return this.verify_reports(true);
        }
    }
    async get_report_id(report_type, report_id) {
        const reports = await this.verify_reports();
        if (report_id === undefined && reports.hasOwnProperty(0)) {
            return 0;
        }
        else if (typeof report_id === "number" && reports[report_type].hasOwnProperty(report_id)) {
            return report_id;
        }
        else if (typeof report_id === "string" && reports[report_type].hasOwnProperty(report_id)) {
            return reports[report_type][report_id];
        }
        else {
            throw new Error(`Invalid ${["Input", "Output", "Feature"][report_type - 1]} report: ${report_id}`);
        }
    }
    async get_string_descriptor(index, language_id) {
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
        let data = Device.verify_transfer_in(await this.webusb_device.controlTransferIn({
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
            let data = Device.verify_transfer_in(await this.webusb_device.controlTransferIn({
                requestType: "standard",
                recipient: "device",
                request: 6 /* GET_DESCRIPTOR */,
                value: 15 /* BOS */ * 256,
                index: 0
            }, 5 /* BOS header size */));
            let total_length = data.getUint16(2, true);
            data = Device.verify_transfer_in(await this.webusb_device.controlTransferIn({
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
                .filter(({ type }) => type === 34 /* Report */);
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
            usage_map.set('version', { major: 1, minor: 0, patch: 0 });
            usage_map.set('page', 65450 /* page */);
            usage_map.set('application', 0 /* application */);
            usage_map.set('array', 1 /* array */);
            usage_map.set('object', 2 /* object */);
            usage_map.set('uint', 3 /* uint */);
            usage_map.set('int', 4 /* int */);
            usage_map.set('float', 5 /* float */);
            usage_map.set('utf8', 6 /* utf8 */);
            for (const descriptor of this.BOS_descriptor.capability_descriptors) {
                if (descriptor.hasOwnProperty('simpleHID')) {
                    const d = descriptor.simpleHID;
                    // TODO: Better version compatibility checking
                    if (d.get('version').major > 1) {
                        throw new DescriptorError(`Incompatible SimpleHID version: ${d.get('version').major}`);
                    }
                    usage_map.update(d);
                    break;
                }
            }
            const usage = Object.freeze(usage_map.toObject());
            // FIXME: Make objects for happy API
            const reports = {
                input: {},
                output: {},
                feature: {}
            };
            /* alias `device.reports.input` to `device.report[Input]` */
            reports[1 /* Input */] = reports.input;
            reports[2 /* Output */] = reports.output;
            reports[3 /* Feature */] = reports.feature;
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
            const build_item = (usage, size) => {
                if (size === 0) {
                    return Padding(0);
                }
                switch (usage) {
                    case undefined:
                        if (size > 7) {
                            throw new DescriptorError(`Invalid Padding size in HID descriptor: ${size}`);
                        }
                        return Padding(size);
                    case 3 /* uint */:
                        if (![1, 2, 3, 4, 5, 6, 7, 8, 16, 32, 64].includes(size)) {
                            throw new DescriptorError(`Invalid Uint size in HID descriptor: ${size}`);
                        }
                        return Uint(size);
                    case 4 /* int */:
                        if (![8, 16, 32].includes(size)) {
                            throw new DescriptorError(`Invalid Int size in HID descriptor: ${size}`);
                        }
                        return Int(size);
                    case 5 /* float */:
                        if (![32, 64].includes(size)) {
                            throw new DescriptorError(`Invalid Float size in HID descriptor: ${size}`);
                        }
                        return Float(size);
                    case 6 /* utf8 */:
                        if (size % 8 !== 0) {
                            throw new DescriptorError(`Invalid Utf-8 size in HID descriptor: ${size}`);
                        }
                        return Utf8(size, { little_endian: true });
                    default:
                        throw new DescriptorError(`Invalid Usage in HID descriptor: ${usage}`);
                }
            };
            const data_item = {
                [HID.Report_Main_Item_Tag.Input]: 1 /* Input */,
                [HID.Report_Main_Item_Tag.Output]: 2 /* Output */,
                [HID.Report_Main_Item_Tag.Feature]: 3 /* Feature */,
            };
            for (const item of this.report_descriptor) {
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
                            case 9 /* Report_Count */:
                                add_raw_tags(item);
                                break;
                            case 8 /* Report_ID */:
                                this._report_ids = true;
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
                            case 1 /* Usage_Minimum */:
                            case 2 /* Usage_Maximum */:
                            case 3 /* Designator_Index */:
                            case 4 /* Designator_Minimum */:
                            case 5 /* Designator_Maximum */:
                            case 7 /* String_Index */:
                            case 8 /* String_Minimum */:
                            case 9 /* String_Maximum */:
                                add_raw_tags(item);
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
                        const state = new Map();
                        if (delimiter_stack.length > 0) {
                            /* Only care about the first delimited set */
                            state.update(delimiter_stack[0]);
                            delimiter_stack = [];
                        }
                        state.update(...states.values());
                        /* Flush local state */
                        states.set(2 /* Local */, empty_local_state());
                        switch (item.tag) {
                            case HID.Report_Main_Item_Tag.Collection:
                                switch (item.collection) {
                                    case 1 /* Application */:
                                        if (state.get('usage_page') === usage.page && state.get('usage_id') === usage.application) {
                                            collection_stack.push(true);
                                        }
                                        else {
                                            collection_stack.push(false); // Not SimpleHID compliant
                                        }
                                        break;
                                    case 0 /* Physical */:
                                    case 2 /* Logical */:
                                    case 3 /* Report */:
                                        /* Do nothing if Application Collection doesn't have correct Usage. */
                                        if (collection_stack.length === 0 || collection_stack[0] === false) {
                                            break;
                                        }
                                        const report_id = state.get('report_id');
                                        let struct;
                                        if (state.get('usage_page') === usage.page && state.get('usage_id') == usage.object) {
                                            struct = Binary_Map(Binary_Map.object_transcoders);
                                        }
                                        else {
                                            struct = Binary_Array();
                                        }
                                        struct.id = report_id;
                                        struct.byte_length = 0;
                                        if (state.has('string_index')) {
                                            struct.name = await this.get_string_descriptor(state.get('string_index'));
                                        }
                                        collection_stack.push({ struct, type: item.collection });
                                        break;
                                    case 4 /* Named_Array */: /* I have no idea WTF this is supposed to do */
                                    case 5 /* Usage_Switch */: /* This application doesn't care */
                                    case 6 /* Usage_Modifier */: /* This application doesn't care */
                                    default:/* Reserved or Vendor collection values are ignored. */ 
                                        break;
                                }
                                break;
                            case HID.Report_Main_Item_Tag.Input:
                            case HID.Report_Main_Item_Tag.Output:
                            case HID.Report_Main_Item_Tag.Feature:
                                const count = state.get('report_count');
                                const size = state.get('report_size');
                                if (size === undefined) {
                                    throw new ReportError(`Size not defined for ${HID.Report_Main_Item_Tag[item.tag]} Report`);
                                }
                                else if (count === undefined) {
                                    throw new ReportError(`Count not defined for ${HID.Report_Main_Item_Tag[item.tag]} Report`);
                                }
                                if (collection_stack.length === 0 || collection_stack[0] === false) {
                                    const id = state.get('report_id');
                                    const type = data_item[item.tag];
                                    const report_type = reports[type];
                                    if (!report_type.hasOwnProperty(id)) {
                                        const array = Binary_Array();
                                        array.byte_length = 0;
                                        report_type[id] = array;
                                    }
                                    const report = report_type[id];
                                    for (let i = 0; i < count; i++) {
                                        report.push(Byte_Buffer(size / 8));
                                    }
                                    report.byte_length += (size / 8) * count;
                                    if (type === 1 /* Input */ && report.byte_length > this._max_input_length) {
                                        this._max_input_length = report.byte_length;
                                    }
                                }
                                else if (collection_stack.length === 1) {
                                    throw new ReportError(`All Input, Output or Feature Reports must be enclosed in a Report Collection.`);
                                }
                                else if (state.get('usage_page') === usage.page) {
                                    const usage = state.get('usage_id');
                                    const { struct } = collection_stack[collection_stack.length - 1];
                                    const item_struct = build_item(usage, size);
                                    if (struct instanceof Array) {
                                        for (let i = 0; i < count; i++) {
                                            struct.push(item_struct);
                                        }
                                    }
                                    else if (struct instanceof Map) {
                                        if (!state.has('string_index')) {
                                            throw new ReportError(`Missing String Index for variable name in Report ID ${state.get('report_id')}`);
                                        }
                                        const name = await this.get_string_descriptor(state.get('string_index'));
                                        if (struct.has(name)) {
                                            const thing = struct.get(name);
                                            let array;
                                            if (thing instanceof Array) {
                                                array = thing;
                                            }
                                            else {
                                                array = Binary_Array();
                                                array.push(thing);
                                            }
                                            for (let i = 0; i < count; i++) {
                                                array.push(item_struct);
                                            }
                                            struct.set(name, array);
                                        }
                                        else {
                                            if (count === 1) {
                                                struct.set(name, item_struct);
                                            }
                                            else {
                                                const array = Binary_Array();
                                                for (let i = 0; i < count; i++) {
                                                    array.push(item_struct);
                                                }
                                                struct.set(name, array);
                                            }
                                        }
                                    }
                                    struct.byte_length += (size / 8) * count;
                                    struct.type = data_item[item.tag];
                                }
                                break;
                            case HID.Report_Main_Item_Tag.End_Collection:
                                if (collection_stack.length === 0) {
                                    break;
                                }
                                const collection = collection_stack.pop();
                                if (typeof collection === 'boolean') {
                                    break;
                                }
                                const { struct } = collection;
                                if (collection.type === 3 /* Report */) {
                                    if (struct.id === undefined) {
                                        if (this._report_ids) {
                                            throw new ReportError(`No Report ID defined for Report Collection`);
                                        }
                                        else {
                                            struct.id = 0;
                                        }
                                    }
                                    const type = struct.type;
                                    if (struct.name !== undefined) {
                                        reports[type][struct.name] = struct.id;
                                    }
                                    reports[type][struct.id] = struct;
                                    if (type === 1 /* Input */ && struct.byte_length > this._max_input_length) {
                                        this._max_input_length = struct.byte_length;
                                    }
                                }
                                else {
                                    const parent = collection_stack[collection_stack.length - 1];
                                    if (typeof parent === 'boolean') {
                                        break;
                                    } // Ignore Logical/Physical Collections outside of Report Collections
                                    if (parent.struct instanceof Map) {
                                        parent.struct.set(struct.name, struct);
                                    }
                                    else if (parent.struct instanceof Array) {
                                        parent.struct.push(struct);
                                    }
                                    parent.struct.byte_length += struct.byte_length;
                                }
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
        return Repeat({ bytes }, HID_item);
    }
    /* Interpreting Physical Descriptor left as an exercise for the reader. */
    physical_descriptor_parser(bytes) {
        return Repeat({ bytes }, Uint8);
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
        return this._reports.get(this._interface_id);
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
        // if ( this === undefined ) {
        //     /* Instantiate class, then connect */
        //     return await ( new Device(...filters) ).connect();
        // }
        if (this.webusb_device !== undefined) {
            /* Already connected */
            return this;
        }
        let device = await navigator.usb.requestDevice({ filters: [...filters, ...this._filters] });
        await device.open();
        if (device.configuration === null) {
            await device.selectConfiguration(this._configuration_id);
        }
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
        let endpoint_id;
        for (const endpoint of this.webusb_device.configuration.interfaces[this._interface_id].alternate.endpoints) {
            if (endpoint.direction === 'in' && endpoint.type === 'interrupt') {
                endpoint_id = endpoint.endpointNumber;
                break;
            }
        }
        const result = await this.webusb_device.transferIn(endpoint_id, this._max_input_length + 1);
        const data_view = Device.verify_transfer_in(result);
        let report_id = 0;
        let byte_offset = 0;
        if (this._report_ids) {
            report_id = data_view.getUint8(0);
            byte_offset++;
        }
        const report = this.reports[1 /* Input */][endpoint_id];
        return { id: report_id, data: report.parse(data_view, { byte_offset }).data };
    }
    async send(report_id, data = []) {
        this.verify_connection();
        const { id, length, data_view } = await output(this, 2 /* Output */, report_id, data);
        let endpoint_id = undefined;
        for (const endpoint of this.webusb_device.configuration.interfaces[this._interface_id].alternate.endpoints) {
            if (endpoint.direction === 'out' && endpoint.type === 'interrupt') {
                endpoint_id = endpoint.endpointNumber;
                break;
            }
        }
        let result;
        if (endpoint_id === undefined) {
            result = await this.webusb_device.controlTransferOut({
                requestType: "class",
                recipient: "interface",
                request: 9 /* SET_REPORT */,
                value: 2 /* Output */ * 256 + id,
                index: this._interface_id
            }, data_view);
        }
        else {
            result = await this.webusb_device.transferOut(endpoint_id, data_view.buffer);
        }
        return length === Device.verify_transfer_out(result);
    }
    async get_feature(report_id) {
        this.verify_connection();
        const id = await this.get_report_id(3 /* Feature */, report_id);
        const report = this.reports[3 /* Feature */][id];
        let length = Math.ceil(report.byte_length);
        let byte_offset = 0;
        if (this._report_ids) {
            length++;
            byte_offset++;
        }
        let result = await this.webusb_device.controlTransferIn({
            requestType: "class",
            recipient: "interface",
            request: 1 /* GET_REPORT */,
            value: 3 /* Feature */ * 256 + id,
            index: this._interface_id
        }, length);
        const data_view = Device.verify_transfer_in(result);
        const data = report.parse(data_view, { byte_offset }).data;
        return { data, id };
    }
    async set_feature(report_id, data) {
        this.verify_connection();
        const { id, length, data_view } = await output(this, 3 /* Feature */, report_id, data);
        let result = await this.webusb_device.controlTransferOut({
            requestType: "class",
            recipient: "interface",
            request: 9 /* SET_REPORT */,
            value: 3 /* Feature */ * 256 + id,
            index: this._interface_id
        }, data_view);
        return length === Device.verify_transfer_out(result);
    }
    static async get_HID_class_descriptor(device, type, index, length, interface_id, request) {
        let result = await device.controlTransferIn({
            requestType: "standard",
            recipient: "interface",
            request: request,
            value: type * 256 + index,
            index: interface_id
        }, length);
        return Device.verify_transfer_in(result);
    }
}
async function output(device, report_type, report_id, data) {
    let id;
    if (typeof report_id === "number" || typeof report_id === "string") {
        id = await device.get_report_id(report_type, report_id);
    }
    else {
        id = await device.get_report_id(report_type, undefined);
        data = report_id;
    }
    const report = device.reports[report_type][id];
    let length = Math.ceil(report.byte_length);
    let byte_offset = 0;
    let data_view;
    if (id !== 0) {
        length++;
        byte_offset++;
        data_view = new DataView(new ArrayBuffer(length));
        data_view.setUint8(0, id);
    }
    else {
        data_view = new DataView(new ArrayBuffer(length));
    }
    report.pack(data, { data_view, byte_offset });
    return { id, length, data_view };
}
navigator.simpleHID = Device;
//# sourceMappingURL=simpleHID.js.map