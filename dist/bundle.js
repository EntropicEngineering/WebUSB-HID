Map.assign = function (target, ...sources) {
    for (const source of sources) {
        for (const [key, value] of source) {
            target.set(key, value);
        }
    }
    return target;
};
Map.prototype.update = function (...sources) {
    return Map.assign(this, ...sources);
};
Map.prototype.toObject = function () {
    const result = {};
    for (const [key, value] of this) {
        if (typeof key === "string" || typeof key === "symbol") {
            result[key] = value;
        }
        else {
            result[`${key}`] = value;
        }
    }
    return result;
};
Map.prototype.pop = function (key, otherwise) {
    if (!this.has(key)) {
        return otherwise;
    }
    const value = this.get(key);
    this.delete(key);
    return value;
};

const hex$1 = (value) => {
    return "0x" + value.toString(16).toUpperCase().padStart(2, "0");
};
const hex_buffer$1 = (buffer) => {
    return Array.from(new Uint8Array(buffer), hex$1).join(", ");
};
const utf8_encoder = new TextEncoder();
const utf8_decoder = new TextDecoder();
const Bits_Sizes = [1, 2, 3, 4, 5, 6, 7];
const Uint_Sizes = Bits_Sizes.concat([8, 16, 32, 64]);
const Int_Sizes = [8, 16, 32];
const Float_Sizes = [32, 64];
const write_bit_shift = (packer, value, { bits, data_view, byte_offset = 0, little_endian }) => {
    /*
     bit_offset = 5
     buffer = 00011111
     byte = xxxxxxxx

     new_buffer = 000xxxxx xxx11111
     */
    const bit_offset = (byte_offset % 1) * 8;
    byte_offset = Math.floor(byte_offset);
    const bytes = new Uint8Array(Math.ceil(bits / 8));
    const bit_length = packer(value, { bits, byte_offset: 0, data_view: new DataView(bytes.buffer), little_endian });
    let overlap = data_view.getUint8(byte_offset) & (0xFF >> (8 - bit_offset));
    for (const [index, byte] of bytes.entries()) {
        data_view.setUint8(byte_offset + index, ((byte << bit_offset) & 0xFF) | overlap);
        overlap = byte >> (8 - bit_offset);
    }
    if (bit_offset + bits > 8) {
        data_view.setUint8(byte_offset + Math.ceil(bits / 8), overlap);
    }
    return bit_length;
};
const read_bit_shift = (parser, { bits, data_view, byte_offset = 0, little_endian }) => {
    const bit_offset = (byte_offset % 1) * 8;
    byte_offset = Math.floor(byte_offset);
    const bytes = new Uint8Array(Math.ceil(bits / 8));
    let byte = data_view.getUint8(byte_offset);
    if (bit_offset + bits > 8) {
        for (const index of bytes.keys()) {
            const next = data_view.getUint8(byte_offset + index + 1);
            bytes[index] = (byte >> bit_offset) | ((next << (8 - bit_offset)) & (0xFF >> (bits < 8 ? (8 - bits) : 0)));
            byte = next;
        }
    }
    else {
        bytes[0] = byte >> bit_offset & (0xFF >> (8 - bits));
    }
    return parser({ bits, byte_offset: 0, data_view: new DataView(bytes.buffer), little_endian });
};
const uint_pack = (value, { bits, data_view, byte_offset = 0, little_endian }) => {
    const original_value = value;
    value = Math.floor(original_value);
    if (value < 0 || value > 2 ** bits || original_value !== value || value > Number.MAX_SAFE_INTEGER) {
        throw new Error(`Unable to encode ${original_value} to Uint${bits}`);
    }
    if (byte_offset % 1) {
        return write_bit_shift(uint_pack, value, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
                data_view.setUint8(byte_offset, value);
                break;
            case 16:
                data_view.setUint16(byte_offset, value, little_endian);
                break;
            case 32:
                data_view.setUint32(byte_offset, value, little_endian);
                break;
            case 64:/* Special case to handle millisecond epoc time (from Date.now()) */ 
                const upper = Math.floor(value / 2 ** 32);
                const lower = value % 2 ** 32;
                let low_byte;
                let high_byte;
                if (little_endian) {
                    low_byte = lower;
                    high_byte = upper;
                }
                else {
                    low_byte = upper;
                    high_byte = lower;
                }
                data_view.setUint32(byte_offset, low_byte, little_endian);
                data_view.setUint32(byte_offset + 4, high_byte, little_endian);
                break;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
        return bits;
    }
};
const uint_parse = ({ bits, data_view, byte_offset = 0, little_endian }) => {
    if (byte_offset % 1) {
        return read_bit_shift(uint_parse, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                return data_view.getUint8(byte_offset) & (0xFF >> (8 - bits));
            case 8:
                return data_view.getUint8(byte_offset);
            case 16:
                return data_view.getUint16(byte_offset, little_endian);
            case 32:
                return data_view.getUint32(byte_offset, little_endian);
            case 64:/* Special case to handle millisecond epoc time (from Date.now()) */ 
                const low_byte = data_view.getUint32(byte_offset, little_endian);
                const high_byte = data_view.getUint32(byte_offset + 4, little_endian);
                let value;
                if (little_endian) {
                    value = high_byte * 2 ** 32 + low_byte;
                }
                else {
                    value = low_byte * 2 ** 32 + high_byte;
                }
                if (value > Number.MAX_SAFE_INTEGER) {
                    throw new Error(`Uint64 out of range for Javascript: ${hex_buffer$1(data_view.buffer.slice(byte_offset, byte_offset + 8))}`);
                }
                return value;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
    }
};
const int_pack = (value, { bits, data_view, byte_offset = 0, little_endian }) => {
    const original_value = value;
    value = Math.floor(original_value);
    if (value < -(2 ** (bits - 1)) || value > 2 ** (bits - 1) - 1 || original_value !== value) {
        throw new Error(`Unable to encode ${original_value} to Int${bits}`);
    }
    if (byte_offset % 1) {
        return write_bit_shift(int_pack, value, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 8:
                data_view.setUint8(byte_offset, value);
                break;
            case 16:
                data_view.setUint16(byte_offset, value, little_endian);
                break;
            case 32:
                data_view.setUint32(byte_offset, value, little_endian);
                break;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
        return bits;
    }
};
const int_parse = ({ bits, data_view, byte_offset = 0, little_endian }) => {
    if (byte_offset % 1) {
        return read_bit_shift(int_parse, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 8:
                return data_view.getInt8(byte_offset);
            case 16:
                return data_view.getInt16(byte_offset, little_endian);
            case 32:
                return data_view.getInt32(byte_offset, little_endian);
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
    }
};
const float_pack = (value, { bits, data_view, byte_offset = 0, little_endian }) => {
    /* TODO: Input validation */
    if (byte_offset % 1) {
        return write_bit_shift(float_pack, value, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 32:
                data_view.setFloat32(byte_offset, value, little_endian);
                break;
            case 64:
                data_view.setFloat64(byte_offset, value, little_endian);
                break;
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
        return bits;
    }
};
const float_parse = ({ bits, data_view, byte_offset = 0, little_endian }) => {
    if (byte_offset % 1) {
        return read_bit_shift(float_parse, { bits, data_view, byte_offset, little_endian });
    }
    else {
        switch (bits) {
            case 32:
                return data_view.getFloat32(byte_offset, little_endian);
            case 64:
                return data_view.getFloat64(byte_offset, little_endian);
            default:
                throw new Error(`Invalid size: ${bits}`);
        }
    }
};
const Parent = '$parent';
const set_context = (data, context) => {
    if (context !== undefined) {
        data[Parent] = context;
    }
    return data;
};
const remove_context = (data, delete_flag) => {
    if (delete_flag) {
        delete data[Parent];
    }
    return data;
};
const fetch_and_encode = ({ source, encode, context }) => {
    let decoded;
    if (typeof source === 'function') {
        decoded = source();
    }
    else {
        decoded = source;
    }
    if (typeof encode === 'function') {
        return encode(decoded, context);
    }
    else {
        return decoded;
    }
};
const decode_and_deliver = ({ encoded, decode, context, deliver }) => {
    let decoded;
    if (typeof decode === 'function') {
        decoded = decode(encoded, context);
    }
    else {
        decoded = encoded;
    }
    if (typeof deliver === 'function') {
        deliver(decoded);
    }
    return decoded;
};
const factory = (serializer, deserializer, verify_size) => {
    return ((bits, transcoders = {}) => {
        if (!verify_size(bits)) {
            throw new Error(`Invalid size: ${bits}`);
        }
        const { encode, decode, little_endian: LE } = transcoders;
        const pack = (source, options = {}) => {
            const { data_view = new DataView(new ArrayBuffer(Math.ceil(bits / 8))), byte_offset = 0, little_endian = LE, context } = options;
            const encoded = fetch_and_encode({ source, encode, context });
            const size = (serializer(encoded, { bits, data_view, byte_offset, little_endian }) / 8);
            return { size, buffer: data_view.buffer };
        };
        const parse = (data_view, options = {}, deliver) => {
            const { byte_offset = 0, little_endian = LE, context } = options;
            const encoded = deserializer({ bits, data_view, byte_offset, little_endian });
            const data = decode_and_deliver({ encoded, context, decode, deliver });
            return { data, size: bits / 8 };
        };
        return { pack, parse };
    });
};
const Bits = factory(uint_pack, uint_parse, (s) => Bits_Sizes.includes(s));
const Uint = factory(uint_pack, uint_parse, (s) => Uint_Sizes.includes(s));
const Int = factory(int_pack, int_parse, (s) => Int_Sizes.includes(s));
const Float = factory(float_pack, float_parse, (s) => Float_Sizes.includes(s));
const numeric = (n, context) => {
    if (typeof n === 'object') {
        let { bits = 0, bytes = 0 } = n;
        n = bits / 8 + bytes;
    }
    else if (typeof n === 'function') {
        n = n(context);
    }
    else if (typeof n !== 'number') {
        throw new Error(`Invalid numeric input ${n}`);
    }
    if (n < 0) {
        throw new Error(`Invalid size: ${n} bytes`);
    }
    return n;
};
/** Byte_Buffer doesn't do any serialization, but just copies bytes to/from an ArrayBuffer that's a subset of the
 * serialized buffer. Byte_Buffer only works on byte-aligned data.
 *
 * @param {Numeric} length
 * @param {Transcoders<ArrayBuffer, any>} transcoders
 */
const Byte_Buffer = (length, transcoders = {}) => {
    const { encode, decode } = transcoders;
    const pack = (source, options = {}) => {
        const { data_view, byte_offset = 0, context } = options;
        const size = numeric(length, context);
        const buffer = fetch_and_encode({ source, encode, context });
        if (size !== buffer.byteLength) {
            throw new Error(`Length miss-match. Expected length: ${size}, actual bytelength: ${buffer.byteLength}`);
        }
        if (data_view === undefined) {
            return { size, buffer };
        }
        new Uint8Array(buffer).forEach((value, index) => {
            data_view.setUint8(byte_offset + index, value);
        });
        return { size, buffer: data_view.buffer };
    };
    const parse = (data_view, options = {}, deliver) => {
        const { byte_offset = 0, context } = options;
        const size = numeric(length, context);
        const buffer = data_view.buffer.slice(byte_offset, byte_offset + size);
        const data = decode_and_deliver({ encoded: buffer, context, decode, deliver });
        return { data, size };
    };
    return { pack, parse };
};
const Padding = (bytes, transcoders = {}) => {
    const { encode, decode } = transcoders;
    const pack = (source, options = {}) => {
        let { data_view, byte_offset = 0, context } = options;
        const size = numeric(bytes, context);
        if (data_view === undefined) {
            data_view = new DataView(new ArrayBuffer(Math.ceil(size)));
        }
        if (encode !== undefined) {
            let fill = encode(null, options.context);
            let i = 0;
            while (i < Math.floor(size)) {
                data_view.setUint8(byte_offset + i, fill);
                fill >>= 8;
                i++;
            }
            const remainder = (size % 1) * 8;
            if (remainder) {
                data_view.setUint8(byte_offset + i, fill & (2 ** remainder - 1));
            }
        }
        return { size, buffer: data_view.buffer };
    };
    const parse = (data_view, options = {}, deliver) => {
        const { context } = options;
        const size = numeric(bytes, context);
        let data = null;
        if (decode !== undefined) {
            data = decode(data, context);
            if (deliver !== undefined) {
                deliver(data);
            }
        }
        return { size, data };
    };
    return { pack, parse };
};
const Branch = ({ chooser, choices, default_choice }) => {
    const choose = (source) => {
        let choice = chooser(source);
        if (choices.hasOwnProperty(choice)) {
            return choices[choice];
        }
        else {
            if (default_choice !== undefined) {
                return default_choice;
            }
            else {
                throw new Error(`Choice ${choice} not in ${Object.keys(choices)}`);
            }
        }
    };
    const pack = (source, options = {}) => {
        return choose(options.context).pack(source, options);
    };
    const parse = (data_view, options = {}, deliver) => {
        return choose(options.context).parse(data_view, options, deliver);
    };
    return { parse, pack };
};
const Embed = (embedded) => {
    const pack = (source, { byte_offset, data_view, little_endian, context } = {}) => {
        if (context !== undefined) {
            const parent = context[Parent];
            if (embedded instanceof Array) {
                return embedded
                    .pack(context, { byte_offset, data_view, little_endian, context: parent }, source);
            }
            else if (embedded instanceof Map) {
                return embedded
                    .pack(context, { byte_offset, data_view, little_endian, context: parent }, context);
            }
        }
        return embedded.pack(source, { byte_offset, data_view, little_endian, context });
    };
    const parse = (data_view, { byte_offset, little_endian, context } = {}, deliver) => {
        if (context !== undefined) {
            const parent = context[Parent];
            if (embedded instanceof Array) {
                return embedded
                    .parse(data_view, { byte_offset, little_endian, context: parent }, undefined, context);
            }
            else if (embedded instanceof Map) {
                return embedded
                    .parse(data_view, { byte_offset, little_endian, context: parent }, undefined, context);
            }
        }
        return embedded.parse(data_view, { byte_offset, little_endian, context }, deliver);
    };
    return { pack, parse };
};
const Binary_Map = (transcoders = {}, iterable) => {
    if (transcoders instanceof Array) {
        [transcoders, iterable] = [iterable, transcoders];
    }
    const { encode, decode, little_endian: LE } = transcoders;
    const map = new Map((iterable || []));
    map.pack = (source, options = {}, encoded) => {
        const packed = [];
        let { data_view, byte_offset = 0, little_endian = LE, context } = options;
        if (encoded === undefined) {
            encoded = fetch_and_encode({ source, encode, context });
            set_context(encoded, context);
        }
        /* Need to return a function to the `pack` chain to enable Embed with value checking. */
        const fetcher = (key) => () => {
            const value = encoded.get(key);
            if (value === undefined) {
                throw new Error(`Insufficient data for serialization: ${key} not in ${encoded}`);
            }
            return value;
        };
        let offset = 0;
        for (const [key, item] of map) {
            const { size, buffer } = item.pack(fetcher(key), { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context: encoded });
            if (data_view === undefined) {
                packed.push({ size, buffer });
            }
            offset += size;
        }
        if (data_view === undefined) {
            data_view = concat_buffers(packed, offset);
        }
        return { size: offset, buffer: data_view.buffer };
    };
    map.parse = (data_view, options = {}, deliver, results) => {
        const { byte_offset = 0, little_endian = LE, context } = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = set_context(new Map(), context);
            remove_parent_symbol = true;
        }
        let offset = 0;
        for (const [key, item] of map) {
            const { data, size } = item.parse(data_view, { byte_offset: byte_offset + offset, little_endian, context: results }, (data) => results.set(key, data));
            offset += size;
        }
        const data = decode_and_deliver({ encoded: results, decode, context, deliver });
        remove_context(results, remove_parent_symbol);
        return { data, size: offset };
    };
    return map;
};
const concat_buffers = (packed, byte_length) => {
    const data_view = new DataView(new ArrayBuffer(Math.ceil(byte_length)));
    let byte_offset = 0;
    for (const { size, buffer } of packed) {
        /* Copy all the data from the returned buffers into one grand buffer. */
        const bytes = Array.from(new Uint8Array(buffer));
        /* Create a Byte Array with the appropriate number of Uint(8)s, possibly with a trailing Bits. */
        const array = Binary_Array();
        for (let i = 0; i < Math.floor(size); i++) {
            array.push(Uint(8));
        }
        if (size % 1) {
            array.push(Bits((size % 1) * 8));
        }
        /* Pack the bytes into the buffer */
        array.pack(bytes, { data_view, byte_offset });
        byte_offset += size;
    }
    return data_view;
};
/* This would be much cleaner if JavaScript had interfaces. Or I could make everything subclass Struct... */
const extract_array_options = (elements = []) => {
    if (elements.length > 0) {
        const first = elements[0];
        if (!first.hasOwnProperty('pack') && !first.hasOwnProperty('parse')) {
            return elements.shift();
        }
        const last = elements[elements.length - 1];
        if (!last.hasOwnProperty('pack') && !last.hasOwnProperty('parse')) {
            return elements.pop();
        }
    }
    return {};
};
const Binary_Array = (...elements) => {
    const { encode, decode, little_endian: LE } = extract_array_options(elements);
    const array = new Array(...elements);
    array.pack = (source, options = {}, fetcher) => {
        let { data_view, byte_offset = 0, little_endian = LE, context } = options;
        const encoded = fetch_and_encode({ source, encode, context });
        const packed = [];
        if (fetcher === undefined) {
            set_context(encoded, context);
            const iterator = encoded[Symbol.iterator]();
            fetcher = () => {
                const value = iterator.next().value;
                if (value === undefined) {
                    throw new Error(`Insufficient data for serialization: ${encoded}`);
                }
                return value;
            };
        }
        const store = (result) => {
            if (data_view === undefined) {
                packed.push(result);
            }
        };
        const size = array.__pack_loop(fetcher, { data_view, byte_offset, little_endian, context: encoded }, store, context);
        if (data_view === undefined) {
            data_view = concat_buffers(packed, size);
        }
        return { size, buffer: data_view.buffer };
    };
    array.__pack_loop = (fetcher, { data_view, byte_offset = 0, little_endian, context }, store) => {
        let offset = 0;
        for (const item of array) {
            const { size, buffer } = item.pack(fetcher, { data_view, byte_offset: data_view === undefined ? 0 : byte_offset + offset, little_endian, context });
            store({ size, buffer });
            offset += size;
        }
        return offset;
    };
    array.parse = (data_view, options = {}, deliver, results) => {
        const { byte_offset = 0, little_endian = LE, context } = options;
        let remove_parent_symbol = false;
        if (results === undefined) {
            results = set_context(new Array(), context);
            remove_parent_symbol = true;
        }
        const size = array.__parse_loop(data_view, { byte_offset, little_endian, context: results }, (data) => results.push(data), context);
        const data = decode_and_deliver({ encoded: remove_context(results, remove_parent_symbol), context, decode, deliver });
        return { data, size };
    };
    array.__parse_loop = (data_view, { byte_offset = 0, little_endian, context }, deliver) => {
        let offset = 0;
        for (const item of array) {
            const { data, size } = item.parse(data_view, { byte_offset: byte_offset + offset, little_endian, context }, deliver);
            offset += size;
        }
        return offset;
    };
    return array;
};
const Repeat = (...elements) => {
    const { count, bytes, encode, decode, little_endian } = extract_array_options(elements);
    const array = Binary_Array({ encode, decode, little_endian }, ...elements);
    const pack_loop = array.__pack_loop;
    const parse_loop = array.__parse_loop;
    array.__pack_loop = (fetcher, { data_view, byte_offset = 0, little_endian, context }, store, parent) => {
        let offset = 0;
        if (count !== undefined) {
            const repeat = numeric(count, parent);
            for (let i = 0; i < repeat; i++) {
                offset += pack_loop(fetcher, { data_view, byte_offset: byte_offset + offset, little_endian, context }, store);
            }
        }
        else if (bytes !== undefined) {
            const repeat = numeric(bytes, parent);
            while (offset < repeat) {
                offset += pack_loop(fetcher, { data_view, byte_offset: byte_offset + offset, little_endian, context }, store);
            }
            if (offset > repeat) {
                throw new Error(`Cannot pack into ${repeat} bytes.`);
            }
        }
        else {
            throw new Error("One of count or bytes must specified in options.");
        }
        return offset;
    };
    array.__parse_loop = (data_view, { byte_offset = 0, little_endian, context }, deliver, parent) => {
        let offset = 0;
        if (count !== undefined) {
            const repeat = numeric(count, parent);
            for (let i = 0; i < repeat; i++) {
                offset += parse_loop(data_view, { byte_offset: byte_offset + offset, little_endian, context }, deliver);
            }
        }
        else if (bytes !== undefined) {
            const repeat = numeric(bytes, parent);
            while (offset < repeat) {
                offset += parse_loop(data_view, { byte_offset: byte_offset + offset, little_endian, context }, deliver);
            }
            if (offset > repeat) {
                throw new Error(`Cannot parse exactly ${repeat} bytes.`);
            }
        }
        else {
            throw new Error("One of count or bytes must specified in options.");
        }
        return offset;
    };
    return array;
};

const Uint8 = Uint(8);
const Uint16 = Uint(16);
const Uint16LE = Uint(16, { little_endian: true });
const Uint32 = Uint(32);
const Uint32LE = Uint(32, { little_endian: true });
const Uint64 = Uint(64);
const Uint64LE = Uint(64, { little_endian: true });
const Int8 = Int(8);
const Int16 = Int(8);
const Int16LE = Int(16, { little_endian: true });
const Int32 = Int(32);
const Int32LE = Int(32, { little_endian: true });
const Float32 = Float(32);
const Float32LE = Float(32, { little_endian: true });
const Float64 = Float(64);
const Float64LE = Float(64, { little_endian: true });
/** Noöp structure
 *
 * @type {Struct}
 */
const Pass = Padding(0);

var Class_Descriptors;
(function (Class_Descriptors) {
    Class_Descriptors[Class_Descriptors["HID"] = 33] = "HID";
    Class_Descriptors[Class_Descriptors["Report"] = 34] = "Report";
    Class_Descriptors[Class_Descriptors["Physical"] = 35] = "Physical";
})(Class_Descriptors || (Class_Descriptors = {}));
var Descriptor_Request;
(function (Descriptor_Request) {
    Descriptor_Request[Descriptor_Request["GET"] = 6] = "GET";
    Descriptor_Request[Descriptor_Request["SET"] = 7] = "SET";
})(Descriptor_Request || (Descriptor_Request = {}));
var Report_Item_Type;
(function (Report_Item_Type) {
    Report_Item_Type[Report_Item_Type["Main"] = 0] = "Main";
    Report_Item_Type[Report_Item_Type["Global"] = 1] = "Global";
    Report_Item_Type[Report_Item_Type["Local"] = 2] = "Local";
    /* Reserved = 0b11 */
})(Report_Item_Type || (Report_Item_Type = {}));
var Report_Main_Item_Tag;
(function (Report_Main_Item_Tag) {
    Report_Main_Item_Tag[Report_Main_Item_Tag["Input"] = 8] = "Input";
    Report_Main_Item_Tag[Report_Main_Item_Tag["Output"] = 9] = "Output";
    Report_Main_Item_Tag[Report_Main_Item_Tag["Feature"] = 11] = "Feature";
    Report_Main_Item_Tag[Report_Main_Item_Tag["Collection"] = 10] = "Collection";
    Report_Main_Item_Tag[Report_Main_Item_Tag["End_Collection"] = 12] = "End_Collection";
})(Report_Main_Item_Tag || (Report_Main_Item_Tag = {}));
var Collection_Type;
(function (Collection_Type) {
    Collection_Type[Collection_Type["Physical"] = 0] = "Physical";
    Collection_Type[Collection_Type["Application"] = 1] = "Application";
    Collection_Type[Collection_Type["Logical"] = 2] = "Logical";
    Collection_Type[Collection_Type["Report"] = 3] = "Report";
    Collection_Type[Collection_Type["Named_Array"] = 4] = "Named_Array";
    Collection_Type[Collection_Type["Usage_Switch"] = 5] = "Usage_Switch";
    Collection_Type[Collection_Type["Usage_Modifier"] = 6] = "Usage_Modifier";
    /* Reserved         = 0x07-0x7F */
    /* Vendor Defined   = 0x80-0xFF */
})(Collection_Type || (Collection_Type = {}));
var Report_Global_Item_Tag;
(function (Report_Global_Item_Tag) {
    Report_Global_Item_Tag[Report_Global_Item_Tag["Usage_Page"] = 0] = "Usage_Page";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Logical_Minimum"] = 1] = "Logical_Minimum";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Logical_Maximum"] = 2] = "Logical_Maximum";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Physical_Minimum"] = 3] = "Physical_Minimum";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Physical_Maximum"] = 4] = "Physical_Maximum";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Unit_Exponent"] = 5] = "Unit_Exponent";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Unit"] = 6] = "Unit";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Report_Size"] = 7] = "Report_Size";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Report_ID"] = 8] = "Report_ID";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Report_Count"] = 9] = "Report_Count";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Push"] = 10] = "Push";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Pop"] = 11] = "Pop";
})(Report_Global_Item_Tag || (Report_Global_Item_Tag = {}));
var Report_Local_Item_Tag;
(function (Report_Local_Item_Tag) {
    Report_Local_Item_Tag[Report_Local_Item_Tag["Usage"] = 0] = "Usage";
    Report_Local_Item_Tag[Report_Local_Item_Tag["Usage_Minimum"] = 1] = "Usage_Minimum";
    Report_Local_Item_Tag[Report_Local_Item_Tag["Usage_Maximum"] = 2] = "Usage_Maximum";
    Report_Local_Item_Tag[Report_Local_Item_Tag["Designator_Index"] = 3] = "Designator_Index";
    Report_Local_Item_Tag[Report_Local_Item_Tag["Designator_Minimum"] = 4] = "Designator_Minimum";
    Report_Local_Item_Tag[Report_Local_Item_Tag["Designator_Maximum"] = 5] = "Designator_Maximum";
    Report_Local_Item_Tag[Report_Local_Item_Tag["String_Index"] = 7] = "String_Index";
    Report_Local_Item_Tag[Report_Local_Item_Tag["String_Minimum"] = 8] = "String_Minimum";
    Report_Local_Item_Tag[Report_Local_Item_Tag["String_Maximum"] = 9] = "String_Maximum";
    Report_Local_Item_Tag[Report_Local_Item_Tag["Delimiter"] = 10] = "Delimiter";
})(Report_Local_Item_Tag || (Report_Local_Item_Tag = {}));
var Request_Type;
(function (Request_Type) {
    Request_Type[Request_Type["GET_REPORT"] = 1] = "GET_REPORT";
    Request_Type[Request_Type["GET_IDLE"] = 2] = "GET_IDLE";
    Request_Type[Request_Type["GET_PROTOCOL"] = 3] = "GET_PROTOCOL";
    Request_Type[Request_Type["SET_REPORT"] = 9] = "SET_REPORT";
    Request_Type[Request_Type["SET_IDLE"] = 10] = "SET_IDLE";
    Request_Type[Request_Type["SET_PROTOCOL"] = 11] = "SET_PROTOCOL";
})(Request_Type || (Request_Type = {}));
var Request_Report_Type;
(function (Request_Report_Type) {
    Request_Report_Type[Request_Report_Type["Input"] = 1] = "Input";
    Request_Report_Type[Request_Report_Type["Output"] = 2] = "Output";
    Request_Report_Type[Request_Report_Type["Feature"] = 3] = "Feature";
})(Request_Report_Type || (Request_Report_Type = {}));

