/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */

import 'improved-map';
import { Packed, Parsed, Binary_Array, Binary_Map, Repeat, Uint8, Padding, Bits, Uint, Int, Float, Utf8, Byte_Buffer } from 'binary-structures';

import * as HID from './HID_data';
import * as USB from './USB_data';
import {
    BOS_descriptor, HID_descriptor, HID_item, languages_string_descriptor, string_descriptor, USAGES, USAGE
} from './parsers';

/*************
 * Utilities *
 *************/

function hex(value: number) {
    return "0x" + value.toString(16).padStart(2, "0")
}

function hex_buffer(buffer: ArrayBuffer) {
    return Array.from(new Uint8Array(buffer), hex).join(", ")
}

export class USBTransferError extends Error {
    constructor(message: string, status?: USBTransferStatus) {
        super(message + ` Transfer Status: ${status}`);
        this.name = 'USBTransferError';
        this.status = status;
    }

    status?: USBTransferStatus;
}

export class ConnectionError extends Error {}

export class ReportError extends Error {}

export class DescriptorError extends Error {}

function verify_transfer_in(result: USBInTransferResult) {
    if ( result.status !== "ok" ) {
        throw new USBTransferError("HID descriptor transfer failed.", result.status);
    } else {
        return result.data as DataView;
    }
}

function verify_transfer_out(result: USBOutTransferResult) {
    if ( result.status !== "ok" ) {
        throw new USBTransferError("HID descriptor transfer failed.", result.status);
    } else {
        return result.bytesWritten;
    }
}

async function get_HID_class_descriptor(device: USBDevice,
    type: number,
    index: number,
    length: number,
    interface_id: number,
    request: HID.Descriptor_Request,) {
    let result = await device.controlTransferIn({
        requestType: "standard",
        recipient: "interface",
        request: request,
        value: type * 256 + index,
        index: interface_id
    }, length);
    return verify_transfer_in(result);
}

export type Data = Data_Object | number | Array<Data_Object | number> | Data_Map;

export interface Data_Object {
    [name: string]: Data;
}
export interface Data_Map extends Map<string, Data> {}

type Per_Interface<T> = Map<number, T>;

export type Report_Data = Report_Object | Report_Array;

export interface Report_Array extends Array<Report_Data> {}

export interface Report_Object {
    [name: string]: Report_Data;
}

export interface Report {
    id: number;
    data: Report_Data;
}

export interface Report_Struct {
    type?: HID.Request_Report_Type;
    id?: number;
    name?: string;
    byte_length?: number;
    pack(source: any, options?: { data_view?: DataView, byte_offset?: number }): Packed;
    parse(data_view: DataView, options?: { byte_offset?: number }): Parsed<Report_Data>;
}

export interface Reports {
    [id: number]: Report_Struct;
    [name: string]: Report_Struct | number;
}

export interface Report_Types {
    'input': Reports;
    'output': Reports;
    'feature': Reports;
    [id: number]: Reports
}

/***************
 * Main Export *
 ***************/

export class Device {
    constructor(...filters: USBDeviceFilter[]) {
        this._filters = filters;
    }

    private _interface_id = 0;
    private _configuration_id = 1;
    readonly _filters: USBDeviceFilter[];
    protected webusb_device: USBDevice | undefined = undefined;
    private _HID_descriptors: Per_Interface<Data_Object> = new Map();
    private _BOS_descriptors: Per_Interface<Data_Object> = new Map();
    private _report_descriptors: Per_Interface<Array<Data_Object>> = new Map();
    private _physical_descriptors: Per_Interface<Array<Data>> = new Map();
    private _reports: Per_Interface<Report_Types> = new Map();
    private _string_descriptors: Per_Interface<Map<number, string | Array<number>>> = new Map();
    private _max_input_length = 0;
    private _report_ids = false;

    verify_connection() {
        if ( this.webusb_device === undefined ) {
            throw new ConnectionError("Not connected to a device.");
        }
    }

    async verify_reports(error = false): Promise<Report_Types> {
        const reports = this._reports.get(this._interface_id);
        if ( reports !== undefined ) {
            return reports;
        } else if ( error ) {
            throw new ReportError("No valid reports.")
        } else {
            await this.build_reports();
            return this.verify_reports(true);
        }
    }

