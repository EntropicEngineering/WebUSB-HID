Notes
=====

To be written up properly later.

Device acts like a normal HID class device, except Vendor class type in Interface descriptor.

Device defines WebUSB BOS platform descriptor.
(Because it's part of the WebUSB spec, I guess.
Chrome doesn't care right now, not sure if it will in the future.)

Device defines WebUSB-HID BOS platform descriptor.

WebUSB-HID BOS platform descriptor has UUID of TBD. Additional bytes:
* bcdVersion, 2 bytes, binary-coded-decimal version number (1.0.0)
* Vendor Usage Page for data-type mapping (default to `0xFFAA`), 2 bytes
* Usage ID for `Uint` (default `0x0001`), 2 bytes
    * Valid Report Sizes for Usage: 8, 16, 32, 64
* Usage ID for `int`(default `0x0002`), 2 bytes
    * Valid Report Sizes for Usage: 8, 16, 32
* Usage ID for `float` (default `0x0003`), 2 bytes
    * Valid Report Sizes for Usage: 32, 64
* Usage ID for bit field (default `0x0004`), 2 bytes
    * Valid Report Sizes for Usage: any
* Usage ID for `utf8` (default `0x0005`), 2 bytes
* Usage ID for report data type of `Object` (default `0x0006`), 2 bytes
    * Only valid when applied to (declared before) Collection item with Report type.
* Usage ID for report data type of `Object` (default `0x0006`), 2 bytes
    * Only valid when applied to (declared before) Collection item with Logical type.

Logical Minimum & Maximum are ignored because they cannot specify
Uint32 or 64, or Floats. (Logical Min & Max are effectively int32 values.)

A String Index item modifying (declared before) a Collection item of the
Report type will be used to name the enclosed Report ID. This allows
using the designated name instead of the Report ID in API calls.

The `Object` Usage ID is intended to modify Collections with the Report type.
Applying the `Object` usage causes the Javascript API to return report data
values as Javascript Objects. Additionally, any inputs to the API are expected
to be Objects as well.

The property names for the values in the returned (and input) objects are
given by String Descriptors on the device, and are indicated by modifying
the Data Main item (Input, Output, or Feature Main items) with the String
Index for the appropriate String Descriptor. If a String Index are not
present for a given Data item, it will be given a numerical property name.

Example WebUSB-HID Report Descriptor:
```c
Usage_Page (WebUSB_HID_vendor_page /* default of 0xFFAA */)
Usage_ID (0x00)             /* Ignored, but required by HID */
Collection (Application)

    String_Index (4)        /* u'timestamp' */
    Collection (Report)
        Report_ID (1)
        Usage_ID (Uint /* default of 0x0001 */)
        Report_Size (64)
        Report_Count (1)    /* 1x Uint64 */
        Output (Variable | Volatile)
    End_Collection

    String_Index (5)        /* u'status', sent as a response to 'timestamp' */
                            /* when device is ready, or on hardware error. */
    Usage_ID (Object /* default of 0x0006 */)
    Collection (Report)
        Report_ID (1)       /* Same Report ID as 'timestamp', but this is an Input */
        String_Index (4)    /* u'timestamp' */
        Usage_ID (Uint)
        Report_Size (64)
        Report_Count (1)
        Input (Variable)    /* 1x Uint64 */
        String_Index (6)    /* u'serial_number' */
        Usage_ID (Uint)     /* Unfortunately, this needs to be re-declared every time */
        Report_Size (32)
        Report_Count (1)
        Input (Variable)    /* 1x Uint32 */
        String_Index (5)    /* u'status */
        Usage_ID (Uint)
        Report_Size (8)
        Report_Count (4)    /* 4x Uint8 */
        Input (Variable | Buffered_Bytes)
        /* Whole input report is Uint64, Uint32, 4x Uint8 */
    End_Collection

    String_Index (7)        /* u'config' */
    Usage_ID (Object)
    Collection (Report)
        Report_ID (2)
        String_Index (8)    /* u'timeout' */
        Usage_ID (Uint)
        Report_Size (64)
        Report_Count (1)
        Feature (Variable | Volatile)
        String_Index (9)    /* u'threshold' */
        Usage_ID (Uint)
        Report_Size (16)
        Report_Count (1)
        Feature (Variable | Volatile)
        String_Index (10)   /* u'item_order' */
        Usage_ID (Uint)
        Report_Size (8)
        Report_Count (10)
        Feature (Variable | Volatile)
    End_Collection

    String_Index (11)       /* u'event' */
    Usage_ID (Object)
    Collection (Report)
        Report_ID (17)
        String_Index (4)    /* u'timestamp' */
        Usage_ID (Uint)
        Report_Size (64)
        Report_Count (1)
        Input (Variable)
        String_Index (11)   /* u'event' */
        Usage_ID (int /* default of 0x0002 */)
        Report_Size (8)
        Report_Count (1)
        Input (Variable)
    End_Collection

    String_Index (42)       /* u'raw_values' */
    Collection (Report)
        Report_ID (0x45)
        /* Output report of 1x Uint8 */
        Usage_ID (Uint)
        Report_Size (8)
        Report_Count (1)
        Output (Variable | Volatile)
        /* Input report of 10x Uint16, 10x Uint8 */
        Usage_ID (Uint)
        Report_Size (16)
        Report_Count (10)
        Input (Variable | Buffered_Bytes)
        Usage_ID (Uint)
        Report_Size (8)
        Report_Count (10)   /* Technically redundant, but explicit is better than implicit. */
        Input (Variable | Buffered_Bytes)
    End_Collection
End_Collection
```
Javascript API:
```javascript
let device = await navigator.hid.connect();     /* Pop-up window prompts user to select device */

await device.set_feature('config', {'timeout': 42*60*100 /* ms */,
                                    'threshold': 42,
                                    'item_order': [0, 2, 4, 6, 8, 9, 7, 5, 3, 1]});

await device.send('timestamp', Date.now());

let report = await device.receive();

console.assert(report.id === device.reports.status, device.reports[report.id]);

console.log(report.data.status);    /* [0, 1, 2, 3] */

let handle = (report) => {
  switch (report.id) {
    case device.reports.status:
      console.log(`new status: ${report.data.status}`);
      break;
    case device.reports.event:
      console.log(`Event ${report.data.event} happened at ${report.data.timestamp}`);
      break;
    case device.reports.raw_values:
      Grapher.Graph(report.data.slice(4, -4), Date.now());
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

await device.send('raw_values', 1);     /* Turn on raw ADC value reporting. */
```


Data Main items with a Report Count of more than 1 will be interpreted as an
 array of values with their data type defined by given Usage(s), with multiple
 Usage declarations acting as a FIFO queue of modifiers, as per any other
 Usage. (HID spec 6.2.2.8, HID1_11.pdf page 50.)
