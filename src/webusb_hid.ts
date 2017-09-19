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
import {HID_descriptor, item} from './parsers';

/* Browser imports. Uncomment in generated js file. */
// import _Parser from './wrapped/binary_parser.js';   let Parser = _Parser.Parser;
// import _Buffer from './wrapped/buffer.js';  let Buffer = _Buffer.Buffer;
// import {HID_descriptor, item} from './parsers.js';

/* binary-parser expects Buffer global object. */
window.Buffer = Buffer;

/*************
 * Utilities *
 *************/

function hex(buffer: ArrayBuffer) {
    return Array.from(new Uint8Array(buffer), arg => "0x" + arg.toString(16).padStart(2, "0")).join(", ")
}

class USBError extends Error {
    constructor(message: any, status: WebUSB.USBTransferStatus) {
        super(message);
        this.name = 'USBError';
        this.status = status;
    }

    status: WebUSB.USBTransferStatus;
}

export default class Device {
    constructor(...filters: WebUSB.USBDeviceFilter[]) {
        this.filters = filters;
    }

    protected _interface_id = 0;
    protected _configuration_id = 0;
    readonly filters: WebUSB.USBDeviceFilter[];
    protected device: WebUSB.USBDevice | undefined = undefined;
    protected HID_descriptors: Array<Parser.Parsed> = [];
    protected report_descriptors: Array<Parser.Parsed> = [];
    protected physical_descriptors: Array<Array<Parser.Parsed>> = [];
    protected _reports: Array<{[index: number]: {[type: number]: Parser}}> = [];
    protected _report_names: Array<{[type: number]: {[name: string]: number}}> = [];

    private empty_report = {};

    private empty_report_names = {
        [HID.Report_Main_Item_Tag.Input]: {},
        [HID.Report_Main_Item_Tag.Output]: {},
        [HID.Report_Main_Item_Tag.Feature]: {}
    };

    protected verify_connection() {
        if (this.device === undefined) {
            throw Error("Not connected to a device.");
        }
    }

    protected async get_HID_descriptor() {
        this.verify_connection();

        if (this.HID_descriptor === undefined) {
            let length = 9;
            let data = await Device.get_HID_class_descriptor(this.device!, HID.Class_Descriptors.HID, 0, length, this._interface_id);

            let returned_length = data.getUint8(0);

            if (length < returned_length) {  /* Unlikely, but possible to have additional descriptors. */
                length = returned_length;
                data = await Device.get_HID_class_descriptor(this.device!, HID.Class_Descriptors.HID, 0, length, this._interface_id);
            }

            if (data.byteLength < length) {
                throw new USBError("Invalid HID descriptor length: " + hex(data.buffer), WebUSB.USBTransferStatus.ok);
            }

            this.HID_descriptors[this._interface_id] = this.HID_descriptor_parser(length).parse(Buffer.from(data.buffer));
        }
        return this.HID_descriptor;
    }

    protected async get_report_descriptor() {
        this.verify_connection();

        if (this.report_descriptor === undefined) {
            if (this.HID_descriptor === undefined) {
                await this.get_HID_descriptor();
            }

            /* Get Report descriptor from HID descriptor */
            let reports = (<Array<{type: number, size: number}>>this.HID_descriptor.descriptors)
                .filter(({type, size}) => type === HID.Class_Descriptors.Report);

            if (reports.length > 1) {
                throw new USBError("Multiple Report descriptors specified in HID descriptor.", WebUSB.USBTransferStatus.ok);
            } else if (reports.length === 0) {
                throw new USBError("Report descriptor missing from HID descriptor.", WebUSB.USBTransferStatus.ok);
            }

            let length = reports[0].size;

            let data = await Device.get_HID_class_descriptor(this.device!, HID.Class_Descriptors.Report, 0, length, this._interface_id);

            if (data.byteLength !== length) {
                throw new USBError("Invalid HID descriptor length: " + hex(data.buffer), WebUSB.USBTransferStatus.ok);
            }

            this.report_descriptors[this._interface_id] = this.report_descriptor_parser(length).parse(Buffer.from(data.buffer));
        }
        return this.report_descriptor;
    }

