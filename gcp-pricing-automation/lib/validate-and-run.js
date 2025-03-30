const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { standardizeRow } = require('./Standardize-input');

const SHEET_URL = process.env.SHEET_URL;
const TEMP_DIR = path.resolve(__dirname, '../tmp');
const SHEET_DUMP_FILE = path.join(TEMP_DIR, 'compute-engine.json');
const RESULTS_FILE = path.join(TEMP_DIR, 'compute-results.json');
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../assets/presales-infra-mod-42a0bcd6a896.json');
const SERVICE_ACCOUNT = require(SERVICE_ACCOUNT_PATH);

const computeServiceEndpoints = {
  sud: 'http://localhost:4001/compute',
  ondemand: 'http://localhost:4002/compute',
  '1year': 'http://localhost:4003/compute',
  '3year': 'http://localhost:4004/compute',
};

if (!SHEET_URL) {
  console.error('❌ SHEET_URL is not defined.');
  process.exit(1);
}

const { google } = require('googleapis');

async function makeSheetPublic(spreadsheetId) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: SERVICE_ACCOUNT.client_email,
      private_key: SERVICE_ACCOUNT.private_key,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });

  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      role: 'writer',        
      type: 'anyone',
      
    },
  });


  console.log(`[validate-and-run.js] 🌐 Sheet made public: anyone with the link can access it.📎 Sheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
  console.log(`[validate-and-run.js] 📎 Sheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
}


/**
 * @param {string} spreadsheetId - The ID of the spreadsheet to share.
 * @param {string[]} emails - Array of email addresses.
 */
async function shareSheetWithEmails(spreadsheetId, emails = []) {
    // Create a JWT client with proper Drive scopes
    const auth = new google.auth.JWT({
      email: SERVICE_ACCOUNT.client_email,
      key: SERVICE_ACCOUNT.private_key,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });
  
    // Initialize Drive API
    const drive = google.drive({ version: 'v3', auth });
  
    try {
      // First ensure service account has access
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: SERVICE_ACCOUNT.client_email,
        },
        sendNotificationEmail: false,
      });
  
      for (const email of emails) {
        if (!email.includes('@')) {
          console.warn(`Skipping invalid email: ${email}`);
          continue;
        }
  
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            role: 'writer',
            type: 'user',
            emailAddress: email,
          },
          sendNotificationEmail: true,
        });
  
        console.log(`✅ Successfully shared with ${email}`);
      }
    } catch (err) {
      console.error(`❌ Critical error: ${err.message}`);
    }
  }
  


function extractSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || null;
}

async function getRowsFromSheet(sheetId, sheetTitle = 'ComputeEngine') {
  const doc = new GoogleSpreadsheet(sheetId);
  await doc.useServiceAccountAuth({
    client_email: SERVICE_ACCOUNT.client_email,
    private_key: SERVICE_ACCOUNT.private_key,
  });
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[sheetTitle];
  if (!sheet) throw new Error(`❌ Sheet "${sheetTitle}" not found.`);
  const rows = await sheet.getRows();
  return { rows, headers: sheet.headerValues };
}

async function sendToComputeContainer(mode, payload) {
  const endpoint = computeServiceEndpoints[mode];
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.error(`[compute-${mode}] ❌ Failed for Sl ${payload.Sl}`);
    return null;
  }

  return await res.json();
}

