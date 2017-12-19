import 'improved-map';
import * as HID from './HID_data';
import * as USB from './USB_data';
import { Pass, Binary_Map, Byte_Buffer, Bits, Uint, Uint8, Uint16LE, Uint32LE, Int8, Int16LE, Int32LE, Embed, Padding, Branch, Repeat, hex } from 'binary-structures';
/* Browser imports. Uncomment in generated js file. */
// import './wrapped/improved-map.js'
// import { Pass, Binary_Map, Byte_Buffer, Bits, Uint, Uint8, Uint16LE, Uint32LE, Int8, Int16LE, Int32LE, Embed, Padding, Branch, Repeat, hex } from './wrapped/binary-structures.js';
export const Platform_UUIDs = {
    /* python -c "import uuid;print(', '.join(map(hex, uuid.UUID('3408b638-09a9-47a0-8bfd-a0768815b665').bytes_le)))" */
    WebUSB: [0x38, 0xb6, 0x8, 0x34, 0xa9, 0x9, 0xa0, 0x47, 0x8b, 0xfd, 0xa0, 0x76, 0x88, 0x15, 0xb6, 0x65],
    /* python -c "import uuid;print(', '.join(map(hex, uuid.UUID('a8adf97c-6a20-48e4-a97c-79978eec00c7').bytes_le)))" */
    SimpleHID: [0x7c, 0xf9, 0xad, 0xa8, 0x20, 0x6a, 0xe4, 0x48, 0xa9, 0x7c, 0x79, 0x97, 0x8e, 0xec, 0x0, 0xc7]
};
/* Utility functions */
const assert = (func, message) => {
    return {
        decode: (value) => {
            const result = func(value);
            if (result) {
                return value;
            }
            else {
                throw new Error(message + `: ${typeof value === 'number' ? hex(value) : value}`);
            }
        }
    };
};
const get = (name) => (context) => context.get(name);
export const decode = (data) => data.toObject();
/* Utility Parsers */
let null_parser = Pass;
let BCD_version = Binary_Map({ decode })
    .set('major', Uint8)
    .set('minor', Bits(4))
    .set('patch', Bits(4));
/* HID Report Parsers */
let input_ouput_feature_size_1 = Binary_Map()
    .set('data_or_constant', Bits(1))
    .set('array_or_variable', Bits(1))
    .set('absolute_or_relative', Bits(1))
    .set('no_wrap_or_wrap', Bits(1))
    .set('linear_or_nonlinear', Bits(1))
    .set('preferred_state_or_no_preferred', Bits(1))
    .set('no_null_position_or_null_state', Bits(1))
    .set('not_volatile_or_volatile', Bits(1));
let input_output_feature_size_2 = Binary_Map()
    .set('embed byte 1', Embed(input_ouput_feature_size_1))
    .set('bit_field_or_buffered_bytes', Bits(1))
    .set('ignored', Padding({ bits: 7 }));
let input_output_feature_size_4 = Binary_Map()
    .set('embed bytes 1-2', Embed(input_output_feature_size_2))
    .set('padding', Padding({ bytes: 2 }));