var Descriptor_Type;
(function (Descriptor_Type) {
    Descriptor_Type[Descriptor_Type["DEVICE"] = 1] = "DEVICE";
    Descriptor_Type[Descriptor_Type["CONFIGURATION"] = 2] = "CONFIGURATION";
    Descriptor_Type[Descriptor_Type["STRING"] = 3] = "STRING";
    Descriptor_Type[Descriptor_Type["INTERFACE"] = 4] = "INTERFACE";
    Descriptor_Type[Descriptor_Type["ENDPOINT"] = 5] = "ENDPOINT";
    /* Reserved             = 6, */
    /* Reserved             = 7, */
    Descriptor_Type[Descriptor_Type["INTERFACE_POWER"] = 8] = "INTERFACE_POWER";
    Descriptor_Type[Descriptor_Type["OTG"] = 9] = "OTG";
    Descriptor_Type[Descriptor_Type["DEBUG"] = 10] = "DEBUG";
    Descriptor_Type[Descriptor_Type["INTERFACE_ASSOCIATION"] = 11] = "INTERFACE_ASSOCIATION";
    Descriptor_Type[Descriptor_Type["BOS"] = 15] = "BOS";
    Descriptor_Type[Descriptor_Type["DEVICE_CAPABILITY"] = 16] = "DEVICE_CAPABILITY";
})(Descriptor_Type || (Descriptor_Type = {}));
var Request_Type$1;
(function (Request_Type) {
    Request_Type[Request_Type["GET_STATUS"] = 0] = "GET_STATUS";
    Request_Type[Request_Type["CLEAR_FEATURE"] = 1] = "CLEAR_FEATURE";
    /* Reserved             = 2, */
    Request_Type[Request_Type["SET_FEATURE"] = 3] = "SET_FEATURE";
    /* Reserved             = 4, */
    Request_Type[Request_Type["SET_ADDRESS"] = 5] = "SET_ADDRESS";
    Request_Type[Request_Type["GET_DESCRIPTOR"] = 6] = "GET_DESCRIPTOR";
    Request_Type[Request_Type["SET_DESCRIPTOR"] = 7] = "SET_DESCRIPTOR";
    Request_Type[Request_Type["GET_CONFIGURATION"] = 8] = "GET_CONFIGURATION";
    Request_Type[Request_Type["SET_CONFIGURATION"] = 9] = "SET_CONFIGURATION";
    Request_Type[Request_Type["GET_INTERFACE"] = 10] = "GET_INTERFACE";
    Request_Type[Request_Type["SET_INTERFACE"] = 11] = "SET_INTERFACE";
    /* Further request types left as an exercise to the reader */
})(Request_Type$1 || (Request_Type$1 = {}));
var Capability_Type;
(function (Capability_Type) {
    /* Reserved             = 0x00, */
    Capability_Type[Capability_Type["Wireless_USB"] = 1] = "Wireless_USB";
    Capability_Type[Capability_Type["USB_2_0_Extension"] = 2] = "USB_2_0_Extension";
    Capability_Type[Capability_Type["SUPERSPEED_USB"] = 3] = "SUPERSPEED_USB";
    Capability_Type[Capability_Type["CONTAINER_ID"] = 4] = "CONTAINER_ID";
    Capability_Type[Capability_Type["PLATFORM"] = 5] = "PLATFORM";
    Capability_Type[Capability_Type["POWER_DELIVERY_CAPABILITY"] = 6] = "POWER_DELIVERY_CAPABILITY";
    Capability_Type[Capability_Type["BATTERY_INFO_CAPABILITY"] = 7] = "BATTERY_INFO_CAPABILITY";
    Capability_Type[Capability_Type["PD_CONSUMER_PORT_CAPABILITY"] = 8] = "PD_CONSUMER_PORT_CAPABILITY";
    Capability_Type[Capability_Type["PD_PROVIDER_PORT_CAPABILITY"] = 9] = "PD_PROVIDER_PORT_CAPABILITY";
    Capability_Type[Capability_Type["SUPERSPEED_PLUS"] = 10] = "SUPERSPEED_PLUS";
    Capability_Type[Capability_Type["PRECISION_TIME_MEASUREMENT"] = 11] = "PRECISION_TIME_MEASUREMENT";
    Capability_Type[Capability_Type["Wireless_USB_Ext"] = 12] = "Wireless_USB_Ext";
    /* Reserved             = 0x0D-0xFF */
})(Capability_Type || (Capability_Type = {}));

