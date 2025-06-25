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
    const targetValue = no_of_instance.toString();
    // This selector is derived from the HTML you provided:
    // - input tag
    // - aria-labelledby="ucc-6" (which is the id of the "Number of instances*" label div)
    const instancesInputSelector = 'input[aria-labelledby="ucc-6"]';
    // As an alternative, if jsname is reliably unique for this input:
    // const instancesInputSelector = 'input[jsname="YPqjbf"]';

    try {
        console.log(`Attempting to set Number of Instances to: ${targetValue}`);

        // 1. Wait for the input field to be visible and enabled
        await page.waitForSelector(instancesInputSelector, { visible: true, timeout: 15000 });
        console.log("Number of Instances input field found and visible.");

        // 2. Focus the input field
        await page.focus(instancesInputSelector);
        console.log("Focused on Number of Instances input field.");

        // 3. Clear the existing value
        // Triple click to select all content in the input field
        await page.click(instancesInputSelector, { clickCount: 3 });
        // Press Backspace to delete the selected content
        await page.keyboard.press('Backspace');
        console.log("Cleared existing value from Number of Instances input field.");

        // 4. Type the new value
        await page.type(instancesInputSelector, targetValue, { delay: 50 }); // Adding a small delay can sometimes improve reliability
        console.log(`Typed "${targetValue}" into the Number of Instances input field.`);
        
        // It's often good practice to blur the field or press Enter if the UI reacts to these events
        // await page.keyboard.press('Enter'); // or await page.blur(instancesInputSelector);

        // 5. Verification (highly recommended)
        // Wait a brief moment for any potential debounce or UI update after typing
        //await page.waitForTimeout(200); // Adjust if needed

        const inputValue = await page.evaluate(selector => {
            const el = document.querySelector(selector);
            return el ? el.value : null;
        }, instancesInputSelector);

        if (inputValue === targetValue) {
            console.log(`✅ Number of Instances successfully set to: ${inputValue}`);
        } else {
            console.error(`❌ Verification failed. Expected: "${targetValue}", Actual: "${inputValue}"`);
            // You might want to throw an error here if strict verification is needed
            // throw new Error(`Failed to set Number of Instances. Expected: "${targetValue}", Actual: "${inputValue}"`);
        }

    } catch (error) {
        console.error(`Error in setNumberOfInstances for value "${targetValue}":`, error);
        // Re-throw the error if you want the calling function to handle it
        throw error;
    }
}