let input_output_feature_item = Branch({
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
    choices: { 0: null_parser },
    default_choice: Uint(8, assert((value) => (value < 0x07) || (value > 0x7F), 'Invalid collection type'))
});
let usage = (default_global = true, local_item = "usage_id") => Branch({
    chooser: get('size'),
    choices: {
        1: Binary_Map().set(default_global ? 'usage_page' : local_item, Uint8),
        2: Binary_Map().set(default_global ? 'usage_page' : local_item, Uint16LE),
        3: Binary_Map().set(local_item, Uint16LE).set('usage_page', Uint16LE)
    }
});
let sized_int = (name) => Binary_Map().set(name, Branch({
    chooser: get('size'),
    choices: { 1: Int8, 2: Int16LE, 3: Int32LE }
}));
let sized_uint = (name) => Binary_Map().set(name, Branch({
    chooser: get('size'),
    choices: { 1: Uint8, 2: Uint16LE, 3: Uint32LE }
}));
// let sized_uint = (name: string): Parser => {
//     return new Parser()
//         .choice('', {
//             // tag: function() {return this.size as number},
//             tag: 'size',
//             choices: {
//                 1: new Parser().uint8(name),
//                 2: new Parser().endianess('little').uint16(name),
//                 3: new Parser().endianess('little').uint32(name)
//             }
//         })
// };
let main_item = Branch({
    chooser: get('tag'),
    choices: {
        [8 /* Input */]: input_output_feature_item,
        [9 /* Output */]: input_output_feature_item,
        [11 /* Feature */]: input_output_feature_item,
        [10 /* Collection */]: collection,
        [12 /* End_Collection */]: null_parser
    }
});
let global_item = Branch({
    chooser: get('tag'),
    choices: {
        [0 /* Usage_Page */]: usage(),
        [1 /* Logical_Minimum */]: sized_int('logical_minimum'),
        [2 /* Logical_Maximum */]: sized_int('logical_maximum'),
        [3 /* Physical_Minimum */]: sized_int('physical_minimum'),
        [4 /* Physical_Maximum */]: sized_int('physical_maximum'),
        /* Parsing unit information left as an exercise to the reader. */
        [5 /* Unit_Exponent */]: Binary_Map().set('unit_exponent', Uint(8, {
            decode: (value) => {
                value &= 0xF;
                /* Only the first nibble is used */
                if (value > 7) {
                    value -= 0xF;
                    /* 4-bit 2's complement */
                }
                return value;
            }
        })),
        [6 /* Unit */]: Binary_Map().set('unit', Uint32LE),
        [7 /* Report_Size */]: sized_uint('report_size'),
        [8 /* Report_ID */]: Binary_Map().set('report_id', Uint8),
        [9 /* Report_Count */]: sized_uint('report_count'),
        [10 /* Push */]: null_parser,
        [11 /* Pop */]: null_parser
    }
});
let local_item = Branch({
    chooser: get('tag'),
    choices: {
        /* Usages left as an exercise to the reader. */
        [0 /* Usage */]: usage(false),
        [1 /* Usage_Minimum */]: usage(false, 'usage_minimum'),
        [2 /* Usage_Maximum */]: usage(false, 'usage_maximum'),
        /* Physical Descriptors left as an exercise to the reader. */
        [3 /* Designator_Index */]: sized_uint('designator_index'),
        [4 /* Designator_Minimum */]: sized_uint('designator_minimum'),
        [5 /* Designator_Maximum */]: sized_uint('designator_maximum'),
        [7 /* String_Index */]: sized_uint('string_index'),
        [8 /* String_Minimum */]: sized_uint('string_minimum'),
        [9 /* String_Maximum */]: sized_uint('string_maximum'),
        [10 /* Delimiter */]: sized_uint('delimiter')
    }
});
let short_item = Branch({
    chooser: get('type'),
    choices: {
        [0 /* Main */]: main_item,
        [1 /* Global */]: global_item,
        [2 /* Local */]: local_item
    }
});
let long_item = Binary_Map()
    .set('data_size', Uint8)
    .set('long_item_tag', Uint(8, assert((tag) => (tag >= 0xF0), "Invalid long_item_tag")))
    .set('data', Byte_Buffer(get('data_size')));
/* exports */
export let HID_item = Binary_Map({ decode })
    .set('size', Bits(2))
    .set('type', Bits(2))
    .set('tag', Bits(4))
    .set('The rest', Embed(Branch({
    /* context.tag << 4 | context.type << 2 | context.size */
    chooser: (context) => context.get('tag') * 16 + context.get('type') * 4 + context.get('size'),
    choices: { 0b11111110: long_item },
    default_choice: short_item
})));
export let HID_descriptor = Binary_Map({ decode })
    .set('length', Uint8)
    .set('type', Uint(8, assert((data) => data === 33 /* HID */, "Invalid Class Descriptor")))
    .set('version', BCD_version)
    .set('country_code', Uint8)
    .set('count', Uint(8, assert((count) => count > 0, "Invalid number of descriptors")))
    .set('descriptors', Repeat({ count: get('count') }, Binary_Map({ decode }).set('type', Uint8).set('size', Uint16LE)));
