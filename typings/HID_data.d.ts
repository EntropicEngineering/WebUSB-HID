export declare const enum Class_Descriptors {
    HID = 33,
    Report = 34,
    Physical = 35,
}
export declare const enum Descriptor_Request {
    GET = 6,
    SET = 7,
}
export declare const enum Report_Item_Type {
    Main = 0,
    Global = 1,
    Local = 2,
}
export declare enum Report_Main_Item_Tag {
    Input = 8,
    Output = 9,
    Feature = 11,
    Collection = 10,
    End_Collection = 12,
}
export declare const enum Collection_Type {
    Physical = 0,
    Application = 1,
    Logical = 2,
    Report = 3,
    Named_Array = 4,
    Usage_Switch = 5,
    Usage_Modifier = 6,
}
export declare const enum Report_Global_Item_Tag {
    Usage_Page = 0,
    Logical_Minimum = 1,
    Logical_Maximum = 2,
    Physical_Minimum = 3,
    Physical_Maximum = 4,
    Unit_Exponent = 5,
    Unit = 6,
    Report_Size = 7,
    Report_ID = 8,
    Report_Count = 9,
    Push = 10,
    Pop = 11,
}
export declare const enum Report_Local_Item_Tag {
    Usage = 0,
    Usage_Minimum = 1,
    Usage_Maximum = 2,
    Designator_Index = 3,
    Designator_Minimum = 4,
    Designator_Maximum = 5,
    String_Index = 7,
    String_Minimum = 8,
    String_Maximum = 9,
    Delimiter = 10,
}
export declare const enum Request_Type {
    GET_REPORT = 1,
    GET_IDLE = 2,
    GET_PROTOCOL = 3,
    SET_REPORT = 9,
    SET_IDLE = 10,
    SET_PROTOCOL = 11,
}
export declare const enum Request_Report_Type {
    Input = 1,
    Output = 2,
    Feature = 3,
}
