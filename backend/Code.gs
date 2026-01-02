
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
    else if (action === "updateEvent" && method === "POST") data = updateEvent(postData);
    else if (action === "deleteEvent" && method === "POST") data = deleteEvent(postData);
    else if (action === "toggleEventStatus" && method === "POST") data = toggleEventStatus(postData);
    
    else if (action === "registerUser" && method === "POST") data = registerEventParticipant(postData); 
    else if (action === "getRegistrations") data = getRegistrations();
    else if (action === "getRegistration" && method === "POST") data = getRegistration(postData); 
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

// --- HELPER: HTML EMAIL TEMPLATE ---
function _sendBrandedEmail(to, subject, title, bodyContent, attachmentBlob) {
  var htmlBody = 
    '<div style="background-color: #F8FAFC; padding: 40px 0; font-family: \'Helvetica\', sans-serif;">' +
      '<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 3px solid #2B427A; border-radius: 16px; overflow: hidden; box-shadow: 8px 8px 0px 0px #DFFF00;">' +
        '<div style="background-color: #2B427A; padding: 30px; text-align: center;">' +
           '<h1 style="color: #DFFF00; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">EVENT BISDIG</h1>' +
           '<p style="color: #ffffff; margin: 5px 0 0 0; font-size: 12px; font-weight: bold; letter-spacing: 2px;">HIMPUNAN MAHASISWA</p>' +
        '</div>' +
        '<div style="padding: 40px 30px;">' +
           '<h2 style="color: #2B427A; font-weight: 900; margin-top: 0; text-transform: uppercase;">' + title + '</h2>' +
           '<div style="color: #4a5568; font-size: 16px; line-height: 1.6;">' +
              bodyContent +
           '</div>' +
           '<div style="margin-top: 30px; padding-top: 20px; border-top: 2px dashed #e2e8f0; text-align: center;">' +
              '<a href="https://bisdig.upy.ac.id/hmp/" style="display: inline-block; background-color: #2B427A; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">KUNJUNGI WEBSITE</a>' +
           '</div>' +
        '</div>' +
        '<div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; font-weight: bold;">' +
           '&copy; ' + new Date().getFullYear() + ' HMP Bisnis Digital UPY. All rights reserved.' +
        '</div>' +
      '</div>' +
    '</div>';

  var options = {
    htmlBody: htmlBody
  };
  
  if (attachmentBlob) {
    options.attachments = [attachmentBlob];
  }

  MailApp.sendEmail(to, subject, bodyContent.replace(/<[^>]*>/g, ""), options);
}

// --- AUTH FUNCTIONS ---
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
    var body = "<p>Halo Admin,</p><p>OTP:</p><h1>" + otp + "</h1>";
    _sendBrandedEmail(found.email, "🔒 Login OTP", "KODE AKSES", body);
    return { valid: false, requireOtp: true };
  }
  return { valid: true, role: "USER", email: found.email, name: found.name };
}

function requestOtp(data) {
  var otp = Math.floor(100000 + Math.random() * 900000).toString();
  CacheService.getScriptCache().put("OTP_" + data.email, otp, 300);
  var body = "<p>Halo,</p><p>OTP:</p><h1>" + otp + "</h1>";
  _sendBrandedEmail(data.email, "🔑 Kode Login", "VERIFIKASI", body);
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
  var dataRows = rows.slice(1);
  return dataRows.map(function(row) {
    var obj = {};
    obj.id = row[0]; obj.title = row[1]; obj.description = row[2];
    obj.date = row[3]; obj.time = row[4]; obj.location = row[5];
    obj.price = row[6]; obj.category = row[7]; obj.bannerUrl = row[8];
    obj.maxParticipants = row[9]; obj.currentParticipants = row[10];
    obj.isOpen = row[11]; 
    try { obj.formFields = row[12] ? JSON.parse(row[12]) : []; } catch(e) { obj.formFields = []; }
    try { obj.certificateConfig = row[13] ? JSON.parse(row[13]) : null; } catch(e) { obj.certificateConfig = null; }
    return obj;
  });
}

