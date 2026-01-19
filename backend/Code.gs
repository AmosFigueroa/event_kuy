
/**
 * EventHorizon Backend - Google Apps Script
 */

// --- KONFIGURASI DATABASE ---
// ID sekarang bersifat OPSIONAL. Sistem akan otomatis mencari file "EventHorizon_DB" di Drive Anda.
// Isi ini HANYA jika sistem gagal menemukan database lama Anda secara otomatis.
var MANUAL_DB_ID = ""; 

var SCRIPT_PROP = PropertiesService.getScriptProperties();
var ADMIN_EMAILS = [
  "bisnisdigitalhmp@gmail.com",
  "eventhmpbisdigupy@gmail.com",
  "mywebnestid@gmail.com"
];

function doGet(e) { return handleRequest(e, "GET"); }
function doPost(e) { return handleRequest(e, "POST"); }

// --- AUTH HELPERS ---
// JALANKAN FUNGSI INI SEKALI SECARA MANUAL DI EDITOR UNTUK MEMBERIKAN IZIN (AUTHORIZATION)
function _setupPermissions() {
  console.log("Checking permissions...");
  // Forces GAS to detect scopes for:
  DriveApp.getRootFolder();       // Drive
  SpreadsheetApp.getActive();     // Sheets
  
  // FIX: Menggunakan .create() bukan .newPresentation()
  var tempSlide = SlidesApp.create("TEMP_AUTH_CHECK"); // Slides (PENTING UNTUK SERTIFIKAT)
  // Hapus file temp agar tidak nyampah
  DriveApp.getFileById(tempSlide.getId()).setTrashed(true);
  
  GmailApp.getInboxThreads(0,1);  // Gmail
  console.log("All permissions registered.");
}

