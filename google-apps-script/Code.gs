const SHEET_NAME = 'EX RECYCLING BIN';
const HEADERS = ['投稿時間', '匿名內容', '狀態', 'TRUE/FAKE', '已使用', '投稿ID', '客戶端時間', 'User Agent'];

function doGet() {
  return json_({ ok: true, service: '1884 EX RECYCLING BIN' });
}

function doPost(e) {
  try {
    const data = parsePayload_(e);
    const text = String(data.text || '').trim();
    if (!text) return json_({ ok: false, error: 'EMPTY_TEXT' });
    if (text.length > 300) return json_({ ok: false, error: 'TEXT_TOO_LONG' });

    const sheet = getSheet_();
    const submissionId = String(data.submissionId || Utilities.getUuid());

    if (isDuplicate_(sheet, submissionId)) {
      return json_({ ok: true, duplicate: true, submissionId: submissionId });
    }

    sheet.appendRow([
      new Date(),
      text,
      '未使用',
      '',
      '否',
      submissionId,
      String(data.clientTime || ''),
      String(data.userAgent || '')
    ]);

    return json_({ ok: true, submissionId: submissionId });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setColumnWidth(1, 165);
    sheet.setColumnWidth(2, 520);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 100);
    sheet.setColumnWidth(5, 90);
    sheet.setColumnWidth(6, 260);
    sheet.setColumnWidth(7, 180);
    sheet.setColumnWidth(8, 360);
  }
  return sheet;
}

function isDuplicate_(sheet, submissionId) {
  if (!submissionId || sheet.getLastRow() < 2) return false;
  const values = sheet.getRange(2, 6, sheet.getLastRow() - 1, 1).getDisplayValues();
  return values.some(row => row[0] === submissionId);
}

function parsePayload_(e) {
  if (!e) return {};
  if (e.postData && e.postData.contents) {
    const raw = e.postData.contents;
    try { return JSON.parse(raw); } catch (_) {}
  }
  return e.parameter || {};
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
