
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
    else if (action === "sendBulkCertificates" && method === "POST") data = sendBulkCertificates(postData);
    
    // New: Ticket Scanner & Export
    else if (action === "validateTicket" && method === "POST") data = validateTicket(postData);
    else if (action === "exportParticipants" && method === "POST") data = exportParticipants(postData);

    // Payment Settings
    else if (action === "savePaymentSettings" && method === "POST") data = savePaymentSettings(postData);
    else if (action === "getPaymentSettings") data = getPaymentSettings();
    
    // Certificate Settings (Global Defaults)
    else if (action === "saveCertificateSettings" && method === "POST") data = saveCertificateSettings(postData);
    else if (action === "getCertificateSettings") data = getCertificateSettings();
    
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

// ... (Auth Functions unchanged) ...
function signupUser(data) { /*...*/ var sheet = _getSheet("Users"); var email = (data.email || "").toLowerCase().trim(); var name = data.name || "User"; var password = data.password || ""; if (!email || !password) throw new Error("Email dan Password wajib diisi."); var rows = sheet.getDataRange().getValues(); for (var i = 1; i < rows.length; i++) { if (String(rows[i][1]).toLowerCase() === email) { throw new Error("Email sudah terdaftar. Silakan login."); } } var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, password); var txtHash = rawHash.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2,'0'); }).join(""); sheet.appendRow([ Utilities.getUuid(), email, txtHash, name, new Date().toISOString() ]); return { created: true }; }
function loginUser(data) { /*...*/ var sheet = _getSheet("Users"); var email = (data.email || "").toLowerCase().trim(); var password = data.password || ""; var rows = sheet.getDataRange().getValues(); var found = null; for (var i = 1; i < rows.length; i++) { if (String(rows[i][1]).toLowerCase() === email) { var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, password); var txtHash = rawHash.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2,'0'); }).join(""); if (txtHash === rows[i][2]) { found = { email: rows[i][1], name: rows[i][3] }; break; } } } if (!found) { throw new Error("Email atau password salah."); } if (ADMIN_EMAILS.indexOf(found.email) > -1) { var otp = Math.floor(100000 + Math.random() * 900000).toString(); CacheService.getScriptCache().put("OTP_" + found.email, otp, 300); var body = `<p>Halo Admin,</p><p>Gunakan kode berikut untuk masuk ke dashboard admin:</p><h1 style="color:#2B427A; letter-spacing: 5px;">${otp}</h1><p>Kode ini berlaku selama 5 menit.</p>`; _sendBrandedEmail(found.email, "Login Admin Bisdig", "VERIFIKASI ADMIN", body); return { valid: false, requireOtp: true }; } return { valid: true, role: "USER", email: found.email, name: found.name }; }
function requestOtp(data) { /*...*/ var email = (data.email || "").toLowerCase().trim(); if (!email) throw new Error("Email invalid"); var otp = Math.floor(100000 + Math.random() * 900000).toString(); CacheService.getScriptCache().put("OTP_" + email, otp, 300); var body = `<p>Halo,</p><p>Gunakan kode OTP berikut untuk masuk ke akun Anda:</p><h1 style="color:#2B427A; letter-spacing: 5px;">${otp}</h1><p>Jangan berikan kode ini kepada siapa pun.</p>`; _sendBrandedEmail(email, "Kode Masuk Event Bisdig", "VERIFIKASI AKUN", body); return { sent: true }; }
function loginWithOtp(data) { /*...*/ var email = (data.email || "").toLowerCase().trim(); var cached = CacheService.getScriptCache().get("OTP_" + email); if (!cached || cached !== data.otp) throw new Error("OTP salah atau kadaluarsa."); CacheService.getScriptCache().remove("OTP_" + email); var role = ADMIN_EMAILS.indexOf(email) > -1 ? "ADMIN" : "USER"; return { valid: true, role: role, email: email, name: "User" }; }

