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

/* Browser imports. Uncomment in generated js file. */
// import _Parser from './wrapped/binary_parser.js';   let Parser = _Parser.Parser;
// import _Buffer from './wrapped/buffer.js';  let Buffer = _Buffer.Buffer;


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

/******************
 * HID Data Types *
 ******************/

const enum HID_Class_Descriptors {
    HID         = 0x21,
    Report      = 0x22,
    Physical    = 0x23,
}

const enum HID_Report_Item_Type {
    Main        = 0b00,
    Global      = 0b01,
    Local       = 0b10,
    Reserved    = 0b11
}

const enum HID_Report_Main_Item_Tag {
    Input               = 0b1000,
    Output              = 0b1001,
    Feature             = 0b1011,
    Collection          = 0b1010,
    End_Collection      = 0b1100
}

const enum HID_Report_Global_Item_Tag {
    Usage_Page          = 0b0000,
    Logical_Minimum     = 0b0001,
    Logical_Maximum     = 0b0010,
    Physical_Minimum    = 0b0011,
    Physical_Maximum    = 0b0100,
    Unit_Exponent       = 0b0101,
    Unit                = 0b0110,
    Report_Size         = 0b0111,
    Report_ID           = 0b1000,
    Report_Count        = 0b1001,
    Push                = 0b1010,
    Pop                 = 0b1011
}

const enum HID_Report_Local_Item_Tag {
    Usage               = 0b0000,
    Usage_Minimum       = 0b0001,
    Usage_Maximum       = 0b0010,
    Designator_Index    = 0b0011,
    Designator_Minimum  = 0b0100,
    Designator_Maximum  = 0b0101,
    String_Index        = 0b0111,
    String_Minimum      = 0b1000,
    String_Maximum      = 0b1001,
    Delimiter           = 0b1010
}

/**********************************
 * Binary deserialization parsers *
 **********************************/

let null_parser = new Parser().namely('null_parser');

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
            .uint8('type')
            .uint16('size'),
        length: (parsed: Parser.Parsed) => parsed.count as number
    })
    .array('extra', {
        type: 'uint8',
        readUntil: 'eof',
        assert: (array: Array<number>) => (array.length === 0)
    });

/* HID Report Parsers */

let input_ouput_feature_byte_0 = new Parser()
    .bit1('data_Vs_constant')
    .bit1('array_Vs_variable')
    .bit1('absolute_Vs_relative')
    .bit1('no_wrap_Vs_wrap')
    .bit1('linear_Vs_non_linear')
    .bit1('preferred_state_Vs_no_preferred')
    .bit1('no_null_position_Vs_null_state')
    .bit1('not_volitile_Vs_volitie');

let input_output_feature_byte_1 = new Parser()
    .bit1('bit_field_Vs_buffered_bytes');
/* Everything following in byte is reserved and should be 0, thus it's ignored. */

let input_output_feature_item = new Parser()
    .choice('', {
        tag: 'size',
        choices: {
            0: null_parser,
            1: new Parser().nest('', {type: input_ouput_feature_byte_0}),
            2: new Parser().nest('', {type: input_ouput_feature_byte_0}).nest('', {type: input_output_feature_byte_1}),
            /* option 3 only necessary because of https://github.com/keichi/binary-parser/issues/56 */
            3: new Parser().nest('', {type: input_ouput_feature_byte_0}).nest('', {type: input_output_feature_byte_1}),
            4: new Parser().nest('', {type: input_ouput_feature_byte_0}).nest('', {type: input_output_feature_byte_1})
        }
    });

let collection = new Parser()
    .choice('', {
        tag: 'size',
        choices: {0: null_parser},
        defaultChoice: new Parser()
            .uint8('', {assert: (value: number) => ((value < 0x07) && (value > 0x7F))})
    });

let usage = (default_global = true, local_item = "usage_ID"): Parser => new Parser()
    .choice('', {
        tag: 'size',
        choices: {
            2: new Parser().endianess(Parser.Endianness.little).uint16(default_global ? 'usage_page' : local_item),
            /* option 3 only necessary because of https://github.com/keichi/binary-parser/issues/56 */
            3: new Parser().endianess(Parser.Endianness.little).uint16(local_item).uint16('usage_page'),
            4: new Parser().endianess(Parser.Endianness.little).uint16(local_item).uint16('usage_page')
        }
    });

let sized_int = (name: string): Parser => {
    return new Parser()
        .choice('', {
            tag: 'size',
            choices: {
                1: new Parser().int8(name),
                2: new Parser().endianess(Parser.Endianness.little).int16(name),
                /* option 3 only necessary because of https://github.com/keichi/binary-parser/issues/56 */
                3: new Parser().endianess(Parser.Endianness.little).int32(name),
                4: new Parser().endianess(Parser.Endianness.little).int32(name)
            }
        })
};

