SimpleHID
=========

Protocol
--------

Device acts like a normal HID class device, except Vendor class type in Interface descriptor.

Device (optionally) defines SimpleHID BOS platform descriptor (with all the normal Capability
and Platform headers).

SimpleHID BOS platform descriptor has UUID of 'a8adf97c-6a20-48e4-a97c-79978eec00c7'.

CapabilityData, 18 bytes (Platform descriptor total of 38 bytes):
* bcdVersion, 2 bytes, binary-coded-decimal version number (1.0.0)
* Vendor Usage Page for SimpleHID data-type mapping (default to `0xFFAA`), 2 bytes
* Usage ID applied to Application-type Collections to indicate SimpleHID compatibility, 2 bytes (default `0x0000`)
* Usage ID for report data type of `Array`, 2 bytes (default `0x0001`)
    * Only valid when applied to Collection items with Report, Logical, or Physical types.
    * Default report type is `Array`, so this can be omitted.
* Usage ID for report data type of `Object`, 2 bytes (default `0x0002`)
    * Only valid when applied to Collection items with Report, Logical, or Physical types.
    * Only valid when applied to (declared before) Collection items with Report type.
* Usage ID for `Uint`, 2 bytes (default `0x0003`)
    * Valid Report Sizes for Usage: 8, 16, 32, 64
* Usage ID for `int`, 2 bytes (default `0x0004`)
    * Valid Report Sizes for Usage: 8, 16, 32
* Usage ID for `float`, 2 bytes (default `0x0005`)
    * Valid Report Sizes for Usage: 32, 64
* Usage ID for `utf8`, 2 bytes (default `0x0006`)
    * Valid Report Sizes for Usage: multiples of 8

Top-level Application-type Collections in a Report Descriptor will be ignored unless
they are tagged with (preceded by) the Usage Page & ID specified in the
BOS platform descriptor (or the default values if the device doesn't have
a SimpleHID BOS platform descriptor).

Report request types (Input, Output, or Feature) are grouped into Report-type Collections.
Report IDs (if used) shall precede each Report Collection declaration.

A String Index item preceding a Report Collection item will be used to name the Report ID.
This allows using the designated name instead of the Report ID in API calls.
The combination of report type (Input, Output, or Feature) and report name must be unique
in order to identify Report ID.

The `Object` Usage ID is intended to modify Report Collections.
Applying the `Object` usage causes the Javascript API to return report data
values as Javascript Objects. Additionally, any inputs to the API are expected
to be Objects as well. By default, report data will be accessed as an Array.

The property names for the values in the returned (and output) objects are
given by String Descriptors on the device, and are indicated by modifying
the Data Main item (Input, Output, or Feature Main items) with the String
Index for the appropriate String Descriptor. If a String Index are not
present for a given Data item, it will be given a numerical property name.

The `Array` or `Object` Usage ID can be applied to Logical or Physical type
Collections within other Report Collections to nest data structures, with the enclosed
Data items being accessed via a nested Array or Object. This can be used
to construct arbitrarily complex objects. Best practice, however, is to
split data between Report IDs to create additional smaller reports.