// --- IMPROVED EMAIL FUNCTION ---
function _sendBrandedEmail(to, subject, title, bodyContent, attachmentBlob) {
  var colorPrimary = "#2B427A";
  var colorAccent = "#DFFF00";
  var homeUrl = "https://bisdig.upy.ac.id/hmp/";
  
  var htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; max-width: 90%;">
              <tr>
                <td align="center" style="background-color: ${colorPrimary}; padding: 30px 20px;">
                  <h1 style="color: ${colorAccent}; margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase;">EVENT BISDIG</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: ${colorPrimary}; font-size: 20px; font-weight: 800; margin: 0 0 20px 0; text-transform: uppercase;">${title}</h2>
                  <div style="color: #475569; font-size: 16px; line-height: 1.6;">
                    ${bodyContent}
                  </div>
                </td>
              </tr>
              <tr>
                <td align="center" style="background-color: #f1f5f9; padding: 20px;">
                  <p style="margin: 0; font-size: 11px; color: #64748b;">&copy; ${new Date().getFullYear()} HMP Bisnis Digital UPY</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Create Plain Text Version (Crucial for Spam Filters)
  var textBody = bodyContent.replace(/<[^>]*>/g, "").trim();
  textBody += "\n\nTerima kasih,\nHMP Bisnis Digital UPY";

  var options = {
    htmlBody: htmlBody,
    name: "Event Bisdig System", // Explicit Sender Name
    noReply: true
  };

  if (attachmentBlob) {
    options.attachments = [attachmentBlob];
  }

  // Use GmailApp if available (Better Deliverability)
  try {
    GmailApp.sendEmail(to, subject, textBody, options);
  } catch(e) {
    // Fallback
    MailApp.sendEmail(to, subject, textBody, options);
  }
}

function _generateEmailButton(url, text) { return ` <table border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;"> <tr> <td align="center" style="border-radius: 10px;" bgcolor="#0B1CDE"> <a href="${url}" target="_blank" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 15px 30px; border: 1px solid #0B1CDE; display: inline-block; font-weight: bold;"> ${text} </a> </td> </tr> </table> `; }

// --- EVENT FUNCTIONS ---
function getEvents() { var sheet = _getSheet("Events"); var rows = sheet.getDataRange().getValues(); if (rows.length <= 1) return []; var dataRows = rows.slice(1); return dataRows.map(function(row) { var obj = {}; obj.id = row[0]; obj.title = row[1]; obj.description = row[2]; obj.date = row[3]; obj.time = row[4]; obj.location = row[5]; obj.price = row[6]; obj.category = row[7]; obj.bannerUrl = row[8]; obj.maxParticipants = row[9]; obj.currentParticipants = row[10]; obj.isOpen = (row[11] === true || String(row[11]).toUpperCase() === "TRUE"); try { obj.formFields = row[12] ? JSON.parse(row[12]) : []; } catch(e) { obj.formFields = []; } try { obj.certificateConfig = row[13] ? JSON.parse(row[13]) : null; } catch(e) { obj.certificateConfig = null; } obj.thumbnailUrl = row[14] || ""; obj.enableTicketScanner = row[15] === true || row[15] === "TRUE"; return obj; }); }
function createEvent(data) { /*...*/ var sheet = _getSheet("Events"); var id = Utilities.getUuid(); var bannerUrl = ""; var thumbnailUrl = ""; var folder = _getAdminFolder(); if (data.bannerBase64) { try { var blob = Utilities.newBlob(Utilities.base64Decode(data.bannerBase64), "image/jpeg", "banner_" + id); bannerUrl = "https://lh3.googleusercontent.com/d/" + folder.createFile(blob).getId(); } catch (e) { } } if (data.thumbnailBase64) { try { var blob = Utilities.newBlob(Utilities.base64Decode(data.thumbnailBase64), "image/jpeg", "thumb_" + id); thumbnailUrl = "https://lh3.googleusercontent.com/d/" + folder.createFile(blob).getId(); } catch (e) { } } var certConfig = data.certificateConfig || null; if (certConfig && data.certBackgroundBase64) { try { var blob = Utilities.newBlob(Utilities.base64Decode(data.certBackgroundBase64), "image/png", "cert_bg_" + id); var file = folder.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); certConfig.backgroundUrl = "https://lh3.googleusercontent.com/d/" + file.getId(); } catch(e) {} } var formFieldsJson = data.formFields ? JSON.stringify(data.formFields) : "[]"; var certConfigJson = certConfig ? JSON.stringify(certConfig) : ""; sheet.appendRow([ id, data.title, data.description, data.date, data.time, data.location, data.price, data.category, bannerUrl, data.maxParticipants, 0, true, formFieldsJson, certConfigJson, thumbnailUrl, data.enableTicketScanner ]); return { id: id }; }
function updateEvent(data) { /*...*/ var sheet = _getSheet("Events"); var rows = sheet.getDataRange().getValues(); for (var i = 1; i < rows.length; i++) { if (rows[i][0] == data.id) { var bannerUrl = rows[i][8]; var thumbnailUrl = rows[i][14] || ""; var folder = _getAdminFolder(); if (data.bannerBase64) { try { var blob = Utilities.newBlob(Utilities.base64Decode(data.bannerBase64), "image/jpeg", "banner_" + data.id + "_" + new Date().getTime()); bannerUrl = "https://lh3.googleusercontent.com/d/" + folder.createFile(blob).getId(); } catch(e) {} } if (data.thumbnailBase64) { try { var blob = Utilities.newBlob(Utilities.base64Decode(data.thumbnailBase64), "image/jpeg", "thumb_" + data.id + "_" + new Date().getTime()); thumbnailUrl = "https://lh3.googleusercontent.com/d/" + folder.createFile(blob).getId(); } catch(e) {} } var formFieldsJson = data.formFields ? JSON.stringify(data.formFields) : "[]"; var certConfigJson = rows[i][13]; var certConfig = data.certificateConfig; if (certConfig) { if (data.certBackgroundBase64) { try { var blob = Utilities.newBlob(Utilities.base64Decode(data.certBackgroundBase64), "image/png", "cert_bg_" + data.id + "_" + new Date().getTime()); var file = folder.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); certConfig.backgroundUrl = "https://lh3.googleusercontent.com/d/" + file.getId(); } catch(e) {} } else if (!certConfig.backgroundUrl && rows[i][13]) { try { var oldConf = JSON.parse(rows[i][13]); certConfig.backgroundUrl = oldConf.backgroundUrl; } catch(e){} } certConfigJson = JSON.stringify(certConfig); } sheet.getRange(i+1, 2).setValue(data.title); sheet.getRange(i+1, 3).setValue(data.description); sheet.getRange(i+1, 4).setValue(data.date); sheet.getRange(i+1, 5).setValue(data.time); sheet.getRange(i+1, 6).setValue(data.location); sheet.getRange(i+1, 7).setValue(data.price); sheet.getRange(i+1, 8).setValue(data.category); sheet.getRange(i+1, 9).setValue(bannerUrl); sheet.getRange(i+1, 10).setValue(data.maxParticipants); sheet.getRange(i+1, 13).setValue(formFieldsJson); if (sheet.getLastColumn() < 14) { sheet.getRange(i+1, 14).setValue(certConfigJson); sheet.getRange(i+1, 15).setValue(thumbnailUrl); sheet.getRange(i+1, 16).setValue(data.enableTicketScanner); } else { sheet.getRange(i+1, 14).setValue(certConfigJson); sheet.getRange(i+1, 15).setValue(thumbnailUrl); if (sheet.getLastColumn() >= 16) sheet.getRange(i+1, 16).setValue(data.enableTicketScanner); else sheet.getRange(i+1, 16).setValue(data.enableTicketScanner); } return { id: data.id, updated: true }; } } throw new Error("Event not found for update"); }
function deleteEvent(data) { /*...*/ var sheet = _getSheet("Events"); var rows = sheet.getDataRange().getValues(); for (var i = 1; i < rows.length; i++) { if (rows[i][0] == data.id) { sheet.deleteRow(i + 1); return { deleted: true }; } } throw new Error("Event not found"); }
function toggleEventStatus(data) { /*...*/ var sheet = _getSheet("Events"); var rows = sheet.getDataRange().getValues(); for (var i = 1; i < rows.length; i++) { if (rows[i][0] == data.id) { var current = rows[i][11]; var isTrue = (current === true || String(current).toUpperCase() === "TRUE"); var newVal = !isTrue; sheet.getRange(i + 1, 12).setValue(newVal); return { id: data.id, isOpen: newVal }; } } throw new Error("Event not found"); }

