export var Descriptor_Type;
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
export var Request_Type;
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
})(Request_Type || (Request_Type = {}));
export var Capability_Type;
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
//# sourceMappingURL=USB_data.js.map