function handleRequest(e, method) {
  // OPTIMISASI LOCKING:
  // Hanya kunci script saat melakukan penulisan data (POST).
  // Saat membaca data (GET), biarkan berjalan paralel agar Dashboard Admin cepat dan tidak timeout.
  var lock = LockService.getScriptLock();
  var hasLock = false;
  
  if (method === "POST") {
    try {
       // Tunggu antrian maksimal 30 detik untuk operasi tulis
       lock.waitLock(30000);
       hasLock = true;
    } catch (err) {
       return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Server sedang sibuk, coba lagi." })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
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
    
    // NEW: GOOGLE SLIDES CERTIFICATE ROUTE
    else if (action === "generateSlideCertificate" && method === "POST") data = generateSlideCertificate(postData);
    
    else if (action === "sendCertificate" && method === "POST") data = sendCertificate(postData); 
    else if (action === "sendBulkCertificates" && method === "POST") data = sendBulkCertificates(postData);
    
    else if (action === "validateTicket" && method === "POST") data = validateTicket(postData);
    else if (action === "exportParticipants" && method === "POST") data = exportParticipants(postData);

    else if (action === "savePaymentSettings" && method === "POST") data = savePaymentSettings(postData);
    else if (action === "getPaymentSettings") data = getPaymentSettings();
    
    else if (action === "saveCertificateSettings" && method === "POST") data = saveCertificateSettings(postData);
    else if (action === "getCertificateSettings") data = getCertificateSettings();
    
    else if (action === "signup" && method === "POST") data = signupUser(postData);
    else if (action === "login" && method === "POST") data = loginUser(postData);
    else if (action === "requestOtp" && method === "POST") data = requestOtp(postData);
    else if (action === "loginOtp" && method === "POST") data = loginWithOtp(postData);
    else if (action === "resetPassword" && method === "POST") data = resetUserPassword(postData);
    
    else {
      if (method === "GET" && !action) data = { message: "Backend Online." };
      else throw new Error("Invalid action/method");
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: data })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

// ... (Auth & Helper functions kept compact) ...
function signupUser(data) { var sheet = _getSheet("Users"); var email = (data.email || "").toLowerCase().trim(); var name = data.name || "User"; var password = data.password || ""; if (!email || !password) throw new Error("Email dan Password wajib diisi."); var rows = sheet.getDataRange().getValues(); for (var i = 1; i < rows.length; i++) { if (String(rows[i][1]).toLowerCase() === email) { throw new Error("Email sudah terdaftar. Silakan login."); } } var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, password); var txtHash = rawHash.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2,'0'); }).join(""); sheet.appendRow([ Utilities.getUuid(), email, txtHash, name, new Date().toISOString() ]); return { created: true }; }
function loginUser(data) { var sheet = _getSheet("Users"); var email = (data.email || "").toLowerCase().trim(); var password = data.password || ""; var rows = sheet.getDataRange().getValues(); var found = null; for (var i = 1; i < rows.length; i++) { if (String(rows[i][1]).toLowerCase() === email) { var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, password); var txtHash = rawHash.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2,'0'); }).join(""); if (txtHash === rows[i][2]) { found = { email: rows[i][1], name: rows[i][3] }; break; } } } if (!found) { throw new Error("Email atau password salah."); } if (ADMIN_EMAILS.indexOf(found.email) > -1) { var otp = Math.floor(100000 + Math.random() * 900000).toString(); CacheService.getScriptCache().put("OTP_" + found.email, otp, 300); var body = `<p>Halo Admin,</p><p>Gunakan kode berikut untuk masuk ke dashboard admin:</p><h1 style="color:#2B427A; letter-spacing: 5px;">${otp}</h1><p>Kode ini berlaku selama 5 menit.</p>`; _sendBrandedEmail(found.email, "Login Admin Bisdig", "VERIFIKASI ADMIN", body); return { valid: false, requireOtp: true }; } return { valid: true, role: "USER", email: found.email, name: found.name }; }
function requestOtp(data) { var email = (data.email || "").toLowerCase().trim(); if (!email) throw new Error("Email invalid"); var otp = Math.floor(100000 + Math.random() * 900000).toString(); CacheService.getScriptCache().put("OTP_" + email, otp, 300); var title = "VERIFIKASI AKUN"; var subject = "Kode Masuk Event Bisdig"; var actionText = "masuk ke akun Anda"; if (data.type === 'RESET') { title = "RESET PASSWORD"; subject = "Kode Reset Password"; actionText = "mereset password Anda"; } var body = `<p>Halo,</p><p>Gunakan kode OTP berikut untuk ${actionText}:</p><h1 style="color:#2B427A; letter-spacing: 5px;">${otp}</h1><p>Jangan berikan kode ini kepada siapa pun.</p>`; _sendBrandedEmail(email, subject, title, body); return { sent: true }; }
function loginWithOtp(data) { var email = (data.email || "").toLowerCase().trim(); var cached = CacheService.getScriptCache().get("OTP_" + email); if (!cached || cached !== data.otp) throw new Error("OTP salah atau kadaluarsa."); CacheService.getScriptCache().remove("OTP_" + email); var role = ADMIN_EMAILS.indexOf(email) > -1 ? "ADMIN" : "USER"; return { valid: true, role: role, email: email, name: "User" }; }
function resetUserPassword(data) { var email = (data.email || "").toLowerCase().trim(); var newPassword = data.newPassword; var otp = data.otp; if (!email || !newPassword || !otp) throw new Error("Data tidak lengkap."); var cached = CacheService.getScriptCache().get("OTP_" + email); if (!cached || cached !== otp) throw new Error("Kode OTP salah atau kadaluarsa."); var sheet = _getSheet("Users"); var rows = sheet.getDataRange().getValues(); var found = false; for (var i = 1; i < rows.length; i++) { if (String(rows[i][1]).toLowerCase() === email) { var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, newPassword); var txtHash = rawHash.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2,'0'); }).join(""); sheet.getRange(i + 1, 3).setValue(txtHash); found = true; break; } } if (!found) throw new Error("Email tidak terdaftar."); CacheService.getScriptCache().remove("OTP_" + email); return { success: true }; }
function _sendBrandedEmail(to, subject, title, bodyContent, attachmentBlob) { var colorPrimary = "#2B427A"; var colorAccent = "#DFFF00"; var htmlBody = ` <!DOCTYPE html> <html> <head> <meta charset="utf-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>${subject}</title> </head> <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;"> <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 20px 0;"> <tr> <td align="center"> <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; max-width: 90%;"> <tr> <td align="center" style="background-color: ${colorPrimary}; padding: 30px 20px;"> <h1 style="color: ${colorAccent}; margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase;">EVENT BISDIG</h1> </td> </tr> <tr> <td style="padding: 40px 30px;"> <h2 style="color: ${colorPrimary}; font-size: 20px; font-weight: 800; margin: 0 0 20px 0; text-transform: uppercase;">${title}</h2> <div style="color: #475569; font-size: 16px; line-height: 1.6;"> ${bodyContent} </div> </td> </tr> <tr> <td align="center" style="background-color: #f1f5f9; padding: 20px;"> <p style="margin: 0; font-size: 11px; color: #64748b;">&copy; ${new Date().getFullYear()} HMP Bisnis Digital UPY</p> </td> </tr> </table> </td> </tr> </table> </body> </html> `; var textBody = bodyContent.replace(/<[^>]*>/g, "").trim(); textBody += "\n\nTerima kasih,\nHMP Bisnis Digital UPY"; var options = { htmlBody: htmlBody, name: "Event Bisdig System", noReply: true }; if (attachmentBlob) { options.attachments = [attachmentBlob]; } try { GmailApp.sendEmail(to, subject, textBody, options); } catch(e) { MailApp.sendEmail(to, subject, textBody, options); } }
function _generateEmailButton(url, text) { return ` <table border="0" cellpadding="0" cellspacing="0" style="margin: 25px 0;"> <tr> <td align="center" style="border-radius: 10px;" bgcolor="#0B1CDE"> <a href="${url}" target="_blank" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 15px 30px; border: 1px solid #0B1CDE; display: inline-block; font-weight: bold;"> ${text} </a> </td> </tr> </table> `; }

