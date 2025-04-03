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

  const dropdownTrigger = 'div.S8daBe-aPP78e';
  const optionSelector = 'li[role="option"]';

  await page.waitForSelector(dropdownTrigger, { visible: true });
  await page.click(dropdownTrigger);
  console.log('📂 Dropdown clicked, waiting for options...');

  await new Promise(resolve => setTimeout(resolve, 1000)); // wait for options to render

  // Run this inside the browser context to find & click the item
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



async function selectMachineFamily(pageOrFrame, value) {
  console.log(`🏗 Selecting Machine Family: "${value}"`);

  const dropdownOpener = await pageOrFrame.$('div.S8daBe-aPP78e');
  if (!dropdownOpener) throw new Error('❌ Dropdown opener not found');
  await dropdownOpener.click();

  console.log('📂 Dropdown clicked, waiting for options...');
  //await pageOrFrame.waitForSelector('ul[role="listbox"]', { visible: true, timeout: 10000 });

  const optionFound = await pageOrFrame.evaluate((value) => {
    const options = [...document.querySelectorAll('li[role="option"] span[jsname="K4r5Ff"]')];
    const target = options.find(span => span.textContent.trim().toLowerCase().includes(value.toLowerCase()));
    if (target) {
      target.scrollIntoView({ behavior: 'instant', block: 'center' });
      target.click();
      return true;
    }
    return false;
  }, value);

  if (!optionFound) throw new Error(`❌ Machine Family "${value}" not found in dropdown`);
  console.log(`✅ Machine Family selected: ${value}`);
}



async function selectSeries(pageOrFrame, value ) {
  console.log(`📘 Selecting Series: "${value}"`);

  const dropdownOpener = await pageOrFrame.$('div.S8daBe-aPP78e');
  if (!dropdownOpener) throw new Error('❌ Series dropdown trigger not found');
  await dropdownOpener.click();
  console.log('📂 Dropdown clicked, waiting for options...');

  // Wait for any option to appear first
  //await pageOrFrame.waitForSelector('ul[role="listbox"] li[role="option"]', { visible: true, timeout: 10000 });

  // Then wait specifically for the option you want to appear in DOM
  

  // Finally evaluate and click it
  const clicked = await pageOrFrame.evaluate((value) => {
    const items = Array.from(document.querySelectorAll('ul[role="listbox"] li[role="option"]'));
    for (const item of items) {
      const label = item.querySelector('span[jsname="K4r5Ff"]');
      if (label && label.textContent.trim().toLowerCase() === value.toLowerCase()) {
        label.scrollIntoView({ block: 'center' });
        label.click();
        return true;
      }
    }
    return false;
  }, value);

  if (!clicked) throw new Error(`❌ Series "${value}" not found in dropdown`);
  console.log(`✅ Series selected: ${value}`);
}





async function selectMachineType(pageOrFrame, value) {
  console.log(`📘 Selecting Machine Type: "${value}"`);

  const dropdownOpener = await pageOrFrame.$('div.S8daBe-aPP78e');
  if (!dropdownOpener) throw new Error('❌ Machine Type dropdown trigger not found');
  await dropdownOpener.click();
  console.log('📂 Dropdown clicked, waiting for options...');

  //await pageOrFrame.waitForSelector('ul[role="listbox"] li[role="option"]', { visible: true, timeout: 10000 });

  await pageOrFrame.waitForFunction(
    (value) => {
      const options = Array.from(document.querySelectorAll('ul[role="listbox"] li[role="option"] span[jsname="K4r5Ff"]'));
      return options.some(el => el.textContent.trim().toLowerCase() === value.toLowerCase());
    },
    { timeout: 10000 },
    value
  );

  const clicked = await pageOrFrame.evaluate((value) => {
    const options = Array.from(document.querySelectorAll('ul[role="listbox"] li[role="option"]'));
    for (const option of options) {
      const label = option.querySelector('span[jsname="K4r5Ff"]');
      if (label && label.textContent.trim().toLowerCase() === value.toLowerCase()) {
        label.scrollIntoView({ block: 'center' });
        label.click();
        return true;
      }
    }
    return false;
  }, value);

  if (!clicked) throw new Error(`❌ Machine Type "${value}" not found in dropdown`);
  console.log(`✅ Machine Type selected: ${value}`);
}


async function setNumberOfvCPUs(page, vCPUs) {
  // Skip setting if vCPUs is zero
  if (vCPUs === 0) {
    console.log("❌ Skipping vCPUs as the value is zero");
    return; // Skip the rest of the function
  }

  // Wait for the input element to be available
  console.log(`Setting vCPUs to ${vCPUs}`);

  // Set the value of the input element
  await page.evaluate((vCPUs) => {
    const inputElement = document.querySelector('#i12');
    if (inputElement) {
      inputElement.value = vCPUs; // Set the value
      inputElement.dispatchEvent(new Event('input', { bubbles: true })); // Trigger the input event
    }
  }, vCPUs);
  console.log(`✅ vCPUs set to ${vCPUs}`);
}





