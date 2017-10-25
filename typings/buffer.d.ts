// Type definitions for buffer
// Project: https://github.com/feross/buffer
// Definitions by: Benjamin Riggs <https://github.com/riggs>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

interface Buffer {

    alloc(size: number, fill?: string| Buffer | number, encoding?: string): Buffer;

    allocUnsafe(size: number): Buffer;

    allocUnsafeSlow(size: number): Buffer;

    readonly buffer: ArrayBuffer;

    byteLength(string: string | Buffer | ArrayLike<number> | DataView | ArrayBuffer, encoding?: string): number;

    compare(buffer: Buffer | Uint8Array, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): number;
    compare(buf1: Buffer, buf2: Buffer): number;

    concat(list: Array<Buffer| Uint8Array>, totalLength?: number): Buffer;

    copy(target: Buffer | Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;

    equals(otherBuffer: Buffer | Uint8Array): boolean;

    fill(value: string | Buffer | number, offset?: number, end?: number, encoding?: string): Buffer;

    from(arg1: Array<number> | ArrayBuffer | Buffer | string | ArrayLike<number>, arg2?: number | string, arg3?: number): Buffer;

    includes(value: string | Buffer | number, byteOffset?: number, encoding?: string): boolean;

    indexOf(value: string | Buffer | number, byteOffset?: number, encoding?: string): number;

    isBuffer(obj: any): boolean;

    isEncoding(encoding: string): boolean;

    lastIndexOf(value: string | Buffer | number, byteOffset?: number, encoding?: string): number;

    readonly length: number;

    readDoubleBE(offset: number, noAssert?: boolean): number;
    readDoubleLE(offset: number, noAssert?: boolean): number;

    readFloatBE(offset: number, noAssert?: boolean): number;
    readFloatLE(offset: number, noAssert?: boolean): number;

    readInt8(offset: number, noAssert?: boolean): number;

    readInt16BE(offset: number, noAssert?: boolean): number;
    readInt16LE(offset: number, noAssert?: boolean): number;

    readInt32BE(offset: number, noAssert?: boolean): number;
    readInt32LE(offset: number, noAssert?: boolean): number;

    readIntBE(offset: number, byteLength: number, noAssert?: boolean): number;
    readIntLE(offset: number, byteLength: number, noAssert?: boolean): number;

    readUInt8(offset: number, noAssert?: boolean): number;

    readUInt16BE(offset: number, noAssert?: boolean): number;
    readUInt16LE(offset: number, noAssert?: boolean): number;

    readUInt32BE(offset: number, noAssert?: boolean): number;
    readUInt32LE(offset: number, noAssert?: boolean): number;

    readUIntBE(offset: number, byteLength: number, noAssert?: boolean): number;
    readUIntLE(offset: number, byteLength: number, noAssert?: boolean): number;

    poolSize: number;

    slice(start?: number, end?: number): Buffer;

    swap16(): Buffer;
    swap32(): Buffer;
    swap64(): Buffer;

    toJSON(): any;

    toString(encoding?: string, start?: number, end?: number): string;

    write(string: string, offset?: number, length?: number, encoding?: string): number;

    writeDoubleBE(value: number, offset: number, noAssert?: boolean): number;
    writeDoubleLE(value: number, offset: number, noAssert?: boolean): number;

    writeFloatBE(value: number, offset: number, noAssert?: boolean): number;
    writeFloatLE(value: number, offset: number, noAssert?: boolean): number;

    writeInt8(value: number, offset: number, noAssert?: boolean): number;

    writeInt16BE(value: number, offset: number, noAssert?: boolean): number;
    writeInt16LE(value: number, offset: number, noAssert?: boolean): number;

    writeInt32BE(value: number, offset: number, noAssert?: boolean): number;
    writeInt32LE(value: number, offset: number, noAssert?: boolean): number;

    writeIntBE(value: number, offset: number, byteLength: number, noAssert?: boolean): number;
    writeIntLE(value: number, offset: number, byteLength: number, noAssert?: boolean): number;

    writeUInt8(value: number, offset: number, noAssert?: boolean): number;

    writeUInt16BE(value: number, offset: number, noAssert?: boolean): number;
    writeUInt16LE(value: number, offset: number, noAssert?: boolean): number;

    writeUInt32BE(value: number, offset: number, noAssert?: boolean): number;
    writeUInt32LE(value: number, offset: number, noAssert?: boolean): number;

    writeUIntBE(value: number, offset: number, byteLength: number, noAssert?: boolean): number;
    writeUIntLE(value: number, offset: number, byteLength: number, noAssert?: boolean): number;

    [index: number]: number | undefined;

}

interface BufferConstructor {
    new (arg1: Array<number> | ArrayBuffer | Buffer | number | string, arg2?: number | string, arg3?: number): Buffer;

    readonly INSPECT_MAX_BYTES: number;

    readonly kMaxLength: number;

    transcode(source: Buffer | Uint8Array, fromEnc: string, toEnc: string): Buffer;

    constants: {MAX_LENGTH: number, MAX_STRING_LENGTH: number}
}

declare const Buffer: BufferConstructor;
export default Buffer;