// --- EVENT FUNCTIONS ---
function getEvents() { var sheet = _getSheet("Events"); var rows = sheet.getDataRange().getValues(); var rSheet = _getSheet("Registrations"); var rRows = rSheet.getDataRange().getValues(); var counts = {}; if (rRows.length > 1) { for (var i = 1; i < rRows.length; i++) { var evtId = rRows[i][1]; var status = rRows[i][6]; if (status !== 'REJECTED') { counts[evtId] = (counts[evtId] || 0) + 1; } } } if (rows.length <= 1) return []; var dataRows = rows.slice(1); return dataRows.map(function(row) { var obj = {}; obj.id = row[0]; obj.title = row[1]; obj.description = row[2]; obj.date = row[3]; var timeVal = row[4]; if (timeVal && typeof timeVal.getMonth === 'function') { obj.time = Utilities.formatDate(timeVal, Session.getScriptTimeZone(), "HH:mm"); } else { obj.time = String(timeVal); } obj.location = row[5]; obj.price = row[6]; obj.category = row[7]; obj.bannerUrl = row[8]; obj.maxParticipants = row[9]; obj.currentParticipants = counts[obj.id] || 0; var rawIsOpen = (row[11] === true || String(row[11]).toUpperCase() === "TRUE"); var rawStatus = row[17] || ""; obj.status = rawStatus ? rawStatus : (rawIsOpen ? 'OPEN' : 'CLOSED'); obj.isOpen = (obj.status === 'OPEN' || obj.status === 'EXTENDED'); try { obj.formFields = row[12] ? JSON.parse(row[12]) : []; } catch(e) { obj.formFields = []; } try { obj.certificateConfig = row[13] ? JSON.parse(row[13]) : null; } catch(e) { obj.certificateConfig = null; } obj.thumbnailUrl = row[14] || ""; obj.enableTicketScanner = row[15] === true || row[15] === "TRUE"; obj.mapUrl = row[16] || ""; obj.groupLink = row[18] || ""; obj.certificateSlideId = row[19] || ""; return obj; }); }
function createEvent(data) { var sheet = _getSheet("Events"); var id = Utilities.getUuid(); var bannerUrl = ""; var thumbnailUrl = ""; var folder = _getAdminFolder(); if (data.bannerBase64) { try { var blob = Utilities.newBlob(Utilities.base64Decode(data.bannerBase64), "image/jpeg", "banner_" + id); bannerUrl = "https://lh3.googleusercontent.com/d/" + folder.createFile(blob).getId(); } catch (e) { } } if (data.thumbnailBase64) { try { var blob = Utilities.newBlob(Utilities.base64Decode(data.thumbnailBase64), "image/jpeg", "thumb_" + id); thumbnailUrl = "https://lh3.googleusercontent.com/d/" + folder.createFile(blob).getId(); } catch (e) { } } var isOpen = (data.status === 'OPEN' || data.status === 'EXTENDED'); sheet.appendRow([ id, data.title, data.description, data.date, data.time, data.location, data.price, data.category, bannerUrl, data.maxParticipants, 0, isOpen, "[]", "{}", thumbnailUrl, data.enableTicketScanner, data.mapUrl || "", data.status || "OPEN", data.groupLink || "", data.certificateSlideId || "" ]); return { id: id }; }
function updateEvent(data) { var sheet = _getSheet("Events"); var rows = sheet.getDataRange().getValues(); for (var i = 1; i < rows.length; i++) { if (rows[i][0] == data.id) { var bannerUrl = rows[i][8]; var thumbnailUrl = rows[i][14] || ""; var folder = _getAdminFolder(); if (data.bannerBase64) { try { var blob = Utilities.newBlob(Utilities.base64Decode(data.bannerBase64), "image/jpeg", "banner_" + data.id + "_" + new Date().getTime()); bannerUrl = "https://lh3.googleusercontent.com/d/" + folder.createFile(blob).getId(); } catch(e) {} } if (data.thumbnailBase64) { try { var blob = Utilities.newBlob(Utilities.base64Decode(data.thumbnailBase64), "image/jpeg", "thumb_" + data.id + "_" + new Date().getTime()); thumbnailUrl = "https://lh3.googleusercontent.com/d/" + folder.createFile(blob).getId(); } catch(e) {} } var isOpen = (data.status === 'OPEN' || data.status === 'EXTENDED'); sheet.getRange(i+1, 2).setValue(data.title); sheet.getRange(i+1, 3).setValue(data.description); sheet.getRange(i+1, 4).setValue(data.date); sheet.getRange(i+1, 5).setValue(data.time); sheet.getRange(i+1, 6).setValue(data.location); sheet.getRange(i+1, 7).setValue(data.price); sheet.getRange(i+1, 8).setValue(data.category); sheet.getRange(i+1, 9).setValue(bannerUrl); sheet.getRange(i+1, 10).setValue(data.maxParticipants); sheet.getRange(i+1, 12).setValue(isOpen); sheet.getRange(i+1, 15).setValue(thumbnailUrl); var maxCols = sheet.getLastColumn(); if (maxCols < 20) sheet.insertColumnsAfter(maxCols, 20 - maxCols); sheet.getRange(i+1, 16).setValue(data.enableTicketScanner); sheet.getRange(i+1, 17).setValue(data.mapUrl || ""); sheet.getRange(i+1, 18).setValue(data.status || "OPEN"); sheet.getRange(i+1, 19).setValue(data.groupLink || ""); sheet.getRange(i+1, 20).setValue(data.certificateSlideId || ""); return { id: data.id, updated: true }; } } throw new Error("Event not found for update"); }
function deleteEvent(data) { var sheet = _getSheet("Events"); var rows = sheet.getDataRange().getValues(); for (var i = 1; i < rows.length; i++) { if (rows[i][0] == data.id) { sheet.deleteRow(i + 1); return { deleted: true }; } } throw new Error("Event not found"); }
function toggleEventStatus(data) { var sheet = _getSheet("Events"); var rows = sheet.getDataRange().getValues(); for (var i = 1; i < rows.length; i++) { if (rows[i][0] == data.id) { var currentStatus = rows[i][17] || "OPEN"; var newStatus = (currentStatus === 'CLOSED') ? 'OPEN' : 'CLOSED'; var newIsOpen = (newStatus === 'OPEN'); sheet.getRange(i + 1, 12).setValue(newIsOpen); sheet.getRange(i + 1, 18).setValue(newStatus); return { id: data.id, isOpen: newIsOpen, status: newStatus }; } } throw new Error("Event not found"); }
function registerEventParticipant(data) { var eSheet = _getSheet("Events"); var rSheet = _getSheet("Registrations"); var events = eSheet.getDataRange().getValues(); var eventRowIndex = -1; var eventTitle = ""; var maxParticipants = 0; var eventStatus = "OPEN"; for(var i=1; i<events.length; i++) { if(events[i][0] == data.eventId) { eventRowIndex = i; eventTitle = events[i][1]; maxParticipants = Number(events[i][9]) || 0; eventStatus = events[i][17] || (events[i][11] ? "OPEN" : "CLOSED"); break; } } if (eventRowIndex == -1) throw new Error("Event not found"); if (eventStatus === 'CLOSED' || eventStatus === 'COMING_SOON') throw new Error("Pendaftaran acara ini sedang ditutup atau belum dibuka."); var rRows = rSheet.getDataRange().getValues(); var currentRealCount = 0; var emailExists = false; if (rRows.length > 1) { for(var i=1; i<rRows.length; i++) { if(rRows[i][1] == data.eventId) { if (rRows[i][4].toString().toLowerCase() == data.email.toString().toLowerCase()) emailExists = true; if (rRows[i][6] !== 'REJECTED') currentRealCount++; } } } if (emailExists) throw new Error("Email ini sudah terdaftar untuk acara tersebut."); if (currentRealCount >= maxParticipants) throw new Error("Mohon maaf, kuota peserta sudah penuh."); var proofUrl = ""; var userFolder = _getUserFolder(); if (data.proofBase64) { try { var blob = Utilities.newBlob(Utilities.base64Decode(data.proofBase64.split(',')[1] || data.proofBase64), "image/jpeg", "proof_" + data.email); proofUrl = userFolder.createFile(blob).getUrl(); } catch(e) {} } var finalCustomData = {}; if (data.customData) { try { var rawData = data.customData; Object.keys(rawData).forEach(function(key) { var val = rawData[key]; if (val && typeof val === 'object' && val.isCustomFile && val.data) { try { var fileBlob = Utilities.newBlob(Utilities.base64Decode(val.data), val.mimeType || "application/octet-stream", "file_" + val.fileName); var uploadedFile = userFolder.createFile(fileBlob); uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); finalCustomData[key] = uploadedFile.getUrl(); } catch (fileErr) { finalCustomData[key] = "Error Uploading File: " + val.fileName; } } else { finalCustomData[key] = val; } }); } catch (e) { finalCustomData = data.customData; } } var customDataJson = JSON.stringify(finalCustomData); rSheet.appendRow([Utilities.getUuid(), data.eventId, eventTitle, data.name, data.email, proofUrl, "PENDING", new Date().toISOString(), customDataJson, "NOT_USED", ""]); var body = `<p>Halo <strong>${data.name}</strong>, 👋</p><p>Terima kasih telah mendaftar di acara <strong>"${eventTitle}"</strong>.</p><p>Data pendaftaran dan bukti pembayaran Anda telah kami terima. Tim kami sedang melakukan verifikasi.</p><p>Mohon cek email Anda secara berkala untuk info selanjutnya.</p>`; _sendBrandedEmail(data.email, "Pendaftaran Diterima", "MENUNGGU VERIFIKASI", body); return { status: "PENDING" }; }
function getRegistrations() { var sheet = _getSheet("Registrations"); var rows = sheet.getDataRange().getValues(); if (rows.length <= 1) return []; return rows.slice(1).map(function(row) { return { id: row[0], eventId: row[1], eventTitle: row[2], userName: row[3], userEmail: row[4], proofUrl: row[5], status: row[6], registrationDate: row[7], customData: row[8], checkInStatus: row[9] || "NOT_USED", checkInTime: row[10] || "" }; }); }
function getRegistration(data) { var rSheet = _getSheet("Registrations"); var rRows = rSheet.getDataRange().getValues(); var reg = null; for(var i=1; i<rRows.length; i++) { if(rRows[i][0] == data.id) { reg = { id: rRows[i][0], eventId: rRows[i][1], eventTitle: rRows[i][2], userName: rRows[i][3], userEmail: rRows[i][4], status: rRows[i][6], registrationDate: rRows[i][7], customData: rRows[i][8], checkInStatus: rRows[i][9] || "NOT_USED", checkInTime: rRows[i][10] || "" }; break; } } if (!reg) throw new Error("Pendaftaran tidak ditemukan."); var eSheet = _getSheet("Events"); var eRows = eSheet.getDataRange().getValues(); var certConfig = null; for(var j=1; j<eRows.length; j++) { if(eRows[j][0] == reg.eventId) { try { certConfig = eRows[j][13] ? JSON.parse(eRows[j][13]) : null; } catch(e) {} break; } } return { registration: reg, certificateConfig: certConfig }; }
function validateTicket(data) { var ticketId = data.ticketId; var eventId = data.eventId; if (!ticketId || !eventId) throw new Error("Data scan tidak lengkap."); var eSheet = _getSheet("Events"); var eRows = eSheet.getDataRange().getValues(); var eventActive = false; var eventName = ""; for(var i=1; i<eRows.length; i++) { if(eRows[i][0] == eventId) { var isOpen = (eRows[i][11] === true || String(eRows[i][11]).toUpperCase() === "TRUE"); if (isOpen) { eventActive = true; eventName = eRows[i][1]; } break; } } if (!eventActive) throw new Error("Link scan tidak valid atau Event sudah ditutup/selesai."); var rSheet = _getSheet("Registrations"); var rRows = rSheet.getDataRange().getValues(); var foundIndex = -1; for(var i=1; i<rRows.length; i++) { if (rRows[i][0] == ticketId) { foundIndex = i; break; } } if (foundIndex === -1) throw new Error("Tiket tidak ditemukan dalam database."); var row = rRows[foundIndex]; if (row[1] != eventId) throw new Error("Tiket ini bukan untuk acara ini (" + eventName + ")."); if (row[6] !== "APPROVED") throw new Error("Status tiket belum disetujui (Status: " + row[6] + ")."); if (row[9] === "CHECKED_IN") throw new Error("Tiket SUDAH DIPAKAI pada " + new Date(row[10]).toLocaleString()); var now = new Date().toISOString(); rSheet.getRange(foundIndex + 1, 10).setValue("CHECKED_IN"); rSheet.getRange(foundIndex + 1, 11).setValue(now); var logSheet = _getSheet("ScanLogs"); logSheet.appendRow([ now, ticketId, eventId, eventName, row[3], row[4] ]); return { success: true, participantName: row[3], eventName: row[2], checkInTime: now }; }
function exportParticipants(data) { var eventId = data.eventId; var rSheet = _getSheet("Registrations"); var rRows = rSheet.getDataRange().getValues(); var headers = ["No", "ID Pendaftaran", "Nama Peserta", "Email", "Acara", "Tanggal Beli", "Status", "Check-In", "Waktu Check-In"]; var customKeys = new Set(); var filteredRows = []; for(var i=1; i<rRows.length; i++) { if (eventId === 'ALL' || rRows[i][1] == eventId) { filteredRows.push(rRows[i]); try { var cData = JSON.parse(rRows[i][8] || "{}"); Object.keys(cData).forEach(function(k) { customKeys.add(k); }); } catch(e) {} } } var customKeysArray = Array.from(customKeys); headers = headers.concat(customKeysArray); function escapeCsv(val) { if (val === null || val === undefined) return ""; var str = String(val); if (str.search(/("|,|\n)/g) >= 0) { str = '"' + str.replace(/"/g, '""') + '"'; } return str; } var csvContent = headers.map(escapeCsv).join(",") + "\n"; filteredRows.forEach(function(row, index) { var line = [ index + 1, row[0], row[3], row[4], row[2], new Date(row[7]).toLocaleDateString(), row[6], row[9] || "NOT_USED", row[10] ? new Date(row[10]).toLocaleString() : "-" ]; var cData = {}; try { cData = JSON.parse(row[8] || "{}"); } catch(e) {} customKeysArray.forEach(function(key) { var val = cData[key] || "-"; line.push(val); }); csvContent += line.map(escapeCsv).join(",") + "\n"; }); return { csv: Utilities.base64Encode(csvContent, Utilities.Charset.UTF_8), filename: "Export_Peserta_" + new Date().getTime() + ".csv" }; }
function updateRegistrationStatus(data) { var sheet = _getSheet("Registrations"); var rows = sheet.getDataRange().getValues(); for (var i = 1; i < rows.length; i++) { if (rows[i][0] == data.id) { sheet.getRange(i + 1, 7).setValue(data.status); var email = rows[i][4]; var name = rows[i][3]; var evtTitle = rows[i][2]; var isApproved = data.status === 'APPROVED'; var statusTitle = isApproved ? 'PENDAFTARAN DISETUJUI' : 'PENDAFTARAN DITOLAK'; var body = ""; if (isApproved) { var baseUrl = data.baseUrl || "https://bisdig.upy.ac.id/hmp/"; var cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl; var ticketLink = cleanBaseUrl + "/#/ticket-view/" + data.id; body = `<p>Halo <strong>${name}</strong>,</p><p>Selamat! Pembayaran Anda telah kami verifikasi.</p><p>Tiket Anda untuk acara <strong>"${evtTitle}"</strong> sekarang berstatus <strong>VALID</strong>.</p><p>Klik tombol di bawah ini untuk melihat dan mengunduh E-Ticket Anda:</p>${_generateEmailButton(ticketLink, "LIHAT E-TICKET SAYA")}<br/><p style="font-size:12px; color:gray;">Atau login ke dashboard jika Anda memiliki akun.</p><p>Sampai jumpa di acara!</p>`; } else { body = `<p>Halo <strong>${name}</strong>,</p><p>Mohon maaf, pendaftaran Anda untuk acara <strong>"${evtTitle}"</strong> belum dapat kami setujui.</p><p>Hal ini mungkin disebabkan karena bukti pembayaran tidak valid atau kuota telah penuh.</p><p>Silakan hubungi admin kami jika Anda merasa ini adalah kesalahan.</p>`; } try { _sendBrandedEmail(email, "Status Tiket Event", statusTitle, body); } catch(e){} return { status: data.status }; } } throw new Error("Registration not found"); }
function generateSlideCertificate(data) { var regId = data.id; if (!regId) throw new Error("ID Registrasi diperlukan."); var rSheet = _getSheet("Registrations"); var rRows = rSheet.getDataRange().getValues(); var reg = null; for(var i=1; i<rRows.length; i++) { if(rRows[i][0] == regId) { reg = { id: rRows[i][0], eventId: rRows[i][1], eventTitle: rRows[i][2], name: rRows[i][3], date: rRows[i][7] }; break; } } if (!reg) throw new Error("Data registrasi tidak ditemukan."); var eSheet = _getSheet("Events"); var eRows = eSheet.getDataRange().getValues(); var slideId = ""; var eventCategory = "Event"; var eventDateStr = ""; for(var j=1; j<eRows.length; j++) { if(eRows[j][0] == reg.eventId) { slideId = eRows[j][19]; eventCategory = eRows[j][7]; var d = eRows[j][3]; if (d) eventDateStr = new Date(d).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}); break; } } if (!slideId) throw new Error("Template Sertifikat (Google Slide) belum diatur untuk acara ini. Hubungi Admin."); try { var templateFile = DriveApp.getFileById(slideId); var tempFolder = _getAdminFolder(); var tempFile = templateFile.makeCopy("TEMP_CERT_" + reg.id, tempFolder); var tempId = tempFile.getId(); var presentation = SlidesApp.openById(tempId); presentation.replaceAllText("{{nama}}", reg.name.toUpperCase()); presentation.replaceAllText("{{event}}", reg.eventTitle); presentation.replaceAllText("{{kategori}}", eventCategory); presentation.replaceAllText("{{tanggal}}", eventDateStr); presentation.replaceAllText("{{id}}", reg.id.substring(0,8)); presentation.saveAndClose(); var pdfBlob = tempFile.getAs(MimeType.PDF); var base64 = Utilities.base64Encode(pdfBlob.getBytes()); tempFile.setTrashed(true); return { pdfBase64: base64, filename: "Sertifikat-" + reg.name.replace(/[^a-z0-9]/gi, '_') + ".pdf" }; } catch(e) { throw new Error(e.message); } }
function sendCertificate(data) { var sheet = _getSheet("Registrations"); var rows = sheet.getDataRange().getValues(); var baseUrl = data.baseUrl || "https://bisdig.upy.ac.id/hmp/"; var cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl; var certLink = cleanBaseUrl + "/#/certificate/" + data.id; for(var i=1; i<rows.length; i++) { if(rows[i][0] == data.id) { var name = rows[i][3]; var evtTitle = rows[i][2]; var body = `<p>Halo <strong>${name}</strong>,</p><p>Terima kasih telah berpartisipasi dalam acara <strong>"${evtTitle}"</strong>.</p><p>Sertifikat Anda telah terbit dan siap diunduh.</p>${_generateEmailButton(certLink, "DOWNLOAD SERTIFIKAT")}`; _sendBrandedEmail(rows[i][4], "Sertifikat Acara Telah Terbit", "E-SERTIFIKAT", body); return { sent: true }; } } throw new Error("Not found"); }
function sendBulkCertificates(data) { var sheet = _getSheet("Registrations"); var rows = sheet.getDataRange().getValues(); var idsToProcess = data.ids || []; var successCount = 0; var failCount = 0; var idMap = {}; var baseUrl = data.baseUrl || "https://bisdig.upy.ac.id/hmp/"; var cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl; for(var i=1; i<rows.length; i++) { idMap[rows[i][0]] = i; } idsToProcess.forEach(function(id) { var rowIndex = idMap[id]; if(rowIndex) { var row = rows[rowIndex]; if(row[6] === 'APPROVED') { try { var certLink = cleanBaseUrl + "/#/certificate/" + id; var body = `<p>Sertifikat Anda:</p>${_generateEmailButton(certLink, "DOWNLOAD SERTIFIKAT")}`; _sendBrandedEmail(row[4], "Sertifikat Acara Telah Terbit", "SERTIFIKAT", body); successCount++; } catch(e) { failCount++; } } } }); return { sent: successCount, failed: failCount }; }
function savePaymentSettings(data) { var ss = _getDb(); var sheet = ss.getSheetByName("Settings"); if (!sheet) { sheet = ss.insertSheet("Settings"); sheet.appendRow(["Key", "Value"]); } var qrisUrl = data.currentQrisUrl || ""; if (data.qrisBase64) { try { var folder = _getAdminFolder(); var blob = Utilities.newBlob(Utilities.base64Decode(data.qrisBase64), "image/jpeg", "qris_master"); var file = folder.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); qrisUrl = "https://lh3.googleusercontent.com/d/" + file.getId(); } catch(e) {} } var setSetting = function(key, val) { var data = sheet.getDataRange().getValues(); for(var i=0; i<data.length; i++) { if(data[i][0] == key) { sheet.getRange(i+1, 2).setValue(val); return; } } sheet.appendRow([key, val]); }; setSetting("BANK_ACCOUNTS_JSON", JSON.stringify(data.bankAccounts || [])); setSetting("QRIS_URL", qrisUrl); return { success: true, qrisUrl: qrisUrl }; }
function getPaymentSettings() { var sheet = _getSheet("Settings"); if (!sheet) return { bankAccounts: [], qrisUrl: "" }; var data = sheet.getDataRange().getValues(); var settings = {}; data.forEach(function(r) { settings[r[0]] = r[1]; }); var bankAccounts = []; if (settings["BANK_ACCOUNTS_JSON"]) { try { bankAccounts = JSON.parse(settings["BANK_ACCOUNTS_JSON"]); } catch (e) { } } return { bankAccounts: bankAccounts, qrisUrl: settings["QRIS_URL"] || "" }; }
function saveCertificateSettings(data) { var ss = _getDb(); var sheet = ss.getSheetByName("Settings"); var templateUrl = data.backgroundUrl || ""; if (data.templateBase64) { try { var folder = _getAdminFolder(); var blob = Utilities.newBlob(Utilities.base64Decode(data.templateBase64), "image/png", "cert_default_" + new Date().getTime()); var file = folder.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); templateUrl = "https://lh3.googleusercontent.com/d/" + file.getId(); } catch(e) {} } var setSetting = function(key, val) { var rows = sheet.getDataRange().getValues(); for(var i=0; i<rows.length; i++) { if(rows[i][0] == key) { sheet.getRange(i+1, 2).setValue(val); return; } } sheet.appendRow([key, val]); }; setSetting("CERT_TEMPLATE_URL", templateUrl); setSetting("CERT_ELEMENTS_JSON", JSON.stringify(data.elements || [])); return { success: true, templateUrl: templateUrl }; }
function getCertificateSettings() { var sheet = _getSheet("Settings"); var data = sheet.getDataRange().getValues(); var s = {}; data.forEach(function(r) { s[r[0]] = r[1]; }); var elements = []; if (s["CERT_ELEMENTS_JSON"]) { try { elements = JSON.parse(s["CERT_ELEMENTS_JSON"]); } catch(e) {} } return { backgroundUrl: s["CERT_TEMPLATE_URL"] || "", elements: elements, csvDataUrl: s["CERT_CSV_DATA_URL"] || "" }; }

// --- DATABASE AUTO-DISCOVERY & INIT (REVISED) ---
function _getDb() { 
  // 1. Cek Manual Hardcode (Prioritas Tertinggi)
  if (MANUAL_DB_ID) {
    try { 
      return SpreadsheetApp.openById(MANUAL_DB_ID); 
    } catch(e) {
      console.error("MANUAL_DB_ID tidak valid: " + e.toString());
    }
  }

  // 2. Smart Discovery: Cari file database LAMA yang SUDAH ADA DATA
  // Ini menghindari sistem membuat database baru yang kosong jika yang lama tidak langsung ketemu
  var files = DriveApp.getFilesByName("EventHorizon_DB");
  var candidates = [];
  while (files.hasNext()) {
    candidates.push(files.next());
  }

  if (candidates.length > 0) {
    // Jika ada lebih dari 1 file dengan nama sama, cari yang sheet 'Events'-nya > 1 baris (ada data)
    for (var i = 0; i < candidates.length; i++) {
      try {
        var ss = SpreadsheetApp.open(candidates[i]);
        var sheet = ss.getSheetByName("Events");
        if (sheet && sheet.getLastRow() > 1) { 
           // KETEMU! Ini database lama yang berisi data. Pakai ini.
           SCRIPT_PROP.setProperty("DB_ID", ss.getId());
           return ss;
        }
      } catch(e) { continue; }
    }
    
    // Jika semua kosong, pakai saja yang pertama ditemukan
    var bestSS = SpreadsheetApp.open(candidates[0]);
    SCRIPT_PROP.setProperty("DB_ID", bestSS.getId());
    return bestSS;
  }

  // 3. Jika benar-benar tidak ada file sama sekali, baru buat baru
  var ss = SpreadsheetApp.create("EventHorizon_DB"); 
  SCRIPT_PROP.setProperty("DB_ID", ss.getId()); 
  _initDbIfNeeded(ss);
  
  return ss; 
}

function _getSheet(name) { var ss = _getDb(); var s = ss.getSheetByName(name); if(!s) { _initDbIfNeeded(ss); s = ss.getSheetByName(name); } return s; }

function _initDbIfNeeded(optionalSS) {
  var ss = optionalSS || _getDb();
  
  if(!ss.getSheetByName("Events")) {
    ss.insertSheet("Events").appendRow(["id","title","desc","date","time","loc","price","cat","banner","max","cur","isOpen","formFields","certificateConfig","thumbnail","enableTicketScanner","mapUrl", "status", "groupLink", "certificateSlideId"]);
  } else {
    var eSheet = ss.getSheetByName("Events");
    var lastCol = eSheet.getLastColumn();
    if (lastCol < 19) eSheet.getRange(1, 19).setValue("groupLink");
    if (lastCol < 20) eSheet.getRange(1, 20).setValue("certificateSlideId");
  }
  
  if(!ss.getSheetByName("Registrations")) {
    ss.insertSheet("Registrations").appendRow(["id","eventId","evtTitle","name","email","proof","status","date","customData","checkInStatus","checkInTime"]);
  }
  
  if(!ss.getSheetByName("ScanLogs")) {
    ss.insertSheet("ScanLogs").appendRow(["Timestamp", "Ticket ID", "Event ID", "Event Name", "Participant Name", "Email"]);
  }
  
  if(!ss.getSheetByName("Users")) ss.insertSheet("Users").appendRow(["id","email","pass","name","date"]);
  if(!ss.getSheetByName("Settings")) ss.insertSheet("Settings").appendRow(["Key", "Value"]);
}

function _getMasterFolder() { var id = SCRIPT_PROP.getProperty("MASTER_FOLDER_ID"); if (id) { try { return DriveApp.getFolderById(id); } catch(e) {} } var f = DriveApp.createFolder("EventHorizon_Master"); f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); SCRIPT_PROP.setProperty("MASTER_FOLDER_ID", f.getId()); return f; }
function _getAdminFolder() { var master = _getMasterFolder(); var folders = master.getFoldersByName("Admin_Assets"); if (folders.hasNext()) return folders.next(); var f = master.createFolder("Admin_Assets"); f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); return f; }
function _getUserFolder() { var master = _getMasterFolder(); var folders = master.getFoldersByName("User_Uploads"); if (folders.hasNext()) return folders.next(); var f = master.createFolder("User_Uploads"); f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); return f; }
