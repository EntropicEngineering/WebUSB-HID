export var Descriptor_Types;
(function (Descriptor_Types) {
    Descriptor_Types[Descriptor_Types["DEVICE"] = 1] = "DEVICE";
    Descriptor_Types[Descriptor_Types["CONFIGURATION"] = 2] = "CONFIGURATION";
    Descriptor_Types[Descriptor_Types["STRING"] = 3] = "STRING";
    Descriptor_Types[Descriptor_Types["INTERFACE"] = 4] = "INTERFACE";
    Descriptor_Types[Descriptor_Types["ENDPOINT"] = 5] = "ENDPOINT";
    /* Reserved             = 6, */
    /* Reserved             = 7, */
    Descriptor_Types[Descriptor_Types["INTERFACE_POWER"] = 8] = "INTERFACE_POWER";
    Descriptor_Types[Descriptor_Types["OTG"] = 9] = "OTG";
    Descriptor_Types[Descriptor_Types["DEBUG"] = 10] = "DEBUG";
    Descriptor_Types[Descriptor_Types["INTERFACE_ASSOCIATION"] = 11] = "INTERFACE_ASSOCIATION";
    Descriptor_Types[Descriptor_Types["BOS"] = 15] = "BOS";
    Descriptor_Types[Descriptor_Types["DEVICE_CAPABILITY"] = 16] = "DEVICE_CAPABILITY";
})(Descriptor_Types || (Descriptor_Types = {}));
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
//# sourceMappingURL=USB_data.js.map