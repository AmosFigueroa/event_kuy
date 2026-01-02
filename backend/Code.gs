
/**
 * EventHorizon Backend - Google Apps Script
 * 
 * NOTE: This script works for both Container-bound (inside a Sheet) and Standalone scripts.
 * If standalone, it automatically creates a 'EventHorizon_DB' spreadsheet in your Drive.
 */

var SCRIPT_PROP = PropertiesService.getScriptProperties();

// --- CONFIGURATION ---
// Email Admin Utama - Hanya email ini yang akan masuk sebagai ADMIN
var ADMIN_EMAILS = [
  "bisnisdigitalhmp@gmail.com",
  "eventhmpbisdigupy@gmail.com",
  "mywebnestid@gmail.com"
];

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
    
    // ROBUST POST DATA PARSING
    var postData = {};
    if (method === "POST" && e && e.postData && e.postData.contents) {
       try {
         var rawContent = e.postData.contents;
         if (rawContent && rawContent !== "null" && rawContent !== "") {
            postData = JSON.parse(rawContent);
         }
       } catch (jsonErr) {
         console.error("JSON Parse Error: " + jsonErr);
         postData = {};
       }
    }

    // SAFETY NET: Ensure postData is never null
    if (!postData || typeof postData !== 'object') {
        postData = {};
    }
    
    // --- ROUTING ---
    if (action === "getEvents") {
      data = getEvents();
    } else if (action === "createEvent" && method === "POST") {
      data = createEvent(postData);
    } else if (action === "registerUser" && method === "POST") {
      data = registerEventParticipant(postData); 
    } else if (action === "getRegistrations") {
      data = getRegistrations();
    } else if (action === "updateRegistrationStatus" && method === "POST") {
      data = updateRegistrationStatus(postData);
    } else if (action === "sendCertificate" && method === "POST") {
      data = sendCertificate(postData);
    } 
    // Auth Routes
    else if (action === "signup" && method === "POST") {
      data = signupUser(postData);
    } else if (action === "login" && method === "POST") {
      data = loginUser(postData);
    } 
    // OTP Routes
    else if (action === "requestOtp" && method === "POST") {
      data = requestOtp(postData);
    } else if (action === "loginOtp" && method === "POST") {
      data = loginWithOtp(postData);
    }
    else {
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

// --- AUTH LOGIC (EMAIL & PASSWORD & OTP) ---

function signupUser(data) {
  if (!data) data = {}; // Safety check
  var email = data.email ? data.email.toLowerCase().trim() : "";
  var password = data.password;
  var name = data.name;

  if (!email || !password || !name) throw new Error("Mohon lengkapi semua data (Nama, Email, Password).");

  var sheet = _getSheet("Users");
  var rows = sheet.getDataRange().getValues();
  
  // Check if email exists
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] == email) {
      throw new Error("Email sudah terdaftar. Silakan login.");
    }
  }

  // Hash password (Simple MD5 for GAS)
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, password);
  var txtHash = "";
  for (i = 0; i < rawHash.length; i++) {
    var hashVal = rawHash[i];
    if (hashVal < 0) hashVal += 256;
    if (hashVal.toString(16).length == 1) txtHash += '0';
    txtHash += hashVal.toString(16);
  }

  var id = Utilities.getUuid();
  var timestamp = new Date().toISOString();
  
  // [id, email, password_hash, name, created_at]
  sheet.appendRow([id, email, txtHash, name, timestamp]);
  
  return { created: true, email: email };
}

function loginUser(data) {
  if (!data) data = {}; // Safety check
  var email = data.email ? data.email.toLowerCase().trim() : "";
  var password = data.password;

  if (!email || !password) throw new Error("Email dan Password diperlukan.");

  var sheet = _getSheet("Users");
  var rows = sheet.getDataRange().getValues();
  var foundUser = null;

  // Verify Credentials
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] == email) {
      // Hash input password to compare
      var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, password);
      var txtHash = "";
      for (var j = 0; j < rawHash.length; j++) {
        var hashVal = rawHash[j];
        if (hashVal < 0) hashVal += 256;
        if (hashVal.toString(16).length == 1) txtHash += '0';
        txtHash += hashVal.toString(16);
      }

      if (txtHash === rows[i][2]) {
        foundUser = {
          id: rows[i][0],
          email: rows[i][1],
          name: rows[i][3]
        };
      }
      break;
    }
  }

  if (!foundUser) {
    throw new Error("Email atau password salah.");
  }

  // Check Role
  if (ADMIN_EMAILS.indexOf(foundUser.email) > -1) {
    // IT IS ADMIN -> TRIGGER OTP GENERATION
    var otp = Math.floor(100000 + Math.random() * 900000).toString();
    var expiry = new Date().getTime() + (5 * 60 * 1000); // 5 minutes
    
    var codeSheet = _getSheet("AuthCodes");
    codeSheet.appendRow([email, otp, expiry]);

    try {
      MailApp.sendEmail({
        to: email,
        subject: "Verifikasi Login Admin Event Bisdig",
        body: "Password terverifikasi. Untuk melanjutkan login Admin, gunakan kode OTP ini: " + otp + "\n\nKode berlaku 5 menit."
      });
    } catch (e) {
      throw new Error("Password benar, tapi gagal kirim OTP. Cek kuota email.");
    }

    return { 
      valid: false, 
      requireOtp: true, 
      message: "Verifikasi 2 Langkah: Cek email untuk kode OTP." 
    };
  }

  // IS USER -> LOGIN DIRECTLY
  return { 
    valid: true, 
    role: "USER", 
    email: foundUser.email, 
    name: foundUser.name 
  };
}

