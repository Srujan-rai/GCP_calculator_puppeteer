const express = require('express');
const puppeteer = require('puppeteer');
const app = express();


app.use(express.json());

app.post('/compute', async (req, res) => {
  const row = req.body;
  const mode = process.env.MODE || 'default';
  const sl = row.Sl;
  const isFirst = row.first;
  const isLast = row.last;


  console.log(`🚀 [${mode.toUpperCase()}] Computing for Sl ${sl}`);
  console.log(`🚀 Row: ${JSON.stringify(row)}`);
  console.log(`🚀 Mode: ${mode}`);
  console.log(`🚀 First: ${isFirst}`);
  console.log(`🚀 Last: ${isLast}`);


  

  const result = await calculatePricing(sl,row, mode,isFirst,isLast);
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🧠 Compute server for ${process.env.MODE} running on port ${PORT}`);
});


/*==========================================================================================*/


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function mainHomePage(page,url) {
  console.log('Navigating to GCP pricing calculator...');
  await page.goto('https://cloud.google.com/products/calculator', {
      waitUntil: 'networkidle2',
      timeout: 45000
  });

  console.log('Page title:', await page.title());

  console.log('Clicking "Add to estimate"...');
  await page.waitForSelector('span[jsname="V67aGc"].UywwFc-vQzf8d', { timeout: 8000 });
  await page.click('span[jsname="V67aGc"].UywwFc-vQzf8d');
}

async function computeEngineModal(page) {
  console.log('Waiting for modal...');
  await sleep(5000); // Consider replacing with `waitForSelector` if modal is dynamic

  console.log('Searching for Compute Engine tile...');
  const clicked = await page.$$eval('div[role="button"]', (tiles) => {
    const tile = tiles.find(el => el.textContent.includes('Compute Engine'));
    if (tile) {
      tile.scrollIntoView({ behavior: 'instant', block: 'center' });
      tile.click();
      return true;
    }
    return false;
  });

  if (clicked) {
    console.log('✅ Compute Engine clicked');
  } else {
    throw new Error('❌ Compute Engine tile not found');
  }
}

async function mainHomePage_2nd(page,url) {
  console.log('Navigating to GCP pricing calculator...');
  await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 45000
  });

  console.log('Page title:', await page.title());
  await page.click('.VVEJ3d');
}

async function clickComputeEngineCard(page) {
  console.log('Waiting for modal...');
  await sleep(5000);
  //await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });

  console.log('Searching for Compute Engine tile...');
  const tiles = await page.$$('div[role="button"]');

  for (const tile of tiles) {
      const text = await tile.evaluate(el => el.textContent);
      if (text.includes('Compute Engine')) {
          console.log('Scrolling into view and clicking...');
          await tile.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
          await tile.evaluate(el => el.click());
          console.log('✅ Compute Engine clicked');
          return;
      }
  }

  throw new Error('❌ Compute Engine tile not found');
}


async function waitForNextSection(page) {
console.log('⏳ Waiting for Compute Engine configuration page to load...');
try {
    await page.waitForSelector('input[aria-label="Name"]', { timeout: 5000, visible: true });
    console.log('✅ Compute Engine config page is ready.');
} catch (error) {
    console.warn('⚠️ Expected Compute Engine input not found. Checking for fallback indicators...');

    // Optional: wait for a known container or other unique section header
    const fallbackSelector = 'div[aria-label="VM instance"]';
    const fallbackVisible = await page.$(fallbackSelector);

    if (fallbackVisible) {
        console.log('✅ Fallback container found. Proceeding with configuration.');
    } else {
        console.warn('❌ Neither primary nor fallback selectors were found. Proceeding anyway...');
    }
}
}


// 🧩 Modular Config Functions (currently empty)

async function configureAdvancedSettings(page) 
{
  console.log(`⏲️ Setting Advance settings`);


  const toggleButtonSelector = 'button[jsname="DMn7nd"][role="switch"]';

  await page.waitForSelector(toggleButtonSelector, { visible: true });

  const isChecked = await page.$eval(toggleButtonSelector, btn => btn.getAttribute('aria-checked') === 'true');

  if (!isChecked) {
      await page.click(toggleButtonSelector);
      console.log('✅ Advance settings Option toggled ON.');
  } else {
      console.log('ℹ️ Advance settings Option was already ON.');
  }
}

  async function setUsageTimeOption(page, hours_per_day) {
      console.log(`⏲️ Setting Usage Time Option based on hours per day: ${hours_per_day}`);

      if (hours_per_day > 0 && hours_per_day < 5) {
          const toggleSelector = 'button[role="switch"][aria-labelledby="ucc-4"]';

          await page.waitForSelector(toggleSelector, { visible: true });

          const isChecked = await page.$eval(toggleSelector, btn => btn.getAttribute('aria-checked') === 'true');

          if (!isChecked) {
              await page.click(toggleSelector);
              console.log('✅ Usage Time Option toggled ON.');
          } else {
              console.log('ℹ️ Usage Time Option already ON.');
          }
      } else {
          console.log('ℹ️ Skipping toggle — hours not in range.');
      }
  }




async function setNumberOfInstances(page, no_of_instance) {
  console.log(`🔢 Setting Number of Instances to: ${no_of_instance}`);

  const inputSelector = 'input[jsname="YPqjbf"][aria-labelledby="ucc-5"]';

  await page.waitForSelector(inputSelector, { visible: true });

  await page.click(inputSelector, { clickCount: 3 }); // select existing value
  await page.keyboard.type(String(no_of_instance));            // type new value

  console.log(`✅ Number of Instances set to ${no_of_instance}`);
}

async function setTotalInstanceUsageTime(page, hours) {
  console.log(`⏱ Evaluating Total Instance Usage Time: ${hours} hours`);

  if (Number(hours) === 730) {
      console.log('ℹ️ Usage Time is default (730 hours) — skipping input.');
      return;
  }

  const inputSelector = 'input[jsname="YPqjbf"][aria-labelledby="ucc-8"]';

  //await page.waitForSelector(inputSelector, { visible: true });

  await page.click(inputSelector, { clickCount: 3 }); // clear the input
  await page.keyboard.type(String(hours));

  console.log(`✅ Total Instance Usage Time set to ${hours} hours`);
}

async function selectOperatingSystem(page, osText) {
  console.log(`💻 Selecting Operating System: "${osText}"`);

  const dropdownTrigger = 'div[role="combobox"].rHGeGc-TkwUic';
  const listboxSelector = 'ul[role="listbox"]';
  const optionSelector = 'li[role="option"]';

  // Wait for the dropdown and ensure it's focused
  await page.waitForSelector(dropdownTrigger, { visible: true });
  console.log('📂 Dropdown found, focusing and clicking...');
  
  // Focus and click the dropdown
  await page.focus(dropdownTrigger);
  await page.click(dropdownTrigger, { delay: 300 });
  console.log('📂 Dropdown clicked, waiting for options...');

  // Retry waiting for the listbox with a longer timeout
  const waitForListbox = page.waitForSelector(listboxSelector, { visible: true, timeout: 10000 }); // Increased to 10s
  const listboxVisible = await waitForListbox.catch(err => false); // Avoids throwing error immediately

  if (!listboxVisible) {
    console.error("❌ Listbox didn't appear in time, but proceeding...");
  } else {
    console.log('📄 Options list visible...');
  }

  // Now try to click the matching option
  const didClick = await page.evaluate((selector, osText) => {
    const items = Array.from(document.querySelectorAll(selector));
    for (const item of items) {
      if (item.innerText.trim().toLowerCase().includes(osText.toLowerCase())) {
        item.scrollIntoView({ behavior: 'instant', block: 'center' });
        item.click();
        return true;
      }
    }
    return false;
  }, optionSelector, osText);

  if (!didClick) {
    throw new Error(`❌ OS option not found or not clickable: "${osText}"`);
  }

  console.log(`✅ OS successfully selected: "${osText}"`);
}





async function selectProvisioningModel(page, model) {
  console.log(`⚙️ Selecting Provisioning Model: ${model}`);

  // If it's the default (Regular), skip
  if (model.toLowerCase() === 'regular') {
      console.log('ℹ️ Provisioning Model is default (Regular) — skipping.');
      return;
  }

  const spotLabelSelector = 'label[for="107spot"]';

  await page.waitForSelector(spotLabelSelector, { visible: true });

  await page.click(spotLabelSelector);
  console.log('✅ Provisioning Model set to Preemptible (Spot)');
}


async function selectMachineFamily(page, label = "Compute-optimized") {
  // Step 1: Force click dropdown by visible text
  console.log(`🔍 Selecting Machine Family: "${label}"`);
  const success = await page.evaluate((labelText) => {
    const dropdowns = Array.from(document.querySelectorAll('[role="combobox"]'));
    for (const dropdown of dropdowns) {
      if (dropdown.innerText.includes("Machine Family")) {
        dropdown.click(); // open the dropdown
        return true;
      }
    }
    return false;
  }, label);

  if (!success) throw new Error("❌ Machine Family dropdown trigger not found.");

  // Step 2: Retry-wait for options to render
  const maxTries = 10;
  let found = false;
  for (let i = 0; i < maxTries; i++) {
    found = await page.evaluate(() => {
      return document.querySelectorAll('ul[role="listbox"] li[role="option"]').length > 0;
    });
    if (found) break;
    await page.waitForTimeout(500); // wait before retrying
  }
  if (!found) throw new Error("❌ Dropdown options never appeared even after retries.");

  // Step 3: Pick the correct option
  const clicked = await page.evaluate((labelText) => {
    const options = document.querySelectorAll('ul[role="listbox"] li[role="option"]');
    for (const opt of options) {
      const span = opt.querySelector("span[jsname='K4r5Ff']");
      if (span && span.innerText.trim().toLowerCase() === labelText.toLowerCase()) {
        span.click(); // click the option
        return true;
      }
    }
    return false;
  }, label);

  if (!clicked) throw new Error(`❌ Option "${label}" not found in dropdown.`);
}




async function selectSeries(page, value = "N2") {
  // Step 1: Open the dropdown (by checking visible text "Series")
  const clicked = await page.evaluate(() => {
    const dropdowns = Array.from(document.querySelectorAll('[role="combobox"]'));
    for (const dropdown of dropdowns) {
      if (dropdown.innerText.includes("Series")) {
        dropdown.click();
        return true;
      }
    }
    return false;
  });

  if (!clicked) throw new Error("❌ Series dropdown not found.");

  // Step 2: Retry until options appear
  const maxTries = 10;
  let optionsVisible = false;
  for (let i = 0; i < maxTries; i++) {
    optionsVisible = await page.evaluate(() => {
      return document.querySelectorAll('ul[role="listbox"] li[role="option"]').length > 0;
    });
    if (optionsVisible) break;
    await page.waitForTimeout(300);
  }

  if (!optionsVisible) throw new Error("❌ Series options did not appear.");

  // Step 3: Click the correct option (like N2, E2, etc.)
  const matched = await page.evaluate((value) => {
    const options = document.querySelectorAll('ul[role="listbox"] li[role="option"]');
    for (const option of options) {
      const label = option.querySelector('span[jsname="K4r5Ff"]');
      if (label && label.innerText.trim().toLowerCase() === value.toLowerCase()) {
        label.click();
        return true;
      }
    }
    return false;
  }, value);

  if (!matched) throw new Error(`❌ Option "${value}" not found in Series dropdown.`);
}









async function selectMachineType(page, value = "c2d-standard-4") {
  const triggered = await page.evaluate(() => {
    const allCombos = [...document.querySelectorAll('[role="combobox"]')];
    for (const combo of allCombos) {
      if (combo.innerText.includes("Machine type")) {
        combo.click();
        return true;
      }
    }
    return false;
  });
  if (!triggered) throw new Error("❌ Could not find Machine type dropdown");

  // Step 2: Retry until options appear
  let found = false;
  for (let i = 0; i < 10; i++) {
    found = await page.evaluate(() =>
      document.querySelectorAll('ul[role="listbox"] li[role="option"]').length > 0
    );
    if (found) break;
    await page.waitForTimeout(300);
  }
  if (!found) throw new Error("❌ Machine type options not loaded");

  // Step 3: Click the correct machine type option by full name
  const clicked = await page.evaluate((value) => {
    const options = document.querySelectorAll('ul[role="listbox"] li[role="option"]');
    for (const option of options) {
      const text = option.querySelector('span[jsname="K4r5Ff"]');
      if (text && text.innerText.trim().toLowerCase() === value.toLowerCase()) {
        text.click();
        return true;
      }
    }
    return false;
  }, value);

  if (!clicked) throw new Error(`❌ Machine type "${value}" not found in dropdown`);
}







async function setNumberOfvCPUs(page, vCPUs = 2) {
  const success = await page.evaluate((vCPUs) => {
    const vcpuBlock = document.querySelector('div[jsname="pYn3de"]');
    if (!vcpuBlock) return false;

    const numberInput = vcpuBlock.querySelector('input[type="number"]');
    if (!numberInput) return false;

    numberInput.value = vCPUs.toString();
    numberInput.dispatchEvent(new Event("input", { bubbles: true }));
    numberInput.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }, vCPUs);

  if (!success) throw new Error("❌ Could not locate and set vCPU field anchored to vCPU block.");
}





async function setAmountOfMemory(page, memory = 16) {
  console.log(`🧠 Setting Amount of Memory to ${memory} GB`);

  const success = await page.evaluate((memory) => {
    const input = document.querySelector('input[type="number"][aria-labelledby="ucc-41"]');
    if (!input) return false;

    input.focus();

    // Clear the existing value with backspaces (simulate a user)
    for (let i = 0; i < 4; i++) {
      input.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Backspace", code: "Backspace", bubbles: true
      }));
    }

    // Set new value
    input.value = memory.toString();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    return true;
  }, memory);

  if (!success) throw new Error("❌ Could not find or update Amount of memory field.");
}





async function setBootDiskSize(pageOrFrame, sizeInGB) {
  console.log(`💾 Setting Boot Disk Size to ${sizeInGB} GB`);

  const inputSelector = 'input[type="number"][id="c31"]';

  // Wait until the input field is visible and enabled
  await pageOrFrame.waitForSelector(inputSelector, { visible: true, timeout: 10000 });

  const input = await pageOrFrame.$(inputSelector);
  if (!input) throw new Error('❌ Boot disk size input field not found');

  // Click + focus + clear + type new value
  await input.click({ clickCount: 3 }); // Triple click selects all text
  await pageOrFrame.keyboard.press('Backspace'); // Ensure it's empty
  await input.type(sizeInGB.toString());

  console.log(`✅ Boot Disk Size set to ${sizeInGB} GB`);
}


async function toggleSustainedUseDiscount(pageOrFrame) {
  try {
    // Selector for the checkbox (update if needed)
    const checkboxSelector = '.eBlXUe-lw9akd';

    // Wait for the checkbox to appear
    //await pageOrFrame.waitForSelector(checkboxSelector, { visible: true });

    // Optionally check current state by icon (check vs cross)
    const isEnabled = await pageOrFrame.$eval(checkboxSelector, el => {
      const checkIcon = el.querySelector('path[d*="M9.55 18.2"]');  // check icon path
      return !!checkIcon;  // true if check icon is present
    });

    if (!isEnabled) {
      await pageOrFrame.click(checkboxSelector);
      console.log("✅ Sustained use discount enabled.");
    } else {
      console.log("🔄 Sustained use discount already enabled.");
    }
  } catch (err) {
    console.error("❌ Failed to toggle Sustained Use Discount:", err);
  }
}




async function selectRegion(ctx, regionValue) {
  try {
    // Step 1: Find the "Region" label and click the parent that triggers the dropdown
    const clicked = await ctx.evaluate((labelText) => {
      const spanElements = Array.from(document.querySelectorAll('span'));
      const regionLabel = spanElements.find(span => span.textContent.trim() === labelText);
      if (!regionLabel) return false;

      // Climb up to the clickable parent (usually div[role=combobox] or button)
      let clickable = regionLabel;
      for (let i = 0; i < 5; i++) {
        if (!clickable) break;
        if (clickable.getAttribute('role') === 'combobox' || clickable.tagName === 'DIV') {
          clickable.click();
          return true;
        }
        clickable = clickable.parentElement;
      }
      return false;
    }, 'Region');

    if (!clicked) {
      throw new Error(`Could not find or click region label`);
    }

    // Step 2: Wait for dropdown and select item
    const optionSelector = `li[role="option"][data-value="${regionValue}"]`;
    await ctx.waitForSelector(optionSelector, { visible: true, timeout: 10000 });

    await ctx.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ block: 'center' });
        el.click();
      }
    }, optionSelector);

    console.log(`✅ Selected region: ${regionValue}`);
  } catch (err) {
    console.error(`❌ Failed to select region "${regionValue}": ${err.message}`);
  }
}




//33333333333333333333333333333333333333333333333333333333333333333333333333333333333333333//


async function selectCommittedUseDiscountOption(page, option) {
  // Map the option parameter to the respective radio button ID
  const optionMap = {
    'ondemand': '116none',
    '1year': '1161-year',
    '3year': '1163-years',
  };

  // Get the ID for the chosen option
  const optionId = optionMap[option.toLowerCase()];

  // Ensure the option exists before attempting to click
  if (!optionId) {
    console.log(`Invalid option: ${option}`);
    throw new Error('Invalid committed use discount option');
  }

  // Build the selector for the label associated with the radio button using its "for" attribute
  const labelSelector = `label[for="${optionId}"]`;

  try {
    // Wait for the label to be visible (we wait for the label because it is clickable)
    await page.waitForSelector(labelSelector, { visible: true, timeout: 10000 }); // Timeout to avoid waiting forever

    // Click the label to select the corresponding radio option
    console.log(`Selecting ${option} option...`);
    await page.click(labelSelector);
    
  } catch (error) {
    console.error(`Error selecting ${option} option:`, error);
    throw new Error(`Failed to select committed use discount option: ${option}`);
  }
}










//333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333//
async function scrapeMachineTypeData(page) {
console.log('🔍 Scraping machine type data...');

try {
  await page.waitForSelector('div.VVW32d', { timeout: 5000 });

  const result = await page.evaluate(() => {
    const container = document.querySelector('div.VVW32d');
    if (!container) return null;

    const machineType = container.querySelector('div.D3Zlgc.MyvX5d.D0aEmf')?.textContent.trim();
    const specs = Array.from(container.querySelectorAll('div.HY0Uh'))
      .map(el => el.textContent.trim())
      .find(text => text.includes('vCPUs'));

    return { machineType, specs };
  });

  if (!result) {
    throw new Error('Machine type container not found or malformed.');
  }

  console.log(`⚙️ Machine Type: ${result.machineType}`);
  console.log(`🧠 Specs: ${result.specs}`);

  return result;
} catch (error) {
  console.error('❌ Failed to scrape machine type data:', error);
  await page.screenshot({ path: 'machine-type-error.png' });
  return { machineType: null, specs: null };
}
}


async function scrapeUrl(page, waitMs = 3000) {
console.log(`⏳ Waiting ${waitMs}ms to ensure all inputs reflect in URL...`);
await new Promise(resolve => setTimeout(resolve, waitMs)); // ✅ Replace 'wait' with this

const url = page.url();
console.log(`🔗 Final page URL: ${url}`);
return url;
}

async function scrapeEstimatedPrice(page) {
console.log('🔍 Scraping estimated price...');

try {
  await page.waitForSelector('div.egBpsb span.MyvX5d.D0aEmf', { timeout: 5000 });
  const price = await page.$eval('div.egBpsb span.MyvX5d.D0aEmf', el => el.textContent.trim());

  console.log(`💰 Estimated Price: ${price}`);
  return price;
} catch (error) {
  console.error('❌ Failed to scrape estimated price:', error);
  await page.screenshot({ path: 'price-error-screenshot.png' });
  return null;
}
}


async function add_to_estimate_button(page, isLast) {
  if (!isLast) {
    // Wait for the "Add to estimate" button to be available
    //await page.waitForSelector('.VVEJ3d');

    // Click the button
    await page.click('.VVEJ3d');
  }
}




/*==========================================================================================*/



async function calculatePricing(sl,row, mode,isFirst, isLast) {

  let browser, page;
  
    try {
      console.log(`\n🎯 Starting automation for row ${sl}...`);
      
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
      });
      
      page = await browser.newPage();
      
      
      console.log(isFirst);
      console.log(isLast);
      
      await mainHomePage(page);
      await sleep(2000);
      await computeEngineModal(page);
      await sleep(2000);
      await waitForNextSection(page);

      await sleep(500);
      await configureAdvancedSettings(page);
      await sleep(500);
      await setUsageTimeOption(page,row["Avg no. of hrs"]);
      await sleep(500);
      await setNumberOfInstances(page, row["No. of Instances"]);
      await sleep(500);
      await setTotalInstanceUsageTime(page,row["Avg no. of hrs"]);
      await sleep(500);
      await selectOperatingSystem(page,row["OS with version"]);
      await sleep(500);
      await selectProvisioningModel(page,row["Machine Class"]);
      await sleep(500);
      await selectMachineFamily(page,row["Machine Family"]);
      await sleep(500);
      await selectSeries(page,row["Series"]);
      await sleep(1000)
      await selectMachineType(page,row["Machine Type"]);
      
      
      
      if (row["Machine Type"] === "Custom machine type" &&
          ["N1", "N2", "N4", "E2", "N2D", "G2"].includes(row["Series"])) {
        
        
          await setNumberOfvCPUs(page, Number(row["vCPUs"]));
          await sleep(1000);
          await setAmountOfMemory(page,Number(row["RAM"]));

      }
      await sleep(3000) 
    
      await setBootDiskSize(page,Number(row["BootDisk Capacity"]));
      
      
      if (row["mode"]==="sud"){
        await toggleSustainedUseDiscount(page);
      }
      
      await sleep(4000);
      await selectRegion(page,row["Datacenter Location"]);
      await sleep(1000);

      if (row["mode"]!=="sud"){
        await selectCommittedUseDiscountOption(page,row["mode"]);

      }
      await sleep(10000);
      machineInfo=await scrapeMachineTypeData(page);
      url=await scrapeUrl(page);
      price=await scrapeEstimatedPrice(page);
      await sleep(1000);
      




  
      

      return {
        price,
        url,
        machineType: machineInfo.machineType || row["Machine Type"] || 'Unknown',
        specs: machineInfo.specs || 'Unknown'
      };
    
    } catch (err) {
      console.error(`❌ Error in calculatePricing for Sl ${sl}:`, err.message);
      return {
        price: 'Error',
        url: 'Error',
        machineType: 'Unknown',
        specs: 'Unknown'
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }