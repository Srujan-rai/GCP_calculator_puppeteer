const puppeteer = require('puppeteer');

async function mainHomePage(page) {
    console.log('Navigating to GCP pricing calculator...');
    await page.goto('https://cloud.google.com/products/calculator?hl=en', {
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
    await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });

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
    console.log('Waiting for Compute Engine config page...');
    try {
        await page.waitForSelector('input[aria-label="Name"]', { timeout: 3000 });
    } catch {
        console.warn('⚠️ Config page did not show expected input, proceeding anyway...');
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

    async function setUsageTimeOption(page, hours_per_day=10) {
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




async function setNumberOfInstances(page, no_of_instance = 1) {
    console.log(`🔢 Setting Number of Instances to: ${no_of_instance}`);

    const inputSelector = 'input[jsname="YPqjbf"][aria-labelledby="ucc-5"]';

    await page.waitForSelector(inputSelector, { visible: true });

    await page.click(inputSelector, { clickCount: 3 }); // select existing value
    await page.keyboard.type(String(no_of_instance));            // type new value

    console.log(`✅ Number of Instances set to ${no_of_instance}`);
}

async function setTotalInstanceUsageTime(page, hours = 730) {
    console.log(`⏱ Evaluating Total Instance Usage Time: ${hours} hours`);

    if (Number(hours) === 730) {
        console.log('ℹ️ Usage Time is default (730 hours) — skipping input.');
        return;
    }

    const inputSelector = 'input[jsname="YPqjbf"][aria-labelledby="ucc-8"]';

    await page.waitForSelector(inputSelector, { visible: true });

    await page.click(inputSelector, { clickCount: 3 }); // clear the input
    await page.keyboard.type(String(hours));

    console.log(`✅ Total Instance Usage Time set to ${hours} hours`);
}

async function selectOperatingSystem(page, osText = 'Paid: Red Hat Enterprise Linux') {
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





async function selectProvisioningModel(page, model = 'Preemptible') {
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

async function selectMachineFamily(pageOrFrame, value = 'General Purpose') {
    console.log(`🏗 Selecting Machine Family: "${value}"`);
  
    const dropdownOpener = await pageOrFrame.$('div.S8daBe-aPP78e');
    if (!dropdownOpener) throw new Error('❌ Dropdown opener not found');
    await dropdownOpener.click();
  
    console.log('📂 Dropdown clicked, waiting for options...');
    await pageOrFrame.waitForSelector('ul[role="listbox"]', { visible: true, timeout: 10000 });
  
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
  
  
  async function selectSeries(pageOrFrame, value = 'N1') {
    console.log(`📘 Selecting Series: "${value}"`);
  
    const dropdownOpener = await pageOrFrame.$('div.S8daBe-aPP78e');
    if (!dropdownOpener) throw new Error('❌ Series dropdown trigger not found');
    await dropdownOpener.click();
    console.log('📂 Dropdown clicked, waiting for options...');
  
    // Wait for any option to appear first
    await pageOrFrame.waitForSelector('ul[role="listbox"] li[role="option"]', { visible: true, timeout: 10000 });
  
    // Then wait specifically for the option you want to appear in DOM
    await pageOrFrame.waitForFunction(
      (value) => {
        const items = Array.from(document.querySelectorAll('ul[role="listbox"] li[role="option"] span[jsname="K4r5Ff"]'));
        return items.some((el) => el.textContent.trim().toLowerCase() === value.toLowerCase());
      },
      { timeout: 10000 },
      value
    );
  
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
  
  
  
  
  
  async function selectMachineType(pageOrFrame, value = 'f1-micro') {
    console.log(`📘 Selecting Machine Type: "${value}"`);
  
    const dropdownOpener = await pageOrFrame.$('div.S8daBe-aPP78e');
    if (!dropdownOpener) throw new Error('❌ Machine Type dropdown trigger not found');
    await dropdownOpener.click();
    console.log('📂 Dropdown clicked, waiting for options...');
  
    await pageOrFrame.waitForSelector('ul[role="listbox"] li[role="option"]', { visible: true, timeout: 10000 });
  
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
  
async function setNumberOfvCPUs(page) {}
async function setAmountOfMemory(page) {}


async function setBootDiskSize(pageOrFrame, sizeInGB = 100) {
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
  

  async function toggleSustainedUseDiscount(pageOrFrame, enable = true) {
    const toggleSelector = 'button[role="switch"][aria-label="Add sustained use discounts"]';
    const checkMarkPath = 'M9.55 18.2'; // enabled
    const crossMarkPath = 'M6.4 19.2';  // disabled
  
    console.log(`🎯 Ensuring Sustained Use Discount is ${enable ? 'ENABLED' : 'DISABLED'}`);
  
    try {
      await pageOrFrame.waitForSelector(toggleSelector, { visible: true, timeout: 10000 });
  
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
  
  
  
  

  async function selectRegion(pageOrFrame, value = 'us-west1') {
    console.log(`🌎 Selecting Region: "${value}"`);
  
    const dropdownTrigger = await pageOrFrame.$('div[role="combobox"] span[jsname="Fb0Bif"]');
    if (!dropdownTrigger) throw new Error('❌ Region dropdown trigger not found');
  
    await dropdownTrigger.click();
    console.log('📂 Region dropdown clicked, waiting for options...');
  
    await pageOrFrame.waitForSelector('ul[role="listbox"] li[role="option"]', {
      visible: true,
      timeout: 10000,
    });
  
    await pageOrFrame.waitForFunction(
      (val) => {
        return Array.from(document.querySelectorAll('ul[role="listbox"] li[role="option"]'))
          .some(option => option.getAttribute('data-value') === val);
      },
      { timeout: 10000 },
      value
    );
  
    const success = await pageOrFrame.evaluate((val) => {
      const options = Array.from(document.querySelectorAll('ul[role="listbox"] li[role="option"]'));
      for (const option of options) {
        if (option.getAttribute('data-value') === val) {
          option.scrollIntoView({ block: 'center' });
          option.click();
          return true;
        }
      }
      return false;
    }, value);
  
    if (!success) throw new Error(`❌ Region "${value}" not found in dropdown`);
  
    console.log(`✅ Region selected: ${value}`);
  }
  
  
  
  
  
  
  
async function selectOnDemandOption(page) {}
async function selectCUD1YearOption(page) {}
async function selectCUD3YearOption(page) {}
async function scrapeMachineTypeData(page) {}
async function scrapeEstimatedPrice(page) {}
async function scrapePrice(page) {}

async function scrapeUrl(page) {
    const currentUrl = page.url();
    console.log(`🔗 Current page URL: ${currentUrl}`);
    return currentUrl;
  }
  


async function calculateGCPCosts() {
    let browser, page;

    try {
        console.log('Launching headless browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox']
        });

        page = await browser.newPage();

        await mainHomePage(page);
        await computeEngineModal(page);
        await waitForNextSection(page);

        // 📦 Call configuration functions here
        await configureAdvancedSettings(page);
        await setUsageTimeOption(page);
        await setNumberOfInstances(page);
        await setTotalInstanceUsageTime(page);
        await selectOperatingSystem(page);
        await selectProvisioningModel(page);
        await selectMachineFamily(page);
        await selectSeries(page);
        await selectMachineType(page);
        await setNumberOfvCPUs(page);
        await setAmountOfMemory(page);
        await setBootDiskSize(page);
        await toggleSustainedUseDiscount(page);
        await selectRegion(page);
        await selectOnDemandOption(page);
        await selectCUD1YearOption(page);
        await selectCUD3YearOption(page);

        // 🔍 Scraping
        await scrapeMachineTypeData(page);
        await scrapeEstimatedPrice(page);
        await scrapePrice(page);
        await scrapeUrl(page);

        // 📸 Screenshot after all steps
        await page.screenshot({ path: 'final-output.png', fullPage: true });
        console.log('📸 Screenshot saved as final-output.png');

    } catch (error) {
        console.error('❌ An unexpected error occurred:', error);
        if (page) {
            await page.screenshot({ path: 'error-screenshot.png' });
            console.log('🖼 Screenshot saved as error-screenshot.png');
        }
    } finally {
        if (browser) await browser.close();
    }
}

calculateGCPCosts();
