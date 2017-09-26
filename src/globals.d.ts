/**
 * Created by riggs on 2017/9/7
 *
 * USB HID utility for WebUSB.
 */

interface String {
    padStart(targetLength: number, padString?: string): string;
}

interface MapConstructor {
    assign(target: Map<any, any>, ...sources: Array<Map<any, any>>): Map<any, any>
}

interface Map<K, V> {
    update(...sources: Array<Map<any, any>>): Map<K, V>
}

interface Navigator {
    hid: any;
}

interface Window {
    Buffer: any;
}