    async get_report_id(report_type: HID.Request_Report_Type, report_id?: number | string): Promise<number> {
        const reports = await this.verify_reports();
        if ( report_id === undefined && reports.hasOwnProperty(0) ) {
            return 0
        } else if ( typeof report_id === "number" && reports[report_type].hasOwnProperty(report_id) ) {
            return report_id;
        } else if ( typeof report_id === "string" && reports[report_type].hasOwnProperty(report_id) ) {
            return reports[report_type][report_id] as number;
        } else {
            throw new Error(`Invalid ${["Input", "Output", "Feature"][report_type - 1]} report: ${report_id}`);
        }
    }

    async get_string_descriptor(index: number, language_id?: number) {
        this.verify_connection();
        if ( index < 0 ) { throw new Error("Invalid string descriptor index") }
        if ( !this._string_descriptors.has(this._interface_id) ) {
            this._string_descriptors.set(this._interface_id, new Map());
            await this.get_string_descriptor(0, 0);
        }
        if ( this._string_descriptors.get(this._interface_id)!.has(index) ) {
            return this._string_descriptors.get(this._interface_id)!.get(index);
        }
        if ( index !== 0 && language_id !== undefined && !( ( this._string_descriptors.get(this._interface_id)!.get(0) as Array<number> ).includes(language_id) ) ) {
            throw new Error(`Unsupported language id: ${hex(language_id)}`);
        }
        if ( index !== 0 && language_id === undefined ) {
            language_id = this._string_descriptors.get(this._interface_id)!.get(0 /* String Descriptor index */)![0 /* First LANGID */] as number;
        }
        let data = verify_transfer_in(await this.webusb_device!.controlTransferIn({
            requestType: "standard",
            recipient: "device",
            request: USB.Request_Type.GET_DESCRIPTOR,
            value: USB.Descriptor_Type.STRING * 256 + index,
            index: language_id as number,
        }, 255));
        let result: string | Array<number>;
        if ( index === 0 ) {
            result = languages_string_descriptor.parse(new DataView(data.buffer)).data.LANGID as Array<number>;
        } else {
            result = string_descriptor.parse(new DataView(data.buffer)).data.string as string;
        }
        this._string_descriptors.get(this._interface_id)!.set(index, result);
        return result;
    }

    async get_BOS_descriptor() {
        this.verify_connection();

        if ( this.BOS_descriptor === undefined ) {
            let data = verify_transfer_in(await this.webusb_device!.controlTransferIn({
                requestType: "standard",
                recipient: "device",
                request: USB.Request_Type.GET_DESCRIPTOR,
                value: USB.Descriptor_Type.BOS * 256,
                index: 0
            }, 5 /* BOS header size */));
            let total_length = data.getUint16(2, true);
            data = verify_transfer_in(await this.webusb_device!.controlTransferIn({
                requestType: "standard",
                recipient: "device",
                request: USB.Request_Type.GET_DESCRIPTOR,
                value: USB.Descriptor_Type.BOS * 256,
                index: 0
            }, total_length));

            if ( data.byteLength < total_length ) {
                throw new USBTransferError(`Invalid length, ${total_length}, for BOS descriptor: ${hex_buffer(data.buffer)}`, 'ok')
            }

            this._BOS_descriptors.set(this._interface_id, this.BOS_descriptor_parser(total_length).parse(new DataView(data.buffer)).data);
        }
        return this.BOS_descriptor;
    }

    async get_HID_descriptor() {
        this.verify_connection();

        if ( this.HID_descriptor === undefined ) {
            let length = 9;
            let data = await get_HID_class_descriptor(this.webusb_device!, HID.Class_Descriptors.HID, 0, length, this._interface_id, HID.Descriptor_Request.GET);

            let returned_length = data.getUint8(0);

            if ( length < returned_length ) {  /* Unlikely, but possible to have additional descriptors. */
                length = returned_length;
                data = await get_HID_class_descriptor(this.webusb_device!, HID.Class_Descriptors.HID, 0, length, this._interface_id, HID.Descriptor_Request.GET);
            }

            if ( data.byteLength < length ) {
                throw new USBTransferError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok");
            }

            this._HID_descriptors.set(this._interface_id, this.HID_descriptor_parser(length).parse(new DataView(data.buffer)).data);
        }
        return this.HID_descriptor;
    }

