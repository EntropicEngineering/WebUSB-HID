import 'improved-map';

import * as HID from './HID_data';
import * as USB from './USB_data';

import {
    inspect,
    Pass,
    Binary_Map,
    Byte_Buffer,
    Bits,
    Uint,
    Uint8,
    Uint16LE,
    Uint32LE,
    Int8,
    Int16LE,
    Int32LE,
    Embed,
    Padding,
    Branch,
    Repeat,
    hex,
    Encoded_Map,
    Encoded
} from 'binary-structures';

export const Platform_UUIDs = {
    /* python -c "import uuid;print(', '.join(map(hex, uuid.UUID('3408b638-09a9-47a0-8bfd-a0768815b665').bytes_le)))" */
    WebUSB: [0x38, 0xb6, 0x8, 0x34, 0xa9, 0x9, 0xa0, 0x47, 0x8b, 0xfd, 0xa0, 0x76, 0x88, 0x15, 0xb6, 0x65],
    /* python -c "import uuid;print(', '.join(map(hex, uuid.UUID('a8adf97c-6a20-48e4-a97c-79978eec00c7').bytes_le)))" */
    SimpleHID: [0x7c, 0xf9, 0xad, 0xa8, 0x20, 0x6a, 0xe4, 0x48, 0xa9, 0x7c, 0x79, 0x97, 0x8e, 0xec, 0x0, 0xc7]
};

/* Utility functions */
const assert = (func: (data: Encoded) => boolean, message: string) => {
    return {
        decode: <T extends Encoded>(value: T): T => {
            const result = func(value);
            if ( result ) {
                return value;
            } else {
                throw new Error(message + `: ${typeof value === 'number' ? hex(value) : value}`)
            }
        }
    }
};

const get = (name: string) => (context: Encoded_Map) => context.get(name) as number;

export const decode = (data: Encoded_Map) => data.toObject();

export type Data = Parsed | number | Array<Parsed | number>;

export interface Parsed {
    [name: string]: Data;
}

/* Utility Parsers */
let null_parser = Embed(Pass);

let BCD_version = Binary_Map({ decode })
    .set('patch', Bits(4))
    .set('minor', Bits(4))
    .set('major', Uint8);

/* HID Report Parsers */
let input_ouput_feature_size_1 = Embed(Binary_Map()
    .set('data_or_constant', Bits(1))
    .set('array_or_variable', Bits(1))
    .set('absolute_or_relative', Bits(1))
    .set('no_wrap_or_wrap', Bits(1))
    .set('linear_or_nonlinear', Bits(1))
    .set('preferred_state_or_no_preferred', Bits(1))
    .set('no_null_position_or_null_state', Bits(1))
    .set('not_volatile_or_volatile', Bits(1)));

let input_output_feature_size_2 = Embed(Binary_Map()
    .set('embed byte 1', Embed(input_ouput_feature_size_1))
    .set('bit_field_or_buffered_bytes', Bits(1))
    /* Everything following in byte is reserved and should be 0, thus it's ignored. */
    .set('ignored', Padding({ bits: 7 })));

let input_output_feature_size_4 = Embed(Binary_Map()
    .set('embed bytes 1-2', Embed(input_output_feature_size_2))
    .set('padding', Padding({ bytes: 2 })));

let input_output_feature_item = Branch(
    {
        chooser: get('size'),
        choices: {
            0: null_parser,
            1: input_ouput_feature_size_1,
            2: input_output_feature_size_2,
            3: input_output_feature_size_4
        }
    });

let collection = Branch({
    chooser: get('size'),
    choices: { 0: Embed(Binary_Map().set('collection', Padding(0, { decode: () => 0 }))) },
    default_choice: Embed(Binary_Map().set('collection', Uint(8, assert((value: number) => ( value < 0x07 ) || ( value > 0x7F ), 'Invalid collection type'))))
});

let usage = (default_global = true, local_item = "usage_id") => Branch({
    chooser: get('size'),
    choices: {
        0: Embed(Binary_Map().set(default_global ? 'usage_page' : local_item, Padding(0, {decode: () => 0}))),
        1: Embed(Binary_Map().set(default_global ? 'usage_page' : local_item, Uint8)),
        2: Embed(Binary_Map().set(default_global ? 'usage_page' : local_item, Uint16LE)),
        3: Embed(Binary_Map().set(local_item, Uint16LE).set('usage_page', Uint16LE))
    }
});

let sized_int = (name: string) => Embed(Binary_Map().set(name, Branch({
    chooser: get('size'),
    choices: { 1: Int8, 2: Int16LE, 3: Int32LE }
})));

