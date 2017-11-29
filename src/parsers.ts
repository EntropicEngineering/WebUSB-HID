
/* Typescript imports. Comment out in generated js file. */
import * as HID from './HID_data';
import * as USB from './USB_data';

import {Byte_Map, Bits, Uint8, Branch} from 'declarative-binary-serialization';

/* Browser imports. Uncomment in generated js file. */
// import _Parser from './wrapped/binary_parser.js';   let Parser = _Parser.Parser;

export const Platform_UUIDs = {
    /* python -c "import uuid;print(', '.join(map(hex, uuid.UUID('3408b638-09a9-47a0-8bfd-a0768815b665').bytes_le)))" */
    WebUSB: [0x38, 0xb6, 0x8, 0x34, 0xa9, 0x9, 0xa0, 0x47, 0x8b, 0xfd, 0xa0, 0x76, 0x88, 0x15, 0xb6, 0x65],
    /* python -c "import uuid;print(', '.join(map(hex, uuid.UUID('a8adf97c-6a20-48e4-a97c-79978eec00c7').bytes_le)))" */
    SimpleHID: [0x7c, 0xf9, 0xad, 0xa8, 0x20, 0x6a, 0xe4, 0x48, 0xa9, 0x7c, 0x79, 0x97, 0x8e, 0xec, 0x0, 0xc7]
};

/* Because binary-parser uses 'eval' shit, this needs to be in the global namespace */
window.Platform_UUIDs = Platform_UUIDs;

/* Utility Parsers */

let null_parser = Byte_Map();

let BCD_version = Byte_Map({little_endian: true})
    .set('major', Uint8())
    .set('minor', Bits(4))
    .set('patch', Bits(4));

/* HID Report Parsers */

let input_ouput_feature_size_1 = Byte_Map()
    .set('data_or_constant', Bits(1))
    .set('array_or_variable', Bits(1))
    .set('absolute_or_relative', Bits(1))
    .set('no_wrap_or_wrap', Bits(1))
    .set('linear_or_nonlinear', Bits(1))
    .set('preferred_state_or_no_preferred', Bits(1))
    .set('no_null_position_or_null_state', Bits(1))
    .set('not_volatile_or_volatile', Bits(1));

let input_output_feature_size_2 = new Parser()
    .nest('', {type: input_ouput_feature_size_1})
    .bit1('bit_field_or_buffered_bytes');
/* Everything following in byte is reserved and should be 0, thus it's ignored. */

let input_output_feature_size_4 = new Parser()
    .nest('', {type: input_output_feature_size_2})
    .skip(2);

let input_output_feature_item = new Parser()
    .choice('', {
        // tag: function() {return this.size as number},
        tag: 'size',
        choices: {
            0: null_parser,
            1: input_ouput_feature_size_1,
            2: input_output_feature_size_2,
            3: input_output_feature_size_4
        }
    });

let collection = new Parser()
    .choice('', {
        // tag: function() {return this.size as number},
        tag: 'size',
        choices: {0: null_parser},
        defaultChoice: new Parser()
            .uint8('collection', {assert: (value: number) => ((value < 0x07) || (value > 0x7F))})
    });

let usage = (default_global = true, local_item = "usage_id"): Parser => new Parser()
    .choice('', {
        // tag: function() {return this.size as number},
        tag: 'size',
        choices: {
            1: new Parser().endianess('little').uint8(default_global ? 'usage_page' : local_item),
            2: new Parser().endianess('little').uint16(default_global ? 'usage_page' : local_item),
            3: new Parser().endianess('little').uint16(local_item).uint16('usage_page')
        }
    });

let sized_int = (name: string): Parser => {
    return new Parser()
        .choice('', {
            // tag: function() {return this.size as number},
            tag: 'size',
            choices: {
                1: new Parser().int8(name),
                2: new Parser().endianess('little').int16(name),
                3: new Parser().endianess('little').int32(name)
            }
        })
};

let sized_uint = (name: string): Parser => {
    return new Parser()
        .choice('', {
            // tag: function() {return this.size as number},
            tag: 'size',
            choices: {
                1: new Parser().uint8(name),
                2: new Parser().endianess('little').uint16(name),
                3: new Parser().endianess('little').uint32(name)
            }
        })
};

let main_item = new Parser()
    .choice('', {
        // tag: function() {return this.tag as number},
        tag: 'tag',
        choices: {
            [HID.Report_Main_Item_Tag.Input]: input_output_feature_item,
            [HID.Report_Main_Item_Tag.Output]: input_output_feature_item,
            [HID.Report_Main_Item_Tag.Feature]: input_output_feature_item,
            [HID.Report_Main_Item_Tag.Collection]: collection,
            [HID.Report_Main_Item_Tag.End_Collection]: null_parser
        }
    });

let global_item = new Parser()
    .choice('', {
        // tag: function() {return this.tag as number},
        tag: 'tag',
        choices: {
            [HID.Report_Global_Item_Tag.Usage_Page]: usage(),
            [HID.Report_Global_Item_Tag.Logical_Minimum]: sized_int('logical_minimum'),
            [HID.Report_Global_Item_Tag.Logical_Maximum]: sized_int('logical_maximum'),
            [HID.Report_Global_Item_Tag.Physical_Minimum]: sized_int('physical_minimum'),
            [HID.Report_Global_Item_Tag.Physical_Maximum]: sized_int('physical_maximum'),
            /* Parsing unit information left as an exercise to the reader. */
            [HID.Report_Global_Item_Tag.Unit_Exponent]: new Parser().uint8('unit_exponent', {formatter: (value: number) => {
                value &= 0xF;    /* Only the first nibble is used */
                if (value > 7) { value -= 0xF;   /* 4-bit 2's complement */ }
                return value;
            }}),
            [HID.Report_Global_Item_Tag.Unit]: new Parser().endianess('little').uint32('unit'),
            [HID.Report_Global_Item_Tag.Report_Size]: sized_uint('report_size'),
            [HID.Report_Global_Item_Tag.Report_ID]: new Parser().uint8('report_id'),
            [HID.Report_Global_Item_Tag.Report_Count]: sized_uint('report_count'),
            [HID.Report_Global_Item_Tag.Push]: null_parser,
            [HID.Report_Global_Item_Tag.Pop]: null_parser
        }
    });