async function setTotalInstanceUsageTime(page, hours) {
  const targetValue = String(hours);
  console.log(`⏱️ Setting Usage Hours to: ${targetValue}`);

  try {
    // --- THE FINAL, DIRECT SELECTOR ---
    // This simple CSS selector finds the container div with the unique jsname="bAfJX"
    // and then finds the input inside it. This bypasses all label-finding issues.
    const directSelector = 'div[jsname="bAfJX"] input';
    console.log(`Using final, direct selector: "${directSelector}"`);

    const hoursInput = await page.waitForSelector(directSelector, { visible: true, timeout: 15000 });
    
    // This interaction logic is the most reliable.
    await hoursInput.evaluate(el => el.value = ''); // Clear the field
    await hoursInput.type(targetValue);             // Type the new value

    // Final verification to be certain.
    const finalValue = await hoursInput.evaluate(el => el.value);
    if (finalValue === targetValue) {
        console.log(`✅ Successfully set Usage Hours to: ${finalValue}`);
    } else {
        throw new Error(`Verification failed! Expected "${targetValue}" but the final value was "${finalValue}".`);
    }

  } catch (error) {
    console.error('❌ FATAL ERROR in setUsageHours:');
    console.error(error.message); // This will provide detailed error info.
    throw error;
  }
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



async function selectMachineFamily(page, optionLabel) {
  const dropdownLabel = 'Machine Family';
  // This is the corrected way to create a delay in modern Puppeteer.
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  console.log(`⚙️ Starting selection: Dropdown "${dropdownLabel}" -> Option "${optionLabel}"`);

  // --- Step 1: Find and Click the Dropdown Trigger ---
  const triggerSelector = `aria/${dropdownLabel}[role="combobox"]`;
  try {
    console.log(`-  Trying to click dropdown trigger: "${dropdownLabel}"`);
    await page.waitForSelector(triggerSelector, { visible: true, timeout: 10000 });
    await page.click(triggerSelector);
  } catch (error) {
    console.error(`❌ Could not find or click the dropdown trigger for "${dropdownLabel}".`);
    await page.screenshot({ path: `error_trigger_${dropdownLabel}.png` });
    throw error;
  }

  // --- Step 2: Wait for the Listbox to Appear (CORRECTED & ENHANCED) ---
  console.log('✅ Trigger clicked. Waiting for listbox to appear...');
  const listboxSelector = `ul[role="listbox"][aria-label="${dropdownLabel}"]`;
  try {
    // Using the corrected wait function.
    await wait(500);
    await page.waitForSelector(listboxSelector, { visible: true, timeout: 15000 });
    console.log(`-  Listbox for "${dropdownLabel}" is now visible.`);
  } catch (e) {
    console.error(`❌ CRITICAL ERROR: The dropdown listbox for "${dropdownLabel}" did not appear after clicking the trigger.`);
    await page.screenshot({ path: `error_listbox_not_found_${dropdownLabel}.png` });
    console.log(`-  Screenshot saved to 'error_listbox_not_found_${dropdownLabel}.png'. Review it carefully.`);
    // Re-throwing the original error after logging and screenshotting.
    throw e;
  }

  // --- Step 3: Click the Desired Option with Fallbacks ---
  const dataValue = optionLabel.toLowerCase().replace(/ /g, '-');
  const optionStrategies = [
    { type: 'ARIA Selector', value: `aria/${optionLabel}[role="option"]` },
    { type: 'Data-Value Selector', value: `${listboxSelector} li[role="option"][data-value="${dataValue}"]` }
  ];

  let optionClicked = false;
  for (const strategy of optionStrategies) {
    try {
      console.log(`-  Trying option strategy: "${strategy.type}"`);
      await page.click(strategy.value, { timeout: 5000 });
      optionClicked = true;
      console.log(`-  Success using "${strategy.type}"`);
      break;
    } catch (error) {
      console.log(`-  Strategy "${strategy.type}" failed. Trying next...`);
    }
  }

  if (!optionClicked) {
    await page.screenshot({ path: `error_option_not_clicked_${optionLabel}.png` });
    throw new Error(`❌ All strategies failed to click the option "${optionLabel}".`);
  }

  console.log(`👍 Successfully selected "${dropdownLabel}" -> "${optionLabel}".`);
}




async function selectSeries(page, seriesLabel) {
  const dropdownLabel = 'Series';
  // This is the corrected way to create a delay in modern Puppeteer.
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  console.log(`⚙️ Starting selection: Dropdown "${dropdownLabel}" -> Option "${seriesLabel}"`);

  // --- Step 1: Find and Click the Dropdown Trigger ---
  const triggerSelector = `aria/${dropdownLabel}[role="combobox"]`;
  try {
    console.log(`-  Trying to click dropdown trigger: "${dropdownLabel}"`);
    await page.waitForSelector(triggerSelector, { visible: true, timeout: 10000 });
    await page.click(triggerSelector);
  } catch (error) {
    console.error(`❌ Could not find or click the dropdown trigger for "${dropdownLabel}".`);
    await page.screenshot({ path: `error_trigger_${dropdownLabel}.png` });
    throw error;
  }

  // --- Step 2: Wait for the Listbox to Appear ---
  console.log('✅ Trigger clicked. Waiting for listbox to appear...');
  const listboxSelector = `ul[role="listbox"][aria-label="${dropdownLabel}"]`;
  try {
    await wait(500); // Give animations/network a moment to start.
    await page.waitForSelector(listboxSelector, { visible: true, timeout: 15000 });
    console.log(`-  Listbox for "${dropdownLabel}" is now visible.`);
  } catch (e) {
    console.error(`❌ CRITICAL ERROR: The dropdown listbox for "${dropdownLabel}" did not appear.`);
    await page.screenshot({ path: `error_listbox_not_found_${dropdownLabel}.png` });
    console.log(`-  Screenshot saved to 'error_listbox_not_found_${dropdownLabel}.png'.`);
    throw e;
  }

  // --- Step 3: Click the Desired Option with Fallbacks ---
  const dataValue = seriesLabel.toLowerCase(); // e.g., "A2" -> "a2"
  const optionStrategies = [
    // Primary Strategy: Most reliable as it finds by visible name.
    { type: 'ARIA Selector', value: `aria/${seriesLabel}[role="option"]` },
    // Fallback Strategy: Also excellent, uses the stable `data-value`.
    { type: 'Data-Value Selector', value: `${listboxSelector} li[role="option"][data-value="${dataValue}"]` }
  ];

  let optionClicked = false;
  for (const strategy of optionStrategies) {
    try {
      console.log(`-  Trying option strategy: "${strategy.type}"`);
      await page.click(strategy.value, { timeout: 5000 });
      optionClicked = true;
      console.log(`-  Success using "${strategy.type}"`);
      break;
    } catch (error) {
      console.log(`-  Strategy "${strategy.type}" failed. Trying next...`);
    }
  }

  if (!optionClicked) {
    await page.screenshot({ path: `error_option_not_clicked_${seriesLabel}.png` });
    throw new Error(`❌ All strategies failed to click the option "${seriesLabel}".`);
  }

  console.log(`👍 Successfully selected "${dropdownLabel}" -> "${seriesLabel}".`);
}








async function selectMachineType(page, machineTypeLabel) {
  const dropdownLabel = 'Machine type';
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  console.log(`⚙️ Starting selection: Dropdown "${dropdownLabel}" -> Option "${machineTypeLabel}"`);

  // --- Step 1 & 2: Open Dropdown & Wait for Listbox (Unchanged) ---
  const triggerSelector = `aria/${dropdownLabel}[role="combobox"]`;
  const listboxSelector = `ul[role="listbox"][aria-label="${dropdownLabel}"]`;
  try {
    await page.waitForSelector(triggerSelector, { visible: true, timeout: 10000 });
    await page.click(triggerSelector);
    await wait(500);
    await page.waitForSelector(listboxSelector, { visible: true, timeout: 15000 });
    console.log(`-  Listbox for "${dropdownLabel}" is now visible.`);
  } catch (error) {
    await page.screenshot({ path: `error_during_open_${dropdownLabel}.png` });
    console.error(`❌ Failed to open dropdown or find listbox for "${dropdownLabel}". Screenshot saved.`);
    throw error;
  }

  // --- Step 3: Find and Click the Option ---

  // --- Corrected, direct path for "Custom machine type" ---
  if (machineTypeLabel === 'Custom machine type') {
    console.log(`-  Entering corrected, direct path for "${machineTypeLabel}"...`);
    // THE KEY FIX: Using the correct data-value from the HTML dump.
    const customOptionSelector = `${listboxSelector} li[role="option"][data-value="custom"]`;
    try {
      console.log(`-  Waiting for selector: ${customOptionSelector}`);
      await page.waitForSelector(customOptionSelector, { visible: true, timeout: 5000 });
      await page.click(customOptionSelector);
    } catch(e) {
      await page.screenshot({ path: `error_custom_final_fail.png` });
      console.error(`❌ [Custom Path] Failed to click the custom option even with the correct selector. This is unexpected. Screenshot saved.`);
      throw e;
    }
  } else {
    // --- General bi-directional scroll path for all other machine types ---
    console.log(`-  Entering general scroll search for "${machineTypeLabel}"...`);
    const dataValue = machineTypeLabel;
    const optionSelectorToFind = `li[role="option"][data-value="${dataValue}"]`;

    const foundAndRevealed = await page.evaluate(async (lboxSelector, optSelector) => {
      const waitInBrowser = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const listbox = document.querySelector(lboxSelector);
      if (!listbox) return false;
      
      // Check current -> scroll down -> scroll up
      if (listbox.querySelector(optSelector)) { listbox.querySelector(optSelector).scrollIntoView({ block: 'center' }); return true; }
      for (let i = 0; i < 20; i++) {
        if ((listbox.scrollTop + listbox.clientHeight) >= listbox.scrollHeight) break;
        listbox.scrollTop = listbox.scrollHeight;
        await waitInBrowser(250);
        if (listbox.querySelector(optSelector)) { listbox.querySelector(optSelector).scrollIntoView({ block: 'center' }); return true; }
      }
      listbox.scrollTop = 0;
      await waitInBrowser(500);
      if (listbox.querySelector(optSelector)) { listbox.querySelector(optSelector).scrollIntoView({ block: 'center' }); return true; }
      return false;
    }, listboxSelector, optionSelectorToFind);

    if (!foundAndRevealed) {
      await page.screenshot({ path: `error_option_not_revealed_${machineTypeLabel}.png` });
      throw new Error(`❌ [General Path] Failed to reveal option "${machineTypeLabel}" after full scroll search.`);
    }

    console.log(`-  Option "${machineTypeLabel}" revealed. Clicking...`);
    await wait(500);
    await page.click(`${listboxSelector} ${optionSelectorToFind}`);
  }

  console.log(`👍 Successfully selected "${dropdownLabel}" -> "${machineTypeLabel}"!`);
}




async function setNumberOfvCPUs(page, vcpusToSet) {
  const inputLabelText = 'Number of vCPUs';
  // Based on your latest HTML snippet, the specific ID for vCPUs input is 'c26'
  const specificInputId = 'c26'; // This will be used as a primary selector/fallback

  console.log(`⚙️ Attempting to set "${inputLabelText}" to: ${vcpusToSet}`);

  let inputSelector = null; // This variable will hold the CSS selector for the vCPUs input

  try {
    // --- Selector Strategy (remains robust as discussed) ---
    inputSelector = await page.evaluate((labelText, specificId) => {
      // Prioritize finding by aria-labelledby
      const inputsByAriaLabelledBy = Array.from(document.querySelectorAll('input[type="number"][aria-labelledby]'));
      for (const input of inputsByAriaLabelledBy) {
        const labelId = input.getAttribute('aria-labelledby');
        if (labelId) {
          const labelElement = document.getElementById(labelId);
          if (labelElement && labelElement.innerText.includes(labelText)) {
            return `input[aria-labelledby="${labelId}"][type="number"]`;
          }
        }
      }

      // Fallback 2: Check for direct aria-label
      const directAriaLabelInput = document.querySelector(`input[type="number"][aria-label*="${labelText}" i]`);
      if (directAriaLabelInput) {
        return directAriaLabelInput.id ? `#${directAriaLabelInput.id}` : `input[type="number"][aria-label*="${labelText}" i]`;
      }

      // Fallback 3: Use specificId if known and accessible strategies failed
      if (specificId) {
          const inputById = document.getElementById(specificId);
          if (inputById && inputById.type === 'number') {
              return `#${specificId}`;
          }
      }

      return null; // No suitable input found via preferred strategies
    }, inputLabelText, specificInputId);

    // Final fallback: generic selector (less reliable)
    if (!inputSelector) {
      console.warn(`⚠️ No specific selector found for "${inputLabelText}". Attempting generic number input. This is less reliable.`);
      inputSelector = 'input[type="number"][min][max]';
    }

    if (!inputSelector) {
        throw new Error(`Could not construct a valid input selector for "${inputLabelText}". Please inspect the page's HTML.`);
    }

    // Wait for the determined input element to be visible
    await page.waitForSelector(inputSelector, { visible: true, timeout: 10000 });
    console.log(`- Found input field for "${inputLabelText}" using selector: ${inputSelector}`);

    // --- CRITICAL UPDATE: More Reliable Clearing and Setting ---
    await page.evaluate((selector, newValue) => {
      const input = document.querySelector(selector);
      if (input) {
        // Clear the value directly
        input.value = '';
        // Dispatch an 'input' event to simulate user clearing
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // Set the new value
        input.value = newValue;
        // Dispatch an 'input' event to simulate user typing the new value
        input.dispatchEvent(new Event('input', { bubbles: true }));
        // Dispatch a 'change' event to ensure all listeners react
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, inputSelector, vcpusToSet.toString());
    // --- END CRITICAL UPDATE ---

    console.log(`- Cleared and typed new value: ${vcpusToSet}`);

    // Optional: Still a good idea to blur the element if the UI validates on blur.
    // However, the above events might already trigger validation.
    await page.evaluate(() => {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'INPUT') { // Only blur if it's an input
            activeElement.blur();
        }
    });

  } catch (error) {
    const screenshotName = `error_set_vcpus_${vcpusToSet}_failed.png`; // More specific name
    await page.screenshot({ path: screenshotName });
    console.error(`❌ Failed to set "${inputLabelText}" to "${vcpusToSet}". Screenshot saved: ${screenshotName}`);
    throw error;
  }

  console.log(`👍 Successfully set "${inputLabelText}" to "${vcpusToSet}".`);
}


async function setAmountOfMemory(page, memoryToSet) {
  const inputLabelText = 'Amount of memory';
  const targetInputClass = 'qdOxv-fmcmS-wGMbrd';
  const knownInputId = 'c27';
  const labelElementId = 'ucc-49';

  console.log(`🧠 Attempting to set "${inputLabelText}" to: ${memoryToSet} GiB`);

  let inputHandle = null;

  try {
    // Directly query the input by ID and class combination
    inputHandle = await page.$(`input#${knownInputId}.${targetInputClass}[type="number"]`);
    
    if (!inputHandle) {
      console.warn(`⚠️ Direct selector lookup failed. Falling back to class lookup.`);
      inputHandle = await page.$(`input.${targetInputClass}[type="number"]`);
    }

    if (!inputHandle) {
      console.warn(`⚠️ Class lookup failed. Falling back to XPath.`);
      const xpath = `//input[@type="number" and @id="${knownInputId}"] | //input[@type="number" and contains(@aria-labelledby, "${labelElementId}")]`;
      const handles = await page.$x(xpath);
      if (handles.length > 0) {
        inputHandle = handles[0];
      }
    }

    if (!inputHandle) {
      throw new Error(`Could not locate input element for "${inputLabelText}" after all strategies.`);
    }

    console.log(`- Successfully obtained input element.`);

    // Click on the parent container to ensure input focus
    const containerHandle = await inputHandle.evaluateHandle(el => el.closest('div[jsaction]') || el.parentElement);
    if (containerHandle) {
      await containerHandle.click();
      console.log(`- Clicked container to focus input.`);
    }

    // Clear and set value
    await inputHandle.focus();
    await page.evaluate((input, newValue) => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = newValue;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, inputHandle, memoryToSet.toString());

    console.log(`- Value set to ${memoryToSet}`);

    // Optionally blur to trigger validation
    await inputHandle.evaluate(input => input.blur());

  } catch (error) {
    const screenshotName = `error_set_memory_${memoryToSet}_failed.png`;
    await page.screenshot({ path: screenshotName });
    console.error(`❌ Failed to set memory. Screenshot saved: ${screenshotName}`);
    console.error(`Debug manually by inspecting input#${knownInputId} on ${page.url()}`);
    throw error;
  }

  console.log(`👍 Successfully set "${inputLabelText}" to "${memoryToSet} GiB".`);
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
  const dropdownLabel = 'Committed use discount options';
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // --- Mappings (Kept from your original code for a clean API) ---
  const valueMap = { 'ondemand': 'none', '1year': '1-year', '3year': '3-years' };
  const labelTextMap = { 'ondemand': 'None', '1year': '1 year', '3year': '3 years' };
  const optionLower = option.toLowerCase();
  const dataValue = valueMap[optionLower];
  const labelText = labelTextMap[optionLower];

  if (!dataValue || !labelText) {
    throw new Error(`Invalid committed use discount option provided: ${option}`);
  }

  console.log(`⚙️ Selecting "${dropdownLabel}" -> "${labelText}"`);

  // --- Step 1 & 2: Click Trigger and Wait for Listbox ---
  const triggerSelector = `aria/${dropdownLabel}[role="combobox"]`;
  const listboxSelector = `ul[role="listbox"][aria-label="${dropdownLabel}"]`;
  try {
    await page.waitForSelector(triggerSelector, { visible: true, timeout: 10000 });
    await page.click(triggerSelector);
    await wait(500);
    await page.waitForSelector(listboxSelector, { visible: true, timeout: 15000 });
    console.log(`-  Listbox for "${dropdownLabel}" is now visible.`);
  } catch (error) {
    await page.screenshot({ path: `error_open_${dropdownLabel}.png` });
    console.error(`❌ Failed to open dropdown for "${dropdownLabel}". Screenshot saved.`);
    throw error;
  }

  // --- Step 3: Click the Desired Option ---
  // This dropdown is short, so no complex scrolling is needed. We can use our reliable
  // multi-strategy click to be extra safe.
  const optionStrategies = [
    { type: 'ARIA Selector', value: `aria/${labelText}[role="option"]` },
    { type: 'Data-Value Selector', value: `${listboxSelector} li[role="option"][data-value="${dataValue}"]` }
  ];

  let optionClicked = false;
  for (const strategy of optionStrategies) {
    try {
      console.log(`-  Trying to click with strategy: "${strategy.type}"`);
      await page.click(strategy.value, { timeout: 5000 });
      optionClicked = true;
      console.log(`-  Success using "${strategy.type}"`);
      break;
    } catch (error) {
      console.log(`-  Strategy "${strategy.type}" failed. Trying next...`);
    }
  }

  if (!optionClicked) {
    await page.screenshot({ path: `error_option_not_clicked_${option}.png` });
    throw new Error(`❌ All strategies failed to click the option "${labelText}".`);
  }

  console.log(`👍 Successfully selected committed use discount: "${labelText}"`);
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
        headless: true ,
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
      if (row["Avg no. of hrs"] < 730) 
      {
      await setTotalInstanceUsageTime(page,row["Avg no. of hrs"]);
      }
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
      await setNumberOfInstances(page, row["No. of Instances"]);
      {
        await setTotalInstanceUsageTime(page,row["Avg no. of hrs"]);
        }

    
      //await setBootDiskSize(page,Number(row["BootDisk Capacity"]));
      
      
      if (row["mode"]==="sud"){
        //await toggleSustainedUseDiscount(page);
      }
      
      await sleep(2000);
      if (row["Datacenter Location"]!== "us-central1") {
      await selectRegion(page,row["Datacenter Location"]);
      }
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