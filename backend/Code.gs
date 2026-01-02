
/**
 * EventHorizon Backend - Google Apps Script
 */

var SCRIPT_PROP = PropertiesService.getScriptProperties();
var ADMIN_EMAILS = [
  "bisnisdigitalhmp@gmail.com",
  "eventhmpbisdigupy@gmail.com",
  "mywebnestid@gmail.com"
];

function doGet(e) { return handleRequest(e, "GET"); }
function doPost(e) { return handleRequest(e, "POST"); }

function handleRequest(e, method) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    _initDbIfNeeded();
    var action = (e.parameter && e.parameter.action) ? e.parameter.action : "";
    var data = null;
    var postData = {};
    
    if (method === "POST" && e && e.postData && e.postData.contents) {
       try {
         var rawContent = e.postData.contents;
         if (rawContent && rawContent !== "null" && rawContent !== "") {
            postData = JSON.parse(rawContent);
         }
       } catch (jsonErr) { postData = {}; }
    }
    if (!postData || typeof postData !== 'object') postData = {};
    
    // --- ROUTING ---
    if (action === "getEvents") data = getEvents();
    else if (action === "createEvent" && method === "POST") data = createEvent(postData);
    else if (action === "deleteEvent" && method === "POST") data = deleteEvent(postData);
    else if (action === "toggleEventStatus" && method === "POST") data = toggleEventStatus(postData);
    
    else if (action === "registerUser" && method === "POST") data = registerEventParticipant(postData); 
    else if (action === "getRegistrations") data = getRegistrations();
    else if (action === "updateRegistrationStatus" && method === "POST") data = updateRegistrationStatus(postData);
    else if (action === "sendCertificate" && method === "POST") data = sendCertificate(postData);
    
    // Payment Settings
    else if (action === "savePaymentSettings" && method === "POST") data = savePaymentSettings(postData);
    else if (action === "getPaymentSettings") data = getPaymentSettings();

    // Auth
    else if (action === "signup" && method === "POST") data = signupUser(postData);
    else if (action === "login" && method === "POST") data = loginUser(postData);
    else if (action === "requestOtp" && method === "POST") data = requestOtp(postData);
    else if (action === "loginOtp" && method === "POST") data = loginWithOtp(postData);
    
    else {
      if (method === "GET" && !action) data = { message: "Backend Online." };
      else throw new Error("Invalid action/method");
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- AUTH FUNCTIONS (UNCHANGED logic, condensed for brevity) ---
function signupUser(data) {
  var sheet = _getSheet("Users");
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (rows[i][1] == data.email) throw new Error("Email terdaftar.");
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, data.password);
  var txtHash = rawHash.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2,'0'); }).join("");
  sheet.appendRow([Utilities.getUuid(), data.email, txtHash, data.name, new Date().toISOString()]);
  return { created: true };
}

function loginUser(data) {
  var sheet = _getSheet("Users");
  var rows = sheet.getDataRange().getValues();
  var found = null;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][1] == data.email) {
      var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, data.password);
      var txtHash = rawHash.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2,'0'); }).join("");
      if (txtHash === rows[i][2]) found = { email: rows[i][1], name: rows[i][3] };
      break;
    }
  }
  if (!found) throw new Error("Kredensial salah.");
  if (ADMIN_EMAILS.indexOf(found.email) > -1) {
    var otp = Math.floor(100000 + Math.random() * 900000).toString();
    CacheService.getScriptCache().put("OTP_" + found.email, otp, 300);
    MailApp.sendEmail(found.email, "Admin OTP", "OTP: " + otp);
    return { valid: false, requireOtp: true };
  }
  return { valid: true, role: "USER", email: found.email, name: found.name };
}

function requestOtp(data) {
  var otp = Math.floor(100000 + Math.random() * 900000).toString();
  CacheService.getScriptCache().put("OTP_" + data.email, otp, 300);
  MailApp.sendEmail(data.email, "Login OTP", "OTP: " + otp);
  return { sent: true };
}

function loginWithOtp(data) {
  var cached = CacheService.getScriptCache().get("OTP_" + data.email);
  if (!cached || cached !== data.otp) throw new Error("OTP salah/expired.");
  CacheService.getScriptCache().remove("OTP_" + data.email);
  var role = ADMIN_EMAILS.indexOf(data.email) > -1 ? "ADMIN" : "USER";
  return { valid: true, role: role, email: data.email, name: "User" };
}