let local_item = new Parser()
    .choice('', {
        // tag: function() {return this.tag as number},
        tag: 'tag',
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

let short_item = new Parser()
    .choice('', {
        // tag: function() {return this.tag as number},
        tag: 'type',
        choices: {
            [HID.Report_Item_Type.Main]: main_item,
            [HID.Report_Item_Type.Global]: global_item,
            [HID.Report_Item_Type.Local]: local_item
        }
    });

let long_item = new Parser()
    .endianess('little')
    .uint8('data_size')
    .uint8('long_item_tag', {assert: (tag: number) => (tag >= 0xF0)})
    .buffer('data', {length: 'data_size'});

/* exports */

export let item = new Parser()
    .endianess('little')
    .bit2('size')
    .bit2('type', {
        assert: (type: number) => (type !== 3)  /* Reserved value */    /* Not actually checked because of https://github.com/keichi/binary-parser/issues/56 */
    })
    .bit4('tag')
    .choice('', {
        // tag: function() {return parsed.tag << 4 | parsed.type << 2 | parsed.size},
        tag: function() {return (<number>this.tag * 16 + <number>this.type * 4 + <number>this.size)},
        choices: {0b11111110: long_item},
        defaultChoice: short_item
    });

export let HID_descriptor = new Parser()
    .endianess('little')
    .uint8('length')
    .uint8('type', {assert: HID.Class_Descriptors.HID})
    .nest('version', {type: BCD_version})
    .uint8('country_code')
    .uint8('count', {assert: (count: number) => (count > 0)})
    .array('descriptors', {
        type: new Parser()
            .endianess('little')
            .uint8('type')
            .uint16('size'),
        length: function() {return this.count as number}
    })
    .array('extra', {
        type: 'uint8',
        readUntil: 'eof',
        assert: (array: Array<number>) => (array.length === 0)
    });

export let languages_string_descriptor = new Parser()
    .endianess('little')
    .uint8('length')
    .uint8('type', {assert: USB.Descriptor_Type.STRING})
    .array('LANGID', {
        type: 'uint16le',
        lengthInBytes: function() {return <number>this.length - 2}
    });

export let string_descriptor = new Parser()
    .endianess('little')
    .uint8('length')
    .uint8('type', {assert: USB.Descriptor_Type.STRING})
    .string('string', {
        encoding: 'utf16le',
        length: function() {return <number>this.length - 2},
        stripNull: true,
    });

let webusb = new Parser()
    .nest('version', {type: BCD_version})
    .uint8('vendor_code')
    .uint8('landing_page_index');

export const enum USAGE{
    page        = 'page',
    application = 'application',
    uint        = 'uint',
    int         = 'int',
    float       = 'float',
    bits        = 'bits',
    utf8        = 'utf8',
    object      = 'object',
    array       = 'array'
}

let webusb_hid = new Parser()
    .endianess('little')
    .nest('version', {type: BCD_version})
    .uint16(USAGE.page, {assert: (usage: number) => usage >= 0xFF00})
    .uint16(USAGE.application)
    .uint16(USAGE.uint)
    .uint16(USAGE.int)
    .uint16(USAGE.float)
    .uint16(USAGE.bits)
    .uint16(USAGE.utf8)
    .uint16(USAGE.object)
    .uint16(USAGE.array);

let platform_capability = new Parser()
    .endianess('little')
    .uint8('reserved', {assert: 0})
    .array('uuid', {
        type: 'uint8',
        lengthInBytes: 16
    })
    .choice('', {
        tag: function () {  /* WTF, javascript, [0, 1] === [0, 1] is false?! */
            for (let [index, uuid] of [Platform_UUIDs.WebUSB, Platform_UUIDs.SimpleHID].entries()) {
                /* Check for match, because Javascript Arrays can't figure out how to do equality checks */
                if (uuid.every((v, i) => (<Array<number>>this.uuid)[i] === v))
                    return index;
            }
            return -1
        },
        choices: {
            0: new Parser().nest('webusb', {type: webusb}),
            1: new Parser().nest('webusb_hid', {type: webusb_hid}),
        },
        defaultChoice: new Parser().buffer('unknown_platform', {length: function () { return <number>this.length - 20 }})
    });

let capability_descriptors = new Parser()
    .endianess('little')
    .uint8('length')
    .uint8('descriptor_type', {assert: USB.Descriptor_Type.DEVICE_CAPABILITY})
    .uint8('type', {assert: function (n) {return n > 0 && n < 0x0D}})
    .choice('', {
        tag: 'type',
        choices: {
            [USB.Capability_Type.PLATFORM]: platform_capability
        },
        defaultChoice: new Parser().buffer('unknown_capability', {length: function () { return <number>this.length - 3 }})
    });

export let BOS_descriptor = new Parser()
    .endianess('little')
    .uint8('length')
    .uint8('type', {assert: USB.Descriptor_Type.BOS})
    .uint16('total_length')
    .uint8('capability_descriptor_count')
    .array('capability_descriptors', {
        type: capability_descriptors,
        lengthInBytes: function () {return <number>this.total_length - 5 /* byte length of BOS header */}
    });
