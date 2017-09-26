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

/******************
 * Default Export *
 ******************/

export default class Device {
    constructor(...filters: WebUSB.USBDeviceFilter[]) {
        this._filters = filters;
    }

    private _interface_id = 0;
    private _configuration_id = 0;
    readonly _filters: WebUSB.USBDeviceFilter[];
    protected webusb_device: WebUSB.USBDevice | undefined = undefined;
    private _HID_descriptors: Array<Parser.Parsed> = [];
    private _report_descriptors: Array<Parser.Parsed> = [];
    private _physical_descriptors: Array<Array<Parser.Parsed>> = [];
    private _reports: Array<Map<number, Parser.Parsed>> = [];
    private _report_names: Array<Map<number, Map<string, number>>> = [];

    verify_connection() {
        if (this.webusb_device === undefined) {
            throw Error("Not connected to a device.");
        }
    }

    static verify_transfer(result: WebUSB.USBInTransferResult) {
        if (result.status !== WebUSB.USBTransferStatus.ok) {
            throw new USBError("HID descriptor transfer failed.", result.status);
        } else {
            return result.data as DataView;
        }
    }

    get_report_id(report: number | string, report_type: HID.Request_Report_Type): number {
        if (typeof report === "number" && this._reports[this._interface_id].has(report)) {
            return report;
        } else if (typeof report === "string" && this._report_names[this._interface_id].get(report_type)!.has(report)) {
            return this._report_names[this._interface_id].get(report_type)!.get(report) as number;
        } else {
            throw new Error("Invalid report: " + report);
        }
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
                throw new USBError("Invalid HID descriptor length: " + hex(data.buffer), WebUSB.USBTransferStatus.ok);
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
            let reports = (<Array<{type: number, size: number}>>this.HID_descriptor.descriptors)
                .filter(({type, size}) => type === HID.Class_Descriptors.Report);

            if (reports.length > 1) {
                throw new USBError("Multiple Report descriptors specified in HID descriptor.", WebUSB.USBTransferStatus.ok);
            } else if (reports.length === 0) {
                throw new USBError("Report descriptor missing from HID descriptor.", WebUSB.USBTransferStatus.ok);
            }

            let length = reports[0].size;

            let data = await Device.get_HID_class_descriptor(this.webusb_device!, HID.Class_Descriptors.Report, 0, length, this._interface_id, HID.Descriptor_Request.GET);

            if (data.byteLength !== length) {
                throw new USBError("Invalid HID descriptor length: " + hex(data.buffer), WebUSB.USBTransferStatus.ok);
            }

            this._report_descriptors[this._interface_id] = this.report_descriptor_parser(length).parse(Buffer.from(data.buffer));
        }
        return this.report_descriptor;
    }

    async get_physical_descriptor(index: number, length: number | undefined = undefined) {
        this.verify_connection();

        if (this.physical_descriptor === undefined) {
            this._physical_descriptors[this._interface_id] = [];
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

            let data = await Device.get_HID_class_descriptor(this.webusb_device!, HID.Class_Descriptors.Physical, index, length, this._interface_id, HID.Descriptor_Request.GET);

            if (data.byteLength !== length) {
                throw new USBError("Invalid HID descriptor length: " + hex(data.buffer), WebUSB.USBTransferStatus.ok);
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
                [HID.Request_Report_Type.Input, new Map()],
                [HID.Request_Report_Type.Output, new Map()],
                [HID.Request_Report_Type.Feature, new Map()],
            ]);

            let stack = [];

            let state = new Map([
                [HID.Report_Item_Type.Global, new Map()],
                [HID.Report_Item_Type.Local, new Map()],
                [HID.Report_Item_Type.Main, new Map()],
            ]);

            let data_field_main_item_types = [HID.Report_Main_Item_Tag.Input, HID.Report_Main_Item_Tag.Output, HID.Report_Main_Item_Tag.Feature];

            for (const item of <Array<Parser.Parsed>>this.report_descriptor.items) {
                switch (item.type as HID.Report_Item_Type) {
                    case HID.Report_Item_Type.Global:
                        switch (item.tag as HID.Report_Global_Item_Tag) {
                            case HID.Report_Global_Item_Tag.Usage_Page:

                                break;
                            case HID.Report_Global_Item_Tag.Logical_Minimum:

                                break;
                            case HID.Report_Global_Item_Tag.Logical_Maximum:

                                break;
                            case HID.Report_Global_Item_Tag.Physical_Minimum:

                                break;
                            case HID.Report_Global_Item_Tag.Physical_Maximum:

                                break;
                            case HID.Report_Global_Item_Tag.Unit_Exponent:

                                break;
                            case HID.Report_Global_Item_Tag.Unit:

                                break;
                            case HID.Report_Global_Item_Tag.Report_Size:

                                break;
                            case HID.Report_Global_Item_Tag.Report_ID:

                                break;
                            case HID.Report_Global_Item_Tag.Report_Count:

                                break;
                            case HID.Report_Global_Item_Tag.Push:

                                break;
                            case HID.Report_Global_Item_Tag.Pop:

                                break;
                        }
                        break;
                    case HID.Report_Item_Type.Local:

                        break;
                    case HID.Report_Item_Type.Main:

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

    get interface_id() {
        return this._interface_id;
    }

    async set_interface_id(id: number) {
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

    async set_configuration_id(id: number) {
        throw Error("Not Implemented")
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

    /******************
     * Public Methods *
     ******************/

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

    async send(report: number | string, ...data: Array<number | string>) {
        this.verify_connection();
        throw new Error("Not Implemented");
    }

    async get_feature(report: number | string) {
        this.verify_connection();
        let report_id = this.get_report_id(report, HID.Request_Report_Type.Feature);
        let length = <number>this.reports.get(report_id)!["length"];
        let result = await this.webusb_device!.controlTransferIn({
            requestType: WebUSB.USBRequestType.class,
            recipient: WebUSB.USBRecipient.interface,
            request: HID.Request_Type.GET_REPORT,
            value: HID.Request_Report_Type.Feature * 256 + report_id,
            index: this._interface_id
        }, length);
        let report_data = Device.verify_transfer(result);

        return report_data
    }

    async set_feature(report: number | string, ...data: Array<number | string>) {
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
            requestType: WebUSB.USBRequestType.standard,
            recipient: WebUSB.USBRecipient.interface,
            request: request,
            value: type * 256 + index,
            index: interface_id
        }, length);
        return Device.verify_transfer(result);
    }
}

navigator.hid = Device;
