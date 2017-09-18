/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */
/* Typescript imports. Comment out in generated js file. */
/// <reference path="../typings/binary_parser.d.ts"/>
/// <reference path="../typings/buffer.d.ts"/>
// import Parser from 'binary-parser';
// import Buffer from 'buffer';
/* Browser imports. Uncomment in generated js file. */
import _Parser from './wrapped/binary_parser.js';   let Parser = _Parser.Parser;
import _Buffer from './wrapped/buffer.js';  let Buffer = _Buffer.Buffer;
/* binary-parser expects Buffer global object. */
window.Buffer = Buffer;
/*************
 * Utilities *
 *************/
function hex(buffer) {
    Array.from(new Uint8Array(buffer), arg => "0x" + arg.toString(16).padStart(2, "0")).join(", ");
}
function log(message) {
    return (parsed) => {
        console.log(`${message}: ${parsed}`);
        return true;
    };
}
class USBError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'USBError';
        this.status = status;
    }
}
/******************
 * HID Data Types *
 ******************/
var HID_Class_Descriptors;
(function (HID_Class_Descriptors) {
    HID_Class_Descriptors[HID_Class_Descriptors["HID"] = 33] = "HID";
    HID_Class_Descriptors[HID_Class_Descriptors["Report"] = 34] = "Report";
    HID_Class_Descriptors[HID_Class_Descriptors["Physical"] = 35] = "Physical";
})(HID_Class_Descriptors || (HID_Class_Descriptors = {}));
var HID_Report_Item_Type;
(function (HID_Report_Item_Type) {
    HID_Report_Item_Type[HID_Report_Item_Type["Main"] = 0] = "Main";
    HID_Report_Item_Type[HID_Report_Item_Type["Global"] = 1] = "Global";
    HID_Report_Item_Type[HID_Report_Item_Type["Local"] = 2] = "Local";
    HID_Report_Item_Type[HID_Report_Item_Type["Reserved"] = 3] = "Reserved";
})(HID_Report_Item_Type || (HID_Report_Item_Type = {}));
var HID_Report_Main_Item_Tag;
(function (HID_Report_Main_Item_Tag) {
    HID_Report_Main_Item_Tag[HID_Report_Main_Item_Tag["Input"] = 8] = "Input";
    HID_Report_Main_Item_Tag[HID_Report_Main_Item_Tag["Output"] = 9] = "Output";
    HID_Report_Main_Item_Tag[HID_Report_Main_Item_Tag["Feature"] = 11] = "Feature";
    HID_Report_Main_Item_Tag[HID_Report_Main_Item_Tag["Collection"] = 10] = "Collection";
    HID_Report_Main_Item_Tag[HID_Report_Main_Item_Tag["End_Collection"] = 12] = "End_Collection";
})(HID_Report_Main_Item_Tag || (HID_Report_Main_Item_Tag = {}));
var HID_Collection_Type;
(function (HID_Collection_Type) {
    HID_Collection_Type[HID_Collection_Type["Physical"] = 0] = "Physical";
    HID_Collection_Type[HID_Collection_Type["Application"] = 1] = "Application";
    HID_Collection_Type[HID_Collection_Type["Logical"] = 2] = "Logical";
    HID_Collection_Type[HID_Collection_Type["Report"] = 3] = "Report";
    HID_Collection_Type[HID_Collection_Type["Named_Array"] = 4] = "Named_Array";
    HID_Collection_Type[HID_Collection_Type["Usage_Switch"] = 5] = "Usage_Switch";
    HID_Collection_Type[HID_Collection_Type["Usage_Modifier"] = 6] = "Usage_Modifier";
    /* Reserved         = 0x07-0x7F */
    /* Vendor Defined   = 0x80-0xFF */
})(HID_Collection_Type || (HID_Collection_Type = {}));
var HID_Report_Global_Item_Tag;
(function (HID_Report_Global_Item_Tag) {
    HID_Report_Global_Item_Tag[HID_Report_Global_Item_Tag["Usage_Page"] = 0] = "Usage_Page";
    HID_Report_Global_Item_Tag[HID_Report_Global_Item_Tag["Logical_Minimum"] = 1] = "Logical_Minimum";
    HID_Report_Global_Item_Tag[HID_Report_Global_Item_Tag["Logical_Maximum"] = 2] = "Logical_Maximum";
    HID_Report_Global_Item_Tag[HID_Report_Global_Item_Tag["Physical_Minimum"] = 3] = "Physical_Minimum";
    HID_Report_Global_Item_Tag[HID_Report_Global_Item_Tag["Physical_Maximum"] = 4] = "Physical_Maximum";
    HID_Report_Global_Item_Tag[HID_Report_Global_Item_Tag["Unit_Exponent"] = 5] = "Unit_Exponent";
    HID_Report_Global_Item_Tag[HID_Report_Global_Item_Tag["Unit"] = 6] = "Unit";
    HID_Report_Global_Item_Tag[HID_Report_Global_Item_Tag["Report_Size"] = 7] = "Report_Size";
    HID_Report_Global_Item_Tag[HID_Report_Global_Item_Tag["Report_ID"] = 8] = "Report_ID";
    HID_Report_Global_Item_Tag[HID_Report_Global_Item_Tag["Report_Count"] = 9] = "Report_Count";
    HID_Report_Global_Item_Tag[HID_Report_Global_Item_Tag["Push"] = 10] = "Push";
    HID_Report_Global_Item_Tag[HID_Report_Global_Item_Tag["Pop"] = 11] = "Pop";
})(HID_Report_Global_Item_Tag || (HID_Report_Global_Item_Tag = {}));
var HID_Report_Local_Item_Tag;
(function (HID_Report_Local_Item_Tag) {
    HID_Report_Local_Item_Tag[HID_Report_Local_Item_Tag["Usage"] = 0] = "Usage";
    HID_Report_Local_Item_Tag[HID_Report_Local_Item_Tag["Usage_Minimum"] = 1] = "Usage_Minimum";
    HID_Report_Local_Item_Tag[HID_Report_Local_Item_Tag["Usage_Maximum"] = 2] = "Usage_Maximum";
    HID_Report_Local_Item_Tag[HID_Report_Local_Item_Tag["Designator_Index"] = 3] = "Designator_Index";
    HID_Report_Local_Item_Tag[HID_Report_Local_Item_Tag["Designator_Minimum"] = 4] = "Designator_Minimum";
    HID_Report_Local_Item_Tag[HID_Report_Local_Item_Tag["Designator_Maximum"] = 5] = "Designator_Maximum";
    HID_Report_Local_Item_Tag[HID_Report_Local_Item_Tag["String_Index"] = 7] = "String_Index";
    HID_Report_Local_Item_Tag[HID_Report_Local_Item_Tag["String_Minimum"] = 8] = "String_Minimum";
    HID_Report_Local_Item_Tag[HID_Report_Local_Item_Tag["String_Maximum"] = 9] = "String_Maximum";
    HID_Report_Local_Item_Tag[HID_Report_Local_Item_Tag["Delimiter"] = 10] = "Delimiter";
})(HID_Report_Local_Item_Tag || (HID_Report_Local_Item_Tag = {}));
/**********************************
 * Binary deserialization parsers *
 **********************************/
