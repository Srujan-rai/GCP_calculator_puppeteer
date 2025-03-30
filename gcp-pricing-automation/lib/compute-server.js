const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.use(express.json());

app.post('/compute', async (req, res) => {
  const row = req.body;
  const mode = process.env.MODE || 'default';
  const sl = row.Sl;

  console.log(`🚀 [${mode.toUpperCase()}] Computing for Sl ${sl}`);

  // Launch browser instance
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://example.com'); // Use actual GCP pricing URL here

  // Simulate delay for mock
  await new Promise(resolve => setTimeout(resolve, 500));

  await browser.close();

  res.json({
    price: `$${(Math.random() * 100).toFixed(2)}`,
    url: `https://dummy-cost-url.com/${mode}/sl-${sl}`,
    machineType: row['Machine Type'] || 'n1-standard-1',
    specs: '2 vCPUs, 8 GB RAM'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🧠 Compute server for ${process.env.MODE} running on port ${PORT}`);
});