    async get_report_descriptor() {
        this.verify_connection();

        if ( this.report_descriptor === undefined ) {
            if ( this.HID_descriptor === undefined ) {
                await this.get_HID_descriptor();
            }

            /* Get Report descriptor from HID descriptor */
            let reports = ( this.HID_descriptor!.descriptors as Array<{ type: number, size: number }> )
                .filter(({ type }) => type === HID.Class_Descriptors.Report);

            if ( reports.length > 1 ) {
                throw new USBTransferError("Multiple Report descriptors specified in HID descriptor.", "ok");
            } else if ( reports.length === 0 ) {
                throw new USBTransferError("Report descriptor missing from HID descriptor.", "ok");
            }

            let length = reports[0].size;

            let data = await get_HID_class_descriptor(this.webusb_device!, HID.Class_Descriptors.Report, 0, length, this._interface_id, HID.Descriptor_Request.GET);

            if ( data.byteLength !== length ) {
                throw new USBTransferError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok");
            }

            this._report_descriptors.set(this._interface_id, this.report_descriptor_parser(length).parse(new DataView(data.buffer)).data as Array<Data_Object>);
        }
        return this.report_descriptor;
    }

    async get_physical_descriptor(index: number, length: number | undefined = undefined) {
        this.verify_connection();

        if ( this.physical_descriptor === undefined ) {
            this._physical_descriptors.set(this._interface_id, []);
        }
        if ( this.physical_descriptor![index] === undefined ) {
            if ( this.HID_descriptor === undefined ) {
                await this.get_HID_descriptor();
            }

            let descriptors = ( this.HID_descriptor!.descriptors as Array<{ type: number, size: number }> )
                .filter(({ type, size }) => type === HID.Class_Descriptors.Physical);

            if ( descriptors.length > 1 ) {
                throw new USBTransferError("Multiple Physical descriptors specified in HID descriptor.", "ok");
            } else if ( descriptors.length === 0 ) {
                throw new USBTransferError("Physical descriptor not present in HID descriptor.", "ok");
            }

            if ( index === 0 ) {
                length = descriptors[0].size;
            } else if ( length === undefined ) {
                throw new Error("Undefined Physical descriptor length.");
            }

            let data = await get_HID_class_descriptor(this.webusb_device!, HID.Class_Descriptors.Physical, index, length, this._interface_id, HID.Descriptor_Request.GET);

            if ( data.byteLength !== length ) {
                throw new USBTransferError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok");
            }

            this.physical_descriptor![index] = this.physical_descriptor_parser(length).parse(new DataView(data.buffer)).data as Array<number>;
        }
        return this.physical_descriptor![index];
    }

