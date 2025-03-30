const path = require('path');
const fs = require('fs');

const { GoogleSpreadsheet } = require('google-spreadsheet');

console.log('✅ google-spreadsheet version check:', typeof GoogleSpreadsheet.prototype.useServiceAccountAuth);

// 🔧 Environment Inputs
const SHEET_URL = process.env.SHEET_URL;
const TEMP_DIR = path.resolve(__dirname, '../tmp');
const SHEET_DUMP_FILE = path.join(TEMP_DIR, 'compute-engine.json');

const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../assets/presales-infra-mod-42a0bcd6a896.json');
const SERVICE_ACCOUNT = require(SERVICE_ACCOUNT_PATH);

// 🚫 Exit if missing input
if (!SHEET_URL) {
  console.error('❌ SHEET_URL is not defined.');
  process.exit(1);
}

// 🔍 Extract Google Sheet ID from URL
function extractSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || null;
}

// 📄 Read rows from Google Sheet
async function getRowsFromSheet(sheetId, sheetTitle = 'ComputeEngine') {
  const doc = new GoogleSpreadsheet(sheetId);
  await doc.useServiceAccountAuth({
    client_email: SERVICE_ACCOUNT.client_email,
    private_key: SERVICE_ACCOUNT.private_key,
  });
  await doc.loadInfo();
  console.log('📄 Loaded sheet:', sheetTitle);

  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) throw new Error(`❌ Sheet "${sheetTitle}" not found.`);

  const rows = await sheet.getRows();
  return rows.map((row, idx) => {
    const data = row._rawData.reduce((obj, val, colIdx) => {
      const header = sheet.headerValues[colIdx];
      obj[header] = val;
      return obj;
    }, {});
    data.Sl = idx + 1; // Add Sl number
    return data;
  });
}

// 🚀 Main Runner
(async () => {
  try {
    const sheetId = extractSheetId(SHEET_URL);
    if (!sheetId) throw new Error('❌ Invalid Google Sheet URL');

    console.log('📥 Fetching data from sheet...');
    const rows = await getRowsFromSheet(sheetId);

    if (!rows.length) throw new Error('❌ No rows found in ComputeEngine tab');

    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);
    fs.writeFileSync(SHEET_DUMP_FILE, JSON.stringify(rows, null, 2));
    console.log(`📦 Sheet data saved to: ${SHEET_DUMP_FILE}`);
  } catch (err) {
    console.error('❌ run-compute.js failed:', err.message);
  }
})();
