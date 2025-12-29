/**
 * EventHorizon Backend - Google Apps Script
 * 
 * NOTE: This script works for both Container-bound (inside a Sheet) and Standalone scripts.
 * If standalone, it automatically creates a 'EventHorizon_DB' spreadsheet in your Drive.
 */

var SCRIPT_PROP = PropertiesService.getScriptProperties();

// --- API ENTRY POINTS ---

function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, method) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    // 1. Initialize DB Structure automatically if missing
    _initDbIfNeeded();

    var action = (e.parameter && e.parameter.action) ? e.parameter.action : "";
    var data = null;
    
    var postData = {};
    if (method === "POST" && e.postData && e.postData.contents) {
       try {
         postData = JSON.parse(e.postData.contents);
       } catch (jsonErr) {
         console.error("JSON Parse Error", jsonErr);
       }
    }
    
    if (action === "getEvents") {
      data = getEvents();
    } else if (action === "createEvent" && method === "POST") {
      data = createEvent(postData);
    } else if (action === "registerUser" && method === "POST") {
      data = registerUser(postData);
    } else if (action === "getRegistrations") {
      data = getRegistrations();
    } else if (action === "updateRegistrationStatus" && method === "POST") {
      data = updateRegistrationStatus(postData);
    } else if (action === "sendCertificate" && method === "POST") {
      data = sendCertificate(postData);
    } else {
      if (method === "GET" && !action) {
         data = { message: "EventHorizon Backend is Online." };
      } else {
         throw new Error("Invalid action (" + action + ") or method (" + method + ")");
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- HELPER FUNCTIONS (DB & FILE SYSTEM) ---

/**
 * Gets the Database Spreadsheet. 
 * If script is bound, returns ActiveSpreadsheet.
 * If script is standalone, finds or creates 'EventHorizon_DB'.
 */
function _getDb() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch(e) {
    // Ignore, likely standalone
  }
  
  // Standalone mode: Check for stored ID
  var dbId = SCRIPT_PROP.getProperty("DB_ID");
  if (dbId) {
    try {
      return SpreadsheetApp.openById(dbId);
    } catch(e) {
      // ID invalid or file deleted
    }
  }
  
  // Create new DB
  var ss = SpreadsheetApp.create("EventHorizon_DB");
  SCRIPT_PROP.setProperty("DB_ID", ss.getId());
  return ss;
}

function _initDbIfNeeded() {
  var ss = _getDb();
  
  if (!ss.getSheetByName("Events")) {
    var sheet = ss.insertSheet("Events");
    sheet.appendRow(["id", "title", "description", "date", "time", "location", "price", "category", "bannerUrl", "maxParticipants", "currentParticipants", "isOpen"]);
  }
  
  if (!ss.getSheetByName("Registrations")) {
    var sheet = ss.insertSheet("Registrations");
    sheet.appendRow(["id", "eventId", "eventTitle", "userName", "userEmail", "proofUrl", "status", "registrationDate"]);
  }
}

function _getSheet(name) {
  var ss = _getDb();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    _initDbIfNeeded();
    sheet = ss.getSheetByName(name);
  }
  return sheet;
}

function _getUploadFolder() {
  var folderId = SCRIPT_PROP.getProperty("UPLOAD_FOLDER_ID");
  var folder;
  
  if (folderId) {
    try {
      folder = DriveApp.getFolderById(folderId);
      return folder;
    } catch (e) { }
  }
  
  var folders = DriveApp.getFoldersByName("EventHorizon_Uploads");
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder("EventHorizon_Uploads");
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  
  SCRIPT_PROP.setProperty("UPLOAD_FOLDER_ID", folder.getId());
  return folder;
}


// --- BUSINESS LOGIC ---

function getEvents() {
  var sheet = _getSheet("Events");
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows.shift();
  return rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) { obj[header] = row[i]; });
    return obj;
  });
}

function createEvent(data) {
  if (!data || !data.title) throw new Error("Missing event data");
  var sheet = _getSheet("Events");
  var id = Utilities.getUuid();
  var bannerUrl = "";
  if (data.bannerBase64) {
    try {
      var folder = _getUploadFolder();
      var blob = Utilities.newBlob(Utilities.base64Decode(data.bannerBase64), "image/jpeg", "banner_" + id);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      bannerUrl = "https://lh3.googleusercontent.com/d/" + file.getId(); 
    } catch (e) { bannerUrl = "https://via.placeholder.com/800x400?text=Error"; }
  }
  var row = [id, data.title, data.description || "", data.date, data.time, data.location, data.price || 0, data.category || "General", bannerUrl, data.maxParticipants || 100, 0, true];
  sheet.appendRow(row);
  return { id: id, title: data.title };
}

function registerUser(data) {
  var rSheet = _getSheet("Registrations");
  var eSheet = _getSheet("Events");
  var events = getEvents(); 
  var event = events.find(function(e) { return e.id === data.eventId });
  if (!event) throw new Error("Event not found");
  
  var proofUrl = "";
  if (data.proofBase64) {
    try {
      var folder = _getUploadFolder();
      var cleanBase64 = data.proofBase64.replace(/^data:image\/\w+;base64,/, "");
      var blob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), "image/jpeg", "proof_" + data.eventId + "_" + data.email);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      proofUrl = file.getUrl();
    } catch (e) { }
  }
  
  var id = Utilities.getUuid();
  rSheet.appendRow([id, data.eventId, event.title, data.name, data.email, proofUrl, "PENDING", new Date().toISOString()]);
  
  var eData = eSheet.getDataRange().getValues();
  for (var i = 1; i < eData.length; i++) {
    if (eData[i][0] == data.eventId) {
      var current = Number(eData[i][10]) || 0;
      eSheet.getRange(i + 1, 11).setValue(current + 1);
      break;
    }
  }
  return { id: id, status: "PENDING" };
}

function getRegistrations() {
  var sheet = _getSheet("Registrations");
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows.shift();
  return rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) { obj[header] = row[i]; });
    return obj;
  });
}

function updateRegistrationStatus(data) {
  var sheet = _getSheet("Registrations");
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.getRange(i + 1, 7).setValue(data.status);
      try {
        var email = rows[i][4];
        var subject = data.status === 'APPROVED' ? "Tiket Dikonfirmasi" : "Pembaruan Status Pendaftaran";
        var body = "Status pendaftaran Anda untuk " + rows[i][2] + " sekarang: " + (data.status === 'APPROVED' ? 'DISETUJUI' : (data.status === 'REJECTED' ? 'DITOLAK' : data.status));
        MailApp.sendEmail({ to: email, subject: subject, body: body });
      } catch (e) {}
      return { id: data.id, status: data.status };
    }
  }
  throw new Error("ID not found");
}

function sendCertificate(data) {
  var sheet = _getSheet("Registrations");
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      if (rows[i][6] !== 'APPROVED') throw new Error("Belum Disetujui");
      var html = "<h1>Sertifikat Partisipasi</h1><p>Diberikan kepada " + rows[i][3] + " atas partisipasinya dalam " + rows[i][2] + "</p>";
      var blob = Utilities.newBlob(html, "text/html", "certificate.html");
      MailApp.sendEmail({
        to: rows[i][4],
        subject: "Sertifikat: " + rows[i][2],
        body: "Terlampir sertifikat Anda.",
        attachments: [blob.getAs("application/pdf")]
      });
      return { sent: true };
    }
  }
  throw new Error("Registration not found");
}