/// <reference types="w3c-web-usb" />
/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */
import 'improved-map';
import { Packed, Binary_Array, Binary_Map } from 'binary-structures';
import * as HID from './HID_data';
import { Parsed, Parsed_Object } from './parsers';
export declare class USBTransferError extends Error {
    constructor(message: string, status?: USBTransferStatus);
    status?: USBTransferStatus;
}
export declare class ConnectionError extends Error {
}
export declare class ReportError extends Error {
}
export declare class DescriptorError extends Error {
}
export interface Report_Struct {
    type?: HID.Request_Report_Type;
    id?: number;
    name?: string;
    byte_length?: number;
    pack(source: any, options?: {
        data_view?: DataView;
        byte_offset?: number;
    }): Packed;
    parse(data_view: DataView, options?: {
        byte_offset?: number;
    }): any;
}
export interface Reports {
    [id: number]: Report_Struct;
    [name: string]: Report_Struct | number;
}
export interface Report_Types {
    'input': Reports;
    'output': Reports;
    'feature': Reports;
    [id: number]: Reports;
}
/******************
 * Default Export *
 ******************/
export declare class Device {
    constructor(...filters: USBDeviceFilter[]);
    private _interface_id;
    private _configuration_id;
    readonly _filters: USBDeviceFilter[];
    protected webusb_device: USBDevice | undefined;
    private _HID_descriptors;
    private _BOS_descriptors;
    private _report_descriptors;
    private _physical_descriptors;
    private _reports;
    private _string_descriptors;
    private _max_input_length;
    private _report_ids;
    static verify_transfer_in(result: USBInTransferResult): DataView;
    static verify_transfer_out(result: USBOutTransferResult): number;
    verify_connection(): void;
    verify_reports(error?: boolean): Promise<Report_Types>;
    get_report_id(report_type: HID.Request_Report_Type, report_id?: number | string): Promise<number>;
    get_string_descriptor(index: number, language_id?: number): Promise<string | number[] | undefined>;
    get_BOS_descriptor(): Promise<Parsed_Object | undefined>;
    get_HID_descriptor(): Promise<Parsed_Object | undefined>;
    get_report_descriptor(): Promise<Parsed_Object[] | undefined>;
    get_physical_descriptor(index: number, length?: number | undefined): Promise<Parsed>;
    build_reports(): Promise<Report_Types | undefined>;
    /**************************
     * External Parser Access *
     **************************/
    BOS_descriptor_parser(length: number): Binary_Map<any, any, {}>;
    HID_descriptor_parser(length: number): Binary_Map<any, any, {}>;
    report_descriptor_parser(bytes: number): Binary_Array<any, {}, {}>;
    physical_descriptor_parser(bytes: number): Binary_Array<number, {}, {}>;
    /***************************
     * Public Attribute Access *
     ***************************/
    readonly interface_id: number;
    readonly configuration_id: number;
    readonly HID_descriptor: Parsed_Object | undefined;
    readonly BOS_descriptor: Parsed_Object | undefined;
    readonly report_descriptor: Parsed_Object[] | undefined;
    readonly physical_descriptor: Parsed[] | undefined;
    readonly reports: Report_Types | undefined;
    /******************
     * Public Methods *
     ******************/
    set_configuration_id(id: number): Promise<void>;
    set_interface_id(id: number): Promise<void>;
    connect(...filters: USBDeviceFilter[]): Promise<Device>;
    static connect(...filters: USBDeviceFilter[]): Promise<Device>;
    receive(): Promise<{
        id: number;
        data: any;
    }>;
    send(report_id: number | string | Parsed, data?: Parsed): Promise<boolean>;
    get_feature(report_id?: number | string): Promise<{
        data: any;
        id: number;
    }>;
    set_feature(report_id: number | string | Parsed, data?: Parsed): Promise<boolean>;
    static get_HID_class_descriptor(device: USBDevice, type: number, index: number, length: number, interface_id: number, request: HID.Descriptor_Request): Promise<DataView>;
}