// --- REGISTRATION FUNCTIONS ---

function registerEventParticipant(data) {
  var eSheet = _getSheet("Events");
  var events = eSheet.getDataRange().getValues();
  var eventRowIndex = -1;
  var eventTitle = "";
  for(var i=1; i<events.length; i++) { if(events[i][0] == data.eventId) { eventRowIndex = i; eventTitle = events[i][1]; break; } }
  if (eventRowIndex == -1) throw new Error("Event not found");
  
  var rSheet = _getSheet("Registrations");
  var rRows = rSheet.getDataRange().getValues();
  for(var i=1; i<rRows.length; i++) { if(rRows[i][1] == data.eventId && rRows[i][4].toString().toLowerCase() == data.email.toString().toLowerCase()) throw new Error("Email ini sudah terdaftar untuk acara tersebut."); }

  // 1. Handle Proof of Payment Upload
  var proofUrl = "";
  var userFolder = _getUserFolder(); // Get folder reference once
  
  if (data.proofBase64) { 
      try { 
          var blob = Utilities.newBlob(Utilities.base64Decode(data.proofBase64.split(',')[1] || data.proofBase64), "image/jpeg", "proof_" + data.email); 
          proofUrl = userFolder.createFile(blob).getUrl(); 
      } catch(e) {} 
  }
  
  // 2. Handle Custom Data (including File Uploads)
  var finalCustomData = {};
  if (data.customData) {
      try {
          var rawData = data.customData;
          // Iterate over custom fields to find file objects
          Object.keys(rawData).forEach(function(key) {
              var val = rawData[key];
              // Check if value looks like the file object we send from frontend { isCustomFile: true, data: ..., fileName: ... }
              if (val && typeof val === 'object' && val.isCustomFile && val.data) {
                  try {
                      var fileBlob = Utilities.newBlob(Utilities.base64Decode(val.data), val.mimeType || "application/octet-stream", "file_" + val.fileName);
                      var uploadedFile = userFolder.createFile(fileBlob);
                      uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                      // Replace base64 data with Drive URL in the saved JSON
                      finalCustomData[key] = uploadedFile.getUrl(); 
                  } catch (fileErr) {
                      finalCustomData[key] = "Error Uploading File: " + val.fileName;
                  }
              } else {
                  // Normal text/number data
                  finalCustomData[key] = val;
              }
          });
      } catch (e) {
          finalCustomData = data.customData; // Fallback
      }
  }
  
  var customDataJson = JSON.stringify(finalCustomData);
  
  // 3. Save Registration
  rSheet.appendRow([
    Utilities.getUuid(), data.eventId, eventTitle, data.name, data.email, 
    proofUrl, "PENDING", new Date().toISOString(), customDataJson, "NOT_USED", ""
  ]);
  
  var current = Number(events[eventRowIndex][10]) || 0;
  eSheet.getRange(eventRowIndex + 1, 11).setValue(current + 1);
  
  var body = `
    <p>Halo <strong>${data.name}</strong>, 👋</p>
    <p>Terima kasih telah mendaftar di acara <strong>"${eventTitle}"</strong>.</p>
    <p>Data pendaftaran dan bukti pembayaran Anda telah kami terima. Tim kami sedang melakukan verifikasi.</p>
    <p>Mohon cek email Anda secara berkala untuk info selanjutnya.</p>
  `;
  _sendBrandedEmail(data.email, "Pendaftaran Diterima", "MENUNGGU VERIFIKASI", body);

  return { status: "PENDING" };
}

