/* Typescript imports. Comment out in generated js file. */
// import Parser from 'binary-parser';
// import * as HID from './HID_data';
// import * as USB from './USB_data';
// /* Browser imports. Uncomment in generated js file. */
import _Parser from './wrapped/binary_parser.js';   let Parser = _Parser.Parser;
/* Utility Parsers */
let null_parser = new Parser().namely('null_parser');
let BCD_version = new Parser()
    .endianess("little" /* little */)
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
        1: new Parser().endianess("little" /* little */).uint8(default_global ? 'usage_page' : local_item),
        2: new Parser().endianess("little" /* little */).uint16(default_global ? 'usage_page' : local_item),
        3: new Parser().endianess("little" /* little */).uint16(local_item).uint16('usage_page')
    }
});
let sized_int = (name) => {
    return new Parser()
        .choice('', {
        // tag: function() {return this.size as number},
        tag: 'size',
        choices: {
            1: new Parser().int8(name),
            2: new Parser().endianess("little" /* little */).int16(name),
            3: new Parser().endianess("little" /* little */).int32(name)
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
            2: new Parser().endianess("little" /* little */).uint16(name),
            3: new Parser().endianess("little" /* little */).uint32(name)
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
        [6 /* Unit */]: new Parser().endianess("little" /* little */).uint32('unit'),
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
    .endianess("little" /* little */)
    .uint8('data_size')
    .uint8('long_item_tag', { assert: (tag) => (tag >= 0xF0) })
    .buffer('data', { length: 'data_size' });
/* exports */
export let item = new Parser()
    .endianess("little" /* little */)
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
    .endianess("little" /* little */)
    .uint8('length')
    .uint8('type', { assert: 33 /* HID */ })
    .nest('version', { type: BCD_version })
    .uint8('country_code')
    .uint8('count', { assert: (count) => (count > 0) })
    .array('descriptors', {
    type: new Parser()
        .endianess("little" /* little */)
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
    .endianess("little" /* little */)
    .uint8('length')
    .uint8('type', { assert: 3 /* STRING */ })
    .array('LANGID', {
    type: 'uint16le',
    lengthInBytes: function () { return this.length - 2; }
});
export let string_descriptor = new Parser()
    .endianess("little" /* little */)
    .uint8('length')
    .uint8('type', { assert: 3 /* STRING */ })
    .string('string', {
    encoding: 'utf16le',
    length: function () { return this.length - 2; },
    stripNull: true,
});
//# sourceMappingURL=parsers.js.map