const Platform_UUIDs = {
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
                throw new Error(message + `: ${typeof value === 'number' ? hex$1(value) : value}`);
            }
        }
    };
};
const get = (name) => (context) => context.get(name);
const decode = (data) => data.toObject();
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
    .set('ignored', Padding({ bits: 7 })));
let input_output_feature_size_4 = Embed(Binary_Map()
    .set('embed bytes 1-2', Embed(input_output_feature_size_2))
    .set('padding', Padding({ bytes: 2 })));
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
    choices: { 0: Embed(Binary_Map().set('collection', Padding(0, { decode: () => 0 }))) },
    default_choice: Embed(Binary_Map().set('collection', Uint(8, assert((value) => (value < 0x07) || (value > 0x7F), 'Invalid collection type'))))
});
let usage = (default_global = true, local_item = "usage_id") => Branch({
    chooser: get('size'),
    choices: {
        0: Embed(Binary_Map().set(default_global ? 'usage_page' : local_item, Padding(0, { decode: () => 0 }))),
        1: Embed(Binary_Map().set(default_global ? 'usage_page' : local_item, Uint8)),
        2: Embed(Binary_Map().set(default_global ? 'usage_page' : local_item, Uint16LE)),
        3: Embed(Binary_Map().set(local_item, Uint16LE).set('usage_page', Uint16LE))
    }
});
let sized_int = (name) => Embed(Binary_Map().set(name, Branch({
    chooser: get('size'),
    choices: { 1: Int8, 2: Int16LE, 3: Int32LE }
})));
let sized_uint = (name) => Embed(Binary_Map().set(name, Branch({
    chooser: get('size'),
    choices: { 1: Uint8, 2: Uint16LE, 3: Uint32LE }
})));
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
        [5 /* Unit_Exponent */]: Embed(Binary_Map().set('unit_exponent', Uint(8, {
            decode: (value) => {
                value &= 0xF;
                /* Only the first nibble is used */
                if (value > 7) {
                    value -= 0xF;
                    /* 4-bit 2's complement */
                }
                return value;
            }
        }))),
        [6 /* Unit */]: Embed(Binary_Map().set('unit', Uint32LE)),
        [7 /* Report_Size */]: sized_uint('report_size'),
        [8 /* Report_ID */]: Embed(Binary_Map().set('report_id', Uint8)),
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
let long_item = Embed(Binary_Map()
    .set('data_size', Uint8)
    .set('long_item_tag', Uint(8, assert((tag) => (tag >= 0xF0), "Invalid long_item_tag")))
    .set('data', Byte_Buffer(get('data_size'))));
