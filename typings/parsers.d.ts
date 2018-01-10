import 'improved-map';
import { Binary_Map } from 'binary-structures';
export declare type Parsed = Parsed_Object | number | Array<Parsed_Object | number> | Parsed_Map;
export interface Parsed_Object {
    [name: string]: Parsed;
}
export interface Parsed_Map extends Map<string, Parsed> {
}
export declare const Platform_UUIDs: {
    WebUSB: number[];
    SimpleHID: number[];
};
export declare const decode: (data: Map<string, any>) => any;
export declare const encode: (data: Parsed_Object) => Map<any, any>;
export declare const map_transcoders: {
    encode: (data: Parsed_Object) => Map<any, any>;
    decode: (data: Map<string, any>) => any;
};
export declare let HID_item: Binary_Map<any, any, {}>;
export declare let HID_descriptor: Binary_Map<any, any, {}>;
export declare let languages_string_descriptor: Binary_Map<any, any, {}>;
export declare let string_descriptor: Binary_Map<any, any, {}>;
export declare type USAGES = 'page' | 'application' | 'array' | 'object' | 'uint' | 'int' | 'float' | 'utf8';
export declare const enum USAGE {
    page = 65450,
    application = 0,
    array = 1,
    object = 2,
    uint = 3,
    int = 4,
    float = 5,
    utf8 = 6,
}
export declare let BOS_descriptor: Binary_Map<any, any, {}>;
