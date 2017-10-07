/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */

/* Typescript imports. Comment out in generated js file. */
/// <reference path="../typings/binary_parser.d.ts"/>
/// <reference path="../typings/buffer.d.ts"/>
import Parser from 'binary-parser';
import Buffer from 'buffer';
import * as HID from './HID_data';
import * as USB from './USB_data';
import {BOS_descriptor, HID_descriptor, item, languages_string_descriptor, string_descriptor, USAGE} from './parsers';

/* Browser imports. Uncomment in generated js file. */
// import _Parser from './wrapped/binary_parser.js';   let Parser = _Parser.Parser;
// import _Buffer from './wrapped/buffer.js';  let Buffer = _Buffer.Buffer;
// import {BOS_descriptor, HID_descriptor, item, languages_string_descriptor, string_descriptor} from './parsers.js';

/* binary-parser expects Buffer global object. */
window.Buffer = Buffer;

/*************
 * Utilities *
 *************/

Map.assign = function(target, ...sources) {
    for (const source of sources) {
        for (const [key, value] of source) {
            target.set(key, value)
        }
    }
    return target;
};

Map.prototype.update = function(...sources) {
    return Map.assign(this, ...sources);
};

Map.prototype.asObject = function () {
    let result: any = Object.create(null);
    for (let [key, value] of this) {
       result[key] = value;
    }
    return result
};

function hex(value: number) {
    return "0x" + value.toString(16).padStart(2, "0")
}

function hex_buffer(buffer: ArrayBuffer) {
    return Array.from(new Uint8Array(buffer), hex).join(", ")
}

export class USBTransferError extends Error {
    constructor(message: any, status: WebUSB.USBTransferStatus) {
        super(message);
        this.name = 'USBTransferError';
        this.status = status;
    }

    status: WebUSB.USBTransferStatus;
}

export class ConnectionError extends Error {}
export class ReportError extends Error {}
export class DescriptorError extends Error {}

interface Report_Parser {
    name: string;
    byte_length: number;
    pack(data: any): ArrayBuffer;
    unpack(buffer: ArrayBuffer): any;
}

type Reports = Map<HID.Request_Report_Type | 'input' | 'output' | 'feature', Map<number | string, Report_Parser | number>>

/******************
 * Default Export *
 ******************/

export default class Device {
    constructor(...filters: WebUSB.USBDeviceFilter[]) {
        this._filters = filters;
    }

    private _interface_id = 0;
    private _configuration_id = 1;
    readonly _filters: WebUSB.USBDeviceFilter[];
    protected webusb_device: WebUSB.USBDevice | undefined = undefined;
    private _HID_descriptors: Map<number, Parser.Parsed> = new Map();
    private _BOS_descriptors: Map<number, Parser.Parsed> = new Map();
    private _report_descriptors: Map<number, Parser.Parsed> = new Map();
    private _physical_descriptors: Map<number, Array<Parser.Parsed>> = new Map();
    private _reports: Map<number, Reports> = new Map();
    private _string_descriptors: Map<number, Map<number, string | Array<number>>> = new Map();

    static verify_transfer(result: WebUSB.USBInTransferResult) {
        if (result.status !== "ok") {
            throw new USBTransferError("HID descriptor transfer failed.", result.status);
        } else {
            return result.data as DataView;
        }
    }

    verify_connection() {
        if (this.webusb_device === undefined) {
            throw new ConnectionError("Not connected to a device.");
        }
    }

    async verify_reports(error = false): Promise<void> {
        if (this._reports.has(this._interface_id) &&
            this._reports.get(this._interface_id)!.has(HID.Request_Report_Type.Input) &&
            this._reports.get(this._interface_id)!.get(HID.Request_Report_Type.Input)!.size +
                this._reports.get(this._interface_id)!.get(HID.Request_Report_Type.Output)!.size +
                this._reports.get(this._interface_id)!.get(HID.Request_Report_Type.Feature)!.size > 0
        ) {
            return
        } else if (!error) {
            throw new ReportError("No valid reports.")
        } else {
            await this.build_reports();
            return this.verify_reports(true);
        }
    }

