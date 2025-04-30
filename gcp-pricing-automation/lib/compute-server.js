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


async function selectMachineFamily(page, label ) {
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




async function selectSeries(page, value ) {
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









async function selectMachineType(page, value ) {
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
  await pageOrFrame.keyboard.press('Tab'); 
  await pageOrFrame.keyboard.press('Tab'); 

  console.log(`✅ Boot Disk Size set to ${sizeInGB} GB`);
}


async function toggleSustainedUseDiscount(pageOrFrame, options = {}) {
  // Default options
  const {
    timeout = 15000, // ms
    verify = true,
    verifyTimeout = 5000 // ms
  } = options;

  // Stable selector based on role and aria-label
  const toggleSelector = "button[role='switch'][aria-label='Add sustained use discounts']";

  console.log(`Attempting to find and toggle Sustained Use Discount switch...`);
  console.log(` - Selector: ${toggleSelector}`);
  console.log(` - Timeout: ${timeout}ms`);

  try {
    // 1. Wait for the button to exist and be visible in the DOM
    //    waitForSelector throws an error if not found within the timeout.
    const toggleButton = await pageOrFrame.waitForSelector(toggleSelector, {
      visible: true, // Ensures the element is not hidden (e.g., display: none)
      timeout: timeout,
    });

    if (!toggleButton) {
        // This check is slightly redundant as waitForSelector should throw, but good for safety.
        console.error("Error: waitForSelector completed but returned a nullish handle.");
        return false;
    }
    console.log("Toggle button found.");

    let initialState = 'unknown';
    if (verify) {
      try {
        // 2. (Optional) Get the initial state *before* clicking
        initialState = await toggleButton.evaluate(el => el.getAttribute('aria-checked'));
        console.log(` - Initial 'aria-checked' state: ${initialState}`);
      } catch (evalError) {
        // Log if we can't get the state, but proceed with the click
        console.warn(` - Warning: Could not read initial aria-checked state: ${evalError.message}`);
      }
    }

    // 3. Click the button
    //    Using the element handle's click method is generally reliable.
    await toggleButton.click();
    console.log("Toggle button clicked.");

    // 4. (Optional) Verify the state changed
    if (verify && initialState !== 'unknown') {
      console.log(" - Verifying state change...");
      try {
        // Wait using waitForFunction, which polls the browser context.
        // This waits until the 'aria-checked' attribute is DIFFERENT from the initial state.
        await pageOrFrame.waitForFunction(
          (selector, expectedInitialState) => {
            const element = document.querySelector(selector);
            // Check if element exists and its attribute is different
            return element && element.getAttribute('aria-checked') !== expectedInitialState;
          },
          { timeout: verifyTimeout }, // Use a specific timeout for verification
          toggleSelector,          // Pass selector to the function
          initialState             // Pass initial state to the function
        );

        // Re-query the element to get the final state reliably after the wait
        const finalButton = await pageOrFrame.$(toggleSelector); // Use .$ which doesn't wait/throw
        if (finalButton) {
           const finalState = await finalButton.evaluate(el => el.getAttribute('aria-checked'));
           console.log(` - Final 'aria-checked' state: ${finalState}`);
           if (finalState === initialState) {
               console.warn(" - Warning: State verification indicates the value didn't change.");
           } else {
               console.log(" - State successfully verified as changed.");
           }
           await finalButton.dispose(); // Clean up the element handle
        } else {
            console.warn(" - Warning: Could not re-find button after click to check final state.");
        }

      } catch (verificationError) {
        // This timeout means the attribute didn't change to the expected opposite state
        // within the verifyTimeout. The click might have worked but the UI update was slow,
        // or the click failed silently.
        console.warn(` - Warning: State verification timed out or failed after ${verifyTimeout}ms. The attribute 'aria-checked' may not have changed from '${initialState}'. Error: ${verificationError.message}`);
        // Optionally, try one last time to read the state without waiting:
         try {
            const lastTryButton = await pageOrFrame.$(toggleSelector);
            if(lastTryButton) {
                 const lastTryState = await lastTryButton.evaluate(el => el.getAttribute('aria-checked'));
                 console.log(` - State reading after verification timeout: ${lastTryState}`);
                 await lastTryButton.dispose();
            }
         } catch(e) {/* Ignore error during final check */}
      }
    }

    await toggleButton.dispose(); // Clean up the element handle
    return true; // Click was successful

  } catch (error) {
    if (error.name === 'TimeoutError') { // More specific check for Puppeteer TimeoutError
      console.error(`Error: Timed out waiting for toggle button (${toggleSelector}) after ${timeout}ms.`);
    } else {
      console.error(`Error interacting with toggle button: ${error}`);
    }
    return false; // Indicate failure
  }
}

/*=================================================================================*/


async function verifySelection(ctx, displaySelector, expectedValuePart, timeout) {
  // ... (verification code)
   console.log(`       - Verifying selection (timeout: <span class="math-inline">\{timeout\}ms\)\: checking if display contains "</span>{expectedValuePart}"...`);
   try {
       await ctx.waitForFunction(
           (selector, value) => {
               const elem = document.querySelector(selector);
               return elem && elem.textContent.includes(value);
           },
           { timeout: timeout },
           displaySelector,
           expectedValuePart
       );
       console.log(`       - Verification PASSED.`);
       return true;
   } catch (verifyError) {
        try {
             const currentText = await ctx.$eval(displaySelector, el => el.textContent);
             console.warn(`- Verification FAILED. Current display text: "${currentText}"`);
        } catch {
             console.warn(`- Verification FAILED. Could not get current display text using selector: ${displaySelector}`);
        }
       return false;
   }
}


async function selectRegion(page, regionValue, timeoutMs = 30000) {
  console.log(`Attempting to select region: ${regionValue}`);

  // --- Selectors ---
  const dropdownTriggerSelector = 'div[data-field-type="115"] div[role="combobox"]';
  // Selector for the outer DIV container of the list using data-idom-key
  const listOuterContainerSelector = `div[jsname="xl07Ob"][data-idom-key*="${regionValue}"]`;
  // Selector for the UL list *inside* that container (verify role, aria-label if possible)
  const listSelectorInContainer = `${listOuterContainerSelector} ul[role="listbox"]`;
  // Selector for the specific option LI *inside* that list
  const targetOptionSelectorInList = `${listSelectorInContainer} li[role="option"][data-value="${regionValue}"]`;
  // Selector for the displayed value span (for verification)
  const displayedValueSelector = `${dropdownTriggerSelector} span[jsname="Fb0Bif"]`; // Verify jsname
  // ---

  try {
    // --- Operating on main page context ---
    console.log('Operating on main page context (no iframe handling).');

    // 1. Click the dropdown trigger
    console.log(`Waiting for dropdown trigger: ${dropdownTriggerSelector}`);
    await page.waitForSelector(dropdownTriggerSelector, { visible: true, timeout: timeoutMs });
    console.log('Dropdown trigger found. Clicking...');
    await page.click(dropdownTriggerSelector);
    console.log('Dropdown trigger clicked.');

    // 2. Wait for the outer list container (using data-idom-key) to appear
    console.log(`Waiting for dropdown container to appear: ${listOuterContainerSelector}`);
    await page.waitForSelector(listOuterContainerSelector, { visible: true, timeout: timeoutMs });
    console.log(`Dropdown container found: ${listOuterContainerSelector}`);

    // 3. Wait for the UL list inside the container to be ready (optional but safer)
    //    If this step fails, the list structure inside the container is different than expected.
    console.log(`Waiting for list inside container: ${listSelectorInContainer}`);
    await page.waitForSelector(listSelectorInContainer, { visible: true, timeout: 5000 }); // Shorter timeout ok?
    console.log(`List inside container found: ${listSelectorInContainer}`);

    // 4. Use page.evaluate to find and click the specific option by data-value
    console.log(`Attempting to find and click option with data-value="${regionValue}" via page.evaluate...`);
    const clicked = await page.evaluate((listSel, optionVal) => {
        const listElement = document.querySelector(listSel);
        if (!listElement) return { success: false, error: `List element not found: ${listSel}` };

        const optionElement = listElement.querySelector(`li[role="option"][data-value="${optionVal}"]`);
        if (!optionElement) {
            console.error(`[Browser Context] Option data-value="${optionVal}" not found in list:`, listSel);
            console.error('[Browser Context] List HTML snippet:', listElement.innerHTML.substring(0, 800));
            return { success: false, error: `Option data-value="${optionVal}" not found` };
        }

        console.log(`[Browser Context] Found option with data-value: ${optionVal}`);
        optionElement.scrollIntoView({ block: 'center', inline: 'nearest' });
        if (typeof optionElement.click === 'function') {
            optionElement.click();
            return { success: true, text: optionElement.innerText.trim() };
        } else { return { success: false, error: 'Option found but has no click method' }; }

    }, listSelectorInContainer, regionValue); // Pass the UL selector and the target region value

    if (!clicked || !clicked.success) {
        throw new Error(`Failed to find or click the region option "${regionValue}" using data-value in page.evaluate. Error: ${clicked?.error || 'Unknown evaluate error'}`);
    }
    const optionText = clicked.text;
    console.log(`Region option "${regionValue}" clicked via page.evaluate. Option text: "${optionText}"`);


    // 5. Optional: Wait for the outer list container to disappear
    await page.waitForSelector(listOuterContainerSelector, { hidden: true, timeout: 5000 });
    console.log('Dropdown container closed.');

    // 6. Verification: Wait for the displayed text to update
    await page.waitForFunction(
        (selector, expectedText) => {
            const element = document.querySelector(selector);
            return element && element.textContent.trim() === expectedText;
        },
        { timeout: 5000 },
        displayedValueSelector,
        optionText
     );
    console.log(`Successfully selected region: ${regionValue}. Display updated.`);

  } catch (error) {
     console.error(`Error during region selection for "${regionValue}" (data-idom-key approach):`);
      try {
         await page.screenshot({ path: `error_select_region_${regionValue}_idomkey.png`, fullPage: true });
         console.log('Saved error screenshot.');
     } catch (screenshotError) {
         console.error('Failed to take error screenshot:', screenshotError);
     }
     console.error(error);
     let detail = "Check error details and screenshot.";
      if (error.message.includes(listOuterContainerSelector)) {
         detail = `Could not find dropdown container matching '${listOuterContainerSelector}'. Check if data-idom-key attribute/value is correct/stable.`;
     } else if (error.message.includes(listSelectorInContainer)) {
         detail = `Found container ('${listOuterContainerSelector}') but failed waiting for list ('${listSelectorInContainer}') inside it. Check the UL structure within the container.`;
     } else if (error.message.includes("page.evaluate")) {
        detail = `Could not find/click option via evaluate. Verify option data-value ('${regionValue}') exists & is correct within the list ('${listSelectorInContainer}').`;
     }
     throw new Error(`Failed to select region option "${regionValue}". ${detail}`);
  }
}
//33333333333333333333333333333333333333333333333333333333333333333333333333333333333333333//



async function selectCommittedUseDiscountOption(page, option) {
  const optionLower = option.toLowerCase();

  // --- Mappings ---
  // Map readable option to the input's 'value' attribute
  const valueMap = {
    'ondemand': 'none',
    '1year': '1-year',
    '3year': '3-years',
  };
  // Map readable option to the label's visible text
  const labelTextMap = {
    'ondemand': 'None',
    '1year': '1 year', // Ensure this matches EXACTLY (case-sensitive)
    '3year': '3 years', // Ensure this matches EXACTLY
  };

  const radioButtonValue = valueMap[optionLower];
  const labelText = labelTextMap[optionLower];

  if (!radioButtonValue || !labelText) {
    console.log(`Invalid option provided: ${option}`);
    throw new Error(`Invalid committed use discount option: ${option}`);
  }

  // --- Selection Strategies ---
  // Define selectors for different strategies
  const primarySelector = `input[type="radio"][value="${radioButtonValue}"] + label`;
  const labelTextXPath = `//label[normalize-space(.)="${labelText}"]`; // Using XPath for text matching

  // --- Attempt Logic ---
  let selected = false;
  const timeoutOptions = { visible: true, timeout: 5000 }; // Shorter timeout for individual attempts

  // Strategy 1: Primary (Input Value + Adjacent Label CSS Selector)
  if (!selected) {
    try {
      console.log(`Attempt 1: Clicking adjacent label using value: [${primarySelector}]`);
      await page.waitForSelector(primarySelector, timeoutOptions);
      await page.click(primarySelector);
      // Optional: Add a short pause or verification step here if needed
      // await page.waitForTimeout(100);
      console.log(`Success (Attempt 1): Clicked adjacent label for value "${radioButtonValue}".`);
      selected = true;
    } catch (error) {
      console.warn(`Attempt 1 Failed: Could not click adjacent label using value. ${error.message}`);
    }
  }

  // Strategy 2: Fallback 1 (Label Text XPath)
  if (!selected) {
    try {
      console.log(`Attempt 2: Clicking label using text XPath: [${labelTextXPath}]`);
      // XPath selectors need page.$x() and then operate on the handle
      const [labelElementHandle] = await page.$x(labelTextXPath);
      if (!labelElementHandle) {
          throw new Error(`Label element not found with XPath: ${labelTextXPath}`);
      }
      // Ensure element is visible before clicking (waitForXPath might be needed depending on Puppeteer version/setup)
      // await page.waitForXPath(labelTextXPath, timeoutOptions); // Alternative wait
      await labelElementHandle.click();
      // Optional: Dispose handle
      await labelElementHandle.dispose();
      console.log(`Success (Attempt 2): Clicked label using text "${labelText}".`);
      selected = true;
    } catch (error) {
      console.warn(`Attempt 2 Failed: Could not click label using text. ${error.message}`);
    }
  }

  // Strategy 3: Fallback 2 (Input Value -> Dynamic ID -> Label For)
  if (!selected) {
    try {
      console.log(`Attempt 3: Finding input by value, getting ID, clicking label by [for]`);
      const inputSelector = `input[type="radio"][value="${radioButtonValue}"]`;
      await page.waitForSelector(inputSelector, timeoutOptions);

      // Get the dynamic ID from the input element
      const dynamicId = await page.$eval(inputSelector, (el) => el.id);

      if (!dynamicId) {
          throw new Error(`Could not retrieve ID for input with value "${radioButtonValue}"`);
      }

      const labelForSelector = `label[for="${dynamicId}"]`;
      console.log(`   - Found dynamic ID: ${dynamicId}. Clicking label: [${labelForSelector}]`);
      await page.waitForSelector(labelForSelector, timeoutOptions);
      await page.click(labelForSelector);
      console.log(`Success (Attempt 3): Clicked label using dynamic ID "${dynamicId}".`);
      selected = true;
    } catch (error) {
      console.warn(`Attempt 3 Failed: Could not click label using dynamic ID. ${error.message}`);
    }
  }

  // Strategy 4: Fallback 3 (Intensive JS Click on Primary Selector)
  // Only try if the primary selector *could* potentially find the element but click failed
  if (!selected) {
      try {
          console.log(`Attempt 4: Trying JS click on primary selector: [${primarySelector}]`);
          await page.waitForSelector(primarySelector, timeoutOptions); // Ensure element exists first
          await page.evaluate((selector) => {
              const element = document.querySelector(selector);
              if (element instanceof HTMLElement) {
                  element.click();
              } else {
                  throw new Error(`Element not found or not HTMLElement for JS click: ${selector}`);
              }
          }, primarySelector);
          console.log(`Success (Attempt 4): JS click on adjacent label for value "${radioButtonValue}".`);
          selected = true;
      } catch (error) {
          console.warn(`Attempt 4 Failed: JS click on primary selector failed. ${error.message}`);
      }
  }


  // Final Check
  if (!selected) {
    console.error(`All selection attempts failed for option: ${option}`);
    // Optional: Add more debugging info here (e.g., screenshot, dump HTML)
    // await page.screenshot({ path: `error_select_${option}.png` });
    throw new Error(`Failed to select committed use discount option '${option}' after multiple attempts.`);
  }

  console.log(`Successfully selected option: ${option}`);
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
      await sleep(2000) 
    
      await setBootDiskSize(page,Number(row["BootDisk Capacity"]));
      
      
      if (row["mode"]==="sud"){
        await toggleSustainedUseDiscount(page);
      }
      
      await sleep(2000);
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