async function setAmountOfMemory(page, memory) {
  // Skip setting if memory is zero
  if (memory === 0) {
    console.log("❌ Skipping Memory as the value is zero");
    return; // Skip the rest of the function
  }

  // Wait for the input element to be available
  console.log(`Setting Memory to ${memory} GB`);

  // Set the value of the input element
  await page.evaluate((memory) => {
    const inputElement = document.querySelector('#i13');
    if (inputElement) {
      inputElement.value = memory; // Set the value
      inputElement.dispatchEvent(new Event('input', { bubbles: true })); // Trigger the input event
    }
  }, memory);
  console.log(`✅ Memory set to ${memory} GB`);
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


async function toggleSustainedUseDiscount(pageOrFrame, enable = false) {
  const toggleSelector = 'button[role="switch"][aria-label="Add sustained use discounts"]';
  const checkMarkPath = 'M9.55 18.2'; // enabled
  const crossMarkPath = 'M6.4 19.2';  // disabled

  console.log(`🎯 Ensuring Sustained Use Discount is ${enable ? 'ENABLED' : 'DISABLED'}`);

  try {
    //await pageOrFrame.waitForSelector(toggleSelector, { visible: true, timeout: 10000 });

    const toggle = await pageOrFrame.$(toggleSelector);
    if (!toggle) throw new Error('❌ Toggle button not found');

    const currentState = await pageOrFrame.evaluate(el => el.getAttribute('aria-checked') === 'true', toggle);

    if (currentState === enable) {
      console.log(`✅ Sustained Use Discount is already ${enable ? 'enabled' : 'disabled'}`);
      return;
    }

    // Simulate actual DOM click
    await pageOrFrame.evaluate(el => {
      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      el.dispatchEvent(event);
    }, toggle);

    await pageOrFrame.waitForTimeout?.(1000) || await new Promise(r => setTimeout(r, 1000));

    const verified = await pageOrFrame.evaluate(({ selector, enable, checkMarkPath, crossMarkPath }) => {
      const btn = document.querySelector(selector);
      if (!btn) return false;

      const path = btn.querySelector('svg path')?.getAttribute('d') || '';
      return enable ? path.includes(checkMarkPath) : path.includes(crossMarkPath);
    }, { selector: toggleSelector, enable, checkMarkPath, crossMarkPath });

    if (verified) {
      console.log(`✅ Sustained Use Discount successfully toggled to ${enable ? 'enabled' : 'disabled'}`);
    } else {
      throw new Error('❌ Toggle verification failed: SVG path did not update');
    }

  } catch (err) {
    console.error(`❌ Failed to toggle Sustained Use Discount: ${err.message}`);
    throw err;
  }
}


async function selectRegion(pageOrFrame, value) {
  console.log(`🌎 Selecting Region: "${value}"`);

  const regionDisplayHandle = await pageOrFrame.$('span.S8daBe-uusGie-fmcmS');

  if (!regionDisplayHandle) {
    throw new Error('❌ Region display element not found');
  }

  const regionDropdownHandle = await regionDisplayHandle.evaluateHandle((el) => {
    while (el && !el.getAttribute('role')?.includes('combobox')) {
      el = el.parentElement;
    }
    return el;
  });

  if (!regionDropdownHandle) {
    throw new Error('❌ Region dropdown trigger not found');
  }

  await regionDropdownHandle.click();
  console.log('📂 Region dropdown clicked. Waiting for options...');

  await pageOrFrame.waitForSelector('ul[role="listbox"] li[role="option"][data-value]', {
    visible: true,
    timeout: 10000,
  });

  // Select the desired region
  const success = await pageOrFrame.evaluate((targetValue) => {
    const options = [...document.querySelectorAll('ul[role="listbox"] li[role="option"]')];
    const option = options.find((el) => el.dataset.value === targetValue);
    if (option) {
      option.scrollIntoView({ block: 'center' });
      option.click();
      return true;
    }
    return false;
  }, value);

  if (!success) {
    throw new Error(`❌ Region "${value}" not found in dropdown`);
  }

  console.log(`✅ Region selected: ${value}`);
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
        headless: false,
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
      await sleep(500);
      await selectMachineType(page,row["Machine Type"]);
      await sleep(2000)
      await setNumberOfvCPUs(page,Number(row["vCPUs"]));
      await sleep(2000)
      await setAmountOfMemory(page,Number(row["RAM"]));
      await sleep(2000)
      await setBootDiskSize(page,Number(row["BootDisk Capacity"]));
      
      /*
      if (row["mode"]==="sud"){
        await toggleSustainedUseDiscount(page,true);
      }
        */
      
  
      await selectRegion(page,row["Datacenter Location"]);
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