    async get_report_id(report: number | string | null | undefined, report_type: HID.Request_Report_Type): Promise<number> {
        await this.verify_reports();
        if ((report === null || report === undefined) && this._reports.get(this._interface_id)!.has(0)) {
            return 0
        } else if (typeof report === "number" && (this._reports.get(this._interface_id)!.get(report_type))!.has(report)) {
            return report;
        } else if (typeof report === "string" && (this._reports.get(this._interface_id)!.get(report_type))!.has(report)) {
            return this._reports.get(this._interface_id)!.get(report_type)!.get(report) as number;
        } else {
            throw new Error(`Invalid ${["Input", "Output", "Feature"][report_type-1]} report: ${report}`);
        }
    }

    async get_string_descriptor(index: number, language_id: number | undefined = undefined) {
        this.verify_connection();
        if (index < 0) {throw new Error("Invalid string descriptor index")}
        if (!this._string_descriptors.has(this._interface_id)) {
            this._string_descriptors.set(this._interface_id, new Map());
            await this.get_string_descriptor(0, 0);
        }
        if (this._string_descriptors.get(this._interface_id)!.has(index)) {
            return this._string_descriptors.get(this._interface_id)!.get(index);
        }
        if (index !== 0 && language_id !== undefined && !((<Array<number>>this._string_descriptors.get(this._interface_id)!.get(0)).includes(language_id))) {
            throw new Error(`Unsupported language id: ${hex(language_id)}`);
        }
        if (index !== 0 && language_id === undefined) {
            language_id = this._string_descriptors.get(this._interface_id)!.get(0 /* String Descriptor index */)![0 /* First LANGID */] as number;
        }
        let data = Device.verify_transfer(await this.webusb_device!.controlTransferIn({
            requestType: "standard",
            recipient: "device",
            request: USB.Request_Type.GET_DESCRIPTOR,
            value: USB.Descriptor_Type.STRING * 256 + index,
            index: language_id as number,
        }, 255));
        let result: string | Array<number>;
        if (index === 0) {
            result = <Array<number>>languages_string_descriptor.parse(Buffer.from(data.buffer)).LANGID;
        } else {
            result = <string>string_descriptor.parse(Buffer.from(data.buffer)).string;
        }
        this._string_descriptors.get(this._interface_id)!.set(index, result);
        return result;
    }

    async get_BOS_descriptor() {
        this.verify_connection();

        if (this.BOS_descriptor === undefined) {
            let data = Device.verify_transfer(await this.webusb_device!.controlTransferIn({
                requestType: "standard",
                recipient: "device",
                request: USB.Request_Type.GET_DESCRIPTOR,
                value: USB.Descriptor_Type.BOS * 256,
                index: 0
            }, 5 /* BOS header size */));

            let total_length = data.getUint16(2, true);
            data = Device.verify_transfer(await this.webusb_device!.controlTransferIn({
                requestType: "standard",
                recipient: "device",
                request: USB.Request_Type.GET_DESCRIPTOR,
                value: USB.Descriptor_Type.BOS * 256,
                index: 0
            }, total_length));

            if (data.byteLength < total_length) {
                throw new USBTransferError(`Invalid length, ${total_length}, for BOS descriptor: ${hex_buffer(data.buffer)}`, 'ok')
            }

            this._BOS_descriptors.set(this._interface_id, this.BOS_descriptor_parser(total_length).parse(Buffer.from(data.buffer)));
        }
        return this.BOS_descriptor;
    }

    async get_HID_descriptor() {
        this.verify_connection();

        if (this.HID_descriptor === undefined) {
            let length = 9;
            let data = await Device.get_HID_class_descriptor(this.webusb_device!, HID.Class_Descriptors.HID, 0, length, this._interface_id, HID.Descriptor_Request.GET);

            let returned_length = data.getUint8(0);

            if (length < returned_length) {  /* Unlikely, but possible to have additional descriptors. */
                length = returned_length;
                data = await Device.get_HID_class_descriptor(this.webusb_device!, HID.Class_Descriptors.HID, 0, length, this._interface_id, HID.Descriptor_Request.GET);
            }

            if (data.byteLength < length) {
                throw new USBTransferError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok");
            }

            this._HID_descriptors.set(this._interface_id, this.HID_descriptor_parser(length).parse(Buffer.from(data.buffer)));
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
            let reports = (<Array<{type: number, size: number}>>this.HID_descriptor!.descriptors)
                .filter(({type, size}) => type === HID.Class_Descriptors.Report);

            if (reports.length > 1) {
                throw new USBTransferError("Multiple Report descriptors specified in HID descriptor.", "ok");
            } else if (reports.length === 0) {
                throw new USBTransferError("Report descriptor missing from HID descriptor.", "ok");
            }

            let length = reports[0].size;

            let data = await Device.get_HID_class_descriptor(this.webusb_device!, HID.Class_Descriptors.Report, 0, length, this._interface_id, HID.Descriptor_Request.GET);

            if (data.byteLength !== length) {
                throw new USBTransferError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok");
            }

            this._report_descriptors.set(this._interface_id, this.report_descriptor_parser(length).parse(Buffer.from(data.buffer)));
        }
        return this.report_descriptor;
    }