// --- EVENT FUNCTIONS ---

function getEvents() {
  var sheet = _getSheet("Events");
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows.shift(); // Remove header
  return rows.map(function(row) {
    var obj = {};
    // Basic mapping
    obj.id = row[0]; obj.title = row[1]; obj.description = row[2];
    obj.date = row[3]; obj.time = row[4]; obj.location = row[5];
    obj.price = row[6]; obj.category = row[7]; obj.bannerUrl = row[8];
    obj.maxParticipants = row[9]; obj.currentParticipants = row[10];
    obj.isOpen = row[11]; 
    // New: Form Fields
    try { obj.formFields = row[12] ? JSON.parse(row[12]) : []; } catch(e) { obj.formFields = []; }
    return obj;
  });
}

function createEvent(data) {
  var sheet = _getSheet("Events");
  var id = Utilities.getUuid();
  var bannerUrl = "";
  if (data.bannerBase64) {
    try {
      var folder = _getUploadFolder();
      var blob = Utilities.newBlob(Utilities.base64Decode(data.bannerBase64), "image/jpeg", "banner_" + id);
      bannerUrl = "https://lh3.googleusercontent.com/d/" + folder.createFile(blob).getId();
    } catch (e) { }
  }
  
  // Column 13 (Index 12) is formFields JSON
  var formFieldsJson = data.formFields ? JSON.stringify(data.formFields) : "[]";
  
  sheet.appendRow([
    id, data.title, data.description, data.date, data.time, data.location, 
    data.price, data.category, bannerUrl, data.maxParticipants, 0, true,
    formFieldsJson
  ]);
  return { id: id };
}

function deleteEvent(data) {
  var sheet = _getSheet("Events");
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.deleteRow(i + 1);
      return { deleted: true };
    }
  }
  throw new Error("Event not found");
}

function toggleEventStatus(data) {
  var sheet = _getSheet("Events");
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      var current = rows[i][11]; // Index 11 is isOpen
      var newVal = !current;
      sheet.getRange(i + 1, 12).setValue(newVal);
      return { id: data.id, isOpen: newVal };
    }
  }
  throw new Error("Event not found");
}

// --- REGISTRATION FUNCTIONS ---

function registerEventParticipant(data) {
  var eSheet = _getSheet("Events");
  var events = eSheet.getDataRange().getValues();
  var eventRowIndex = -1;
  var eventTitle = "";
  
  for(var i=1; i<events.length; i++) {
    if(events[i][0] == data.eventId) {
      eventRowIndex = i;
      eventTitle = events[i][1];
      break;
    }
  }
  if (eventRowIndex == -1) throw new Error("Event not found");
  
  var proofUrl = "";
  if (data.proofBase64) {
    try {
      var folder = _getUploadFolder();
      var blob = Utilities.newBlob(Utilities.base64Decode(data.proofBase64.split(',')[1] || data.proofBase64), "image/jpeg", "proof_" + data.email);
      proofUrl = folder.createFile(blob).getUrl();
    } catch(e) {}
  }
  
  var rSheet = _getSheet("Registrations");
  var customDataJson = data.customData ? JSON.stringify(data.customData) : "{}";
  
  rSheet.appendRow([
    Utilities.getUuid(), data.eventId, eventTitle, data.name, data.email, 
    proofUrl, "PENDING", new Date().toISOString(), customDataJson
  ]);
  
  // Increment Count
  var current = Number(events[eventRowIndex][10]) || 0;
  eSheet.getRange(eventRowIndex + 1, 11).setValue(current + 1);
  
  return { status: "PENDING" };
}

function getRegistrations() {
  var sheet = _getSheet("Registrations");
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  // Hardcoded mapping for reliability
  // ID, EventID, Title, Name, Email, Proof, Status, Date, CustomData
  return rows.slice(1).map(function(row) {
    return {
      id: row[0], eventId: row[1], eventTitle: row[2], userName: row[3],
      userEmail: row[4], proofUrl: row[5], status: row[6], registrationDate: row[7],
      customData: row[8]
    };
  });
}

function updateRegistrationStatus(data) {
  var sheet = _getSheet("Registrations");
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.getRange(i + 1, 7).setValue(data.status);
      try { MailApp.sendEmail(rows[i][4], "Update Status: " + rows[i][2], "Status: " + data.status); } catch(e){}
      return { status: data.status };
    }
  }
  throw new Error("Registration not found");
}