export let languages_string_descriptor = Binary_Map({ decode })
    .set('length', Uint8)
    .set('type', Uint(8, assert((value) => value === 3 /* STRING */, "Invalid string descriptor type")))
    .set('LANGID', Repeat({ count: (context) => (context.get('length') - 2) / 2 }, Uint16LE));
const text_decoder = new TextDecoder("utf-16le");
export let string_descriptor = Binary_Map({ decode })
    .set('length', Uint8)
    .set('type', Uint(8, assert((value) => value === 3 /* STRING */, "Invalid string descriptor type")))
    .set('string', Byte_Buffer((context) => (context.get('length') - 2), { decode: (buffer) => text_decoder.decode(buffer) }));
let webusb = Binary_Map()
    .set('version', BCD_version)
    .set('vendor_code', Uint8)
    .set('landing_page_index', Uint8);
export var USAGE;
(function (USAGE) {
    USAGE["page"] = "page";
    USAGE["application"] = "application";
    USAGE["uint"] = "uint";
    USAGE["int"] = "int";
    USAGE["float"] = "float";
    USAGE["bits"] = "bits";
    USAGE["utf8"] = "utf8";
    USAGE["object"] = "object";
    USAGE["array"] = "array";
})(USAGE || (USAGE = {}));
let simpleHID = Binary_Map()
    .set('version', BCD_version)
    .set("page" /* page */, Uint(16, { little_endian: true, decode: (usage) => usage >= 0xFF00 }))
    .set("application" /* application */, Uint16LE)
    .set("uint" /* uint */, Uint16LE)
    .set("int" /* int */, Uint16LE)
    .set("float" /* float */, Uint16LE)
    .set("bits" /* bits */, Uint16LE)
    .set("utf8" /* utf8 */, Uint16LE)
    .set("object" /* object */, Uint16LE)
    .set("array" /* array */, Uint16LE);
let platform_capability = Binary_Map()
    .set('reserved', Uint(8, assert((v) => v === 0, "Invalid reserved value")))
    .set('uuid', Repeat({ count: 16 }, Uint8))
    .set('platform', Embed(Branch({
    chooser: (context) => {
        const UUID = context.get('uuid');
        for (let [index, uuid] of [Platform_UUIDs.WebUSB, Platform_UUIDs.SimpleHID].entries()) {
            /* Check for match, because Javascript Arrays can't figure out how to do equality checks */
            if (uuid.every((v, i) => UUID[i] === v)) {
                return index;
            }
        }
        return -1;
    },
    choices: {
        0: Binary_Map().set('webusb', webusb),
        1: Binary_Map().set('simpleHID', simpleHID)
    },
    default_choice: Binary_Map().set('unknown_platform', Byte_Buffer((context) => context.get('length') - 20))
})));
let capability_descriptors = Binary_Map({ decode })
    .set('length', Uint8)
    .set('descriptor_type', Uint(8, assert((data) => data === 16 /* DEVICE_CAPABILITY */, "Incorrect descriptor type, should be DEVICE CAPABILITY")))
    .set('type', Uint(8, assert((data) => data > 0 && data < 0x0D, "Invalid device capability type")))
    .set('capability', Embed(Branch({
    chooser: get('type'),
    choices: { [5 /* PLATFORM */]: platform_capability },
    default_choice: Binary_Map().set('unknown_capability', Byte_Buffer((context) => context.get('length') - 3))
})));
export let BOS_descriptor = Binary_Map({ decode })
    .set('length', Uint8)
    .set('type', Uint(8, assert((data) => data === 15 /* BOS */, "Invalid descriptor type, should be BOS")))
    .set('total_length', Uint16LE)
    .set('capability_descriptor_count', Uint8)
    .set('capability_descriptors', Repeat({ count: get('capability_descriptor_count') }, capability_descriptors));
//# sourceMappingURL=parsers.js.map