    async build_reports() {
        if ( this.reports === undefined ) {

            if ( this.report_descriptor === undefined ) {
                await this.get_report_descriptor();
            }

            if ( this.BOS_descriptor === undefined ) {
                await this.get_BOS_descriptor();
            }

            const usage_map: Map<USAGES | 'version', number | Data_Object> = new Map();
            usage_map.set('version', {major: 1, minor: 0, patch: 0});
            usage_map.set('page', USAGE.page);
            usage_map.set('application', USAGE.application);
            usage_map.set('array', USAGE.array);
            usage_map.set('object', USAGE.object);
            usage_map.set('uint', USAGE.uint);
            usage_map.set('int', USAGE.int);
            usage_map.set('float', USAGE.float);
            usage_map.set('utf8', USAGE.utf8);

            for ( const descriptor of this.BOS_descriptor!.capability_descriptors as Array<Data_Object> ) {
                if ( descriptor.hasOwnProperty('simpleHID') ) {
                    const d = descriptor.simpleHID as Data_Map;
                    // TODO: Better version compatibility checking
                    if ( ( d.get('version') as Data_Object ).major > 1 ) {
                        throw new DescriptorError(`Incompatible SimpleHID version: ${( d.get('version') as Data_Object ).major}`)
                    }
                    usage_map.update(d);
                    break;
                }
            }
            const usage = Object.freeze(usage_map.toObject());

            const reports: Report_Types = {
                input: {},
                output: {},
                feature: {}
            };
            /* alias `device.reports.input` to `device.report[Input]` */
            reports[HID.Request_Report_Type.Input] = reports.input;
            reports[HID.Request_Report_Type.Output] = reports.output;
            reports[HID.Request_Report_Type.Feature] = reports.feature;

            type Stack = Array<Data_Map>

            interface Collection {
                struct: Report_Struct;
                type: HID.Collection_Type;
            }

            const collection_stack: Array<Collection | boolean> = [];

            const global_state_stack: Stack = [];

            let delimiter_stack: Stack = [];
            let delimited = false;

            let empty_local_state = () => new Map<string, Stack | Data>([['usage_stack', []], ['string_stack', []], ['designator_stack', []]]);

            const states = new Map([
                [HID.Report_Item_Type.Global, new Map()],
                [HID.Report_Item_Type.Local, empty_local_state()],
            ]);

            const add_raw_tags = (item: Data_Object) => {
                /* Strips 'type', 'tag', and 'size' from item, then adds whatever is left to the correct state table */
                states.get(item.type as HID.Report_Item_Type)!.update(Object.entries(item).slice(3));
            };

            const build_item = (usage: USAGE | undefined, size: number) => {
                if ( size === 0 ) {
                    return Padding(0);
                }
                switch ( usage ) {
                    case undefined:
                        if ( size > 7 ) { throw new DescriptorError(`Invalid Padding size in HID descriptor: ${size}`); }
                        return Padding(size);
                    case USAGE.uint:
                        if ( ![1, 2, 3, 4, 5, 6, 7, 8, 16, 32, 64].includes(size) ) { throw new DescriptorError(`Invalid Uint size in HID descriptor: ${size}`); }
                        return Uint(size);
                    case USAGE.int:
                        if ( ![8, 16, 32].includes(size) ) { throw new DescriptorError(`Invalid Int size in HID descriptor: ${size}`); }
                        return Int(size);
                    case USAGE.float:
                        if ( ![32, 64].includes(size) ) { throw new DescriptorError(`Invalid Float size in HID descriptor: ${size}`); }
                        return Float(size);
                    case USAGE.utf8:
                        if ( size % 8 !== 0 ) { throw new DescriptorError(`Invalid Utf-8 size in HID descriptor: ${size}`); }
                        return Utf8(size, {little_endian: true});
                    default:
                        throw new DescriptorError(`Invalid Usage in HID descriptor: ${usage}`);
                }
            };

            const data_item: { [id: number]: HID.Request_Report_Type } = {
                [HID.Report_Main_Item_Tag.Input]: HID.Request_Report_Type.Input,
                [HID.Report_Main_Item_Tag.Output]: HID.Request_Report_Type.Output,
                [HID.Report_Main_Item_Tag.Feature]: HID.Request_Report_Type.Feature,
            };

            for ( const item of this.report_descriptor! ) {
                switch ( item.type as HID.Report_Item_Type ) {
                    case HID.Report_Item_Type.Global:
                        switch ( item.tag as HID.Report_Global_Item_Tag ) {
                            case HID.Report_Global_Item_Tag.Usage_Page:
                            case HID.Report_Global_Item_Tag.Logical_Minimum:
                            case HID.Report_Global_Item_Tag.Logical_Maximum:
                            case HID.Report_Global_Item_Tag.Physical_Minimum:
                            case HID.Report_Global_Item_Tag.Physical_Maximum:
                            case HID.Report_Global_Item_Tag.Unit:
                            case HID.Report_Global_Item_Tag.Unit_Exponent:
                            case HID.Report_Global_Item_Tag.Report_Size:
                            case HID.Report_Global_Item_Tag.Report_Count:
                                add_raw_tags(item);
                                break;
                            case HID.Report_Global_Item_Tag.Report_ID:
                                this._report_ids = true;
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
                        switch ( item.tag as HID.Report_Local_Item_Tag ) {
                            case HID.Report_Local_Item_Tag.Usage:
                            case HID.Report_Local_Item_Tag.Usage_Minimum:
                            case HID.Report_Local_Item_Tag.Usage_Maximum:
                            case HID.Report_Local_Item_Tag.Designator_Index:
                            case HID.Report_Local_Item_Tag.Designator_Minimum:
                            case HID.Report_Local_Item_Tag.Designator_Maximum:
                            case HID.Report_Local_Item_Tag.String_Index:
                            case HID.Report_Local_Item_Tag.String_Minimum:
                            case HID.Report_Local_Item_Tag.String_Maximum:
                                add_raw_tags(item);
                                break;
                            case HID.Report_Local_Item_Tag.Delimiter:
                                let delimiter = item.delimiter as number;
                                if ( delimiter === 1 && !delimited ) {  // Start of new delimiter set
                                    delimited = true;
                                } else if ( delimiter === 0 && delimited ) {   // End of delimiter set
                                    delimiter_stack.push(states.get(HID.Report_Item_Type.Local)!);
                                    states.set(HID.Report_Item_Type.Local, empty_local_state());
                                    delimited = false;
                                }   // Ignore other delimiter tags because they don't make sense.
                                break;
                        }
                        break;
                    case HID.Report_Item_Type.Main:
                        /* Set the state for the Main item from the Global & Local states */
                        const state = new Map();
                        if ( delimiter_stack.length > 0 ) {
                            /* Only care about the first delimited set */
                            state.update(delimiter_stack[0]);
                            delimiter_stack = [];
                        }
                        state.update(...states.values());
                        /* Flush local state */
                        states.set(HID.Report_Item_Type.Local, empty_local_state());
                        switch ( item.tag as HID.Report_Main_Item_Tag ) {
                            case HID.Report_Main_Item_Tag.Collection:
                                switch ( item.collection ) {
                                    case HID.Collection_Type.Application:
                                        if ( state.get('usage_page') === usage.page && state.get('usage_id') === usage.application ) {
                                            collection_stack.push(true);
                                        } else {
                                            collection_stack.push(false);   // Not SimpleHID compliant
                                        }
                                        break;
                                    case HID.Collection_Type.Physical:
                                    case HID.Collection_Type.Logical:
                                    case HID.Collection_Type.Report:
                                        /* Do nothing if Application Collection doesn't have correct Usage. */
                                        if ( collection_stack.length === 0 || collection_stack[0] === false ) { break; }
                                        const report_id = state.get('report_id');
                                        let struct: Report_Struct;
                                        if ( state.get('usage_page') === usage.page && state.get('usage_id') === usage.object ) {
                                            struct = Binary_Map(Binary_Map.object_transcoders) as Report_Struct;
                                        } else {
                                            struct = Binary_Array() as Report_Struct;
                                        }
                                        struct.id = report_id;
                                        struct.byte_length = 0;
                                        if ( state.has('string_index') ) {
                                            struct.name = await this.get_string_descriptor(state.get('string_index')) as string;
                                        }
                                        collection_stack.push({ struct, type: item.collection as HID.Collection_Type });
                                        break;
                                    case HID.Collection_Type.Named_Array:       /* I have no idea WTF this is supposed to do */
                                    case HID.Collection_Type.Usage_Switch:      /* This application doesn't care */
                                    case HID.Collection_Type.Usage_Modifier:    /* This application doesn't care */
                                    default:                                    /* Reserved or Vendor collection values are ignored. */
                                        break;
                                }
                                break;
                            case HID.Report_Main_Item_Tag.Input:
                            case HID.Report_Main_Item_Tag.Output:
                            case HID.Report_Main_Item_Tag.Feature:
                                const count = state.get('report_count');
                                const size = state.get('report_size');
                                if ( size === undefined ) {
                                    throw new ReportError(`Size not defined for ${HID.Report_Main_Item_Tag[item.tag as HID.Report_Main_Item_Tag]} Report`);
                                } else if ( count === undefined ) {
                                    throw new ReportError(`Count not defined for ${HID.Report_Main_Item_Tag[item.tag as HID.Report_Main_Item_Tag]} Report`);
                                }
                                if ( collection_stack.length === 0 || collection_stack[0] === false) {  // Not SimpleHID compliant
                                    const id = state.get('report_id');
                                    const type = data_item[item.tag as HID.Report_Main_Item_Tag];
                                    const report_type = reports[type];
                                    if ( !report_type.hasOwnProperty(id) ) {
                                        const array = Binary_Array() as Report_Struct;
                                        array.byte_length = 0;
                                        report_type[id] = array;
                                    }
                                    const report = report_type[id] as Array<any> & Report_Struct;
                                    for ( let i = 0; i < count; i++ ) {
                                        report.push(Byte_Buffer(size / 8))
                                    }
                                    report.byte_length! += ( size / 8 ) * count;
                                    if ( type === HID.Request_Report_Type.Input && report.byte_length! > this._max_input_length ) {
                                        this._max_input_length = report.byte_length!;
                                    }
                                } else if ( collection_stack.length === 1 ) {
                                    throw new ReportError(`All Input, Output or Feature Reports must be enclosed in a Report Collection.`);
                                } else if ( state.get('usage_page') === usage.page ) {  // SimpleHID compliant
                                    const usage = state.get('usage_id');
                                    const { struct } = collection_stack[collection_stack.length - 1] as Collection;
                                    const item_struct = build_item(usage, size);
                                    if ( struct instanceof Array ) {
                                        for ( let i = 0; i < count; i++ ) {
                                            struct.push(item_struct);
                                        }
                                    } else if ( struct instanceof Map ) {
                                        if ( !state.has('string_index') ) {
                                            throw new ReportError(`Missing String Index for variable name in Report ID ${state.get('report_id')}`);
                                        }
                                        const name = await this.get_string_descriptor(state.get('string_index'));
                                        if ( struct.has(name) ) {
                                            const thing = struct.get(name);
                                            let array: Array<any>;
                                            if ( thing instanceof Array ) {
                                                array = thing;
                                            } else {
                                                array = Binary_Array();
                                                array.push(thing);
                                            }
                                            for ( let i = 0; i < count; i++ ) {
                                                array.push(item_struct);
                                            }
                                            struct.set(name, array);
                                        } else {
                                            if ( count === 1 ) {
                                                struct.set(name, item_struct);
                                            } else {
                                                const array = Binary_Array();
                                                for ( let i = 0; i < count; i++ ) {
                                                    array.push(item_struct);
                                                }
                                                struct.set(name, array);
                                            }
                                        }
                                    }
                                    struct.byte_length! += ( size / 8 ) * count;
                                    struct.type = data_item[item.tag as HID.Report_Main_Item_Tag];
                                }
                                break;
                            case HID.Report_Main_Item_Tag.End_Collection:
                                if ( collection_stack.length === 0 ) { break; }
                                const collection = collection_stack.pop()!;
                                if ( typeof collection === 'boolean' ) { break; }
                                const { struct } = collection;
                                if ( collection.type === HID.Collection_Type.Report ) { // Store struct in reports object
                                    if ( struct.id === undefined ) {
                                        if ( this._report_ids ) {
                                            throw new ReportError(`No Report ID defined for Report Collection`);
                                        } else {
                                            struct.id = 0;
                                        }
                                    }
                                    const type = struct.type!;
                                    if ( struct.name !== undefined ) {
                                        reports[type][struct.name] = struct.id;
                                    }
                                    reports[type][struct.id] = struct;
                                    if ( type === HID.Request_Report_Type.Input && struct.byte_length! > this._max_input_length ) {
                                        this._max_input_length = struct.byte_length!;
                                    }
                                } else {
                                    const parent = collection_stack[collection_stack.length - 1];
                                    if ( typeof parent === 'boolean' ) { break; }   // Ignore Logical/Physical Collections outside of Report Collections
                                    if ( parent.struct instanceof Map ) {
                                        parent.struct.set(struct.name, struct);
                                    } else if ( parent.struct instanceof Array ){
                                        parent.struct.push(struct);
                                    }
                                    parent.struct.byte_length! += struct.byte_length!;
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

    BOS_descriptor_parser(length: number) {
        return BOS_descriptor;
    }

    HID_descriptor_parser(length: number) {
        return HID_descriptor;
    }

    report_descriptor_parser(bytes: number) {
        return Repeat({ bytes }, HID_item);
    }

    /* Interpreting Physical Descriptor left as an exercise for the reader. */
    physical_descriptor_parser(bytes: number) {
        return Repeat({ bytes }, Uint8);
    }

    /***************************
     * Public Attribute Access *
     ***************************/

    /* Getters cannot dynamically generate missing descriptors/reports because they're inherently synchronous. */

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

    /********************
     * Main API Methods *
     ********************/

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

    async connect(...filters: USBDeviceFilter[]): Promise<Device> {

        // TODO: Detect & handle device disconnect

        if ( this.webusb_device !== undefined ) {
            /* Already connected */
            return this;
        }

        let device = await navigator.usb.requestDevice({ filters: [...filters, ...this._filters] });

        await device.open();
        if ( device.configuration === null ) {
            await device.selectConfiguration(this._configuration_id);
        }
        await device.claimInterface(this._interface_id);

        this.webusb_device = device;

        await this.build_reports();

        return this;
    }

    static async connect(...filters: USBDeviceFilter[]): Promise<Device> {
        /* Instantiate class, then connect */
        return await ( new Device(...filters) ).connect();
    }

    async receive(): Promise<Report> {
        this.verify_connection();
        let endpoint_id: number;
        for ( const endpoint of this.webusb_device!.configuration!.interfaces[this._interface_id].alternate.endpoints ) {
            if ( endpoint.direction === 'in' && endpoint.type === 'interrupt' ) {
                endpoint_id = endpoint.endpointNumber;
                break;
            }
        }
        const result = await this.webusb_device!.transferIn(endpoint_id!, this._max_input_length + 1);
        const data_view = verify_transfer_in(result);
        let report_id = 0;
        let byte_offset = 0;
        if ( this._report_ids ) {
            report_id = data_view.getUint8(0);
            byte_offset++;
        }
        const report = this.reports![HID.Request_Report_Type.Input][report_id] as Report_Struct;
        return { id: report_id, data: report.parse(data_view, { byte_offset }).data };
    }

    async send(report_id: number | string | Data, data: Data = []) {
        this.verify_connection();
        const { id, length, data_view } = await output(this, HID.Request_Report_Type.Output, report_id, data);
        let endpoint_id: number | undefined = undefined;
        for ( const endpoint of this.webusb_device!.configuration!.interfaces[this._interface_id].alternate.endpoints ) {
            if ( endpoint.direction === 'out' && endpoint.type === 'interrupt' ) {
                endpoint_id = endpoint.endpointNumber;
                break;
            }
        }
        let result;
        if ( endpoint_id === undefined ) {
            result = await this.webusb_device!.controlTransferOut({
                requestType: "class",
                recipient: "interface",
                request: HID.Request_Type.SET_REPORT,
                value: HID.Request_Report_Type.Output * 256 + id,
                index: this._interface_id
            }, data_view);
        } else {
            result = await this.webusb_device!.transferOut(endpoint_id!, data_view.buffer);
        }
        return length === verify_transfer_out(result);
    }

    async get_feature(report_id?: number | string): Promise<Report> {
        this.verify_connection();
        const id = await this.get_report_id(HID.Request_Report_Type.Feature, report_id);
        const report = this.reports![HID.Request_Report_Type.Feature][id] as Report_Struct;
        let length = Math.ceil(report.byte_length as number);
        let byte_offset = 0;
        if ( this._report_ids ) {    // Report IDs prefix data if used.
            length++;
            byte_offset++;
        }
        let result = await this.webusb_device!.controlTransferIn({
            requestType: "class",
            recipient: "interface",
            request: HID.Request_Type.GET_REPORT,
            value: HID.Request_Report_Type.Feature * 256 + id,
            index: this._interface_id
        }, length);
        const data_view = verify_transfer_in(result);
        const data = report.parse(data_view, { byte_offset }).data;
        return { data, id };
    }

    async set_feature(report_id: number | string | Data, data?: Data) {
        this.verify_connection();
        const { id, length, data_view } = await output(this, HID.Request_Report_Type.Feature, report_id, data);
        let result = await this.webusb_device!.controlTransferOut({
            requestType: "class",
            recipient: "interface",
            request: HID.Request_Type.SET_REPORT,
            value: HID.Request_Report_Type.Feature * 256 + id,
            index: this._interface_id
        }, data_view);
        return length === verify_transfer_out(result);
    }
}

async function output(device: Device, report_type: HID.Request_Report_Type, report_id: number | string | Data, data?: Data) {
    let id: number;
    if ( typeof report_id === "number" || typeof report_id === "string" ) {
        id = await device.get_report_id(report_type, report_id);
    } else {
        id = await device.get_report_id(report_type, undefined);
        data = report_id as Data;
    }
    const report = device.reports![report_type][id] as Report_Struct;
    let length = Math.ceil(report.byte_length as number);
    let byte_offset = 0;
    let data_view: DataView;
    if ( id !== 0 ) {    // Report IDs prefix data if used.
        length++;
        byte_offset++;
        data_view = new DataView(new ArrayBuffer(length));
        data_view.setUint8(0, id);
    } else {
        data_view = new DataView(new ArrayBuffer(length));
    }
    report.pack(data, { data_view, byte_offset });
    return { id, length, data_view }
}

declare global {
    interface Navigator {
        simpleHID: any;
    }
}
navigator.simpleHID = Device;