    async get_physical_descriptor(index: number, length: number | undefined = undefined) {
        this.verify_connection();

        if (this.physical_descriptor === undefined) {
            this._physical_descriptors.set(this._interface_id, []);
        }
        if (this.physical_descriptor![index] === undefined) {
            if (this.HID_descriptor === undefined) {
                await this.get_HID_descriptor();
            }

            let descriptors = (<Array<{type: number, size: number}>>this.HID_descriptor!.descriptors)
                .filter(({type, size}) => type === HID.Class_Descriptors.Physical);

            if (descriptors.length > 1) {
                throw new USBTransferError("Multiple Physical descriptors specified in HID descriptor.", "ok");
            } else if (descriptors.length === 0) {
                throw new USBTransferError("Physical descriptor not present in HID descriptor.", "ok");
            }

            if (index === 0) {
                length = descriptors[0].size;
            } else if (length === undefined) {
                throw new Error("Undefined Physical descriptor length.");
            }

            let data = await Device.get_HID_class_descriptor(this.webusb_device!, HID.Class_Descriptors.Physical, index, length, this._interface_id, HID.Descriptor_Request.GET);

            if (data.byteLength !== length) {
                throw new USBTransferError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok");
            }

            this.physical_descriptor![index] = this.physical_descriptor_parser(length).parse(Buffer.from(data.buffer));
        }
        return this.physical_descriptor![index];
    }