function createEvent(data) {
  var sheet = _getSheet("Events");
  var id = Utilities.getUuid();
  var bannerUrl = "";
  
  // Save Banner to Admin Folder
  if (data.bannerBase64) {
    try {
      var folder = _getAdminFolder();
      var blob = Utilities.newBlob(Utilities.base64Decode(data.bannerBase64), "image/jpeg", "banner_" + id);
      bannerUrl = "https://lh3.googleusercontent.com/d/" + folder.createFile(blob).getId();
    } catch (e) { }
  }
  
  // Save Certificate Background to Admin Folder
  var certConfig = data.certificateConfig || null;
  if (certConfig && data.certBackgroundBase64) {
     try {
        var folder = _getAdminFolder();
        var blob = Utilities.newBlob(Utilities.base64Decode(data.certBackgroundBase64), "image/png", "cert_bg_" + id);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        certConfig.backgroundUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
     } catch(e) {}
  }

  var formFieldsJson = data.formFields ? JSON.stringify(data.formFields) : "[]";
  var certConfigJson = certConfig ? JSON.stringify(certConfig) : "";
  
  sheet.appendRow([
    id, data.title, data.description, data.date, data.time, data.location, 
    data.price, data.category, bannerUrl, data.maxParticipants, 0, true,
    formFieldsJson, certConfigJson
  ]);
  return { id: id };
}

function updateEvent(data) {
  var sheet = _getSheet("Events");
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      var bannerUrl = rows[i][8];
      
      // Update Banner (Admin Folder)
      if (data.bannerBase64) {
        try {
          var folder = _getAdminFolder();
          var blob = Utilities.newBlob(Utilities.base64Decode(data.bannerBase64), "image/jpeg", "banner_" + data.id + "_" + new Date().getTime());
          bannerUrl = "https://lh3.googleusercontent.com/d/" + folder.createFile(blob).getId();
        } catch(e) {}
      }
      
      var formFieldsJson = data.formFields ? JSON.stringify(data.formFields) : "[]";
      var certConfigJson = rows[i][13]; 
      var certConfig = data.certificateConfig;
      
      if (certConfig) {
          // Update Cert Background (Admin Folder)
          if (data.certBackgroundBase64) {
             try {
                var folder = _getAdminFolder();
                var blob = Utilities.newBlob(Utilities.base64Decode(data.certBackgroundBase64), "image/png", "cert_bg_" + data.id + "_" + new Date().getTime());
                var file = folder.createFile(blob);
                file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                certConfig.backgroundUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
             } catch(e) {}
          } else if (!certConfig.backgroundUrl && rows[i][13]) {
             try {
                var oldConf = JSON.parse(rows[i][13]);
                certConfig.backgroundUrl = oldConf.backgroundUrl;
             } catch(e){}
          }
          certConfigJson = JSON.stringify(certConfig);
      }
      
      sheet.getRange(i+1, 2).setValue(data.title);
      sheet.getRange(i+1, 3).setValue(data.description);
      sheet.getRange(i+1, 4).setValue(data.date);
      sheet.getRange(i+1, 5).setValue(data.time);
      sheet.getRange(i+1, 6).setValue(data.location);
      sheet.getRange(i+1, 7).setValue(data.price);
      sheet.getRange(i+1, 8).setValue(data.category);
      sheet.getRange(i+1, 9).setValue(bannerUrl);
      sheet.getRange(i+1, 10).setValue(data.maxParticipants);
      sheet.getRange(i+1, 13).setValue(formFieldsJson);
      
      if (sheet.getLastColumn() < 14) {
         sheet.getRange(i+1, 14).setValue(certConfigJson);
      } else {
         sheet.getRange(i+1, 14).setValue(certConfigJson);
      }
      
      return { id: data.id, updated: true };
    }
  }
  throw new Error("Event not found for update");
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
      var current = rows[i][11];
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
  
  var rSheet = _getSheet("Registrations");
  var rRows = rSheet.getDataRange().getValues();
  for(var i=1; i<rRows.length; i++) {
      if(rRows[i][1] == data.eventId && rRows[i][4].toString().toLowerCase() == data.email.toString().toLowerCase()) {
          throw new Error("Email ini sudah terdaftar untuk acara tersebut.");
      }
  }

  var proofUrl = "";
  
  // Save Proof to User Folder
  if (data.proofBase64) {
    try {
      var folder = _getUserFolder();
      var blob = Utilities.newBlob(Utilities.base64Decode(data.proofBase64.split(',')[1] || data.proofBase64), "image/jpeg", "proof_" + data.email);
      proofUrl = folder.createFile(blob).getUrl();
    } catch(e) {}
  }
  
  var customDataJson = data.customData ? JSON.stringify(data.customData) : "{}";
  
  rSheet.appendRow([
    Utilities.getUuid(), data.eventId, eventTitle, data.name, data.email, 
    proofUrl, "PENDING", new Date().toISOString(), customDataJson
  ]);
  
  var current = Number(events[eventRowIndex][10]) || 0;
  eSheet.getRange(eventRowIndex + 1, 11).setValue(current + 1);
  
  var body = "<p>Halo " + data.name + ",</p><p>Terima kasih telah mendaftar: <strong>" + eventTitle + "</strong>.</p>";
  _sendBrandedEmail(data.email, "✅ Pendaftaran Diterima", "MENUNGGU VERIFIKASI", body);

  return { status: "PENDING" };
}

