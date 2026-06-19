const SHEET_NAME = "Guest List";
const DATA_START_ROW = 3; // 如果你的第1列是標題，用2；如果第2列才是標題，用3

function doGet(e) {
  const EVENT_START = new Date("2026-06-16T18:00:00+08:00");
  const EVENT_END   = new Date("2026-06-30T23:59:00+08:00");
  const now = new Date();

  if (now < EVENT_START || now > EVENT_END) {
    return jsonOutput({ status: "closed", message: "Check-in is not open." });
  }

  const id = e.parameter.id;
  if (!id || id.trim() === "") {
    return jsonOutput({ status: "invalid" });
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  let checkinCount = 0;
  for (let i = DATA_START_ROW - 1; i < data.length; i++) {
    if (data[i][6] === "Checked in") checkinCount++; // G
  }

  for (let i = DATA_START_ROW - 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {

      if (data[i][6] === "Checked in") {
        return jsonOutput({
          status: "duplicate",
          name: data[i][1],
          table: data[i][3],   // D table
          order: data[i][7]
        });
      }

      const timestamp = new Date();
      const order = checkinCount + 1;

      sheet.getRange(i + 1, 6).setValue(timestamp);      // F time
      sheet.getRange(i + 1, 7).setValue("Checked in");   // G status
      sheet.getRange(i + 1, 8).setValue(order);          // H Check-in Order
      sheet.getRange(i + 1, 11).setValue("QR");          // K check_in_method

      return jsonOutput({
        status: "ok",
        name: data[i][1],
        table: data[i][3],   // D table
        order: order
      });
    }
  }

  return jsonOutput({ status: "not_found" });
}

function onEdit(e) {
  const sheet = e.range.getSheet();

  if (sheet.getName() !== SHEET_NAME) return;

  const row = e.range.getRow();
  const col = e.range.getColumn();

  if (row < DATA_START_ROW) return;

  const MANUAL_COL = 10; // J manual_check_in
  if (col !== MANUAL_COL) return;

  const isChecked = e.range.getValue();

  if (isChecked === true) {
    const order = getNextCheckinOrder(sheet);

    sheet.getRange(row, 6).setValue(new Date());        // F time
    sheet.getRange(row, 7).setValue("Checked in");      // G status
    sheet.getRange(row, 8).setValue(order);             // H Check-in Order
    sheet.getRange(row, 11).setValue("Manual");         // K check_in_method
  } else {
    sheet.getRange(row, 6).clearContent();              // F time
    sheet.getRange(row, 7).clearContent();              // G status
    sheet.getRange(row, 8).clearContent();              // H Check-in Order
    sheet.getRange(row, 11).clearContent();             // K check_in_method
  }
}

function getNextCheckinOrder(sheet) {
  const lastRow = sheet.getLastRow();
  const orders = sheet.getRange(DATA_START_ROW, 8, lastRow - DATA_START_ROW + 1, 1).getValues();

  let maxOrder = 0;

  orders.forEach(row => {
    const value = Number(row[0]);
    if (!isNaN(value) && value > maxOrder) {
      maxOrder = value;
    }
  });

  return maxOrder + 1;
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