    protected async get_physical_descriptor(index: number, length: number | undefined = undefined) {
        this.verify_connection();

        if (this.physical_descriptor === undefined) {
            this.physical_descriptors[this._interface_id] = [];
        }
        if (this.physical_descriptor[index] === undefined) {
            if (this.HID_descriptor === undefined) {
                await this.get_HID_descriptor();
            }

            let descriptors = (<Array<{type: number, size: number}>>this.HID_descriptor.descriptors)
                .filter(({type, size}) => type === HID.Class_Descriptors.Physical);

            if (descriptors.length > 1) {
                throw new USBError("Multiple Physical descriptors specified in HID descriptor.", WebUSB.USBTransferStatus.ok);
            } else if (descriptors.length === 0) {
                throw new USBError("Physical descriptor not present in HID descriptor.", WebUSB.USBTransferStatus.ok);
            }

            if (index === 0) {
                length = descriptors[0].size;
            } else if (length === undefined) {
                throw new Error("Undefined Physical descriptor length.");
            }

            let data = await Device.get_HID_class_descriptor(this.device!, HID.Class_Descriptors.Physical, index, length, this._interface_id);

            if (data.byteLength !== length) {
                throw new USBError("Invalid HID descriptor length: " + hex(data.buffer), WebUSB.USBTransferStatus.ok);
            }

            this.physical_descriptor[index] = this.physical_descriptor_parser(length).parse(Buffer.from(data.buffer));
        }
        return this.physical_descriptor[index];
    }

    protected async build_reports() {
        if (this.report_descriptor === undefined) {
            await this.get_report_descriptor();
        }
    }

    /**************************
     * External Parser Access *
     **************************/
    /* Overwrite to use different parsers. */

    protected HID_descriptor_parser(length: number) {
        return HID_descriptor;
    }

    protected report_descriptor_parser(length: number) {
        return new Parser()
            .array('items', {
                type: item,
                lengthInBytes: length
            });
    }

    protected physical_descriptor_parser(length: number) {
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

    async set_interface_id(id: number) {
        this._interface_id = id;

        if (this.device === undefined) {
            /* Not connected, nothing to do */
            return;
        }

        await this.device.claimInterface(id);

        await this.build_reports();
    }

    get configuration_id() {
        return this._configuration_id;
    }

    async set_configuration_id(id: number) {
        throw Error("Not Implemented")
    }

    get HID_descriptor() {
        return this.HID_descriptors[this._interface_id];
    }

    get report_descriptor() {
        return this.report_descriptors[this._interface_id];
    }

    get physical_descriptor() {
        return this.physical_descriptors[this._interface_id];
    }

    get reports() {
        return this._reports[this._interface_id];
    }

    /******************
     * Public Methods *
     ******************/

    async connect(...filters: WebUSB.USBDeviceFilter[]): Promise<Device> {

        if (this === undefined) {
            /* Instantiate class, then connect */
            return await (new Device(...filters)).connect();
        }

        if (this.device !== undefined) {
            /* Already connected */
            return this;
        }

        let device = await navigator.usb.requestDevice({filters: [...filters, ...this.filters]});

        await device.open();
        if (device.configuration === null)
            await device.selectConfiguration(this._configuration_id);
        await device.claimInterface(this._interface_id);

        this.device = device;

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

    async send(report: number | string, ...data: Array<number | string>) {
        this.verify_connection();
        throw new Error("Not Implemented");
    }

    async get_feature(report: number | string) {
        this.verify_connection();
        throw new Error("Not Implemented");
    }

    async set_feature(report: number | string, ...data: Array<number | string>) {
        this.verify_connection();
        throw new Error("Not Implemented");
    }

    static async get_HID_class_descriptor(device: WebUSB.USBDevice, type: number, index: number, length: number, interface_id = 0) {
        let result = await device.controlTransferIn({
            requestType: WebUSB.USBRequestType.standard,
            recipient: WebUSB.USBRecipient.interface,
            request: /* GET_DESCRIPTOR */ 0x06,
            value: type * 256 + index,
            index: interface_id
        }, length);
        if (result.status !== WebUSB.USBTransferStatus.ok) {
            throw new USBError("HID descriptor transfer failed.", result.status);
        } else {
            return result.data as DataView;
        }
    }

}

navigator.hid = Device;