Example SimpleHID Report Descriptor
-----------------------------------
```c
Usage_Page (SimpleHID_vendor_page)          /* default of 0xFFAA */
Usage_ID (SimpleHID_application_collection) /* default of 0x0000 */
Collection (Application)

    /* Report Name: 'timestamp'
     * Report ID:   1
     * Report Type: Output
     * Report Data: [ Uint64 ]
     */
    String_Index(4)             /* u'timestamp' */
    Report_ID(1)
    Usage_ID(USAGE_ARRAY)       /* default of 0x0001, can be omitted as Array is default */
    Collection(Report)
        Usage_ID(USAGE_UINT)    /* default of 0x0003 */
        Report_Size(64)
        Report_Count(1)         /* 1x Uint64 */
        Output(Variable)
    End_Collection

    /* Report Name: 'status'
     * Report ID:   1
     * Report Type: Input
     * Report Data: { 'timestamp': Uint64,
     *                'serial_number': Uint32,
     *                'status': Uint8[4] }
     */
    String_Index(5)         /* u'status' */
    Report_ID(1)        /* Same Report ID as 'timestamp', but this is an Input */
    Usage_ID(USAGE_OBJECT)  /* default of 0x0002 */
    Collection(Report)
        String_Index(4)     /* u'timestamp' */
        Usage_ID(USAGE_UINT) Report_Size(64) Report_Count(1) Input(Variable)        /* 1x Uint64 */
        String_Index(6)     /* u'serial_number' */
        Usage_ID(USAGE_UINT) Report_Size(32) Report_Count(1) Input(Variable)        /* 1x Uint32 */
        String_Index(5)     /* u'status */
        Usage_ID(USAGE_UINT) Report_Size(8) Report_Count(4) Input(Variable)         /* 4x Uint8 */
    End_Collection

    /* Report Name: 'config'
     * Report ID:   2
     * Report Type: Feature
     * Report Data: { 'timeout': Uint64,
     *                'error_threshold': Uint16,
     *                'item_order': Uint8[10] }
     */
    String_Index(7)         /* u'config'*/
    Report_ID(2)
    Usage_ID(USAGE_OBJECT)
    Collection(Report)
        String_Index(8)     /* u'timeout' */
        Usage_ID(USAGE_UINT) Report_Size(64) Report_Count(1) Feature(Variable | Volatile)
        String_Index(9)     /* u'threshold' */
        Usage_ID(USAGE_UINT) Report_Size(16) Report_Count(1) Feature(Variable | Volatile)
        String_Index(10)    /* u'item_order' */
        Usage_ID(USAGE_UINT) Report_Size(8) Report_Count(10) Feature(Variable | Volatile)
    End_Collection

    /* Report Name: 'event'
     * Report ID:   17
     * Report Type: Input
     * Report Data: { 'timestamp': Uint64,
     *                'event': Uint8 }
     */
    String_Index(11)        /* u'event' */
    Report_ID(17)
    Usage_ID(USAGE_OBJECT)
    Collection(Report)
        String_Index(4)     /* u'timestamp' */
        Usage_ID(USAGE_UINT) Report_Size(64) Report_Count(1) Input(Variable)
        String_Index(11)    /* u'event' */
        Usage_ID(USAGE_INT) Report_Size(8) Report_Count(1) Input(Variable)
    End_Collection

    /* Report Name: 'raw_values'
     * Report ID:   0x45
     *
     * Report Type: Output
     * Report Data: None
     */
    String_Index(42)            /* u'raw_values' */
    Report_ID(0x45)
    Collection(Report)
        Report_Size(0) Report_Count(0) Output(Variable | Volatile) /* Output report with no data */
    End_Collection

    /* Report Name: 'raw_values'
     * Report ID:   0x45
     *
     * Report Type: Input
     * Report Data: { 'single_array': [Uint16, Uint16, ...Uint16, Uint8, Uint8, ...Uint8],
     *                'nested_arrays': [[Uint16, Uint16, ...Uint16], [Uint8, Uint8, ...Uint8]]
     *                'object': { 'ADCs': [Uint16, Uint16, ...Uint16],
     *                            'switches': [Uint8, Uint8, ...Uint8] }
     */
    String_Index(42)            /* u'raw_values' */
    Report_ID(0x45)
    Usage_ID(USAGE_OBJECT)
    Collection(Report)
        /* Input report of 10x Uint16, 10x Uint8 in a single array */
        /* Multiple Data Items with the same String Index are concatenated */
        String_Index(43)        /* u'single_array' */
        Usage_ID(USAGE_UINT) Report_Size(16) Report_Count(10) Input(Variable | Buffered_Bytes)
        String_Index(43)        /* u'single_array' */
        Usage_ID(USAGE_UINT) Report_Size(8) Report_Count(10) Input(Variable | Buffered_Bytes)

        /* Input report of [Uint16[10], Uint8[10]]: two arrays nested in an array */
        String_Index(44)        /* u'nested_arrays' */
        Usage_ID(USAGE_ARRAY)   /* Declare outter array */
        Collection(Physical)
            Usage_ID(USAGE_UINT) Report_Size(16) Report_Count(10) Input(Variable | Buffered_Bytes)
            Usage_ID(USAGE_UINT) Report_Size(8) Report_Count(10) Input(Variable | Buffered_Bytes)
        End_Collection

        String_Index(45)        /* u'object' */
        Usage_ID(USAGE_OBJECT)  /* Declare nested object */
        Collection(Physical)
            String_Index(46)        /* u'ADCs' */
            Usage_ID(USAGE_UINT) Report_Size(16) Report_Count(10) Input(Variable | Buffered_Bytes)
            String_Index(47)        /* u'switches' */
            Usage_ID(USAGE_UINT) Report_Size(8) Report_Count(10) Input(Variable | Buffered_Bytes)
        End_Collection
    End_Collection
End_Collection
```
Javascript Library Example
--------------------------
Connecting to the device defined above:
```javascript
let device = await navigator.simpleHID.connect();     /* Pop-up window prompts user to select device */

await device.set_feature('config', {'timeout': 6*60*100 /* ms */,
                                    'error_threshold': 42,
                                    'item_order': [0, 2, 4, 6, 8, 9, 7, 5, 3, 1]});

await device.send('timestamp', [ Date.now() ]);

let report = await device.receive();

console.assert(report.id === device.reports.input.status, device.reports.input[report.id]);

console.log(report.data.status);    /* [0, 1, 2, 3] */

let handle = (report) => {
  switch (report.id) {
    case device.reports.input.status:
      console.log(`new status: ${report.data.status}`);
      break;
    case device.reports.input.event:
      console.log(`Event ${report.data.event} happened at ${report.data.timestamp}`);
      break;
    case device.reports.input.raw_values:
      Grapher.Graph(report.data.raw_values.slice(4, -4), Date.now());
      break;
    default:
      console.log(`Unknown Input report: ${report}`);
  }
}

let poll = async () => {
  try {
    let report = await device.receive();
    handle(report);
    setTimeout(poll, 0);
  } catch (error) {
    if (error isinstanceof StopError) {
      console.log("stopping polling");
    } else {
      throw error;
    }
  }
}
setTimeout(poll, 0);

await device.send('raw_values');     /* Turn on raw ADC value reporting. */
```

Logical Minimum & Maximum are ignored because they cannot specify
Uint32 or 64, or Floats. (Logical Min & Max are effectively int32 values.)
