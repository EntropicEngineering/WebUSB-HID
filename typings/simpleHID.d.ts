/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */
import 'improved-map';
import { Binary_Map } from 'binary-structures';
import * as HID from './HID_data';
import { Parsed } from './parsers';
export declare class USBTransferError extends Error {
    constructor(message: string, status: WebUSB.USBTransferStatus);
    status: WebUSB.USBTransferStatus;
}
export declare class ConnectionError extends Error {
}
export declare class ReportError extends Error {
}
export declare class DescriptorError extends Error {
}
/******************
 * Default Export *
 ******************/
export declare class Device {
    constructor(...filters: WebUSB.USBDeviceFilter[]);
    private _interface_id;
    private _configuration_id;
    readonly _filters: WebUSB.USBDeviceFilter[];
    protected webusb_device: WebUSB.USBDevice | undefined;
    private _HID_descriptors;
    private _BOS_descriptors;
    private _report_descriptors;
    private _physical_descriptors;
    private _reports;
    private _string_descriptors;
    static verify_transfer(result: WebUSB.USBInTransferResult): DataView;
    verify_connection(): void;
    verify_reports(error?: boolean): Promise<void>;
    get_report_id(report: number | string | null | undefined, report_type: HID.Request_Report_Type): Promise<number>;
    get_string_descriptor(index: number, language_id?: number | undefined): Promise<string | number[] | undefined>;
    get_BOS_descriptor(): Promise<Parsed | undefined>;
    get_HID_descriptor(): Promise<Parsed | undefined>;
    get_report_descriptor(): Promise<Parsed | undefined>;
    get_physical_descriptor(index: number, length?: number | undefined): Promise<Parsed>;
    build_reports(): Promise<any>;
    /**************************
     * External Parser Access *
     **************************/
    BOS_descriptor_parser(length: number): Binary_Map<any, any, {}>;
    HID_descriptor_parser(length: number): Binary_Map<any, any, {}>;
    report_descriptor_parser(bytes: number): Binary_Map<any, any, {}>;
    physical_descriptor_parser(bytes: number): Binary_Map<any, any, {}>;
    /***************************
     * Public Attribute Access *
     ***************************/
    readonly interface_id: number;
    readonly configuration_id: number;
    readonly HID_descriptor: Parsed | undefined;
    readonly BOS_descriptor: Parsed | undefined;
    readonly report_descriptor: Parsed | undefined;
    readonly physical_descriptor: Parsed[] | undefined;
    readonly reports: any;
    /******************
     * Public Methods *
     ******************/
    set_configuration_id(id: number): Promise<void>;
    set_interface_id(id: number): Promise<void>;
    connect(...filters: WebUSB.USBDeviceFilter[]): Promise<Device>;
    static connect(...filters: WebUSB.USBDeviceFilter[]): Promise<Device>;
    receive(): Promise<void>;
    send(report?: number | string, ...data: Array<number | string>): Promise<void>;
    get_feature(report?: number | string): Promise<DataView>;
    set_feature(report: number | string | null, ...data: Array<number | string>): Promise<void>;
    static get_HID_class_descriptor(device: WebUSB.USBDevice, type: number, index: number, length: number, interface_id: number, request: HID.Descriptor_Request): Promise<DataView>;
}
