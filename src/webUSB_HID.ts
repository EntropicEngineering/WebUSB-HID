/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */

import Parser from 'binary-parser';

/* Utility Functions */
function hex(buffer: ArrayBuffer) {
    Array.from(new Uint8Array(buffer), arg => "0x" + arg.toString(16).padStart(2, "0")).join(", ")
}

let version = new Parser()
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

export async function connect(...filters: USBDeviceFilter[]) {
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

const enum HID_Class_Descriptors {
    HID = 0x21,
    Report = 0x22,
    Physical = 0x23,
}

async function get_HID_class_descriptor(device, type, index, length, interface_id = 0) {
    /* TODO: Error handling */
    let result = await device.controlTransferIn({
        requestType: "standard",
        recipient: "interface",
        request: /* GET_DESCRIPTOR */ 0x06,
        value: type * 256 + index,
        index: interface_id
    }, length);
    return result.data;
}

async function get_HID_descriptor(device, interface_id = 0) {
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

function parse_HID_descriptor(data_view) {
    const descriptor = {
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
        let type = data_view.getUint8(offset);
        if (!(type in HID_Class_Descriptors)) {
            throw Error("Invalid HID bDescriptorType at byte `{offset}`: " + hex(data_view.buffer));
        }
        let length = data_view.getUint16(offset + 1, true);
        descriptor.descriptors.push([])
    }
    return descriptor;
}
