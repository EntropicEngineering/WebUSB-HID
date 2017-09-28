
export enum Descriptor_Types {
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

export enum Request_Type {
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