function doGet(e) {

  // ─── TIME GUARD ───────────────────────────────────────────────
  // Edit EVENT_START and EVENT_END to match your event day.
  // Check-in is only accepted within this window.
  const EVENT_START = new Date("2026-6-17T18:00:00+08:00"); // 6:00 PM SGT/HKT
  const EVENT_END   = new Date("2026-6-17T23:59:00+08:00"); // midnight
  const now         = new Date();

  if (now < EVENT_START || now > EVENT_END) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status:  "closed",
        message: "Check-in is not open. Please contact the organiser."
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  // ──────────────────────────────────────────────────────────────

  const id = e.parameter.id;

  // Safety check — reject empty or missing id
  if (!id || id.trim() === "") {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "invalid", message: "No guest ID provided." })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet()
                  .getSheetByName("Guest List");

  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: "Sheet not found." })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();

  // Count existing check-ins to assign the next order number
  let checkinCount = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === "Checked in") checkinCount++;
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {

      // Already checked in — return duplicate warning
      if (data[i][5] === "Checked in") {
        return ContentService.createTextOutput(
          JSON.stringify({
            status: "duplicate",
            name:   data[i][1],
            order:  data[i][6],
            message: "This guest has already checked in."
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      // First-time check-in — write to sheet
      const timestamp = new Date().toLocaleString("en-US");
      const order     = checkinCount + 1;

      sheet.getRange(i + 1, 5).setValue(timestamp);   // E: time
      sheet.getRange(i + 1, 6).setValue("Checked in"); // F: status
      sheet.getRange(i + 1, 7).setValue(order);        // G: Check-in Order
      sheet.getRange(i + 1, 10).setValue("QR");        // J: check_in_method
      return ContentService.createTextOutput(
        JSON.stringify({
          status: "ok",
          name:   data[i][1],
          table:  data[i][3],
          order:  order
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // No matching guest ID found
  return ContentService.createTextOutput(
    JSON.stringify({ status: "not_found", message: "Guest ID not found." })
  ).setMimeType(ContentService.MimeType.JSON);
}
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const row = e.range.getRow();
  const col = e.range.getColumn();

  const timeCol = 5;            // E: time
  const statusCol = 6;          // F: status
  const manualCheckInCol = 9;   // I: manual_check_in
  const methodCol = 10;         // J: check_in_method

  if (row <= 2) return;

  if (col === manualCheckInCol && e.value === "TRUE") {
    sheet.getRange(row, timeCol).setValue(new Date());
    sheet.getRange(row, statusCol).setValue("Checked in");
    sheet.getRange(row, methodCol).setValue("Manual");
  }

  if (col === manualCheckInCol && e.value === "FALSE") {
    sheet.getRange(row, timeCol).clearContent();
    sheet.getRange(row, statusCol).clearContent();
    sheet.getRange(row, methodCol).clearContent();
  }
}