// Request OTP manual (optional/backup)
function requestOtp(data) {
  if (!data) data = {}; // Safety check
  var email = data.email ? data.email.toLowerCase().trim() : "";
  if (!email) throw new Error("Email diperlukan.");

  // Generate OTP
  var otp = Math.floor(100000 + Math.random() * 900000).toString();
  var expiry = new Date().getTime() + (5 * 60 * 1000); 
  
  var codeSheet = _getSheet("AuthCodes");
  codeSheet.appendRow([email, otp, expiry]);

  try {
    MailApp.sendEmail({
      to: email,
      subject: "Kode OTP Login",
      body: "Kode OTP Anda: " + otp
    });
  } catch (e) {
    // throw new Error("Gagal kirim email."); // Soft fail if email quota exceeded
  }

  return { sent: true, message: "OTP terkirim." };
}

function loginWithOtp(data) {
  if (!data) data = {}; // Safety check
  var email = data.email ? data.email.toLowerCase().trim() : "";
  var otp = data.otp;
  
  if (!email) throw new Error("Email diperlukan.");
  if (!otp) throw new Error("Kode OTP diperlukan.");

  // 1. Verify OTP
  var codeSheet = _getSheet("AuthCodes");
  var codeRows = codeSheet.getDataRange().getValues();
  var isValid = false;
  var now = new Date().getTime();

  // Iterate backwards to find latest
  for (var i = codeRows.length - 1; i >= 1; i--) {
    if (codeRows[i][0] == email) {
      var storedOtp = codeRows[i][1].toString(); 
      var expiry = Number(codeRows[i][2]);
      
      if (storedOtp === otp.toString()) {
         if (now <= expiry) {
           isValid = true;
           break;
         } else {
           throw new Error("Kode OTP telah kedaluwarsa.");
         }
      }
    }
  }

  if (!isValid) throw new Error("Kode OTP salah atau tidak ditemukan.");

  // 2. Get User Details
  var userSheet = _getSheet("Users");
  var userRows = userSheet.getDataRange().getValues();
  var foundUser = null;
  for (var i = 1; i < userRows.length; i++) {
    if (userRows[i][1] == email) {
      foundUser = {
        id: userRows[i][0],
        email: userRows[i][1],
        name: userRows[i][3]
      };
      break;
    }
  }

  // If verifying via OTP, check if they are actually admin, or just allow login
  var role = "USER";
  if (foundUser && ADMIN_EMAILS.indexOf(foundUser.email) > -1) {
    role = "ADMIN";
  }
  
  // Fallback: If email is in ADMIN_EMAILS, allow login even if not in Users table
  if (!foundUser) {
      if (ADMIN_EMAILS.indexOf(email) > -1) {
          foundUser = { email: email, name: "Admin", role: "ADMIN" };
          role = "ADMIN";
      } else {
          // If OTP valid but user not found and not admin, we could register them or fail.
          // For now, fail to be safe, or allow guest login?
          throw new Error("Akun pengguna tidak ditemukan.");
      }
  }

  return { 
    valid: true, 
    role: role, 
    email: foundUser.email, 
    name: foundUser.name 
  };
}


// --- HELPER FUNCTIONS (DB & FILE SYSTEM) ---

function _getDb() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch(e) {}
  
  var dbId = SCRIPT_PROP.getProperty("DB_ID");
  if (dbId) {
    try { return SpreadsheetApp.openById(dbId); } catch(e) {}
  }
  
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

  if (!ss.getSheetByName("Users")) {
    var sheet = ss.insertSheet("Users");
    sheet.appendRow(["id", "email", "password_hash", "name", "created_at"]);
  }

  if (!ss.getSheetByName("AuthCodes")) {
    var sheet = ss.insertSheet("AuthCodes");
    sheet.appendRow(["email", "otp", "expiry_timestamp"]);
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

function registerEventParticipant(data) {
  if (!data) data = {};
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
  if (!data) data = {};
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
  if (!data) data = {};
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
