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

interface Text_Encoder {
    readonly encoding: 'utf-8';
    encode(buffer?: string, options?: {stream: boolean}): Uint8Array;
}

interface Text_Encoder_Constructor {
    new (): Text_Encoder;
}

declare const TextEncoder: Text_Encoder_Constructor;

interface Text_Decoder {
    readonly encoding: string;
    readonly fatal: boolean;
    readonly ignoreBOM: boolean;
    decode(buffer?: ArrayBuffer | ArrayBufferView, options?: {stream: boolean}): string;
}

interface Text_Decoder_Constructor {
    new (utfLabel?: string, options?: {fatal: boolean, ignoreBOM: boolean}): Text_Decoder;
}

declare const TextDecoder: Text_Decoder_Constructor;

/* Pushing this to the global object because of a deficiency in typescript. */
interface SymbolConstructor {
    Context_Parent: symbol;
}
