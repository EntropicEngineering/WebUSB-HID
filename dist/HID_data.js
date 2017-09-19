export var Class_Descriptors;
(function (Class_Descriptors) {
    Class_Descriptors[Class_Descriptors["HID"] = 33] = "HID";
    Class_Descriptors[Class_Descriptors["Report"] = 34] = "Report";
    Class_Descriptors[Class_Descriptors["Physical"] = 35] = "Physical";
})(Class_Descriptors || (Class_Descriptors = {}));
export var Report_Item_Type;
(function (Report_Item_Type) {
    Report_Item_Type[Report_Item_Type["Main"] = 0] = "Main";
    Report_Item_Type[Report_Item_Type["Global"] = 1] = "Global";
    Report_Item_Type[Report_Item_Type["Local"] = 2] = "Local";
    Report_Item_Type[Report_Item_Type["Reserved"] = 3] = "Reserved";
})(Report_Item_Type || (Report_Item_Type = {}));
export var Report_Main_Item_Tag;
(function (Report_Main_Item_Tag) {
    Report_Main_Item_Tag[Report_Main_Item_Tag["Input"] = 8] = "Input";
    Report_Main_Item_Tag[Report_Main_Item_Tag["Output"] = 9] = "Output";
    Report_Main_Item_Tag[Report_Main_Item_Tag["Feature"] = 11] = "Feature";
    Report_Main_Item_Tag[Report_Main_Item_Tag["Collection"] = 10] = "Collection";
    Report_Main_Item_Tag[Report_Main_Item_Tag["End_Collection"] = 12] = "End_Collection";
})(Report_Main_Item_Tag || (Report_Main_Item_Tag = {}));
export var Collection_Type;
(function (Collection_Type) {
    Collection_Type[Collection_Type["Physical"] = 0] = "Physical";
    Collection_Type[Collection_Type["Application"] = 1] = "Application";
    Collection_Type[Collection_Type["Logical"] = 2] = "Logical";
    Collection_Type[Collection_Type["Report"] = 3] = "Report";
    Collection_Type[Collection_Type["Named_Array"] = 4] = "Named_Array";
    Collection_Type[Collection_Type["Usage_Switch"] = 5] = "Usage_Switch";
    Collection_Type[Collection_Type["Usage_Modifier"] = 6] = "Usage_Modifier";
    /* Reserved         = 0x07-0x7F */
    /* Vendor Defined   = 0x80-0xFF */
})(Collection_Type || (Collection_Type = {}));
export var Report_Global_Item_Tag;
(function (Report_Global_Item_Tag) {
    Report_Global_Item_Tag[Report_Global_Item_Tag["Usage_Page"] = 0] = "Usage_Page";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Logical_Minimum"] = 1] = "Logical_Minimum";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Logical_Maximum"] = 2] = "Logical_Maximum";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Physical_Minimum"] = 3] = "Physical_Minimum";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Physical_Maximum"] = 4] = "Physical_Maximum";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Unit_Exponent"] = 5] = "Unit_Exponent";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Unit"] = 6] = "Unit";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Report_Size"] = 7] = "Report_Size";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Report_ID"] = 8] = "Report_ID";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Report_Count"] = 9] = "Report_Count";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Push"] = 10] = "Push";
    Report_Global_Item_Tag[Report_Global_Item_Tag["Pop"] = 11] = "Pop";
})(Report_Global_Item_Tag || (Report_Global_Item_Tag = {}));
export var Report_Local_Item_Tag;
(function (Report_Local_Item_Tag) {
    Report_Local_Item_Tag[Report_Local_Item_Tag["Usage"] = 0] = "Usage";
    Report_Local_Item_Tag[Report_Local_Item_Tag["Usage_Minimum"] = 1] = "Usage_Minimum";
    Report_Local_Item_Tag[Report_Local_Item_Tag["Usage_Maximum"] = 2] = "Usage_Maximum";
    Report_Local_Item_Tag[Report_Local_Item_Tag["Designator_Index"] = 3] = "Designator_Index";
    Report_Local_Item_Tag[Report_Local_Item_Tag["Designator_Minimum"] = 4] = "Designator_Minimum";
    Report_Local_Item_Tag[Report_Local_Item_Tag["Designator_Maximum"] = 5] = "Designator_Maximum";
    Report_Local_Item_Tag[Report_Local_Item_Tag["String_Index"] = 7] = "String_Index";
    Report_Local_Item_Tag[Report_Local_Item_Tag["String_Minimum"] = 8] = "String_Minimum";
    Report_Local_Item_Tag[Report_Local_Item_Tag["String_Maximum"] = 9] = "String_Maximum";
    Report_Local_Item_Tag[Report_Local_Item_Tag["Delimiter"] = 10] = "Delimiter";
})(Report_Local_Item_Tag || (Report_Local_Item_Tag = {}));
//# sourceMappingURL=HID_data.js.map