let sized_uint = (name: string) => Embed(Binary_Map().set(name, Branch({
    chooser: get('size'),
    choices: { 1: Uint8, 2: Uint16LE, 3: Uint32LE }
})));

let main_item = Branch({
    chooser: get('tag'),
    choices: {
        [HID.Report_Main_Item_Tag.Input]: input_output_feature_item,
        [HID.Report_Main_Item_Tag.Output]: input_output_feature_item,
        [HID.Report_Main_Item_Tag.Feature]: input_output_feature_item,
        [HID.Report_Main_Item_Tag.Collection]: collection,
        [HID.Report_Main_Item_Tag.End_Collection]: null_parser
    }
});

let global_item = Branch({
    chooser: get('tag'),
    choices: {
        [HID.Report_Global_Item_Tag.Usage_Page]: usage(),
        [HID.Report_Global_Item_Tag.Logical_Minimum]: sized_int('logical_minimum'),
        [HID.Report_Global_Item_Tag.Logical_Maximum]: sized_int('logical_maximum'),
        [HID.Report_Global_Item_Tag.Physical_Minimum]: sized_int('physical_minimum'),
        [HID.Report_Global_Item_Tag.Physical_Maximum]: sized_int('physical_maximum'),
        /* Parsing unit information left as an exercise to the reader. */
        [HID.Report_Global_Item_Tag.Unit_Exponent]: Embed(Binary_Map().set('unit_exponent', Uint(8, {
            decode: (value: number) => {
                value &= 0xF;
                /* Only the first nibble is used */
                if ( value > 7 ) {
                    value -= 0xF;
                    /* 4-bit 2's complement */
                }
                return value;
            }
        }))),
        [HID.Report_Global_Item_Tag.Unit]: Embed(Binary_Map().set('unit', Uint32LE)),
        [HID.Report_Global_Item_Tag.Report_Size]: sized_uint('report_size'),
        [HID.Report_Global_Item_Tag.Report_ID]: Embed(Binary_Map().set('report_id', Uint8)),
        [HID.Report_Global_Item_Tag.Report_Count]: sized_uint('report_count'),
        [HID.Report_Global_Item_Tag.Push]: null_parser,
        [HID.Report_Global_Item_Tag.Pop]: null_parser
    }
});

let local_item = Branch({
    chooser: get('tag'),
    choices: {
        /* Usages left as an exercise to the reader. */
        [HID.Report_Local_Item_Tag.Usage]: usage(false),
        [HID.Report_Local_Item_Tag.Usage_Minimum]: usage(false, 'usage_minimum'),
        [HID.Report_Local_Item_Tag.Usage_Maximum]: usage(false, 'usage_maximum'),
        /* Physical Descriptors left as an exercise to the reader. */
        [HID.Report_Local_Item_Tag.Designator_Index]: sized_uint('designator_index'),
        [HID.Report_Local_Item_Tag.Designator_Minimum]: sized_uint('designator_minimum'),
        [HID.Report_Local_Item_Tag.Designator_Maximum]: sized_uint('designator_maximum'),
        [HID.Report_Local_Item_Tag.String_Index]: sized_uint('string_index'),
        [HID.Report_Local_Item_Tag.String_Minimum]: sized_uint('string_minimum'),
        [HID.Report_Local_Item_Tag.String_Maximum]: sized_uint('string_maximum'),
        [HID.Report_Local_Item_Tag.Delimiter]: sized_uint('delimiter')
    }
});

let short_item = Branch({
    chooser: get('type'),
    choices: {
        [HID.Report_Item_Type.Main]: main_item,
        [HID.Report_Item_Type.Global]: global_item,
        [HID.Report_Item_Type.Local]: local_item
    }
});

let long_item = Embed(Binary_Map()
    .set('data_size', Uint8)
    .set('long_item_tag', Uint(8, assert((tag: number) => ( tag >= 0xF0 ), "Invalid long_item_tag")))
    .set('data', Byte_Buffer(get('data_size'))));

/* exports */
export let HID_item = Binary_Map({ decode })
    .set('size', Bits(2))
    .set('type', Bits(2))
    .set('tag', Bits(4))
    .set('The rest', Branch({
        chooser: (context: Map<string, number>) =>{
            /* context.tag << 4 | context.type << 2 | context.size */
            return context.get('tag')! * 16 + context.get('type')! * 4 + context.get('size')!;
        },
        choices: { 0b11111110: long_item },
        default_choice: short_item
    }));

