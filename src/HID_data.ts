
export const enum Class_Descriptors {
    HID         = 0x21,
    Report      = 0x22,
    Physical    = 0x23,
}

export const enum Descriptor_Request {
    GET         = 0x06,
    SET         = 0x07,
}

export const enum Report_Item_Type {
    Main        = 0b00,
    Global      = 0b01,
    Local       = 0b10,
    /* Reserved = 0b11 */
}

export const enum Report_Main_Item_Tag {
    Input               = 0b1000,
    Output              = 0b1001,
    Feature             = 0b1011,
    Collection          = 0b1010,
    End_Collection      = 0b1100,
}

export const enum Collection_Type {
    Physical            = 0x00,
    Application         = 0x01,
    Logical             = 0x02,
    Report              = 0x03,
    Named_Array         = 0x04,
    Usage_Switch        = 0x05,
    Usage_Modifier      = 0x06,
    /* Reserved         = 0x07-0x7F */
    /* Vendor Defined   = 0x80-0xFF */
}

export const enum Report_Global_Item_Tag {
    Usage_Page          = 0b0000,
    Logical_Minimum     = 0b0001,
    Logical_Maximum     = 0b0010,
    Physical_Minimum    = 0b0011,
    Physical_Maximum    = 0b0100,
    Unit_Exponent       = 0b0101,
    Unit                = 0b0110,
    Report_Size         = 0b0111,
    Report_ID           = 0b1000,
    Report_Count        = 0b1001,
    Push                = 0b1010,
    Pop                 = 0b1011,
}

export const enum Report_Local_Item_Tag {
    Usage               = 0b0000,
    Usage_Minimum       = 0b0001,
    Usage_Maximum       = 0b0010,
    Designator_Index    = 0b0011,
    Designator_Minimum  = 0b0100,
    Designator_Maximum  = 0b0101,
    String_Index        = 0b0111,
    String_Minimum      = 0b1000,
    String_Maximum      = 0b1001,
    Delimiter           = 0b1010,
}

export const enum Request_Type {
    GET_REPORT          = 0x01,
    GET_IDLE            = 0x02,
    GET_PROTOCOL        = 0x03,
    SET_REPORT          = 0x09,
    SET_IDLE            = 0x0A,
    SET_PROTOCOL        = 0x0B,
}

export const enum Request_Report_Type {
    Input               = 0x01,
    Output              = 0x02,
    Feature             = 0x03,
}
