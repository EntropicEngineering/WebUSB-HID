
/* Typescript imports. Comment out in generated js file. */
import Parser from 'binary-parser';
import * as HID from './HID_data';

/* Browser imports. Uncomment in generated js file. */
// import _Parser from './wrapped/binary_parser.js';   let Parser = _Parser.Parser;

/* Utility Parsers */

let null_parser = new Parser().namely('null_parser');

let BCD_version = new Parser()
    .endianess(Parser.Endianness.little)
    .uint8('major')
    .bit4('minor')
    .bit4('patch');

/* HID Report Parsers */

let input_ouput_feature_size_1 = new Parser()
    .bit1('data_Vs_constant')
    .bit1('array_Vs_variable')
    .bit1('absolute_Vs_relative')
    .bit1('no_wrap_Vs_wrap')
    .bit1('linear_Vs_non_linear')
    .bit1('preferred_state_Vs_no_preferred')
    .bit1('no_null_position_Vs_null_state')
    .bit1('not_volitile_Vs_volitie');
// .uint8('byte0');

let input_output_feature_size_2 = new Parser()
    .nest('', {type: input_ouput_feature_size_1})
    .bit1('bit_field_Vs_buffered_bytes');
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

let usage = (default_global = true, local_item = "usage_ID"): Parser => new Parser()
    .choice('', {
        // tag: function() {return this.size as number},
        tag: 'size',
        choices: {
            1: new Parser().endianess(Parser.Endianness.little).uint8(default_global ? 'usage_page' : local_item),
            2: new Parser().endianess(Parser.Endianness.little).uint16(default_global ? 'usage_page' : local_item),
            3: new Parser().endianess(Parser.Endianness.little).uint16(local_item).uint16('usage_page')
        }
    });

let sized_int = (name: string): Parser => {
    return new Parser()
        .choice('', {
            // tag: function() {return this.size as number},
            tag: 'size',
            choices: {
                1: new Parser().int8(name),
                2: new Parser().endianess(Parser.Endianness.little).int16(name),
                3: new Parser().endianess(Parser.Endianness.little).int32(name)
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
                2: new Parser().endianess(Parser.Endianness.little).uint16(name),
                3: new Parser().endianess(Parser.Endianness.little).uint32(name)
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
            [HID.Report_Global_Item_Tag.Unit_Exponent]: new Parser().uint8('unit_exponent'),
            [HID.Report_Global_Item_Tag.Unit]: new Parser().endianess(Parser.Endianness.little).uint32('unit'),
            [HID.Report_Global_Item_Tag.Report_Size]: sized_uint('report_size'),
            [HID.Report_Global_Item_Tag.Report_ID]: new Parser().uint8('report_ID'),
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
    .endianess(Parser.Endianness.little)
    .uint8('data_size')
    .uint8('long_item_tag', {assert: (tag: number) => (tag >= 0xF0)})
    .buffer('data', {length: 'data_size'});

/* exports */

export let item = new Parser()
    .endianess(Parser.Endianness.little)
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
    .endianess(Parser.Endianness.little)
    .uint8('length')
    .uint8('type', {assert: HID.Class_Descriptors.HID})
    .nest('version', {type: BCD_version})
    .uint8('country_code')
    .uint8('count', {assert: (count: number) => (count > 0)})
    .array('descriptors', {
        type: new Parser()
            .endianess(Parser.Endianness.little)
            .uint8('type')
            .uint16('size'),
        length: function() {return this.count as number}
    })
    .array('extra', {
        type: 'uint8',
        readUntil: 'eof',
        assert: (array: Array<number>) => (array.length === 0)
    });