function sendCertificate(data) {
  var sheet = _getSheet("Registrations");
  var rows = sheet.getDataRange().getValues();
  for(var i=1; i<rows.length; i++) {
    if(rows[i][0] == data.id) {
       var blob = Utilities.newBlob("<h1>Certificate for " + rows[i][3] + "</h1>", "text/html", "cert.html").getAs("application/pdf");
       MailApp.sendEmail({to: rows[i][4], subject: "Certificate", body: "Attached.", attachments: [blob]});
       return { sent: true };
    }
  }
  throw new Error("Not found");
}

// --- PAYMENT SETTINGS ---

function savePaymentSettings(data) {
  var ss = _getDb();
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) { sheet = ss.insertSheet("Settings"); sheet.appendRow(["Key", "Value"]); }
  
  // Store Bank details in Properties or separate rows. Using rows for file URL capability easier.
  // Structure in Settings Sheet:
  // Row 1: BANK_NAME, Value
  // Row 2: ACCOUNT_NUM, Value
  // Row 3: ACCOUNT_HOLDER, Value
  // Row 4: QRIS_URL, Value
  
  var qrisUrl = data.currentQrisUrl || "";
  if (data.qrisBase64) {
    try {
      var folder = _getUploadFolder();
      var blob = Utilities.newBlob(Utilities.base64Decode(data.qrisBase64), "image/jpeg", "qris_master");
      // Delete old file if possible, or just overwrite reference
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      qrisUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
    } catch(e) {}
  }
  
  // Helper to set/update row
  var setSetting = function(key, val) {
    var data = sheet.getDataRange().getValues();
    for(var i=0; i<data.length; i++) {
      if(data[i][0] == key) { sheet.getRange(i+1, 2).setValue(val); return; }
    }
    sheet.appendRow([key, val]);
  };
  
  setSetting("BANK_NAME", data.bankName);
  setSetting("ACCOUNT_NUM", data.accountNumber);
  setSetting("ACCOUNT_HOLDER", data.accountHolder);
  setSetting("QRIS_URL", qrisUrl);
  
  return { success: true, qrisUrl: qrisUrl };
}

function getPaymentSettings() {
  var sheet = _getSheet("Settings");
  if (!sheet) return { bankName: "", accountNumber: "", accountHolder: "", qrisUrl: "" };
  var data = sheet.getDataRange().getValues();
  var settings = {};
  data.forEach(function(r) { settings[r[0]] = r[1]; });
  
  return {
    bankName: settings["BANK_NAME"] || "",
    accountNumber: settings["ACCOUNT_NUM"] || "",
    accountHolder: settings["ACCOUNT_HOLDER"] || "",
    qrisUrl: settings["QRIS_URL"] || ""
  };
}

// --- DB HELPERS ---
function _getDb() {
  var dbId = SCRIPT_PROP.getProperty("DB_ID");
  if (dbId) try { return SpreadsheetApp.openById(dbId); } catch(e){}
  var ss = SpreadsheetApp.create("EventHorizon_DB");
  SCRIPT_PROP.setProperty("DB_ID", ss.getId());
  return ss;
}

function _getSheet(name) {
  var ss = _getDb();
  var s = ss.getSheetByName(name);
  if(!s) {
    _initDbIfNeeded();
    s = ss.getSheetByName(name);
  }
  return s;
}

function _initDbIfNeeded() {
  var ss = _getDb();
  if(!ss.getSheetByName("Events")) {
     ss.insertSheet("Events").appendRow(["id","title","desc","date","time","loc","price","cat","banner","max","cur","isOpen","formFields"]);
  }
  if(!ss.getSheetByName("Registrations")) ss.insertSheet("Registrations").appendRow(["id","eventId","evtTitle","name","email","proof","status","date","customData"]);
  if(!ss.getSheetByName("Users")) ss.insertSheet("Users").appendRow(["id","email","pass","name","date"]);
  if(!ss.getSheetByName("Settings")) ss.insertSheet("Settings").appendRow(["Key", "Value"]);
}

function _getUploadFolder() {
  var id = SCRIPT_PROP.getProperty("UPLOAD_ID");
  if(id) try { return DriveApp.getFolderById(id); } catch(e){}
  var f = DriveApp.createFolder("EventHorizon_Uploads");
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  SCRIPT_PROP.setProperty("UPLOAD_ID", f.getId());
  return f;
}