    async build_reports() {
        if (this.reports === undefined) {

            if (this.report_descriptor === undefined) {
                await this.get_report_descriptor();
            }

            if (this.BOS_descriptor === undefined) {
                await this.get_BOS_descriptor();
            }

            type Usages = USAGE.page | USAGE.application | USAGE.uint | USAGE.int |
                USAGE.float | USAGE.bits | USAGE.utf8 | USAGE.object | USAGE.array;

            const usage_map: Map<Usages | number, number | Usages | null> = new Map();
            usage_map.set(USAGE.page, null);
            usage_map.set(USAGE.application, null);
            usage_map.set(USAGE.uint, null);
            usage_map.set(USAGE.int, null);
            usage_map.set(USAGE.float, null);
            usage_map.set(USAGE.bits, null);
            usage_map.set(USAGE.utf8, null);
            usage_map.set(USAGE.object, null);
            usage_map.set(USAGE.array, null);

            for (const descriptor of <Array<Parser.Parsed>>this.BOS_descriptor!.capability_descriptors) {
                if (descriptor.hasOwnProperty('webusb_hid')) {
                    const d = descriptor.webusb_hid as Parser.Parsed;
                    if ((<Parser.Parsed>d.version).major > 1) {
                        throw new DescriptorError(`Incompatible WebUSB-HID version: ${(<Parser.Parsed>d.version).major}`)
                    }
                    for (const usage of usage_map.keys()) {
                        const page = d[usage];
                        if (page !== undefined) {
                            usage_map.set(usage, <number>page).set(<number>page, usage)
                        }
                    }
                    break;
                }
            }
            const usage = Object.freeze(usage_map.asObject());

            const reports: Reports = new Map([
                [HID.Request_Report_Type.Input, new Map()],
                [HID.Request_Report_Type.Output, new Map()],
                [HID.Request_Report_Type.Feature, new Map()]
            ]);
            /* alias `device.reports.input` to `device.report[Input]` */
            reports.set('input', reports.get(HID.Request_Report_Type.Input)!);
            reports.set('output', reports.get(HID.Request_Report_Type.Output)!);
            reports.set('feature', reports.get(HID.Request_Report_Type.Feature)!);

            type Stack = Array<Map<string, Parser.Data>>

            const collection_stack: Stack = [];

            const global_state_stack: Stack = [];

            let delimiter_stack: Stack = [];
            let delimited = false;

            let empty_local_state = () => new Map<string, Stack | Parser.Data>([['usage_stack', []], ['string_stack', []], ['designator_stack', []]]);

            const states = new Map([
                [HID.Report_Item_Type.Global, new Map()],
                [HID.Report_Item_Type.Local, empty_local_state()],
            ]);

            function add_raw_tags(item: Parser.Parsed) {
                /* Strips 'type', 'tag', and 'size' from item, then adds whatever is left to the correct state table */
                states.get(item.type as HID.Report_Item_Type)!.update(Object.entries(item).slice(3));
            }

            const data_field_main_item_types = [HID.Report_Main_Item_Tag.Input, HID.Report_Main_Item_Tag.Output, HID.Report_Main_Item_Tag.Feature];

            for (const item of <Array<Parser.Parsed>>this.report_descriptor!.items) {
                switch (item.type as HID.Report_Item_Type) {
                    case HID.Report_Item_Type.Global:
                        switch (item.tag as HID.Report_Global_Item_Tag) {
                            case HID.Report_Global_Item_Tag.Usage_Page:
                            case HID.Report_Global_Item_Tag.Logical_Minimum:
                            case HID.Report_Global_Item_Tag.Logical_Maximum:
                            case HID.Report_Global_Item_Tag.Physical_Minimum:
                            case HID.Report_Global_Item_Tag.Physical_Maximum:
                            case HID.Report_Global_Item_Tag.Unit:
                            case HID.Report_Global_Item_Tag.Unit_Exponent:
                            case HID.Report_Global_Item_Tag.Report_Size:
                            case HID.Report_Global_Item_Tag.Report_ID:
                            case HID.Report_Global_Item_Tag.Report_Count:
                                add_raw_tags(item);
                                break;
                            case HID.Report_Global_Item_Tag.Push:
                                global_state_stack.push(new Map(states.get(HID.Report_Item_Type.Global)!.entries()));
                                break;
                            case HID.Report_Global_Item_Tag.Pop:
                                let g = states.get(HID.Report_Item_Type.Global)!;
                                let s = global_state_stack.pop() || new Map();
                                g.clear();
                                g.update(s);
                                break;
                        }
                        break;
                    case HID.Report_Item_Type.Local:
                        switch (item.tag as HID.Report_Local_Item_Tag) {
                            case HID.Report_Local_Item_Tag.Usage:
                                states.get(HID.Report_Item_Type.Local)!.get('usage_stack').push(new Map(Object.entries(item).slice(3)));
                                break;
                            case HID.Report_Local_Item_Tag.Designator_Index:
                                states.get(HID.Report_Item_Type.Local)!.get('designator_stack').push(new Map(Object.entries(item).slice(3)));
                                break;
                            case HID.Report_Local_Item_Tag.Usage_Minimum:
                            case HID.Report_Local_Item_Tag.Usage_Maximum:
                            case HID.Report_Local_Item_Tag.Designator_Minimum:
                            case HID.Report_Local_Item_Tag.Designator_Maximum:
                            case HID.Report_Local_Item_Tag.String_Minimum:
                            case HID.Report_Local_Item_Tag.String_Maximum:
                                add_raw_tags(item);
                                break;
                            case HID.Report_Local_Item_Tag.String_Index:
                                states.get(HID.Report_Item_Type.Local)!.get('string_stack').push(this.get_string_descriptor(<number>item.string_index));
                                break;
                            case HID.Report_Local_Item_Tag.Delimiter:
                                let delimiter = item.delimiter as number;
                                if (delimiter === 1 && !delimited) {  // Start of new delimiter set
                                    delimited = true;
                                } else if (delimiter === 0 && delimited) {   // End of delimiter set
                                    delimiter_stack.push(states.get(HID.Report_Item_Type.Local)!);
                                    states.set(HID.Report_Item_Type.Local, empty_local_state());
                                    delimited = false;
                                }   // Ignore other delimiter tags because they don't make sense.
                                break;
                        }
                        break;
                    case HID.Report_Item_Type.Main:
                        /* Set the state for the Main item from the Global & Local states */
                        let state = new Map();
                        if (delimiter_stack.length > 0) {
                            /* Only care about the first delimited set */
                            state.update(delimiter_stack[0]);
                            delimiter_stack = [];
                        }
                        state.update(...states.values());
                        /* Flush local state */
                        states.set(HID.Report_Item_Type.Local, empty_local_state());
                        switch (item.tag as HID.Report_Main_Item_Tag) {
                            case HID.Report_Main_Item_Tag.Collection:
                                switch (item.collection) {
                                    case undefined:     /* Zero bytes can be omitted */
                                    case 0:             /* Physical collection */
                                        break;
                                    case 1:             /* Application collection */
                                        break;
                                    case 2:             /* Logical collection */
                                        break;
                                    case 3:             /* Report collection */
                                        break;
                                    case 4:             /* Named Array collection; I have no idea WTF this is supposed to do */
                                    case 5:             /* Usage Switch collection; this application doesn't care */
                                    default:            /* Reserved or Vendor collection values are ignored. */
                                        break;
                                }
                                break;
                            case HID.Report_Main_Item_Tag.End_Collection:
                                break;
                            case HID.Report_Main_Item_Tag.Input:
                                break;
                            case HID.Report_Main_Item_Tag.Output:
                                break;
                            case HID.Report_Main_Item_Tag.Feature:
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

    BOS_descriptor_parser(length: number) {
        return BOS_descriptor;
    }

    HID_descriptor_parser(length: number) {
        return HID_descriptor;
    }

    report_descriptor_parser(length: number) {
        return new Parser()
            .array('items', {
                type: item,
                lengthInBytes: length
            });
    }

    /* Interpreting Physical Descriptor left as an exercise for the reader. */
    physical_descriptor_parser(length: number) {
        return new Parser()
            .array('bytes', {
                type: 'uint8',
                lengthInBytes: length
            });
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
        return result !== undefined ? Object.freeze(result.asObject()) : result;
    }

    /******************
     * Public Methods *
     ******************/

    async set_configuration_id(id: number) {
        this.verify_connection();
        throw Error("Not Implemented")
    }

    async set_interface_id(id: number) {
        this.verify_connection();

        await this.webusb_device!.claimInterface(id);

        this._interface_id = id;

        await this.build_reports();
    }

    async connect(...filters: WebUSB.USBDeviceFilter[]): Promise<Device> {

        if (this === undefined) {
            /* Instantiate class, then connect */
            return await (new Device(...filters)).connect();
        }

        if (this.webusb_device !== undefined) {
            /* Already connected */
            return this;
        }

        let device = await navigator.usb.requestDevice({filters: [...filters, ...this._filters]});

        await device.open();
        if (device.configuration === null)
            await device.selectConfiguration(this._configuration_id);
        await device.claimInterface(this._interface_id);

        this.webusb_device = device;

        await this.build_reports();

        return this;
    }

    static async connect(...filters: WebUSB.USBDeviceFilter[]): Promise<Device> {
        /* Instantiate class, then connect */
        return await (new Device(...filters)).connect();
    }

    async receive() {
        this.verify_connection();
        throw new Error("Not Implemented");
    }

    async send(report: number | string | null, ...data: Array<number | string>) {
        this.verify_connection();
        throw new Error("Not Implemented");
    }

    async get_feature(report: number | string | null | undefined) {
        this.verify_connection();
        let report_id = await this.get_report_id(report, HID.Request_Report_Type.Feature);
        let length = (<Report_Parser>this.reports[HID.Request_Report_Type.Feature]!.report_id).byte_length;
        let result = await this.webusb_device!.controlTransferIn({
            requestType: "class",
            recipient: "interface",
            request: HID.Request_Type.GET_REPORT,
            value: HID.Request_Report_Type.Feature * 256 + report_id,
            index: this._interface_id
        }, length);
        let report_data = Device.verify_transfer(result);

        return report_data
    }

    async set_feature(report: number | string | null, ...data: Array<number | string>) {
        this.verify_connection();
        throw new Error("Not Implemented");
    }

    static async get_HID_class_descriptor(
        device: WebUSB.USBDevice,
        type: number,
        index: number,
        length: number,
        interface_id: number,
        request: HID.Descriptor_Request,
    ) {
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

navigator.hid = Device;