function getRegistrations() { /*...*/ var sheet = _getSheet("Registrations"); var rows = sheet.getDataRange().getValues(); if (rows.length <= 1) return []; return rows.slice(1).map(function(row) { return { id: row[0], eventId: row[1], eventTitle: row[2], userName: row[3], userEmail: row[4], proofUrl: row[5], status: row[6], registrationDate: row[7], customData: row[8], checkInStatus: row[9] || "NOT_USED", checkInTime: row[10] || "" }; }); }
function getRegistration(data) { /*...*/ var rSheet = _getSheet("Registrations"); var rRows = rSheet.getDataRange().getValues(); var reg = null; for(var i=1; i<rRows.length; i++) { if(rRows[i][0] == data.id) { reg = { id: rRows[i][0], eventId: rRows[i][1], eventTitle: rRows[i][2], userName: rRows[i][3], userEmail: rRows[i][4], status: rRows[i][6], registrationDate: rRows[i][7], customData: rRows[i][8], checkInStatus: rRows[i][9] || "NOT_USED", checkInTime: rRows[i][10] || "" }; break; } } if (!reg) throw new Error("Pendaftaran tidak ditemukan."); var eSheet = _getSheet("Events"); var eRows = eSheet.getDataRange().getValues(); var certConfig = null; for(var j=1; j<eRows.length; j++) { if(eRows[j][0] == reg.eventId) { try { certConfig = eRows[j][13] ? JSON.parse(eRows[j][13]) : null; } catch(e) {} break; } } if (!certConfig) { var settings = getCertificateSettings(); if (settings.backgroundUrl) { certConfig = settings; } } return { registration: reg, certificateConfig: certConfig }; }
// ... (Ticket Validation & Export unchanged) ...
function validateTicket(data) { /*...*/ var ticketId = data.ticketId; var eventId = data.eventId; if (!ticketId || !eventId) throw new Error("Data scan tidak lengkap."); var eSheet = _getSheet("Events"); var eRows = eSheet.getDataRange().getValues(); var eventActive = false; var eventName = ""; for(var i=1; i<eRows.length; i++) { if(eRows[i][0] == eventId) { var isOpen = (eRows[i][11] === true || String(eRows[i][11]).toUpperCase() === "TRUE"); if (isOpen) { eventActive = true; eventName = eRows[i][1]; } break; } } if (!eventActive) throw new Error("Link scan tidak valid atau Event sudah ditutup/selesai."); var rSheet = _getSheet("Registrations"); var rRows = rSheet.getDataRange().getValues(); var foundIndex = -1; for(var i=1; i<rRows.length; i++) { if (rRows[i][0] == ticketId) { foundIndex = i; break; } } if (foundIndex === -1) throw new Error("Tiket tidak ditemukan dalam database."); var row = rRows[foundIndex]; if (row[1] != eventId) throw new Error("Tiket ini bukan untuk acara ini (" + eventName + ")."); if (row[6] !== "APPROVED") throw new Error("Status tiket belum disetujui (Status: " + row[6] + ")."); if (row[9] === "CHECKED_IN") throw new Error("Tiket SUDAH DIPAKAI pada " + new Date(row[10]).toLocaleString()); var now = new Date().toISOString(); rSheet.getRange(foundIndex + 1, 10).setValue("CHECKED_IN"); rSheet.getRange(foundIndex + 1, 11).setValue(now); return { success: true, participantName: row[3], eventName: row[2], checkInTime: now }; }
function exportParticipants(data) { /*...*/ var eventId = data.eventId; var rSheet = _getSheet("Registrations"); var rRows = rSheet.getDataRange().getValues(); var headers = ["No", "ID Pendaftaran", "Nama Peserta", "Email", "Acara", "Tanggal Beli", "Status", "Check-In", "Waktu Check-In"]; var customKeys = new Set(); var filteredRows = []; for(var i=1; i<rRows.length; i++) { if (eventId === 'ALL' || rRows[i][1] == eventId) { filteredRows.push(rRows[i]); try { var cData = JSON.parse(rRows[i][8] || "{}"); Object.keys(cData).forEach(function(k) { customKeys.add(k); }); } catch(e) {} } } var customKeysArray = Array.from(customKeys); headers = headers.concat(customKeysArray); var csvContent = headers.join(",") + "\n"; filteredRows.forEach(function(row, index) { var line = [ index + 1, row[0], '"' + row[3].replace(/"/g, '""') + '"', row[4], '"' + row[2].replace(/"/g, '""') + '"', new Date(row[7]).toLocaleDateString(), row[6], row[9] || "NOT_USED", row[10] ? new Date(row[10]).toLocaleTimeString() : "-" ]; var cData = {}; try { cData = JSON.parse(row[8] || "{}"); } catch(e) {} customKeysArray.forEach(function(key) { var val = cData[key] || "-"; line.push('"' + String(val).replace(/"/g, '""') + '"'); }); csvContent += line.join(",") + "\n"; }); return { csv: Utilities.base64Encode(csvContent), filename: "Export_Peserta_" + new Date().getTime() + ".csv" }; }

function updateRegistrationStatus(data) {
  var sheet = _getSheet("Registrations");
  var rows = sheet.getDataRange().getValues();
  
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      sheet.getRange(i + 1, 7).setValue(data.status);
      var email = rows[i][4];
      var name = rows[i][3];
      var evtTitle = rows[i][2];
      var isApproved = data.status === 'APPROVED';
      var statusTitle = isApproved ? 'PENDAFTARAN DISETUJUI' : 'PENDAFTARAN DITOLAK';
      var body = "";

      if (isApproved) {
        // Use Dynamic Base URL from Frontend, fallback to default if missing
        var baseUrl = data.baseUrl || "https://bisdig.upy.ac.id/hmp/";
        // Remove trailing slash to prevent double slash, then append hash path
        var cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        var ticketLink = cleanBaseUrl + "/#/ticket-view/" + data.id;

        body = `
          <p>Halo <strong>${name}</strong>,</p>
          <p>Selamat! Pembayaran Anda telah kami verifikasi.</p>
          <p>Tiket Anda untuk acara <strong>"${evtTitle}"</strong> sekarang berstatus <strong>VALID</strong>.</p>
          <p>Klik tombol di bawah ini untuk melihat dan mengunduh E-Ticket Anda:</p>
          ${_generateEmailButton(ticketLink, "LIHAT E-TICKET SAYA")}
          <br/>
          <p style="font-size:12px; color:gray;">Atau login ke dashboard jika Anda memiliki akun.</p>
          <p>Sampai jumpa di acara!</p>
        `;
      } else {
        body = `
          <p>Halo <strong>${name}</strong>,</p>
          <p>Mohon maaf, pendaftaran Anda untuk acara <strong>"${evtTitle}"</strong> belum dapat kami setujui.</p>
          <p>Hal ini mungkin disebabkan karena bukti pembayaran tidak valid atau kuota telah penuh.</p>
          <p>Silakan hubungi admin kami jika Anda merasa ini adalah kesalahan.</p>
        `;
      }
      try {
        _sendBrandedEmail(email, "Status Tiket Event", statusTitle, body);
      } catch(e){}
      return { status: data.status };
    }
  }
  throw new Error("Registration not found");
}

function sendCertificate(data) {
  var sheet = _getSheet("Registrations");
  var rows = sheet.getDataRange().getValues();
  
  // Use Dynamic Base URL
  var baseUrl = data.baseUrl || "https://bisdig.upy.ac.id/hmp/";
  var cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  var certLink = cleanBaseUrl + "/#/certificate/" + data.id;

  for(var i=1; i<rows.length; i++) {
    if(rows[i][0] == data.id) {
      var name = rows[i][3];
      var evtTitle = rows[i][2];
      var body = `
        <p>Halo <strong>${name}</strong>,</p>
        <p>Terima kasih telah berpartisipasi dalam acara <strong>"${evtTitle}"</strong>.</p>
        <p>Sebagai bentuk apresiasi, kami lampirkan e-Sertifikat keikutsertaan Anda.</p>
        ${_generateEmailButton(certLink, "DOWNLOAD SERTIFIKAT")}
        <p>Semoga ilmu yang didapatkan bermanfaat!</p>
      `;
      _sendBrandedEmail(rows[i][4], "Sertifikat Acara Telah Terbit", "E-SERTIFIKAT", body);
      return { sent: true };
    }
  }
  throw new Error("Not found");
}

function sendBulkCertificates(data) {
  var sheet = _getSheet("Registrations");
  var rows = sheet.getDataRange().getValues();
  var idsToProcess = data.ids || [];
  var successCount = 0;
  var failCount = 0;
  var idMap = {};
  
  // Use Dynamic Base URL
  var baseUrl = data.baseUrl || "https://bisdig.upy.ac.id/hmp/";
  var cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  for(var i=1; i<rows.length; i++) {
    idMap[rows[i][0]] = i;
  }
  
  idsToProcess.forEach(function(id) {
    var rowIndex = idMap[id];
    if(rowIndex) {
      var row = rows[rowIndex];
      if(row[6] === 'APPROVED') {
        try {
          var certLink = cleanBaseUrl + "/#/certificate/" + id;
          var body = `<p>Sertifikat Anda:</p>${_generateEmailButton(certLink, "DOWNLOAD SERTIFIKAT")}`;
          _sendBrandedEmail(row[4], "Sertifikat Acara Telah Terbit", "SERTIFIKAT", body);
          successCount++;
        } catch(e) {
          failCount++;
        }
      }
    }
  });
  return { sent: successCount, failed: failCount };
}

function savePaymentSettings(data) { var ss = _getDb(); var sheet = ss.getSheetByName("Settings"); if (!sheet) { sheet = ss.insertSheet("Settings"); sheet.appendRow(["Key", "Value"]); } var qrisUrl = data.currentQrisUrl || ""; if (data.qrisBase64) { try { var folder = _getAdminFolder(); var blob = Utilities.newBlob(Utilities.base64Decode(data.qrisBase64), "image/jpeg", "qris_master"); var file = folder.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); qrisUrl = "https://lh3.googleusercontent.com/d/" + file.getId(); } catch(e) {} } var setSetting = function(key, val) { var data = sheet.getDataRange().getValues(); for(var i=0; i<data.length; i++) { if(data[i][0] == key) { sheet.getRange(i+1, 2).setValue(val); return; } } sheet.appendRow([key, val]); }; setSetting("BANK_ACCOUNTS_JSON", JSON.stringify(data.bankAccounts || [])); setSetting("QRIS_URL", qrisUrl); return { success: true, qrisUrl: qrisUrl }; }
function getPaymentSettings() { var sheet = _getSheet("Settings"); if (!sheet) return { bankAccounts: [], qrisUrl: "" }; var data = sheet.getDataRange().getValues(); var settings = {}; data.forEach(function(r) { settings[r[0]] = r[1]; }); var bankAccounts = []; if (settings["BANK_ACCOUNTS_JSON"]) { try { bankAccounts = JSON.parse(settings["BANK_ACCOUNTS_JSON"]); } catch (e) { } } return { bankAccounts: bankAccounts, qrisUrl: settings["QRIS_URL"] || "" }; }
function saveCertificateSettings(data) { var ss = _getDb(); var sheet = ss.getSheetByName("Settings"); var templateUrl = data.backgroundUrl || ""; if (data.templateBase64) { try { var folder = _getAdminFolder(); var blob = Utilities.newBlob(Utilities.base64Decode(data.templateBase64), "image/png", "cert_default_" + new Date().getTime()); var file = folder.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); templateUrl = "https://lh3.googleusercontent.com/d/" + file.getId(); } catch(e) {} } var setSetting = function(key, val) { var rows = sheet.getDataRange().getValues(); for(var i=0; i<rows.length; i++) { if(rows[i][0] == key) { sheet.getRange(i+1, 2).setValue(val); return; } } sheet.appendRow([key, val]); }; setSetting("CERT_TEMPLATE_URL", templateUrl); setSetting("CERT_ELEMENTS_JSON", JSON.stringify(data.elements || [])); return { success: true, templateUrl: templateUrl }; }
function getCertificateSettings() { var sheet = _getSheet("Settings"); var data = sheet.getDataRange().getValues(); var s = {}; data.forEach(function(r) { s[r[0]] = r[1]; }); var elements = []; if (s["CERT_ELEMENTS_JSON"]) { try { elements = JSON.parse(s["CERT_ELEMENTS_JSON"]); } catch(e) {} } return { backgroundUrl: s["CERT_TEMPLATE_URL"] || "", elements: elements, csvDataUrl: s["CERT_CSV_DATA_URL"] || "" }; }
function _getDb() { var dbId = SCRIPT_PROP.getProperty("DB_ID"); if (dbId) try { return SpreadsheetApp.openById(dbId); } catch(e){} var ss = SpreadsheetApp.create("EventHorizon_DB"); SCRIPT_PROP.setProperty("DB_ID", ss.getId()); return ss; }
function _getSheet(name) { var ss = _getDb(); var s = ss.getSheetByName(name); if(!s) { _initDbIfNeeded(); s = ss.getSheetByName(name); } return s; }
function _initDbIfNeeded() { var ss = _getDb(); if(!ss.getSheetByName("Events")) { ss.insertSheet("Events").appendRow(["id","title","desc","date","time","loc","price","cat","banner","max","cur","isOpen","formFields","certificateConfig","thumbnail","enableTicketScanner"]); } else { var eSheet = ss.getSheetByName("Events"); if (eSheet.getLastColumn() < 16) eSheet.getRange(1, 16).setValue("enableTicketScanner"); } if(!ss.getSheetByName("Registrations")) { ss.insertSheet("Registrations").appendRow(["id","eventId","evtTitle","name","email","proof","status","date","customData","checkInStatus","checkInTime"]); } else { var rSheet = ss.getSheetByName("Registrations"); if (rSheet.getLastColumn() < 10) rSheet.getRange(1, 10).setValue("checkInStatus"); if (rSheet.getLastColumn() < 11) rSheet.getRange(1, 11).setValue("checkInTime"); } if(!ss.getSheetByName("Users")) ss.insertSheet("Users").appendRow(["id","email","pass","name","date"]); if(!ss.getSheetByName("Settings")) ss.insertSheet("Settings").appendRow(["Key", "Value"]); }
function _getMasterFolder() { var id = SCRIPT_PROP.getProperty("MASTER_FOLDER_ID"); if (id) { try { return DriveApp.getFolderById(id); } catch(e) {} } var f = DriveApp.createFolder("EventHorizon_Master"); f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); SCRIPT_PROP.setProperty("MASTER_FOLDER_ID", f.getId()); return f; }
function _getAdminFolder() { var master = _getMasterFolder(); var folders = master.getFoldersByName("Admin_Assets"); if (folders.hasNext()) return folders.next(); var f = master.createFolder("Admin_Assets"); f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); return f; }
function _getUserFolder() { var master = _getMasterFolder(); var folders = master.getFoldersByName("User_Uploads"); if (folders.hasNext()) return folders.next(); var f = master.createFolder("User_Uploads"); f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); return f; }