function getRegistrations() {
  var sheet = _getSheet("Registrations");
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  return rows.slice(1).map(function(row) {
    return {
      id: row[0], eventId: row[1], eventTitle: row[2], userName: row[3],
      userEmail: row[4], proofUrl: row[5], status: row[6], registrationDate: row[7],
      customData: row[8]
    };
  });
}

function getRegistration(data) {
  var rSheet = _getSheet("Registrations");
  var rRows = rSheet.getDataRange().getValues();
  var reg = null;
  
  for(var i=1; i<rRows.length; i++) {
    if(rRows[i][0] == data.id) {
       reg = {
          id: rRows[i][0], eventId: rRows[i][1], eventTitle: rRows[i][2],
          userName: rRows[i][3], userEmail: rRows[i][4], status: rRows[i][6],
          registrationDate: rRows[i][7], customData: rRows[i][8]
       };
       break;
    }
  }
  
  if (!reg) throw new Error("Pendaftaran tidak ditemukan.");
  
  var eSheet = _getSheet("Events");
  var eRows = eSheet.getDataRange().getValues();
  var certConfig = null;
  
  for(var j=1; j<eRows.length; j++) {
      if(eRows[j][0] == reg.eventId) {
          try {
             certConfig = eRows[j][13] ? JSON.parse(eRows[j][13]) : null;
          } catch(e) {}
          break;
      }
  }
  
  return { registration: reg, certificateConfig: certConfig };
}

function updateRegistrationStatus(data) {
  var sheet = _getSheet("Registrations");
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.getRange(i + 1, 7).setValue(data.status);
      var email = rows[i][4];
      var name = rows[i][3];
      var evtTitle = rows[i][2];
      
      var statusTitle = data.status === 'APPROVED' ? 'PENDAFTARAN DISETUJUI' : 'PENDAFTARAN DITOLAK';
      var body = "<p>Halo " + name + ",</p><p>Status acara <strong>" + evtTitle + "</strong>: " + (data.status === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK') + "</p>";
      try { _sendBrandedEmail(email, "Update Status", statusTitle, body); } catch(e){}
      return { status: data.status };
    }
  }
  throw new Error("Registration not found");
}

function sendCertificate(data) {
  var sheet = _getSheet("Registrations");
  var rows = sheet.getDataRange().getValues();
  var certLink = (data.baseUrl || "https://bisdig.upy.ac.id/hmp/") + "/#/certificate/" + data.id;

  for(var i=1; i<rows.length; i++) {
    if(rows[i][0] == data.id) {
       var name = rows[i][3];
       var evtTitle = rows[i][2];
       var body = "<p>Halo " + name + ",</p><p>Sertifikat acara <strong>" + evtTitle + "</strong> telah terbit.</p><a href='" + certLink + "'>Download Sertifikat</a>";
       _sendBrandedEmail(rows[i][4], "🎓 Sertifikat", "SERTIFIKAT", body);
       return { sent: true };
    }
  }
  throw new Error("Not found");
}

