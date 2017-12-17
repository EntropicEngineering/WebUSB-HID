import 'improved-map';
import { Binary_Map } from 'binary-structures';
export declare const Platform_UUIDs: {
    WebUSB: number[];
    SimpleHID: number[];
};
export declare const decode: (data: Map<string, any>) => any;
export declare type Data = Parsed | number | Array<Parsed | number>;
export interface Parsed {
    [name: string]: Data;
}
export declare let HID_item: Binary_Map<any, any, {}>;
export declare let HID_descriptor: Binary_Map<any, any, {}>;
export declare let languages_string_descriptor: Binary_Map<any, any, {}>;
export declare let string_descriptor: Binary_Map<any, any, {}>;
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
export declare let BOS_descriptor: Binary_Map<any, any, {}>;