let null_parser = new Parser().namely('null_parser');
let BCD_version = new Parser()
    .endianess("little" /* little */)
    .uint8('major')
    .bit4('minor')
    .bit4('patch');
let HID_descriptor = new Parser()
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
    length: (parsed) => parsed.count
})
    .array('extra', {
    type: 'uint8',
    readUntil: 'eof',
    assert: (array) => (array.length === 0)
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
        1: new Parser().nest('', { type: input_ouput_feature_byte_0 }),
        2: new Parser().nest('', { type: input_ouput_feature_byte_0 }).nest('', { type: input_output_feature_byte_1 }),
        3: new Parser().nest('', { type: input_ouput_feature_byte_0 }).nest('', { type: input_output_feature_byte_1 })
    },
    assert: log('input output feature')
});
let collection = new Parser()
    .choice('', {
    tag: 'size',
    choices: { 0: null_parser },
    defaultChoice: new Parser()
        .uint8('', { assert: (value) => ((value < 0x07) && (value > 0x7F)) }),
    assert: log("collection")
});
let usage = (default_global = true, local_item = "usage_ID") => new Parser()
    .choice('', {
    tag: 'size',
    choices: {
        2: new Parser().endianess("little" /* little */).uint16(default_global ? 'usage_page' : local_item),
        3: new Parser().endianess("little" /* little */).uint16(local_item).uint16('usage_page')
    }
});
let sized_int = (name) => {
    return new Parser()
        .choice('', {
        tag: 'size',
        choices: {
            1: new Parser().int8(name),
            2: new Parser().endianess("little" /* little */).int16(name),
            3: new Parser().endianess("little" /* little */).int32(name)
        },
        assert: log('sized int')
    });
};
let sized_uint = (name) => {
    return new Parser()
        .choice('', {
        tag: 'size',
        choices: {
            1: new Parser().uint8(name),
            2: new Parser().endianess("little" /* little */).uint16(name),
            3: new Parser().endianess("little" /* little */).uint32(name)
        },
        assert: log('sized Uint')
    });
};
let main_item = new Parser()
    .choice('data', {
    tag: 'tag',
    choices: {
        [8 /* Input */]: input_output_feature_item,
        [9 /* Output */]: input_output_feature_item,
        [11 /* Feature */]: input_output_feature_item,
        [10 /* Collection */]: collection,
        [12 /* End_Collection */]: null_parser
    },
    assert: log('main item')
});
let global_item = new Parser()
    .choice('data', {
    tag: 'tag',
    choices: {
        [0 /* Usage_Page */]: usage(),
        [1 /* Logical_Minimum */]: sized_int('logical_minimum'),
        [2 /* Logical_Maximum */]: sized_int('logical_maximum'),
        [3 /* Physical_Minimum */]: sized_int('physical_minimum'),
        [4 /* Physical_Maximum */]: sized_int('physical_maximum'),
        /* Parsing unit information left as an exercise to the reader. */
        [5 /* Unit_Exponent */]: new Parser().uint8('unit_exponent'),
        [6 /* Unit */]: new Parser().endianess("little" /* little */).uint32('unit'),
        [7 /* Report_Size */]: sized_uint('report_size'),
        [8 /* Report_ID */]: new Parser().uint8('report_ID'),
        [9 /* Report_Count */]: sized_uint('report_count'),
        [10 /* Push */]: null_parser,
        [11 /* Pop */]: null_parser
    },
    assert: log('global item')
});
let local_item = new Parser()
    .choice('data', {
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
    },
    assert: log('local item')
});
let short_item = new Parser()
    .choice('', {
    tag: "type",
    choices: {
        0: main_item,
        1: global_item,
        2: local_item
    },
    assert: log('short item')
});
let long_item = new Parser()
    .endianess("little" /* little */)
    .uint8('data_size')
    .uint8('long_item_tag', { assert: (tag) => (tag >= 0xF0) })
    .buffer('data', { length: 'data_size' });
