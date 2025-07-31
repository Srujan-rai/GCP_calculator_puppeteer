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
      console.log(rowWithMeta);
    
      console.log(`[validate-and-run.js] 🚀 Sending Sl ${row.Sl} to compute containers...`);
    
      const resultObj = { Sl: row.Sl, timestamp: new Date().toISOString() };
    
      const machineClass = row["Machine Class"]?.toLowerCase(); 
      const series = row["Series"]?.toUpperCase();  
      const hours = parseFloat(row["Avg no. of hrs"] || 0);

      console.log(` hours: ${hours}`);
      console.log(` machineClass: ${machineClass}`);
      console.log(` series: ${series}`);
    
      if (machineClass === 'preemptible') {
        const ondemand = await sendToComputeContainer('ondemand', { ...rowWithMeta, mode: 'ondemand' });
        ['sud', '1year', '3year'].forEach(mode => {
          resultObj[`${mode}_price`] = ondemand?.price || null;
          resultObj[`${mode}_url`] = ondemand?.url || null;
          resultObj[`${mode}_machineType`] = ondemand?.machineType || null;
          resultObj[`${mode}_specs`] = ondemand?.specs || null;
        });
        resultObj['ondemand_price'] = ondemand?.price || null;
        resultObj['ondemand_url'] = ondemand?.url || null;
        resultObj['ondemand_machineType'] = ondemand?.machineType || null;
        resultObj['ondemand_specs'] = ondemand?.specs || null;
        console.log(`[validate-and-run.js] ✅ Completed compute for Sl ${row.Sl} (preemptible)`);
    
      }

      else if (machineClass === 'regular' && hours < 730) {
        const ondemand = await sendToComputeContainer('ondemand', { ...rowWithMeta, mode: 'ondemand' });
      
        resultObj['ondemand_price'] = ondemand?.price || null;
        resultObj['ondemand_url'] = ondemand?.url || null;
        resultObj['ondemand_machineType'] = ondemand?.machineType || null;
        resultObj['ondemand_specs'] = ondemand?.specs || null;
      
        if (series === 'C2D') {
          // Copy ondemand to sud, 1year, 3year
          ['sud', '1year', '3year'].forEach(mode => {
            resultObj[`${mode}_price`] = ondemand?.price || null;
            resultObj[`${mode}_url`] = ondemand?.url || null;
            resultObj[`${mode}_machineType`] = ondemand?.machineType || null;
            resultObj[`${mode}_specs`] = ondemand?.specs || null;
          });
      
          console.log("C2D detected — copied ondemand to sud, 1year, 3year");
        } else {
          // Call sud
          const sud = await sendToComputeContainer('sud', { ...rowWithMeta, mode: 'sud' });
      
          resultObj['sud_price'] = sud?.price || null;
          resultObj['sud_url'] = sud?.url || null;
          resultObj['sud_machineType'] = sud?.machineType || null;
          resultObj['sud_specs'] = sud?.specs || null;
      
          // Copy sud to 1year and 3year
          ['1year', '3year'].forEach(mode => {
            resultObj[`${mode}_price`] = sud?.price || null;
            resultObj[`${mode}_url`] = sud?.url || null;
            resultObj[`${mode}_machineType`] = sud?.machineType || null;
            resultObj[`${mode}_specs`] = sud?.specs || null;
          });
      
          console.log("Non-C2D — used separate sud and copied it to 1year and 3year");
        }
      }
       
      
      
      else if (series === 'E2' || series === 'C2D') {
        // REGULAR or others with E2 or C2D
        const ondemand = await sendToComputeContainer('ondemand', { ...rowWithMeta, mode: 'ondemand' });
        resultObj['ondemand_price'] = ondemand?.price || null;
        resultObj['ondemand_url'] = ondemand?.url || null;
        resultObj['ondemand_machineType'] = ondemand?.machineType || null;
        resultObj['ondemand_specs'] = ondemand?.specs || null;
    
        // Copy to sud
        resultObj['sud_price'] = ondemand?.price || null;
        resultObj['sud_url'] = ondemand?.url || null;
        resultObj['sud_machineType'] = ondemand?.machineType || null;
        resultObj['sud_specs'] = ondemand?.specs || null;
    
        const [year1, year3] = await Promise.all([
          sendToComputeContainer('1year', { ...rowWithMeta, mode: '1year' }),
          sendToComputeContainer('3year', { ...rowWithMeta, mode: '3year' }),
        ]);
        resultObj['1year_price'] = year1?.price || null;
        resultObj['1year_url'] = year1?.url || null;
        resultObj['1year_machineType'] = year1?.machineType || null;
        resultObj['1year_specs'] = year1?.specs || null;
    
        resultObj['3year_price'] = year3?.price || null;
        resultObj['3year_url'] = year3?.url || null;
        resultObj['3year_machineType'] = year3?.machineType || null;
        resultObj['3year_specs'] = year3?.specs || null;
        console.log(`[validate-and-run.js] ✅ Completed compute for Sl ${row.Sl} (E2 or C2D)`);
    
      } 
      
      else {
        const [sud, ondemand, year1, year3] = await Promise.all(
          ['sud', 'ondemand', '1year', '3year'].map(mode =>
            sendToComputeContainer(mode, { ...rowWithMeta, mode }))
        );
    
        const results = { sud, ondemand, '1year': year1, '3year': year3 };
    
        for (const mode of ['sud', 'ondemand', '1year', '3year']) {
          const result = results[mode];
          resultObj[`${mode}_price`] = result?.price || null;
          resultObj[`${mode}_url`] = result?.url || null;
          resultObj[`${mode}_machineType`] = result?.machineType || null;
          resultObj[`${mode}_specs`] = result?.specs || null;
        }
        console.log(`[validate-and-run.js] ✅ Completed compute for Sl ${row.Sl} (custom or other series)`);
      }
    
      computeResults[row.Sl] = resultObj;
      console.log(`[validate-and-run.js] ✅ Completed compute for Sl ${row.Sl}`);
      console.log(`[validate-and-run.js] ✅ Results: ${JSON.stringify(resultObj, null, 2)}`);
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
          'Sl', 'machineType', 'specs', 'sud_price', 'sud_url',
          'ondemand_price', 'ondemand_url',
          '1year_price', '1year_url',
          '3year_price', '3year_url',
          'timestamp'
      ]
  });

    const defaultSheet = doc.sheetsByTitle['Sheet1'];
    if (defaultSheet) {
    await defaultSheet.delete();
    }


    const resultArray = Object.values(computeResults).map(result => ({
      Sl: result.Sl,
      machineType: result.sud_machineType,
      specs: result.sud_specs,
      sud_price: result.sud_price,
      sud_url: result.sud_url,
      ondemand_price: result.ondemand_price,
      ondemand_url: result.ondemand_url,
      '1year_price': result['1year_price'],
      '1year_url': result['1year_url'],
      '3year_price': result['3year_price'],
      '3year_url': result['3year_url'],
      timestamp: result.timestamp
  }));

    await sheet.addRows(resultArray);

    await makeSheetPublic(doc.spreadsheetId);
    await shareSheetWithEmails(doc.spreadsheetId, emailList);


    

    
    console.log(`[validate-and-run.js] 📎 Sheet URL: https://docs.google.com/spreadsheets/d/${doc.spreadsheetId}`);


    
  } catch (err) {
    console.error('[validate-and-run.js] ❌ Failed:', err.message);
  }
})();