/* exports */
let HID_item = Binary_Map({ decode })
    .set('size', Bits(2))
    .set('type', Bits(2))
    .set('tag', Bits(4))
    .set('The rest', Branch({
    chooser: (context) => {
        /* context.tag << 4 | context.type << 2 | context.size */
        return context.get('tag') * 16 + context.get('type') * 4 + context.get('size');
    },
    choices: { 0b11111110: long_item },
    default_choice: short_item
}));
let HID_descriptor = Binary_Map({ decode })
    .set('length', Uint8)
    .set('type', Uint(8, assert((data) => data === 33 /* HID */, "Invalid Class Descriptor")))
    .set('version', BCD_version)
    .set('country_code', Uint8)
    .set('count', Uint(8, assert((count) => count > 0, "Invalid number of descriptors")))
    .set('descriptors', Repeat({ count: get('count') }, Binary_Map({ decode }).set('type', Uint8).set('size', Uint16LE)));
let languages_string_descriptor = Binary_Map({ decode })
    .set('length', Uint8)
    .set('type', Uint(8, assert((value) => value === 3 /* STRING */, "Invalid string descriptor type")))
    .set('LANGID', Repeat({ count: (context) => (context.get('length') - 2) / 2 }, Uint16LE));
const text_decoder = new TextDecoder("utf-16le");
let string_descriptor = Binary_Map({ decode })
    .set('length', Uint8)
    .set('type', Uint(8, assert((value) => value === 3 /* STRING */, "Invalid string descriptor type")))
    .set('string', Byte_Buffer((context) => (context.get('length') - 2), { decode: (buffer) => text_decoder.decode(buffer) }));
