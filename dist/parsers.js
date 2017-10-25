/* Typescript imports. Comment out in generated js file. */
// import Parser from 'binary-parser';
// import * as HID from './HID_data';
// import * as USB from './USB_data';
// /* Browser imports. Uncomment in generated js file. */
import _Parser from './wrapped/binary_parser.js';   let Parser = _Parser.Parser;
export const Platform_UUIDs = {
    /* python -c "import uuid;print(', '.join(map(hex, uuid.UUID('3408b638-09a9-47a0-8bfd-a0768815b665').bytes_le)))" */
    WebUSB: [0x38, 0xb6, 0x8, 0x34, 0xa9, 0x9, 0xa0, 0x47, 0x8b, 0xfd, 0xa0, 0x76, 0x88, 0x15, 0xb6, 0x65],
    /* python -c "import uuid;print(', '.join(map(hex, uuid.UUID('a8adf97c-6a20-48e4-a97c-79978eec00c7').bytes_le)))" */
    WebUSB_HID: [0x7c, 0xf9, 0xad, 0xa8, 0x20, 0x6a, 0xe4, 0x48, 0xa9, 0x7c, 0x79, 0x97, 0x8e, 0xec, 0x0, 0xc7]
};
/* Because binary-parser uses 'eval' shit, this needs to be in the global namespace */
window.Platform_UUIDs = Platform_UUIDs;
/* Utility Parsers */
let null_parser = new Parser().namely('null_parser');
let BCD_version = new Parser()
    .endianess('little')
    .uint8('major')
    .bit4('minor')
    .bit4('patch');
/* HID Report Parsers */
let input_ouput_feature_size_1 = new Parser()
    .bit1('data_or_constant')
    .bit1('array_or_variable')
    .bit1('absolute_or_relative')
    .bit1('no_wrap_or_wrap')
    .bit1('linear_or_non_linear')
    .bit1('preferred_state_or_no_preferred')
    .bit1('no_null_position_or_null_state')
    .bit1('not_volitile_or_volitie');
// .uint8('byte0');
let input_output_feature_size_2 = new Parser()
    .nest('', { type: input_ouput_feature_size_1 })
    .bit1('bit_field_or_buffered_bytes');
