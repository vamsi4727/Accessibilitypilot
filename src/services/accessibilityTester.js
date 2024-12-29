import { chromium } from 'playwright';
import axeCore from 'axe-core';

async function runAccessibilityTests(url) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url);
    
    // Inject and run axe-core
    await page.evaluate(axeCore.source);
    const results = await page.evaluate(() => {
      return new Promise(resolve => {
        window.axe.run(document, (err, results) => {
          if (err) throw err;
          resolve(results);
        });
      });
    });

    return results;
  } finally {
    await browser.close();
  }
}

export { runAccessibilityTests };