/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */

import Buffer from 'buffer';
import Parser from 'binary-parser';

/*************
 * Utilities *
 *************/

function hex(buffer: ArrayBuffer) {
    Array.from(new Uint8Array(buffer), arg => "0x" + arg.toString(16).padStart(2, "0")).join(", ")
}

class USBError extends Error {
    constructor(message: any, status: WebUSB.USBTransferStatus) {
        super(message);
        this.name = 'USBError';
        this.status = status;
    }
    status: WebUSB.USBTransferStatus;
}

enum HID_Class_Descriptors {
    HID = 0x21,
    Report = 0x22,
    Physical = 0x23,
}

enum HID_Report_Item_Type {
    Main = 0,
    Global = 1,
    Local = 2,
    Reserved = 3
}


/**********************************
 * Binary deserialization parsers *
 **********************************/

let BCD_version = new Parser()
    .endianess(Parser.Endianness.little)
    .uint8('major')
    .bit4('minor')
    .bit4('patch');

let HID_descriptor = new Parser()
    .endianess(Parser.Endianness.little)
    .uint8('length')
    .uint8('type', {assert: HID_Class_Descriptors.HID})
    .nest('version', {type: BCD_version})
    .uint8('country_code')
    .uint8('count', {assert: (count: number) => (count > 0)})
    .array('descriptors', {
        type: new Parser()
            .endianess(Parser.Endianness.little)
            .uint8('type', {formatter: (type: HID_Class_Descriptors) => HID_Class_Descriptors[type]})
            .uint16('size'),
        length: (parsed: Parser.Parsed)  => parsed.count as number
    })
    .array('extra', {
        type: 'uint8',
        readUntil: 'eof',
        assert: (array: Array<number>) => (array.length === 0)
    });

let main_byte_0 = new Parser()
    .bit1('data_Vs_constant')
    .bit1('array_Vs_variable')
    .bit1('absolute_Vs_relative')
    .bit1('no_wrap_Vs_wrap')
    .bit1('linear_Vs_non_linear')
    .bit1('preferred_state_Vs_no_preferred')
    .bit1('no_null_position_Vs_null_state')
    .bit1('not_volitile_Vs_volitie');

let main_byte_1 = new Parser()
    .bit1('bit_field_Vs_buffered_bytes');

let main_item = new Parser()
    .endianess(Parser.Endianness.little)
    .choice('', {
        tag: 'size',
        choices: {
            0: new Parser(), /* no-op parser */
            1: new Parser().nest('', {type: main_byte_0}),
            2: new Parser().nest('', {type: main_byte_0}).nest('', {type: main_byte_1}),
            4: new Parser().nest('', {type: main_byte_0}).nest('', {type: main_byte_1})
        }
    });

let global_item = new Parser()
    .endianess(Parser.Endianness.little)

let local_item = new Parser()
    .endianess(Parser.Endianness.little)

let short_item = new Parser()
    .endianess(Parser.Endianness.little)
    .choice('', {
        tag: "type",
        choices: {
            0: main_item,
            1: global_item,
            2: local_item
        }
    });

let long_item = new Parser()
    .endianess(Parser.Endianness.little)
    .uint8('data_size')
    .uint8('long_item_tag', {assert: (tag: number) => (tag >= 0xF0)})
    .buffer('data', {length: 'data_size'});

let item = new Parser()
    .endianess(Parser.Endianness.little)
    .bit2('size', {
        formatter: (size: number) => (size === 3 ? 4 : size)    /* 0b11 means 4 bytes */
    })
    .bit2('type', {
        assert: (type: number) => (type !== 3)  /* Reserved value */
    })
    .bit4('tag')
    .choice('', {
        tag: (parsed: Parser.Parsed) => (parsed.tag as number << 4 | parsed.type as number << 2 | parsed.size as number),
        choices: {0b11111110: long_item},
        defaultChoice: short_item
    });


/**************
 * Public API *
 **************/

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
        throw new USBError("Invalid HID descriptor length: " + hex(data.buffer), WebUSB.USBTransferStatus.ok);
    }

    return data;
}