let webusb = Binary_Map({ decode })
    .set('version', BCD_version)
    .set('vendor_code', Uint8)
    .set('landing_page_index', Uint8);
var USAGE;
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
let simpleHID = Binary_Map({ decode })
    .set('version', BCD_version)
    .set("page" /* page */, Uint(16, { little_endian: true, decode: (usage) => {
        if (usage >= 0xFF00)
            return usage;
        throw new Error(`Invalid Vendor Usage page for SimpleHID Platform Descriptor: ${usage}`);
    } }))
    .set("application" /* application */, Uint16LE)
    .set("array" /* array */, Uint16LE)
    .set("object" /* object */, Uint16LE)
    .set("bits" /* bits */, Uint16LE)
    .set("uint" /* uint */, Uint16LE)
    .set("int" /* int */, Uint16LE)
    .set("float" /* float */, Uint16LE)
    .set("utf8" /* utf8 */, Uint16LE);
let platform_capability = Embed(Binary_Map()
    .set('reserved', Uint(8, assert((v) => v === 0, "Invalid reserved value")))
    .set('uuid', Repeat({ count: 16 }, Uint8))
    .set('platform', Branch({
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
        0: Embed(Binary_Map().set('webusb', webusb)),
        1: Embed(Binary_Map().set('simpleHID', simpleHID))
    },
    default_choice: Embed(Binary_Map().set('unknown_platform', Byte_Buffer((context) => context.get('length') - 20)))
})));
let capability_descriptors = Binary_Map({ decode })
    .set('length', Uint8)
    .set('descriptor_type', Uint(8, assert((data) => data === 16 /* DEVICE_CAPABILITY */, "Incorrect descriptor type, should be DEVICE CAPABILITY")))
    .set('type', Uint(8, assert((data) => data > 0 && data < 0x0D, "Invalid device capability type")))
    .set('capability', Branch({
    chooser: get('type'),
    choices: { [5 /* PLATFORM */]: platform_capability },
    default_choice: Embed(Binary_Map().set('unknown_capability', Byte_Buffer((context) => context.get('length') - 3)))
}));
let BOS_descriptor = Binary_Map({ decode })
    .set('length', Uint8)
    .set('type', Uint(8, assert((data) => data === 15 /* BOS */, "Invalid descriptor type, should be BOS")))
    .set('total_length', Uint16LE)
    .set('capability_descriptor_count', Uint8)
    .set('capability_descriptors', Repeat({ count: get('capability_descriptor_count') }, capability_descriptors));