/* Everything following in byte is reserved and should be 0, thus it's ignored. */
let input_output_feature_size_4 = new Parser()
    .nest('', { type: input_output_feature_size_2 })
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
    choices: { 0: null_parser },
    defaultChoice: new Parser()
        .uint8('collection', { assert: (value) => ((value < 0x07) || (value > 0x7F)) })
});
let usage = (default_global = true, local_item = "usage_id") => new Parser()
    .choice('', {
    // tag: function() {return this.size as number},
    tag: 'size',
    choices: {
        1: new Parser().endianess('little').uint8(default_global ? 'usage_page' : local_item),
        2: new Parser().endianess('little').uint16(default_global ? 'usage_page' : local_item),
        3: new Parser().endianess('little').uint16(local_item).uint16('usage_page')
    }
});
let sized_int = (name) => {
    return new Parser()
        .choice('', {
        // tag: function() {return this.size as number},
        tag: 'size',
        choices: {
            1: new Parser().int8(name),
            2: new Parser().endianess('little').int16(name),
            3: new Parser().endianess('little').int32(name)
        }
    });
};
let sized_uint = (name) => {
    return new Parser()
        .choice('', {
        // tag: function() {return this.size as number},
        tag: 'size',
        choices: {
            1: new Parser().uint8(name),
            2: new Parser().endianess('little').uint16(name),
            3: new Parser().endianess('little').uint32(name)
        }
    });
};
let main_item = new Parser()
    .choice('', {
    // tag: function() {return this.tag as number},
    tag: 'tag',
    choices: {
        [8 /* Input */]: input_output_feature_item,
        [9 /* Output */]: input_output_feature_item,
        [11 /* Feature */]: input_output_feature_item,
        [10 /* Collection */]: collection,
        [12 /* End_Collection */]: null_parser
    }
});
let global_item = new Parser()
    .choice('', {
    // tag: function() {return this.tag as number},
    tag: 'tag',
    choices: {
        [0 /* Usage_Page */]: usage(),
        [1 /* Logical_Minimum */]: sized_int('logical_minimum'),
        [2 /* Logical_Maximum */]: sized_int('logical_maximum'),
        [3 /* Physical_Minimum */]: sized_int('physical_minimum'),
        [4 /* Physical_Maximum */]: sized_int('physical_maximum'),
        /* Parsing unit information left as an exercise to the reader. */
        [5 /* Unit_Exponent */]: new Parser().uint8('unit_exponent', { formatter: (value) => {
                value &= 0xF; /* Only the first nibble is used */
                if (value > 7) {
                    value -= 0xF; /* 4-bit 2's complement */
                }
                return value;
            } }),
        [6 /* Unit */]: new Parser().endianess('little').uint32('unit'),
        [7 /* Report_Size */]: sized_uint('report_size'),
        [8 /* Report_ID */]: new Parser().uint8('report_id'),
        [9 /* Report_Count */]: sized_uint('report_count'),
        [10 /* Push */]: null_parser,
        [11 /* Pop */]: null_parser
    }
});
let local_item = new Parser()
    .choice('', {
    // tag: function() {return this.tag as number},
    tag: 'tag',
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
let short_item = new Parser()
    .choice('', {
    // tag: function() {return this.tag as number},
    tag: 'type',
    choices: {
        [0 /* Main */]: main_item,
        [1 /* Global */]: global_item,
        [2 /* Local */]: local_item
    }
});
let long_item = new Parser()
    .endianess('little')
    .uint8('data_size')
    .uint8('long_item_tag', { assert: (tag) => (tag >= 0xF0) })
    .buffer('data', { length: 'data_size' });
/* exports */
export let item = new Parser()
    .endianess('little')
    .bit2('size')
    .bit2('type', {
    assert: (type) => (type !== 3) /* Reserved value */ /* Not actually checked because of https://github.com/keichi/binary-parser/issues/56 */
})
    .bit4('tag')
    .choice('', {
    // tag: function() {return parsed.tag << 4 | parsed.type << 2 | parsed.size},
    tag: function () { return (this.tag * 16 + this.type * 4 + this.size); },
    choices: { 0b11111110: long_item },
    defaultChoice: short_item
});
export let HID_descriptor = new Parser()
    .endianess('little')
    .uint8('length')
    .uint8('type', { assert: 33 /* HID */ })
    .nest('version', { type: BCD_version })
    .uint8('country_code')
    .uint8('count', { assert: (count) => (count > 0) })
    .array('descriptors', {
    type: new Parser()
        .endianess('little')
        .uint8('type')
        .uint16('size'),
    length: function () { return this.count; }
})
    .array('extra', {
    type: 'uint8',
    readUntil: 'eof',
    assert: (array) => (array.length === 0)
});
export let languages_string_descriptor = new Parser()
    .endianess('little')
    .uint8('length')
    .uint8('type', { assert: 3 /* STRING */ })
    .array('LANGID', {
    type: 'uint16le',
    lengthInBytes: function () { return this.length - 2; }
});
export let string_descriptor = new Parser()
    .endianess('little')
    .uint8('length')
    .uint8('type', { assert: 3 /* STRING */ })
    .string('string', {
    encoding: 'utf16le',
    length: function () { return this.length - 2; },
    stripNull: true,
});
let webusb = new Parser()
    .nest('version', { type: BCD_version })
    .uint8('vendor_code')
    .uint8('landing_page_index');
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
let webusb_hid = new Parser()
    .endianess('little')
    .nest('version', { type: BCD_version })
    .uint16("page" /* page */, { assert: (usage) => usage >= 0xFF00 })
    .uint16("application" /* application */)
    .uint16("uint" /* uint */)
    .uint16("int" /* int */)
    .uint16("float" /* float */)
    .uint16("bits" /* bits */)
    .uint16("utf8" /* utf8 */)
    .uint16("object" /* object */)
    .uint16("array" /* array */);
let platform_capability = new Parser()
    .endianess('little')
    .uint8('reserved', { assert: 0 })
    .array('uuid', {
    type: 'uint8',
    lengthInBytes: 16
})
    .choice('', {
    tag: function () {
        for (let [index, uuid] of [Platform_UUIDs.WebUSB, Platform_UUIDs.WebUSB_HID].entries()) {
            /* Check for match, because Javascript Arrays can't figure out how to do equality checks */
            if (uuid.every((v, i) => this.uuid[i] === v))
                return index;
        }
        return -1;
    },
    choices: {
        0: new Parser().nest('webusb', { type: webusb }),
        1: new Parser().nest('webusb_hid', { type: webusb_hid }),
    },
    defaultChoice: new Parser().buffer('unknown_platform', { length: function () { return this.length - 20; } })
});
let capability_descriptors = new Parser()
    .endianess('little')
    .uint8('length')
    .uint8('descriptor_type', { assert: 16 /* DEVICE_CAPABILITY */ })
    .uint8('type', { assert: function (n) { return n > 0 && n < 0x0D; } })
    .choice('', {
    tag: 'type',
    choices: {
        [5 /* PLATFORM */]: platform_capability
    },
    defaultChoice: new Parser().buffer('unknown_capability', { length: function () { return this.length - 3; } })
});
export let BOS_descriptor = new Parser()
    .endianess('little')
    .uint8('length')
    .uint8('type', { assert: 15 /* BOS */ })
    .uint16('total_length')
    .uint8('capability_descriptor_count')
    .array('capability_descriptors', {
    type: capability_descriptors,
    lengthInBytes: function () { return this.total_length - 5; /* byte length of BOS header */ }
});
//# sourceMappingURL=parsers.js.map