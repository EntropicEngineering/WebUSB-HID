// Type definitions for WebUSB
// Project: https://github.com/WICG/webusb
// Definitions by: Benjamin Riggs <https://github.com/riggs>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module WebUSB {

    /** 5. Device Enumeration
     *
     * https://wicg.github.io/webusb/#enumeration
     */
    export interface USBDeviceFilter {
        vendorId?: number;
        productId?: number;
        classCode?: number;
        subclassCode?: number;
        protocolCode?: number;
        serialNumber?: string;
    }

    export interface USBDeviceRequestOptions {
        filters: Array<USBDeviceFilter>;
    }

    interface EventHandler {
        (event?: Event): void;
    }

    export interface USB extends EventTarget {
        onconnect: EventHandler;
        ondisconnect: EventHandler;
        getDevices(): Promise<Array<USBDevice>>;
        requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
    }

    /** 5.1 Events
     *
     * https://wicg.github.io/webusb/#events
     */
    export interface USBConnectionEventInit extends EventInit {
        device: USBDevice;
    }

    export interface USBConnectionEvent extends Event {
        new (type: string, eventInitDict: USBConnectionEventInit): USBConnectionEvent;
        readonly device: USBDevice;
    }

    /** 6. Device Usage
     *
     * https://wicg.github.io/webusb/#device-usage
     */
    export interface USBDevice {
        readonly usbVersionMajor: number;
        readonly usbVersionMinor: number;
        readonly usbVersionSubminor: number;
        readonly deviceClass: number;
        readonly deviceSubclass: number;
        readonly deviceProtocol: number;
        readonly vendorId: number;
        readonly productId: number;
        readonly deviceVersionMajor: number;
        readonly deviceVersionMinor: number;
        readonly deviceVersionSubminor: number;
        readonly manufacturerName: string | null;
        readonly productName: string | null;
        readonly serialNumber: string | null;
        readonly configuration: USBConfiguration | null;
        readonly configurations: ReadonlyArray<USBConfiguration> ;
        readonly opened: boolean;
        open(): Promise<void>;
        close(): Promise<void>;
        selectConfiguration(configurationValue: number): Promise<void>;
        claimInterface( interfaceNumber: number): Promise<void>;
        releaseInterface( interfaceNumber: number): Promise<void>;
        selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>;
        controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>;
        controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult>;
        clearHalt(direction: USBDirection, endpointNumber: number): Promise<void>;
        transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
        transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
        isochronousTransferIn(endpointNumber: number, packetLengths: Array<number>): Promise<USBIsochronousInTransferResult>;
        isochronousTransferOut(endpointNumber: number, data: BufferSource, packetLengths: Array<number>): Promise<USBIsochronousOutTransferResult>;
        reset(): Promise<void>;
    }

    /** 6.1 Transfers
     *
     * https://wicg.github.io/webusb/#transfers
     */
    export type USBRequestType =
        'standard' |
        'class' |
        'vendor'

    export type USBRecipient =
        'device' |
        'interface' |
        'endpoint' |
        'other'

    export type USBTransferStatus =
        'ok' |
        'stall' |
        'babble'

    export interface USBControlTransferParameters {
        requestType: USBRequestType;
        recipient: USBRecipient;
        request: number;
        value: number;
        index: number;
    }

    export interface USBInTransferResult {
        new (status: USBTransferStatus, data?: DataView | null): USBInTransferResult;
        data: DataView | null;
        status: USBTransferStatus;
    }

    export interface USBOutTransferResult {
        new (status: USBTransferStatus, bytesWritten?: number): USBOutTransferResult;
        bytesWritten: number;
        status: USBTransferStatus;
    }

    export interface USBIsochronousInTransferPacket {
        new (status: USBTransferStatus, data?: DataView | null): USBIsochronousInTransferPacket;
        readonly data: DataView | null;
        readonly status: USBTransferStatus;
    }

    export interface USBIsochronousInTransferResult {
        new (packets: Array<USBIsochronousInTransferPacket>, data?: DataView | null): USBIsochronousInTransferResult;
        readonly data: DataView | null;
        readonly packets: ReadonlyArray<USBIsochronousInTransferPacket>;
    }

    export interface USBIsochronousOutTransferPacket {
        new (status: USBTransferStatus, bytesWritten?: number): USBIsochronousOutTransferPacket;
        readonly bytesWritten: number;
        readonly status: USBTransferStatus;
    }

    export interface USBIsochronousOutTransferResult {
        new (packets: Array<USBIsochronousOutTransferPacket>): USBIsochronousOutTransferResult;
        readonly packets: ReadonlyArray<USBIsochronousOutTransferPacket>;
    }

    /** 6.2 Configurations
     *
     * https://wicg.github.io/webusb/#configurations
     */
    export interface USBConfiguration {
        new (device: USBDevice, configurationValue: number): USBConfiguration;
        readonly configurationValue: number;
        readonly configurationName: string | null;
        readonly interfaces: ReadonlyArray<USBInterface>;
    }

    /** 6.3 Interfaces
     *
     * https://wicg.github.io/webusb/#interfaces
     */
    export interface USBInterface {
        new (configuration: USBConfiguration, interfaceNumber: number): USBInterface;
        readonly interfaceNumber: number;
        readonly alternate: USBAlternateInterface;
        readonly alternates: ReadonlyArray<USBAlternateInterface>;
        readonly claimed: boolean;
    }

    export interface USBAlternateInterface {
        new (deviceInterface: USBInterface, alternateSetting: number): USBAlternateInterface;
        readonly alternateSetting: number;
        readonly interfaceClass: number;
        readonly interfaceSubclass: number;
        readonly interfaceProtocol: number;
        readonly interfaceName: string | null;
        readonly endpoints: ReadonlyArray<USBEndpoint>;
    }

    /** 6.4 Endpoints
     *
     * https://wicg.github.io/webusb/#endpoints
     */
    export type USBDirection =
        'in' |
        'out'

    export type USBEndpointType =
        'bulk' |
        'interrupt' |
        'isochronous'

    export interface USBEndpoint {
        new (alternate: USBAlternateInterface, endpointNumber: number, direction: USBDirection): USBEndpoint;
        readonly endpointNumber: number;
        readonly direction: USBDirection;
        readonly type: USBEndpointType;
        readonly packetSize: number;
    }

    /** 7.2 Permissions API
     *
     * https://wicg.github.io/webusb/#permission-api
     */
    export interface USBPermissionDescriptor extends PermissionDescriptor {
        filters: Array<USBDeviceFilter>;
    }

    export interface AllowedUSBDevice {
        vendorId: number;
        productId: number;
        serialNumber?: string;
    }

    export interface USBPermissionStorage {
        allowedDevices: Array<AllowedUSBDevice>;
    }

    export interface USBPermissionResult extends PermissionStatus {
        devices: ReadonlyArray<USBDevice>;
    }

    /* Missing Permissions definitions */
    interface PermissionDescriptor {
        name: PermissionName;
    }
    type PermissionName =
        "geolocation" |
        "notifications" |
        "push" |
        "midi" |
        "camera" |
        "microphone" |
        "speaker" |
        "device-info" |
        "background-sync" |
        "bluetooth" |
        "persistent-storage" |
        "ambient-light-sensor" |
        "accelerometer" |
        "gyroscope" |
        "magnetometer" |
        "clipboard"
    interface PermissionStatus extends EventTarget {
        readonly state: PermissionState;
        onchange: EventHandler;
    }
    type PermissionState =
        'granted' |
        'denied' |
        'prompt'
}

interface Navigator {
    usb: WebUSB.USB;
}
