/**
 * Waleema Ceremony RSVP: saves each invitation response into this Google Sheet.
 *
 * How to use: see README.md, section 1. In short:
 *   1. Paste this whole file into Extensions > Apps Script (replace the default code).
 *   2. Run the "setup" function once and approve the permissions.
 *   3. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 *   4. Copy the Web app URL into config.js on the website.
 */

var SHEET_NAME   = 'RSVPs';
var SUMMARY_NAME = 'Summary';
var TIMEZONE     = 'Asia/Colombo';
var MAX_GUESTS   = 20;

var HEADERS = [
  'Received (Sri Lanka time)', // A
  'Full name',                 // B
  'Phone / WhatsApp',          // C
  'Attending',                 // D  Yes / No
  'Guests',                    // E  0 when not attending
  'Message',                   // F
  'Ref'                        // G  hidden; stops a double tap from adding a row twice
];

/** Run this once from the editor. Creates the RSVPs and Summary tabs. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  getSheet_(ss);
  setupSummary_(ss);
  SpreadsheetApp.flush();
}

/** Receives a response from the invitation page. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    var d = JSON.parse(raw);

    // Honeypot: real guests never fill this hidden field.
    if (d.website) return json_({ ok: true });

    var name = clean_(d.name, 80);
    if (!name) return json_({ ok: false, error: 'name_required' });

    var attending = d.attending === 'Yes' ? 'Yes' : (d.attending === 'No' ? 'No' : '');
    if (!attending) return json_({ ok: false, error: 'attending_required' });

    var guests = 0;
    if (attending === 'Yes') {
      guests = Math.round(Number(d.guests));
      if (!(guests >= 1)) guests = 1;
      if (guests > MAX_GUESTS) guests = MAX_GUESTS;
    }

    var phone   = clean_(d.phone, 24);
    var message = clean_(d.message, 400);
    var ref     = clean_(d.ref, 40);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getSheet_(ss);

    // The page may resend the same response if the first reply was unreadable. Ignore repeats.
    if (ref && sheet.getLastRow() > 1) {
      var hit = sheet.getRange(2, 7, sheet.getLastRow() - 1, 1)
        .createTextFinder(ref).matchEntireCell(true).findNext();
      if (hit) return json_({ ok: true, duplicate: true });
    }

    sheet.appendRow([
      Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      name, phone, attending, guests, message, ref
    ]);
    return json_({ ok: true });

  } catch (err) {
    return json_({ ok: false, error: 'server_error' });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/** Opening the web app URL in a browser shows this, so you can confirm it is live. */
function doGet() {
  return json_({ ok: true, service: 'Waleema RSVP' });
}

/* ------------------------------ helpers ------------------------------ */

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().substring(0, max);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME, 0);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold')
      .setBackground('#0a1330')
      .setFontColor('#ecd283')
      .setVerticalAlignment('middle');
    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 34);

    // Plain text columns keep phone numbers' leading 0 and stop typed "=" being read as a formula.
    sheet.getRange('A:D').setNumberFormat('@');
    sheet.getRange('F:G').setNumberFormat('@');
    sheet.getRange('E:E').setNumberFormat('0');

    sheet.setColumnWidth(1, 170);
    sheet.setColumnWidth(2, 210);
    sheet.setColumnWidth(3, 150);
    sheet.setColumnWidth(4, 90);
    sheet.setColumnWidth(5, 70);
    sheet.setColumnWidth(6, 360);
    sheet.getRange('F:F').setWrap(true);
    sheet.getRange('A2:G').setVerticalAlignment('top');
    sheet.hideColumns(7);

    // Green for Yes, grey for No.
    var range = sheet.getRange('D2:D');
    sheet.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Yes')
        .setBackground('#dcebd5').setFontColor('#2f5a28').setRanges([range]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('No')
        .setBackground('#ececec').setFontColor('#555555').setRanges([range]).build()
    ]);
  }
  return sheet;
}

function setupSummary_(ss) {
  var s = ss.getSheetByName(SUMMARY_NAME);
  if (!s) s = ss.insertSheet(SUMMARY_NAME);
  s.clear();
  s.getRange('A1').setValue('Waleema Ceremony: RSVP summary')
    .setFontWeight('bold').setFontSize(14);
  s.getRange('A3:B6').setValues([
    ['Responses received',        '=COUNTA(RSVPs!B2:B)'],
    ['Replied yes',               '=COUNTIF(RSVPs!D2:D,"Yes")'],
    ['Replied no',                '=COUNTIF(RSVPs!D2:D,"No")'],
    ['Total guests attending',    '=SUMIF(RSVPs!D2:D,"Yes",RSVPs!E2:E)']
  ]);
  s.getRange('B3:B6').setFontWeight('bold').setHorizontalAlignment('left');
  s.setColumnWidth(1, 230);
  s.setColumnWidth(2, 90);
}
