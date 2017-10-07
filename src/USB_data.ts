
export const enum Descriptor_Type {
    DEVICE                  = 1,
    CONFIGURATION           = 2,
    STRING                  = 3,
    INTERFACE               = 4,
    ENDPOINT                = 5,
    /* Reserved             = 6, */
    /* Reserved             = 7, */
    INTERFACE_POWER         = 8,
    OTG                     = 9,
    DEBUG                   = 10,
    INTERFACE_ASSOCIATION   = 11,
    BOS                     = 15,
    DEVICE_CAPABILITY       = 16,
}

export const enum Request_Type {
    GET_STATUS              = 0,
    CLEAR_FEATURE           = 1,
    /* Reserved             = 2, */
    SET_FEATURE             = 3,
    /* Reserved             = 4, */
    SET_ADDRESS             = 5,
    GET_DESCRIPTOR          = 6,
    SET_DESCRIPTOR          = 7,
    GET_CONFIGURATION       = 8,
    SET_CONFIGURATION       = 9,
    GET_INTERFACE           = 10,
    SET_INTERFACE           = 11,
    /* Further request types left as an exercise to the reader */
}

export const enum Capability_Type {
    /* Reserved             = 0x00, */
    Wireless_USB            = 0x01,
    USB_2_0_Extension       = 0x02,
    SUPERSPEED_USB          = 0x03,
    CONTAINER_ID            = 0x04,
    PLATFORM                = 0x05,
    POWER_DELIVERY_CAPABILITY = 0x06,
    BATTERY_INFO_CAPABILITY = 0x07,
    PD_CONSUMER_PORT_CAPABILITY = 0x08,
    PD_PROVIDER_PORT_CAPABILITY = 0x09,
    SUPERSPEED_PLUS         = 0x0A,
    PRECISION_TIME_MEASUREMENT = 0x0B,
    Wireless_USB_Ext        = 0x0C,
    /* Reserved             = 0x0D-0xFF */
}
