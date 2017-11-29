/**
 * Created by riggs on 2017/9/7
 *
 * USB HID utility for WebUSB.
 */

interface String {
    padStart(targetLength: number, padString?: string): string;
}

interface Navigator {
    simpleHID: any;
}

interface Window {
    Platform_UUIDs: {[platform: string]: Array<number>}
}