let item = new Parser()
    .endianess("little" /* little */)
    .bit2('size')
    .bit2('type', {
    assert: (type) => (type !== 3) /* Reserved value */ /* Not actually checked because of https://github.com/keichi/binary-parser/issues/56 */
})
    .bit4('tag')
    .choice('', {
    tag: (parsed) => (parsed.tag * 16 + parsed.type * 4 + parsed.size),
    choices: { 0b11111110: long_item },
    defaultChoice: short_item,
    assert: log('item')
});
let report_descriptor = (length) => new Parser()
    .array('items', {
    type: item,
    lengthInBytes: length
});
let physical_descriptor = (length) => new Parser()
    .array('bytes', {
    type: 'uint8',
    length: length
});
/*********************
 * Private Functions *
 *********************/
/**************
 * Public API *
 **************/
export class Device {
    constructor(...filters) {
        this._interface_id = 0;
        this._configuration_id = 0;
        this.filters = [];
        this.device = undefined;
        this.HID_descriptors = [];
        this.report_descriptors = [];
        this.filters = filters;
    }
    get interface_id() {
        return this._interface_id;
    }
    async set_interface_id(id) {
        this._interface_id = id;
        if (this.device === undefined) {
            /* Not connected, nothing to do */
            return;
        }
        await this.device.claimInterface(id);
        await this.get_report_descriptor();
    }
    get configuration_id() {
        return this._configuration_id;
    }
    async set_configuration_id(id) {
        throw Error("Not Implemented");
    }
    get HID_descriptor() {
        return this.HID_descriptors[this._interface_id];
    }
    async get_HID_descriptor() {
        if (this.device === undefined) {
            throw Error("Not connected to a device.");
        }
        if (this.HID_descriptors[this._interface_id] === undefined) {
            let length = 9;
            let data = await Device.get_HID_class_descriptor(this.device, 33 /* HID */, 0, length, this._interface_id);
            let returned_length = data.getUint8(0);
            if (length < returned_length) {
                length = returned_length;
                data = await Device.get_HID_class_descriptor(this.device, 33 /* HID */, 0, length, this._interface_id);
            }
            if (data.byteLength < length) {
                throw new USBError("Invalid HID descriptor length: " + hex(data.buffer), "ok" /* ok */);
            }
            this.HID_descriptors[this._interface_id] = HID_descriptor.parse(Buffer.from(data.buffer));
        }
        return this.HID_descriptors[this._interface_id];
    }
    async get_report_descriptor() {
        if (this.device === undefined) {
            throw Error("Not connected to a device.");
        }
        if (this.report_descriptors[this._interface_id] === undefined) {
            if (this.HID_descriptors[this._interface_id] === undefined) {
                await this.get_HID_descriptor();
            }
            /* Get Report descriptor from HID descriptor */
            let reports = this.HID_descriptors[this._interface_id].descriptors
                .filter(({ type, size }) => type === 34 /* Report */);
            if (reports.length > 1) {
                throw new USBError("Multiple Report descriptors specified in HID descriptor.", "ok" /* ok */);
            }
            else if (reports.length === 0) {
                throw new USBError("Report descriotpr missing from HID descriptor.", "ok" /* ok */);
            }
            let length = reports[0].size;
            let data = await Device.get_HID_class_descriptor(this.device, 34 /* Report */, 0, length, this._interface_id);
            if (data.byteLength !== length) {
                throw new USBError("Invalid HID descriptor length: " + hex(data.buffer), "ok" /* ok */);
            }
            this.report_descriptors[this._interface_id] = report_descriptor(length).parse(Buffer.from(data.buffer));
        }
        return this.report_descriptors[this._interface_id];
    }
    async connect(...filters) {
        if (this === undefined) {
            /* Instantiate class, then connect */
            return await (new Device(...filters)).connect();
        }
        if (this.device !== undefined) {
            /* Already connected */
            return this;
        }
        let device = await navigator.usb.requestDevice({ filters: [...filters, ...this.filters] });
        await device.open();
        if (device.configuration === null)
            await device.selectConfiguration(this._configuration_id);
        await device.claimInterface(this._interface_id);
        this.device = device;
        // await this.get_report_descriptor();
        return this;
    }
    static async connect(...filters) {
        return await (new Device(...filters)).connect();
    }
    static async get_HID_class_descriptor(device, type, index, length, interface_id = 0) {
        let result = await device.controlTransferIn({
            requestType: "standard" /* standard */,
            recipient: "interface" /* interface */,
            request: /* GET_DESCRIPTOR */ 0x06,
            value: type * 256 + index,
            index: interface_id
        }, length);
        if (result.status !== "ok" /* ok */) {
            throw new USBError("HID descriptor transfer failed.", result.status);
        }
        else {
            return result.data;
        }
    }
}
export async function connect(...filters) {
    if (filters.length === 0) {
        filters = [{ vendorId: 0x03eb }];
    }
    let device = await navigator.usb.requestDevice({ filters });
    await device.open();
    if (device.configuration === null)
        await device.selectConfiguration(0);
    await device.claimInterface(0);
    return device;
}
export async function get_HID_descriptor(device, interface_id = 0) {
    let length = 9;
    let data = await Device.get_HID_class_descriptor(device, 33 /* HID */, 0, length, interface_id);
    let returned_length = data.getUint8(0);
    if (length < returned_length) {
        length = returned_length;
        data = await Device.get_HID_class_descriptor(device, 33 /* HID */, 0, length, interface_id);
    }
    if (data.byteLength < length) {
        throw new USBError("Invalid HID descriptor length: " + hex(data.buffer), "ok" /* ok */);
    }
    return HID_descriptor.parse(Buffer.from(data.buffer));
}
navigator.hid = Device;
//# sourceMappingURL=webusb_hid.js.map