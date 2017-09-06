/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */

// import * as WebUSB from "webusb.d";

import Parser from 'binary-parser';

interface String {
    padStart(targetLength: number, padString?: string): string;
}

/* Utility Functions */
function hex(buffer: ArrayBuffer) {
    Array.from(new Uint8Array(buffer), arg => "0x" + arg.toString(16).padStart(2, "0")).join(", ")
}

let version_parser = new Parser()
    .endianness('little')
    .uint8('major')
    .bit4('minor')
    .bit4('patch');

function decode_BCD(bcd_word: number) {
    let major = Math.floor(bcd_word / 256);
    let minor = Math.floor((bcd_word % 256) / 16);
    let patch = (bcd_word % 256) % 16;
    return [major, minor, patch];
}

const enum HID_Class_Descriptors {
    HID = 0x21,
    Report = 0x22,
    Physical = 0x23,
}

class USBError extends Error {
    constructor(message: any, status: WebUSB.USBTransferStatus) {
        super(message);
        this.name = 'USBError';
        this.status = status;
    }
    status: WebUSB.USBTransferStatus;
}

export async function connect(...filters: WebUSB.USBDeviceFilter[]) {
    if (filters.length === 0) {
        filters = [{vendorId: 0x03eb}]
    }

    let device = await navigator.usb.requestDevice({filters});

    await device.open();
    if (device.configuration === null)
        await device.selectConfiguration(0);
    await device.claimInterface(0);

    return device;
}

async function get_HID_class_descriptor(device: WebUSB.USBDevice, type: number, index: number, length: number, interface_id = 0) {
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

async function get_HID_descriptor(device: WebUSB.USBDevice, interface_id = 0) {
    let length = 9;
    let data = await get_HID_class_descriptor(device, HID_Class_Descriptors.HID, 0, length, interface_id);

    let returned_length = data.getUint8(0);

    if (length < returned_length) {  /* Unlikely, but possible to have additional descriptors. */
        length = returned_length;
        data = await get_HID_class_descriptor(device, HID_Class_Descriptors.HID, 0, length, interface_id);
    }

    if (data.byteLength < length) {
        throw Error("Invalid HID descriptor length: " + hex(data.buffer));
    }

    return data;
}

function parse_HID_descriptor(data_view: DataView) {
    const descriptor: {
        length: number | null,
        type: number | null,
        version: Array<number | null>,
        country_code: number | null,
        count: number | null,
        descriptors: []
    } = {
        length: null,
        type: null,
        version: [null, null, null],
        country_code: null,
        count: null,
        descriptors: []
    };
    descriptor.length = data_view.getUint8(0);
    descriptor.type = data_view.getUint8(1);
    if (descriptor.type !== HID_Class_Descriptors.HID) {
        throw Error("Invalid HID bDescriptorType at byte 1: " + hex(data_view.buffer));
    }
    descriptor.version = decode_BCD(data_view.getUint16(2, true));
    descriptor.country_code = data_view.getUint8(4);
    /* TODO: Care about country code */
    descriptor.count = data_view.getUint8(5);
    let offset = 6;
    while (offset < descriptor.length) {
        try {
            let type = HID_Class_Descriptors[data_view.getUint8(offset)];
        } catch(e) {
            throw Error("Invalid HID bDescriptorType at byte `{offset}`: " + hex(data_view.buffer));
        }
        let length = data_view.getUint16(offset + 1, true);
        descriptor.descriptors.push([])
    }
    return descriptor;
}