let sized_uint = (name: string): Parser => {
    return new Parser()
        .choice('', {
            tag: 'size',
            choices: {
                1: new Parser().uint8(name),
                2: new Parser().endianess(Parser.Endianness.little).uint16(name),
                /* option 3 only necessary because of https://github.com/keichi/binary-parser/issues/56 */
                3: new Parser().endianess(Parser.Endianness.little).uint32(name),
                4: new Parser().endianess(Parser.Endianness.little).uint32(name)
            }
        })
};

let main_item = new Parser()
    .choice('data', {
        tag: 'tag',
        choices: {
            [HID_Report_Main_Item_Tag.Input]: input_output_feature_item,
            [HID_Report_Main_Item_Tag.Output]: input_output_feature_item,
            [HID_Report_Main_Item_Tag.Feature]: input_output_feature_item,
            [HID_Report_Main_Item_Tag.Collection]: collection,
            [HID_Report_Main_Item_Tag.End_Collection]: null_parser
        }
    });

let global_item = new Parser()
    .choice('data', {
        tag: 'tag',
        choices: {
            [HID_Report_Global_Item_Tag.Usage_Page]: usage(),
            [HID_Report_Global_Item_Tag.Logical_Minimum]: sized_int('logical_minimum'),
            [HID_Report_Global_Item_Tag.Logical_Maximum]: sized_int('logical_maximum'),
            [HID_Report_Global_Item_Tag.Physical_Minimum]: sized_int('physical_minimum'),
            [HID_Report_Global_Item_Tag.Physical_Maximum]: sized_int('physical_maximum'),
            /* Parsing unit information left as an exercise to the reader. */
            [HID_Report_Global_Item_Tag.Unit_Exponent]: new Parser().uint8('unit_exponent'),
            [HID_Report_Global_Item_Tag.Unit]: new Parser().endianess(Parser.Endianness.little).uint32('unit'),
            [HID_Report_Global_Item_Tag.Report_Size]: sized_uint('report_size'),
            [HID_Report_Global_Item_Tag.Report_ID]: new Parser().uint8('report_ID'),
            [HID_Report_Global_Item_Tag.Report_Count]: sized_uint('report_count'),
            [HID_Report_Global_Item_Tag.Push]: null_parser,
            [HID_Report_Global_Item_Tag.Pop]: null_parser
        }
    });

let local_item = new Parser()
    .choice('data', {
        tag: 'tag',
        choices: {
            /* Usages left as an exercise to the reader. */
            [HID_Report_Local_Item_Tag.Usage]: usage(false),
            [HID_Report_Local_Item_Tag.Usage_Minimum]: usage(false, 'usage_minimum'),
            [HID_Report_Local_Item_Tag.Usage_Maximum]: usage(false, 'usage_maximum'),
            /* Physical Descriptors left as an exercise to the reader. */
            [HID_Report_Local_Item_Tag.Designator_Index]: sized_uint('designator_index'),
            [HID_Report_Local_Item_Tag.Designator_Minimum]: sized_uint('designator_minimum'),
            [HID_Report_Local_Item_Tag.Designator_Maximum]: sized_uint('designator_maximum'),
            [HID_Report_Local_Item_Tag.String_Index]: sized_uint('string_index'),
            [HID_Report_Local_Item_Tag.String_Minimum]: sized_uint('string_minimum'),
            [HID_Report_Local_Item_Tag.String_Maximum]: sized_uint('string_maximum'),
            [HID_Report_Local_Item_Tag.Delimiter]: sized_uint('delimiter')
        }
    });

let short_item = new Parser()
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
        formatter: (size: number) => (size === 3 ? 4 : size)    /* 0b11 means 4 bytes */    /* Not actually called because of https://github.com/keichi/binary-parser/issues/56 */
    })
    .bit2('type', {
        assert: (type: number) => (type !== 3)  /* Reserved value */    /* Not actually checked because of https://github.com/keichi/binary-parser/issues/56 */
    })
    .bit4('tag')
    .choice('', {
        tag: (parsed: Parser.Parsed) => (parsed.tag as number << 4 | parsed.type as number << 2 | parsed.size as number),
        choices: {0b11111110: long_item},
        defaultChoice: short_item
    });

let report_descriptor = (length: number): Parser => new Parser()
    .array('items', {
        type: item,
        lengthInBytes: length
    });

let physical_descriptor = (length: number): Parser => new Parser()
    .array('bytes', {
        type: 'uint8',
        length: length
    });

/*********************
 * Private Functions *
 *********************/

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

export async function get_HID_descriptor(device: WebUSB.USBDevice, interface_id = 0) {
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

    return HID_descriptor.parse(Buffer.from(data.buffer));
}

navigator.hid = {
    connect: connect,
    get_HID_descriptor: get_HID_descriptor
};
