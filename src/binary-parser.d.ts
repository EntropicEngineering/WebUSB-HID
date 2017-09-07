// Type definitions for binary-parser <https://github.com/keichi/binary-parser>
// Project: binary-parser
// Definitions by: Benjamin Riggs <https://github.com/riggs>

/// <reference types="typescript" />

import {Callback} from "awesome-typescript-loader/dist/paths-plugin";
import Buffer from 'buffer';

declare namespace binary_parser {

    interface Options {
        formatter?: (arg: any) => any;
        assert?: string | number | ((arg: any) => boolean);
    }

    interface StringOptions extends Options {
        encoding?: string;
        length?: number | string | ((arg?: Map<string, any>) => number);
        zeroTerminated?: boolean;
        greedy?: boolean;
        stripNull?: boolean;
    }

    interface BufferOptions extends Options {
        clone?: boolean;
        length?: number | string | ((arg?: Map<string, any>) => number);
        readUntil?: string | ((item: number, buffer: Buffer) => boolean);
    }

    interface ArrayOptions extends Options {
        type: string | Parser;
        length?: number | string | ((arg?: Map<string, any>) => number);
        lengthInBytes?: number | string | ((arg?: Map<string, any>) => number);
        readUntil?: string | ((item: number, buffer: Buffer) => boolean);
    }

    interface ChoiceOptions extends Options {
        tag: string | ((arg?: Map<string, any>) => number);
        choices: Map<number, Parser | string>;
        defaultChoice?: Parser | string;
    }

    interface NestOptions extends Options {
        type: Parser | string;
    }

    export const enum Endianness {
        little = 'little',
        big = 'big'
    }

    export interface Parser {
        new (): Parser;

        parse(buffer: Buffer, callback?: Callback): any;

        create(constructorFunction: ObjectConstructor): Parser;

        int8(name: string, options?: Options): Parser;
        uint8(name: string, options?: Options): Parser;

        int16(name: string, options?: Options): Parser;
        uint16(name: string, options?: Options): Parser;
        int16le(name: string, options?: Options): Parser;
        int16be(name: string, options?: Options): Parser;
        uint16le(name: string, options?: Options): Parser;
        uint16be(name: string, options?: Options): Parser;

        int32(name: string, options?: Options): Parser;
        uint32(name: string, options?: Options): Parser;
        int32le(name: string, options?: Options): Parser;
        int32be(name: string, options?: Options): Parser;
        uint32le(name: string, options?: Options): Parser;
        uint32be(name: string, options?: Options): Parser;

        bit1(name: string, options?: Options): Parser;
        bit2(name: string, options?: Options): Parser;
        bit3(name: string, options?: Options): Parser;
        bit4(name: string, options?: Options): Parser;
        bit5(name: string, options?: Options): Parser;
        bit6(name: string, options?: Options): Parser;
        bit7(name: string, options?: Options): Parser;
        bit8(name: string, options?: Options): Parser;
        bit9(name: string, options?: Options): Parser;
        bit10(name: string, options?: Options): Parser;
        bit11(name: string, options?: Options): Parser;
        bit12(name: string, options?: Options): Parser;
        bit13(name: string, options?: Options): Parser;
        bit14(name: string, options?: Options): Parser;
        bit15(name: string, options?: Options): Parser;
        bit16(name: string, options?: Options): Parser;
        bit17(name: string, options?: Options): Parser;
        bit18(name: string, options?: Options): Parser;
        bit19(name: string, options?: Options): Parser;
        bit20(name: string, options?: Options): Parser;
        bit21(name: string, options?: Options): Parser;
        bit22(name: string, options?: Options): Parser;
        bit23(name: string, options?: Options): Parser;
        bit24(name: string, options?: Options): Parser;
        bit25(name: string, options?: Options): Parser;
        bit26(name: string, options?: Options): Parser;
        bit27(name: string, options?: Options): Parser;
        bit28(name: string, options?: Options): Parser;
        bit29(name: string, options?: Options): Parser;
        bit30(name: string, options?: Options): Parser;
        bit31(name: string, options?: Options): Parser;
        bit32(name: string, options?: Options): Parser;

        float(name: string, options?: Options): Parser;
        floatle(name: string, options?: Options): Parser;
        floatbe(name: string, options?: Options): Parser;

        double(name: string, options?: Options): Parser;
        doublele(name: string, options?: Options): Parser;
        doublebe(name: string, options?: Options): Parser;

        string(name: string, options?: StringOptions): Parser;

        buffer(name: string, options: BufferOptions): Parser;

        array(name: string, options: ArrayOptions): Parser;

        choice(name: string, options: ChoiceOptions): Parser;

        nest(name: string, options: NestOptions): Parser;

        skip(length: number | Map<string, any>): Parser;

        endianess(endianess: Endianness): Parser; /* [sic] */

        namely(alias: string): Parser;

        compile(): void;

        getCode(): string;
    }
}
