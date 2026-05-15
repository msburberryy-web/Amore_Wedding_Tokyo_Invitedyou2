// RSVP Script — sheet: https://docs.google.com/spreadsheets/d/12cbTmX6FZQPEM4kW3jSCowcGB94TXwUR_Ua332cwgl4
// 1. Go to https://script.google.com → New project
// 2. Replace all code with this file
// 3. Deploy → New Deployment → Web App → Execute as: Me → Who has access: Anyone → Deploy
// 4. Copy the Web App URL → paste it as googleScriptUrl in the wedding data JSON

function doPost(e) {
  var sheet = SpreadsheetApp.openById("12cbTmX6FZQPEM4kW3jSCowcGB94TXwUR_Ua332cwgl4").getActiveSheet();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp","Attendance","Full Name","Email","Phone","Guests","Guest Info","Allergies","Message"]);
  }

  var p = e.parameter;
  sheet.appendRow([
    new Date(),
    p.attendance,
    p.full_name,
    p.email,
    p.phone,
    p.guests,
    p.guest_info,
    p.allergies,
    p.message
  ]);

  return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}