export let HID_descriptor = Binary_Map({ decode })
    .set('length', Uint8)
    .set('type', Uint(8, assert((data: number) => data === HID.Class_Descriptors.HID, "Invalid Class Descriptor")))
    .set('version', BCD_version)
    .set('country_code', Uint8)
    .set('count', Uint(8, assert((count: number) => count > 0, "Invalid number of descriptors")))
    .set('descriptors', Repeat({ count: get('count') }, Binary_Map({ decode }).set('type', Uint8).set('size', Uint16LE)));

export let languages_string_descriptor = Binary_Map({ decode })
    .set('length', Uint8)
    .set('type', Uint(8, assert((value: number) => value === USB.Descriptor_Type.STRING, "Invalid string descriptor type")))
    .set('LANGID', Repeat({ count: (context) => ( context!.get('length') as number - 2 ) / 2 }, Uint16LE));

const text_decoder = new TextDecoder("utf-16le");
export let string_descriptor = Binary_Map({ decode })
    .set('length', Uint8)
    .set('type', Uint(8, assert((value: number) => value === USB.Descriptor_Type.STRING, "Invalid string descriptor type")))
    .set('string', Byte_Buffer((context: Encoded_Map) => ( context.get('length') as number - 2 ), { decode: (buffer: ArrayBuffer) => text_decoder.decode(buffer) }));

let webusb = Binary_Map({ decode })
    .set('version', BCD_version)
    .set('vendor_code', Uint8)
    .set('landing_page_index', Uint8);

export const enum USAGE {
    page = 'page',
    application = 'application',
    uint = 'uint',
    int = 'int',
    float = 'float',
    bits = 'bits',
    utf8 = 'utf8',
    object = 'object',
    array = 'array'
}

let simpleHID = Binary_Map({ decode })
    .set('version', BCD_version)
    .set(USAGE.page, Uint(16, { little_endian: true, decode: (usage: number) => {
        if ( usage >= 0xFF00 )
            return usage;
         throw new Error(`Invalid Vendor Usage page for SimpleHID Platform Descriptor: ${usage}`);
    }}))
    .set(USAGE.application, Uint16LE)
    .set(USAGE.array, Uint16LE)
    .set(USAGE.object, Uint16LE)
    .set(USAGE.bits, Uint16LE)
    .set(USAGE.uint, Uint16LE)
    .set(USAGE.int, Uint16LE)
    .set(USAGE.float, Uint16LE)
    .set(USAGE.utf8, Uint16LE);

let platform_capability = Embed(Binary_Map()
    .set('reserved', Uint(8, assert((v: number) => v === 0, "Invalid reserved value")))
    .set('uuid', Repeat({ count: 16 }, Uint8))
    .set('platform', Branch({
        chooser: (context: Encoded_Map) => {
            const UUID = context.get('uuid') as Array<number>;
            for ( let [index, uuid] of [Platform_UUIDs.WebUSB, Platform_UUIDs.SimpleHID].entries() ) {
                /* Check for match, because Javascript Arrays can't figure out how to do equality checks */
                if ( uuid.every((v, i) => UUID[i] === v) ) {
                    return index;
                }
            }
            return -1
        },
        choices: {
            0: Embed(Binary_Map().set('webusb', webusb)),
            1: Embed(Binary_Map().set('simpleHID', simpleHID))
        },
        default_choice: Embed(Binary_Map().set('unknown_platform', Byte_Buffer((context: Encoded_Map) => context.get('length') as number - 20)))
    })));

let capability_descriptors = Binary_Map({ decode })
    .set('length', Uint8)
    .set('descriptor_type', Uint(8, assert((data: number) => data === USB.Descriptor_Type.DEVICE_CAPABILITY, "Incorrect descriptor type, should be DEVICE CAPABILITY")))
    .set('type', Uint(8, assert((data: number) => data > 0 && data < 0x0D, "Invalid device capability type")))
    .set('capability', Branch({
        chooser: get('type'),
        choices: { [USB.Capability_Type.PLATFORM]: platform_capability },
        default_choice: Embed(Binary_Map().set('unknown_capability', Byte_Buffer((context: Encoded_Map) => context.get('length') as number - 3)))
    }));

export let BOS_descriptor = Binary_Map({ decode })
    .set('length', Uint8)
    .set('type', Uint(8, assert((data: number) => data === USB.Descriptor_Type.BOS, "Invalid descriptor type, should be BOS")))
    .set('total_length', Uint16LE)
    .set('capability_descriptor_count', Uint8)
    .set('capability_descriptors', Repeat({ count: get('capability_descriptor_count') }, capability_descriptors));