// --- SETTINGS (Payment) ---
function savePaymentSettings(data) {
  var ss = _getDb();
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) { sheet = ss.insertSheet("Settings"); sheet.appendRow(["Key", "Value"]); }
  
  var qrisUrl = data.currentQrisUrl || "";
  
  // Save QRIS to Admin Folder
  if (data.qrisBase64) {
    try {
      var folder = _getAdminFolder();
      var blob = Utilities.newBlob(Utilities.base64Decode(data.qrisBase64), "image/jpeg", "qris_master");
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      qrisUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
    } catch(e) {}
  }
  
  var setSetting = function(key, val) {
    var data = sheet.getDataRange().getValues();
    for(var i=0; i<data.length; i++) {
      if(data[i][0] == key) { sheet.getRange(i+1, 2).setValue(val); return; }
    }
    sheet.appendRow([key, val]);
  };
  
  var bankAccountsJson = JSON.stringify(data.bankAccounts || []);
  setSetting("BANK_ACCOUNTS_JSON", bankAccountsJson);
  setSetting("QRIS_URL", qrisUrl);
  return { success: true, qrisUrl: qrisUrl };
}

function getPaymentSettings() {
  var sheet = _getSheet("Settings");
  if (!sheet) return { bankAccounts: [], qrisUrl: "" };
  var data = sheet.getDataRange().getValues();
  var settings = {};
  data.forEach(function(r) { settings[r[0]] = r[1]; });
  
  var bankAccounts = [];
  if (settings["BANK_ACCOUNTS_JSON"]) {
    try { bankAccounts = JSON.parse(settings["BANK_ACCOUNTS_JSON"]); } catch (e) { }
  } 
  return { bankAccounts: bankAccounts, qrisUrl: settings["QRIS_URL"] || "" };
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
  if(!s) { _initDbIfNeeded(); s = ss.getSheetByName(name); }
  return s;
}

function _initDbIfNeeded() {
  var ss = _getDb();
  if(!ss.getSheetByName("Events")) {
     ss.insertSheet("Events").appendRow(["id","title","desc","date","time","loc","price","cat","banner","max","cur","isOpen","formFields","certificateConfig"]);
  } else {
     var eSheet = ss.getSheetByName("Events");
     if (eSheet.getLastColumn() < 14) {
         eSheet.getRange(1, 14).setValue("certificateConfig");
     }
  }
  if(!ss.getSheetByName("Registrations")) ss.insertSheet("Registrations").appendRow(["id","eventId","evtTitle","name","email","proof","status","date","customData"]);
  if(!ss.getSheetByName("Users")) ss.insertSheet("Users").appendRow(["id","email","pass","name","date"]);
  if(!ss.getSheetByName("Settings")) ss.insertSheet("Settings").appendRow(["Key", "Value"]);
}

// --- DRIVE FOLDER HELPERS (REFACTORED) ---

// 1. Get or Create Master Folder
function _getMasterFolder() {
  var id = SCRIPT_PROP.getProperty("MASTER_FOLDER_ID");
  if (id) {
    try { 
      return DriveApp.getFolderById(id); 
    } catch(e) {
      // If folder deleted, recover
    }
  }
  var f = DriveApp.createFolder("EventHorizon_Master");
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  SCRIPT_PROP.setProperty("MASTER_FOLDER_ID", f.getId());
  return f;
}

// 2. Get or Create Admin Folder (For Banners, Cert Templates, QRIS)
function _getAdminFolder() {
  var master = _getMasterFolder();
  var folders = master.getFoldersByName("Admin_Assets");
  if (folders.hasNext()) return folders.next();
  
  var f = master.createFolder("Admin_Assets");
  // Assets must be public for frontend display
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return f;
}

// 3. Get or Create User Folder (For Payment Proofs)
function _getUserFolder() {
  var master = _getMasterFolder();
  var folders = master.getFoldersByName("User_Uploads");
  if (folders.hasNext()) return folders.next();
  
  var f = master.createFolder("User_Uploads");
  // Proofs need to be viewable by Admin via link
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); 
  return f;
}
