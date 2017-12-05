import 'improved_map';
import { Byte_Map_Class } from 'declarative-binary-serialization';
export declare const Platform_UUIDs: {
    WebUSB: number[];
    SimpleHID: number[];
};
export declare const decode: <T>(data: Map<string, T>) => any;
export declare type Data = Parsed | number | Array<Parsed | number>;
export interface Parsed {
    [name: string]: Data;
}
export declare let item: Byte_Map_Class<any, {}>;
export declare let HID_descriptor: Byte_Map_Class<any, {}>;
export declare let languages_string_descriptor: Byte_Map_Class<any, {}>;
export declare let string_descriptor: Byte_Map_Class<any, {}>;
export declare const enum USAGE {
    page = "page",
    application = "application",
    uint = "uint",
    int = "int",
    float = "float",
    bits = "bits",
    utf8 = "utf8",
    object = "object",
    array = "array",
}
export declare let BOS_descriptor: Byte_Map_Class<any, {}>;