(async () => {
  try {
    const sheetId = extractSheetId(SHEET_URL);
    if (!sheetId) throw new Error('❌ Invalid Google Sheet URL');

    console.log('[validate-and-run.js] 📥 Downloading ComputeEngine tab...');
    const { rows, headers } = await getRowsFromSheet(sheetId);

    if (!rows.length) throw new Error('❌ No rows found in ComputeEngine tab');
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

    const requiredFields = ['No. of Instances', 'Datacenter Location', 'OS with version'];
    const finalRows = [];

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const row = {};
      headers.forEach(header => {
        row[header] = rawRow[header];
      });
      row.Sl = i + 1;

      const missingFields = requiredFields.filter(field => !row[field]);
      if (missingFields.length > 0) {
        const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
        console.log(`[validate-and-run.js] ⚠️ Skipping row ${row.Sl}: ${errorMsg}`);
        finalRows.push({ Sl: row.Sl, Error: errorMsg });
        continue;
      }

      const standardized = standardizeRow(row);
      finalRows.push(standardized);
      console.log(`[validate-and-run.js] ✅ Row ${row.Sl} standardized`);
    }

    fs.writeFileSync(SHEET_DUMP_FILE, JSON.stringify(finalRows, null, 2));
    console.log(`[validate-and-run.js] ✅ Processed data saved to: ${SHEET_DUMP_FILE}`);

    const computeResults = {};

    for (let i = 0; i < finalRows.length; i++) {
      const row = finalRows[i];
      if (row.Error) {
        computeResults[row.Sl] = { Sl: row.Sl, Error: row.Error };
        continue;
      }

      const isFirst = i === 0;
      const isLast = i === finalRows.length - 1;
      const rowWithMeta = { ...row, first: isFirst, last: isLast };

      console.log(`[validate-and-run.js] 🚀 Sending Sl ${row.Sl} to all compute containers...`);

      const modes = ['sud', 'ondemand', '1year', '3year'];
      const resultsByMode = await Promise.all(
        modes.map(mode => sendToComputeContainer(mode, { ...rowWithMeta, mode }))
      );

      const resultObj = { Sl: row.Sl, timestamp: new Date().toISOString() };

      for (let j = 0; j < modes.length; j++) {
        const mode = modes[j];
        const result = resultsByMode[j];
        resultObj[`${mode}_price`] = result?.price || null;
        resultObj[`${mode}_url`] = result?.url || null;
        resultObj[`${mode}_machineType`] = result?.machineType || null;
        resultObj[`${mode}_specs`] = result?.specs || null;
      }

      computeResults[row.Sl] = resultObj;
      console.log(`[validate-and-run.js] ✅ Completed compute for Sl ${row.Sl}`);
    }

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(computeResults, null, 2));
    console.log(`[validate-and-run.js] ✅ Results written to ${RESULTS_FILE}`);

    const emailList = process.env.EMAILS?.split(',').map(e => e.trim()).filter(Boolean) || [];

    console.log('[validate-and-run.js] 📤 Creating new Google Sheet to store results...');

    const doc = new GoogleSpreadsheet();
    await doc.useServiceAccountAuth({
      client_email: SERVICE_ACCOUNT.client_email,
      private_key: SERVICE_ACCOUNT.private_key,
    });

    await doc.createNewSpreadsheetDocument({
      title: `GCP Compute Pricing Results - ${new Date().toLocaleString()}`
    });




    const sheet = await doc.addSheet({
        title: "ComputeEngine",
        headerValues: [
      'Sl',
      'sud_price', 'sud_url', 'sud_machineType', 'sud_specs',
      'ondemand_price', 'ondemand_url', 'ondemand_machineType', 'ondemand_specs',
      '1year_price', '1year_url', '1year_machineType', '1year_specs',
      '3year_price', '3year_url', '3year_machineType', '3year_specs',
      'timestamp'
    ] });

    const defaultSheet = doc.sheetsByTitle['Sheet1'];
    if (defaultSheet) {
    await defaultSheet.delete();
    }
    const resultArray = Object.values(computeResults);
    await sheet.addRows(resultArray);

    await makeSheetPublic(doc.spreadsheetId);
    await shareSheetWithEmails(doc.spreadsheetId, emailList);


    

    
    console.log(`[validate-and-run.js] 📎 Sheet URL: https://docs.google.com/spreadsheets/d/${doc.spreadsheetId}`);


    
  } catch (err) {
    console.error('[validate-and-run.js] ❌ Failed:', err.message);
  }
})();