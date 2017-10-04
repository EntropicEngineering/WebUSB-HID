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
* Vendor Usage Page for data-type mapping (default to 0xFFAA), 2 bytes
* Usage ID for `Uint` (default `0x0001`), 2 bytes
    * Valid Report Sizes for Usage: 8, 16, 32, 64
* Usage ID for `int`(default `0x0002`), 2 bytes
    * Valid Report Sizes for Usage: 8, 16, 32
* Usage ID for `float` (default `0x0003`), 2 bytes
    * Valid Report Sizes for Usage: 32, 64
* Usage ID for bit field (default `0x0004`), 2 bytes
    * Valid Report Sizes for Usage: any
* Usage ID for `utf8` (default `0x0005`), 2 bytes
* Usage ID for Report Data type of `Array` (default `0x0006`), 2 bytes
    * Only valid when applied to (declared before) Collection item with Report type.
* Usage ID for Report Data type of `Object` (default `0x0007`), 2 bytes
    * Only valid when applied to (declared before) Collection item with Report type.

Logical Minimum & Maximum are ignored because they cannot specify
 Uint32 or 64, or Floats. (Logical Min & Max are effectively int32 values.)

A String Index item modifying (declared before) a Collection item of the
 Report type will be used to name the enclosed Report ID. This allows
 using the designated name instead of the Report ID in API calls.

Including String Index items that modify (are declared before) Data Main items
 (Input, Output, or Feature Main items) for all of the Data items in a
 particular report will cause report data to be returned as objects with
 property names given by the indicated string descriptors. If a String Index
 are not present for a given item, it will be given a numerical property
 name. If no String Indices are given, report data will be returned as an
 array. The first Data item in a Report will determine whether all subsequent
 items are named or returned as an array.

Example WebUSB-HID Report Descriptor:
```
Usage Page (WebUSB_HID vendor page, default of 0xFFAA)
Usage ID (0x00)             /* Ignored, but required by HID */
Collection (Application)

    String Index (4)        /* u'timestamp' */
    Usage ID (Array type, default of 0x0006)
    Collection (Report)
        Report ID (1)
        Usage ID (Uint, default of 0x0001)
        Report Size (64)
        Report Count (1)    /* 1x Uint64 */
        Output (Variable | Volatile)
    End Collection

    String Index (5)        /* u'status', sent as a response to 'timestamp' */
                            /* when device is ready, or on hardware error. */
    Usage ID (Object type, default of 0x0007)
    Collection (Report)
        Report ID (1)       /* Same Report ID as 'timestamp', but this is an Input */
        String Index (4)    /* u'timestamp' */
        Usage ID (Uint)
        Report Size (64)
        Report Count (1)
        Input (Variable)    /* 1x Uint64 */
        String Index (6)    /* u'serial_number' */
        Usage ID (Uint)     /* Unfortunately, this needs to be re-declared every time */
        Report Size (32)
        Report Count (1)
        Input (Variable)    /* 1x Uint32 */
        String Index (5)    /* u'status */
        Usage ID (Uint)
        Report Size (8)
        Report Count (4)    /* 4x Uint8 */
        Input (Variable | Buffered Bytes)
        /* Whole input report is Uint64, Uint32, 4x Uint8 */
    End Collection

    String Index (7)        /* u'config' */
    Usage ID (Object type)
    Collection (Report)
        Report ID (2)
        String Index (8)    /* u'timeout' */
        Usage ID (Uint)
        Report Size (64)
        Report Count (1)
        Feature (Variable | Volatile)
        String Index (9)    /* u'threshold' */
        Usage ID (Uint)
        Report Size (16)
        Report Count (1)
        Feature (Variable | Volatile)
        String Index (10)   /* u'item_order' */
        Usage ID (Uint)
        Report Size (8)
        Report Count (10)
        Feature (Variable | Volatile)
    End Collection

    String Index (11)       /* u'event' */
    Usage ID (Object type)
    Collection (Report)
        Report ID (17)
        String Index (4)    /* u'timestamp' */
        Usage ID (Uint)
        Report Size (64)
        Report Count (1)
        Input (Variable)
        String Index (11)   /* u'event' */
        Usage ID (int, default of 0x0002)
        Report Size (8)
        Report Count (1)
        Input (Variable)
    End Collection

    String Index (42)       /* u'raw_values' */
    Usage ID (Array type)   /* Arrays ignore any String Indices on Data items in Array type. */
    Collection (Report)
        Report ID (0x45)
        /* Output report of 1x Uint8 */
        Usage ID (Uint)
        Report Size (8)
        Report Count (1)
        Output (Variable | Volatile)
        /* Input report of 10x Uint16, 10x Uint8 */
        Usage ID (Uint)
        Report Size (16)
        Report Count (10)
        Input (Variable | Buffered Bytes)
        Usage ID (Uint)
        Report Size (8)
        Report Count (10)   /* Technically redundant, but explicit is better than implicit. */
        Input (Variable | Buffered Bytes)
    End Collection
End Collection
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
