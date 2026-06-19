function doGet(e) {
  const EVENT_START = new Date("2025-12-20T18:00:00+08:00");
  const EVENT_END   = new Date("2025-12-20T23:59:00+08:00");
  const now         = new Date();

  if (now < EVENT_START || now > EVENT_END) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "closed", message: "Check-in is not open." })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const id = e.parameter.id;
  if (!id || id.trim() === "") {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "invalid" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet()
                  .getSheetByName("Guest List");
  const data  = sheet.getDataRange().getValues();

  let checkinCount = 0;
  for (let i = 2; i < data.length; i++) {   // ← 從第3列開始（row 1 是網址，row 2 是標題）
    if (data[i][6] === "Checked in") checkinCount++;
  }

  for (let i = 2; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      if (data[i][6] === "Checked in") {
        return ContentService.createTextOutput(
          JSON.stringify({ status: "duplicate", name: data[i][1], order: data[i][7] })
        ).setMimeType(ContentService.MimeType.JSON);
      }
      const timestamp = new Date().toLocaleString("en-US");
      const order     = checkinCount + 1;
      sheet.getRange(i + 1, 6).setValue(timestamp);    // F: time
      sheet.getRange(i + 1, 7).setValue("Checked in"); // G: status
      sheet.getRange(i + 1, 8).setValue(order);        // H: Check-in Order
      return ContentService.createTextOutput(
        JSON.stringify({ status: "ok", name: data[i][1], table: data[i][4], order: order })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(
    JSON.stringify({ status: "not_found" })
  ).setMimeType(ContentService.MimeType.JSON);
}
