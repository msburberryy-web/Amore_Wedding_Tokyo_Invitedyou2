// 1. Open your Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Paste this entire code there
// 4. Click Deploy > New Deployment > Select type: Web App
// 5. Set 'Who has access' to 'Anyone' -> Deploy
// 6. Copy the Web App URL and paste it into your Wedding Website Admin Panel

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Create Headers if they don't exist
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp", 
      "Attendance", 
      "Full Name", 
      "Email", 
      "Phone", 
      "Guests", 
      "Guest Info", 
      "Allergies", 
      "Message"
    ]);
  }

  // Extract data from the request
  var p = e.parameter;
  
  var timestamp = new Date();
  var attendance = p.attendance; // 'attend' or 'decline'
  var name = p.full_name;
  var email = p.email;
  var phone = p.phone;
  var guests = p.guests;
  var guestInfo = p.guest_info;
  var allergies = p.allergies;
  var message = p.message;

  // Append the row
  sheet.appendRow([
    timestamp,
    attendance,
    name,
    email,
    phone,
    guests,
    guestInfo,
    allergies,
    message
  ]);

  // Return success (Website ignores content due to no-cors, but this prevents errors)
  return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}