/**
 * Created by riggs on 2017/9/1
 *
 * USB HID utility for WebUSB.
 */
/*************
 * Utilities *
 *************/
function hex(value) {
    return "0x" + value.toString(16).padStart(2, "0");
}
function hex_buffer(buffer) {
    return Array.from(new Uint8Array(buffer), hex).join(", ");
}
class USBTransferError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'USBTransferError';
        this.status = status;
    }
}
class ConnectionError extends Error {
}
class ReportError extends Error {
}
class DescriptorError extends Error {
}
/******************
 * Default Export *
 ******************/
class Device {
    constructor(...filters) {
        this._interface_id = 0;
        this._configuration_id = 1;
        this.webusb_device = undefined;
        this._HID_descriptors = new Map();
        this._BOS_descriptors = new Map();
        this._report_descriptors = new Map();
        this._physical_descriptors = new Map();
        this._reports = new Map();
        this._string_descriptors = new Map();
        this._filters = filters;
    }
    static verify_transfer(result) {
        if (result.status !== "ok") {
            throw new USBTransferError("HID descriptor transfer failed.", result.status);
        }
        else {
            return result.data;
        }
    }
    verify_connection() {
        if (this.webusb_device === undefined) {
            throw new ConnectionError("Not connected to a device.");
        }
    }
    async verify_reports(error = false) {
        if (this._reports.has(this._interface_id) &&
            this._reports.get(this._interface_id).has(1 /* Input */) &&
            this._reports.get(this._interface_id).get(1 /* Input */).size +
                this._reports.get(this._interface_id).get(2 /* Output */).size +
                this._reports.get(this._interface_id).get(3 /* Feature */).size > 0) {
            return;
        }
        else if (!error) {
            throw new ReportError("No valid reports.");
        }
        else {
            await this.build_reports();
            return this.verify_reports(true);
        }
    }
    async get_report_id(report, report_type) {
        await this.verify_reports();
        if ((report === null || report === undefined) && this._reports.get(this._interface_id).has(0)) {
            return 0;
        }
        else if (typeof report === "number" && (this._reports.get(this._interface_id).get(report_type)).has(report)) {
            return report;
        }
        else if (typeof report === "string" && (this._reports.get(this._interface_id).get(report_type)).has(report)) {
            return this._reports.get(this._interface_id).get(report_type).get(report);
        }
        else {
            throw new Error(`Invalid ${["Input", "Output", "Feature"][report_type - 1]} report: ${report}`);
        }
    }
    async get_string_descriptor(index, language_id = undefined) {
        this.verify_connection();
        if (index < 0) {
            throw new Error("Invalid string descriptor index");
        }
        if (!this._string_descriptors.has(this._interface_id)) {
            this._string_descriptors.set(this._interface_id, new Map());
            await this.get_string_descriptor(0, 0);
        }
        if (this._string_descriptors.get(this._interface_id).has(index)) {
            return this._string_descriptors.get(this._interface_id).get(index);
        }
        if (index !== 0 && language_id !== undefined && !(this._string_descriptors.get(this._interface_id).get(0).includes(language_id))) {
            throw new Error(`Unsupported language id: ${hex(language_id)}`);
        }
        if (index !== 0 && language_id === undefined) {
            language_id = this._string_descriptors.get(this._interface_id).get(0 /* String Descriptor index */)[0 /* First LANGID */];
        }
        let data = Device.verify_transfer(await this.webusb_device.controlTransferIn({
            requestType: "standard",
            recipient: "device",
            request: 6 /* GET_DESCRIPTOR */,
            value: 3 /* STRING */ * 256 + index,
            index: language_id,
        }, 255));
        let result;
        if (index === 0) {
            result = languages_string_descriptor.parse(new DataView(data.buffer)).data.LANGID;
        }
        else {
            result = string_descriptor.parse(new DataView(data.buffer)).data.string;
        }
        this._string_descriptors.get(this._interface_id).set(index, result);
        return result;
    }
    async get_BOS_descriptor() {
        this.verify_connection();
        if (this.BOS_descriptor === undefined) {
            let data = Device.verify_transfer(await this.webusb_device.controlTransferIn({
                requestType: "standard",
                recipient: "device",
                request: 6 /* GET_DESCRIPTOR */,
                value: 15 /* BOS */ * 256,
                index: 0
            }, 5 /* BOS header size */));
            let total_length = data.getUint16(2, true);
            data = Device.verify_transfer(await this.webusb_device.controlTransferIn({
                requestType: "standard",
                recipient: "device",
                request: 6 /* GET_DESCRIPTOR */,
                value: 15 /* BOS */ * 256,
                index: 0
            }, total_length));
            if (data.byteLength < total_length) {
                throw new USBTransferError(`Invalid length, ${total_length}, for BOS descriptor: ${hex_buffer(data.buffer)}`, 'ok');
            }
            this._BOS_descriptors.set(this._interface_id, this.BOS_descriptor_parser(total_length).parse(new DataView(data.buffer)).data);
        }
        return this.BOS_descriptor;
    }
    async get_HID_descriptor() {
        this.verify_connection();
        if (this.HID_descriptor === undefined) {
            let length = 9;
            let data = await Device.get_HID_class_descriptor(this.webusb_device, 33 /* HID */, 0, length, this._interface_id, 6 /* GET */);
            let returned_length = data.getUint8(0);
            if (length < returned_length) {
                length = returned_length;
                data = await Device.get_HID_class_descriptor(this.webusb_device, 33 /* HID */, 0, length, this._interface_id, 6 /* GET */);
            }
            if (data.byteLength < length) {
                throw new USBTransferError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok");
            }
            this._HID_descriptors.set(this._interface_id, this.HID_descriptor_parser(length).parse(new DataView(data.buffer)).data);
        }
        return this.HID_descriptor;
    }
    async get_report_descriptor() {
        this.verify_connection();
        if (this.report_descriptor === undefined) {
            if (this.HID_descriptor === undefined) {
                await this.get_HID_descriptor();
            }
            /* Get Report descriptor from HID descriptor */
            let reports = this.HID_descriptor.descriptors
                .filter(({ type }) => type === 34 /* Report */);
            if (reports.length > 1) {
                throw new USBTransferError("Multiple Report descriptors specified in HID descriptor.", "ok");
            }
            else if (reports.length === 0) {
                throw new USBTransferError("Report descriptor missing from HID descriptor.", "ok");
            }
            let length = reports[0].size;
            let data = await Device.get_HID_class_descriptor(this.webusb_device, 34 /* Report */, 0, length, this._interface_id, 6 /* GET */);
            if (data.byteLength !== length) {
                throw new USBTransferError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok");
            }
            this._report_descriptors.set(this._interface_id, this.report_descriptor_parser(length).parse(new DataView(data.buffer)).data);
        }
        return this.report_descriptor;
    }
    async get_physical_descriptor(index, length = undefined) {
        this.verify_connection();
        if (this.physical_descriptor === undefined) {
            this._physical_descriptors.set(this._interface_id, []);
        }
        if (this.physical_descriptor[index] === undefined) {
            if (this.HID_descriptor === undefined) {
                await this.get_HID_descriptor();
            }
            let descriptors = this.HID_descriptor.descriptors
                .filter(({ type, size }) => type === 35 /* Physical */);
            if (descriptors.length > 1) {
                throw new USBTransferError("Multiple Physical descriptors specified in HID descriptor.", "ok");
            }
            else if (descriptors.length === 0) {
                throw new USBTransferError("Physical descriptor not present in HID descriptor.", "ok");
            }
            if (index === 0) {
                length = descriptors[0].size;
            }
            else if (length === undefined) {
                throw new Error("Undefined Physical descriptor length.");
            }
            let data = await Device.get_HID_class_descriptor(this.webusb_device, 35 /* Physical */, index, length, this._interface_id, 6 /* GET */);
            if (data.byteLength !== length) {
                throw new USBTransferError("Invalid HID descriptor length: " + hex_buffer(data.buffer), "ok");
            }
            this.physical_descriptor[index] = this.physical_descriptor_parser(length).parse(new DataView(data.buffer)).data;
        }
        return this.physical_descriptor[index];
    }
    async build_reports() {
        if (this.reports === undefined) {
            if (this.report_descriptor === undefined) {
                await this.get_report_descriptor();
            }
            if (this.BOS_descriptor === undefined) {
                await this.get_BOS_descriptor();
            }
            const usage_map = new Map();
            usage_map.set("page" /* page */, null);
            usage_map.set("application" /* application */, null);
            usage_map.set("uint" /* uint */, null);
            usage_map.set("int" /* int */, null);
            usage_map.set("float" /* float */, null);
            usage_map.set("bits" /* bits */, null);
            usage_map.set("utf8" /* utf8 */, null);
            usage_map.set("object" /* object */, null);
            usage_map.set("array" /* array */, null);
            for (const descriptor of this.BOS_descriptor.capability_descriptors) {
                if (descriptor.hasOwnProperty('simpleHID')) {
                    const d = descriptor.simpleHID;
                    if (d.version.major > 1) {
                        throw new DescriptorError(`Incompatible WebUSB-HID version: ${d.version.major}`);
                    }
                    for (const usage of usage_map.keys()) {
                        const page = d[usage];
                        if (page !== undefined) {
                            usage_map.set(usage, page).set(page, usage);
                        }
                    }
                    break;
                }
            }
            const usage = Object.freeze(usage_map.toObject());
            // TODO: FIXME
            if (usage)
                return usage;
            const reports = new Map([
                [1 /* Input */, new Map()],
                [2 /* Output */, new Map()],
                [3 /* Feature */, new Map()]
            ]);
            /* alias `device.reports.input` to `device.report[Input]` */
            reports.set('input', reports.get(1 /* Input */));
            reports.set('output', reports.get(2 /* Output */));
            reports.set('feature', reports.get(3 /* Feature */));
            const global_state_stack = [];
            let delimiter_stack = [];
            let delimited = false;
            let empty_local_state = () => new Map([['usage_stack', []], ['string_stack', []], ['designator_stack', []]]);
            const states = new Map([
                [1 /* Global */, new Map()],
                [2 /* Local */, empty_local_state()],
            ]);
            const add_raw_tags = (item) => {
                /* Strips 'type', 'tag', and 'size' from item, then adds whatever is left to the correct state table */
                states.get(item.type).update(Object.entries(item).slice(3));
            };
            for (const item of this.report_descriptor) {
                switch (item.type) {
                    case 1 /* Global */:
                        switch (item.tag) {
                            case 0 /* Usage_Page */:
                            case 1 /* Logical_Minimum */:
                            case 2 /* Logical_Maximum */:
                            case 3 /* Physical_Minimum */:
                            case 4 /* Physical_Maximum */:
                            case 6 /* Unit */:
                            case 5 /* Unit_Exponent */:
                            case 7 /* Report_Size */:
                            case 8 /* Report_ID */:
                            case 9 /* Report_Count */:
                                add_raw_tags(item);
                                break;
                            case 10 /* Push */:
                                global_state_stack.push(new Map(states.get(1 /* Global */).entries()));
                                break;
                            case 11 /* Pop */:
                                let g = states.get(1 /* Global */);
                                let s = global_state_stack.pop() || new Map();
                                g.clear();
                                g.update(s);
                                break;
                        }
                        break;
                    case 2 /* Local */:
                        switch (item.tag) {
                            case 0 /* Usage */:
                                states.get(2 /* Local */).get('usage_stack').push(new Map(Object.entries(item).slice(3)));
                                break;
                            case 3 /* Designator_Index */:
                                states.get(2 /* Local */).get('designator_stack').push(new Map(Object.entries(item).slice(3)));
                                break;
                            case 1 /* Usage_Minimum */:
                            case 2 /* Usage_Maximum */:
                            case 4 /* Designator_Minimum */:
                            case 5 /* Designator_Maximum */:
                            case 8 /* String_Minimum */:
                            case 9 /* String_Maximum */:
                                add_raw_tags(item);
                                break;
                            case 7 /* String_Index */:
                                states.get(2 /* Local */).get('string_stack').push(this.get_string_descriptor(item.string_index));
                                break;
                            case 10 /* Delimiter */:
                                let delimiter = item.delimiter;
                                if (delimiter === 1 && !delimited) {
                                    delimited = true;
                                }
                                else if (delimiter === 0 && delimited) {
                                    delimiter_stack.push(states.get(2 /* Local */));
                                    states.set(2 /* Local */, empty_local_state());
                                    delimited = false;
                                } // Ignore other delimiter tags because they don't make sense.
                                break;
                        }
                        break;
                    case 0 /* Main */:
                        /* Set the state for the Main item from the Global & Local states */
                        let state = new Map();
                        if (delimiter_stack.length > 0) {
                            /* Only care about the first delimited set */
                            state.update(delimiter_stack[0]);
                            delimiter_stack = [];
                        }
                        state.update(...states.values());
                        /* Flush local state */
                        states.set(2 /* Local */, empty_local_state());
                        switch (item.tag) {
                            case 10 /* Collection */:
                                switch (item.collection) {
                                    case 0 /* Physical */:
                                        break;
                                    case 1 /* Application */:
                                        break;
                                    case 2 /* Logical */:
                                        break;
                                    case 3 /* Report */:
                                        break;
                                    case 4 /* Named_Array */: /* I have no idea WTF this is supposed to do */
                                    case 5 /* Usage_Switch */: /* This application doesn't care */
                                    case 6 /* Usage_Modifier */: /* This application doesn't care */
                                    default:/* Reserved or Vendor collection values are ignored. */ 
                                        break;
                                }
                                break;
                            case 12 /* End_Collection */:
                                break;
                            case 8 /* Input */:
                                break;
                            case 9 /* Output */:
                                break;
                            case 11 /* Feature */:
                                break;
                        }
                        break;
                }
            }
            this._reports.set(this._interface_id, reports);
        }
        return this.reports;
    }
    /**************************
     * External Parser Access *
     **************************/
    /* Overwrite to use different parsers. */
    BOS_descriptor_parser(length) {
        return BOS_descriptor;
    }
    HID_descriptor_parser(length) {
        return HID_descriptor;
    }
    report_descriptor_parser(bytes) {
        return Repeat({ bytes }, HID_item);
    }
    /* Interpreting Physical Descriptor left as an exercise for the reader. */
    physical_descriptor_parser(bytes) {
        return Repeat({ bytes }, Uint8);
    }
    /***************************
     * Public Attribute Access *
     ***************************/
    /* Getters cannot dynamic generate missing descriptors/reports because they're inherently synchronous. */
    get interface_id() {
        return this._interface_id;
    }
    get configuration_id() {
        return this._configuration_id;
    }
    get HID_descriptor() {
        return this._HID_descriptors.get(this._interface_id);
    }
    get BOS_descriptor() {
        return this._BOS_descriptors.get(this._interface_id);
    }
    get report_descriptor() {
        return this._report_descriptors.get(this._interface_id);
    }
    get physical_descriptor() {
        return this._physical_descriptors.get(this._interface_id);
    }
    get reports() {
        let result = this._reports.get(this._interface_id);
        return result !== undefined ? Object.freeze(result.toObject()) : result;
    }
    /******************
     * Public Methods *
     ******************/
    async set_configuration_id(id) {
        this.verify_connection();
        throw Error("Not Implemented");
    }
    async set_interface_id(id) {
        this.verify_connection();
        await this.webusb_device.claimInterface(id);
        this._interface_id = id;
        await this.build_reports();
    }
    async connect(...filters) {
        if (this === undefined) {
            /* Instantiate class, then connect */
            return await (new Device(...filters)).connect();
        }
        if (this.webusb_device !== undefined) {
            /* Already connected */
            return this;
        }
        let device = await navigator.usb.requestDevice({ filters: [...filters, ...this._filters] });
        await device.open();
        if (device.configuration === null)
            await device.selectConfiguration(this._configuration_id);
        await device.claimInterface(this._interface_id);
        this.webusb_device = device;
        await this.build_reports();
        return this;
    }
    static async connect(...filters) {
        /* Instantiate class, then connect */
        return await (new Device(...filters)).connect();
    }
    async receive() {
        this.verify_connection();
        throw new Error("Not Implemented");
    }
    async send(report, ...data) {
        this.verify_connection();
        throw new Error("Not Implemented");
    }
    async get_feature(report) {
        this.verify_connection();
        let report_id = await this.get_report_id(report, 3 /* Feature */);
        let length = this.reports[3 /* Feature */].report_id.byte_length;
        let result = await this.webusb_device.controlTransferIn({
            requestType: "class",
            recipient: "interface",
            request: 1 /* GET_REPORT */,
            value: 3 /* Feature */ * 256 + report_id,
            index: this._interface_id
        }, length);
        return Device.verify_transfer(result);
    }
    async set_feature(report, ...data) {
        this.verify_connection();
        throw new Error("Not Implemented");
    }
    static async get_HID_class_descriptor(device, type, index, length, interface_id, request) {
        let result = await device.controlTransferIn({
            requestType: "standard",
            recipient: "interface",
            request: request,
            value: type * 256 + index,
            index: interface_id
        }, length);
        return Device.verify_transfer(result);
    }
}
navigator.simpleHID = Device;

export { USBTransferError, ConnectionError, ReportError, DescriptorError, Device };
//# sourceMappingURL=bundle.js.map
