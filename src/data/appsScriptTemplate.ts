export const APPS_SCRIPT_CODE = `// LabTech Nexus LIMS — Google Drive 30TB & Google Sheets Live Database Bridge
const DB_FOLDER_ID = '1N9LPfqraNMpOiT-G7bCKx3ixi19aGY91';
const UPLOADS_FOLDER_ID = '1rFJigHJ3hDf6xC4K1A07zeRRUbkVGCvI';
const SPREADSHEET_ID = '1m_-woyQFFGBuvz7rLFONnnTnWTXkrNIImukiGAJayMY';
const STATE_FILENAME = 'labtech_db_state.json';
const API_SECRET = 'labtech-gdrive-2026';

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (!e || !e.parameter || e.parameter.secret !== API_SECRET) {
    return jsonOut({ ok: false, error: 'Unauthorized' });
  }
  const folder = DriveApp.getFolderById(DB_FOLDER_ID);
  const files = folder.getFilesByName(STATE_FILENAME);
  if (!files.hasNext()) return jsonOut({ ok: true, rev: 0, state: null });
  const file = files.next();
  const parsed = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  const state = parsed && parsed.state ? parsed.state : parsed;
  const rev = (parsed && parsed.rev) ? parsed.rev : file.getLastUpdated().getTime();
  return jsonOut({ ok: true, rev: rev, updatedAt: file.getLastUpdated().toISOString(), state: state });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== API_SECRET) return jsonOut({ ok: false, error: 'Unauthorized' });

    if (body.action === 'uploadBatch' && Array.isArray(body.files)) {
      const folder = DriveApp.getFolderById(UPLOADS_FOLDER_ID);
      const results = body.files.map(function(f) {
        if (f.overwrite && f.fileName) {
          const existing = folder.getFilesByName(f.fileName);
          while (existing.hasNext()) {
            existing.next().setTrashed(true);
          }
        }
        const bytes = Utilities.base64Decode(f.base64Data);
        const blob = Utilities.newBlob(bytes, f.mimeType || 'application/octet-stream', f.fileName);
        const created = folder.createFile(blob);
        return {
          fileName: f.fileName,
          ok: true,
          driveId: created.getId(),
          viewUrl: 'https://drive.google.com/file/d/' + created.getId() + '/view'
        };
      });
      return jsonOut({ ok: true, results: results });
    }

    if (body.action === 'uploadFile') {
      const folder = DriveApp.getFolderById(UPLOADS_FOLDER_ID);
      if (body.overwrite && body.fileName) {
        const existing = folder.getFilesByName(body.fileName);
        while (existing.hasNext()) {
          existing.next().setTrashed(true);
        }
      }
      const bytes = Utilities.base64Decode(body.base64Data);
      const blob = Utilities.newBlob(bytes, body.mimeType || 'application/octet-stream', body.fileName);
      const created = folder.createFile(blob);
      return jsonOut({
        ok: true,
        driveId: created.getId(),
        viewUrl: 'https://drive.google.com/file/d/' + created.getId() + '/view'
      });
    }

    if (body.action === 'saveDb' && body.state) {
      const rev = body.rev || new Date().getTime();
      const updatedAt = new Date().toISOString();
      const folder = DriveApp.getFolderById(DB_FOLDER_ID);
      const files = folder.getFilesByName(STATE_FILENAME);
      const text = JSON.stringify({ rev: rev, updatedAt: updatedAt, state: body.state });
      if (files.hasNext()) {
        files.next().setContent(text);
      } else {
        folder.createFile(STATE_FILENAME, text, MimeType.PLAIN_TEXT);
      }
      syncToSheets(body.state);
      return jsonOut({ ok: true, rev: rev, updatedAt: updatedAt });
    }
    return jsonOut({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function syncToSheets(st) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const eqMap = {};
  (st.equipment || []).forEach(function(e) { eqMap[e.code] = e.name; });

  writeTab(ss, 'Jobs',
    ['Site ID', 'Project No', 'Short Name', 'Scope', 'Client', 'Status', 'Address', 'Remark'],
    (st.jobs || []).map(function(j) {
      return [j.no, j.companyProjNo || '', j.shortName || '', j.scope || '', j.client || '', j.status || '', j.mapAddress || j.site || '', j.remark || ''];
    })
  );

  writeTab(ss, 'Equipment',
    ['Code', 'Name', 'Maker', 'Model', 'S/N', 'Tests', 'Cal Due', 'Cert File', 'Location / Status', 'Borrower', 'Expected Return'],
    (st.equipment || []).map(function(e) {
      return [e.code, e.name, e.maker || '', e.model || '', e.serial || '', e.tests || '', e.certDue || e.due || '', e.certFile || '', e.currentLoan ? ('On Loan: ' + e.currentLoan.siteLocation) : (e.loc || e.store || ''), e.currentLoan ? e.currentLoan.borrowerName : '', e.currentLoan ? e.currentLoan.expectedReturn : ''];
    })
  );

  writeTab(ss, 'Loans_History',
    ['Loan ID', 'Eq Code', 'Eq Name', 'Status', 'Borrower', 'Staff ID', 'Job No', 'Site Location', 'Checkout At', 'Expected Return', 'Checkout Remark', 'Returned At', 'Returned By', 'Return Store', 'Condition', 'Return Remark'],
    (st.loans || []).map(function(l) {
      return [l.id, l.equipmentCode, eqMap[l.equipmentCode] || '', l.returnedAt ? 'Returned' : 'On Loan', l.borrowerName || '', l.borrowerStaffId || '', l.jobNo || '', l.siteLocation || '', l.checkoutAt || '', l.expectedReturn || '', l.remark || '', l.returnedAt || '', l.returnedBy || '', l.returnStore || '', l.returnCondition || '', l.returnRemark || ''];
    })
  );

  writeTab(ss, 'Calendar_Events',
    ['Event ID', 'Date', 'End Date', 'Time', 'Type', 'Test Code', 'Title', 'Site', 'Trainees', 'Instructor', 'Status', 'Notes'],
    (st.events || []).map(function(ev) {
      return [ev.id, ev.date || '', ev.endDate || '', ev.timeSlot || '', ev.type || '', ev.testCode || '', ev.title || '', ev.site || '', (ev.trainees || []).join(', '), ev.instructor || '', ev.status || '', ev.notes || ''];
    })
  );
}

function writeTab(ss, name, headers, rows) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clearContents();
  const all = [headers].concat(rows);
  sh.getRange(1, 1, all.length, headers.length).setValues(all);
}
`;