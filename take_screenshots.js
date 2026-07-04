import puppeteer from 'puppeteer';
import fs from 'fs';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  fs.mkdirSync('docs/screenshots', { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log('1. Capturing Landing Page...');
  // Mobile Landing
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: 'docs/screenshots/landing_mobile.png' });

  // Desktop Landing
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: 'docs/screenshots/landing_desktop.png' });

  console.log('2. Capturing Auth Page...');
  // Desktop Auth
  await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.screenshot({ path: 'docs/screenshots/auth_desktop.png' });

  // Mobile Auth
  await page.setViewport({ width: 375, height: 812 });
  await delay(500);
  await page.screenshot({ path: 'docs/screenshots/auth_mobile.png' });

  console.log('3. Logging in...');
  // Fill login
  await page.type('#email', 'owner@kantami.com');
  await page.type('#password', 'password123');
  await page.click('.btn-submit-auth');
  await delay(3000); // Wait for auth session and redirect to /dashboard

  console.log('4. Capturing Dashboard Profile...');
  // Mobile Dashboard Profile
  await page.setViewport({ width: 375, height: 812 });
  await delay(1000);
  await page.screenshot({ path: 'docs/screenshots/dashboard_profile_mobile.png' });

  // Desktop Dashboard Profile
  await page.setViewport({ width: 1280, height: 800 });
  await delay(1000);
  await page.screenshot({ path: 'docs/screenshots/dashboard_profile_desktop.png' });

  console.log('5. Capturing Dashboard Menu...');
  // Click Menu Tab
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.nav-item'));
    const menuTab = items.find(item => item.textContent.includes('Menu management'));
    if (menuTab) menuTab.click();
  });
  await delay(1500);
  await page.screenshot({ path: 'docs/screenshots/dashboard_menu_desktop.png' });

  // Mobile Menu Tab
  await page.setViewport({ width: 375, height: 812 });
  // open sidebar if closed
  await page.evaluate(() => {
    const toggle = document.querySelector('.sidebar-mobile-toggle');
    if (toggle) toggle.click();
  });
  await delay(500);
  await page.screenshot({ path: 'docs/screenshots/dashboard_menu_mobile.png' });

  console.log('5b. Capturing Dashboard QR Code Tab...');
  // Desktop QR Code Tab
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.nav-item'));
    const qrTab = items.find(item => item.textContent.includes('QR Code'));
    if (qrTab) qrTab.click();
  });
  await delay(1500);
  await page.screenshot({ path: 'docs/screenshots/dashboard_qr_desktop.png' });

  // Mobile QR Code Tab
  await page.setViewport({ width: 375, height: 812 });
  await page.evaluate(() => {
    const toggle = document.querySelector('.sidebar-mobile-toggle');
    if (toggle) toggle.click();
  });
  await delay(500);
  await page.screenshot({ path: 'docs/screenshots/dashboard_qr_mobile.png' });

  console.log('6. Capturing Dashboard Analytics...');
  // Desktop Analytics Tab
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.nav-item'));
    const analyticsTab = items.find(item => item.textContent.includes('Analytics'));
    if (analyticsTab) analyticsTab.click();
  });
  await delay(1500);
  await page.screenshot({ path: 'docs/screenshots/dashboard_analytics_desktop.png' });

  // Mobile Analytics Tab
  await page.setViewport({ width: 375, height: 812 });
  await page.evaluate(() => {
    const toggle = document.querySelector('.sidebar-mobile-toggle');
    if (toggle) toggle.click();
  });
  await delay(500);
  await page.screenshot({ path: 'docs/screenshots/dashboard_analytics_mobile.png' });

  console.log('7. Capturing Public Menu (Kantami)...');
  // Desktop Public Menu
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/menu/kantami', { waitUntil: 'networkidle2' });
  await delay(2000);
  await page.screenshot({ path: 'docs/screenshots/menu_kantami_desktop.png' });

  // Mobile Public Menu
  await page.setViewport({ width: 375, height: 812 });
  await delay(1000);
  await page.screenshot({ path: 'docs/screenshots/menu_kantami_mobile.png' });

  console.log('7b. Capturing Public Menu Search-Active State...');
  // Mobile Public Menu Search
  await page.setViewport({ width: 375, height: 812 });
  await page.type('.menu-search-input', 'shawarma');
  await delay(500);
  await page.screenshot({ path: 'docs/screenshots/menu_kantami_search_mobile.png' });

  console.log('8. Capturing Product Detail Page (Hummus)...');
  // Desktop Product Detail
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/menu/kantami/product/p-1', { waitUntil: 'networkidle2' });
  await delay(2000);
  await page.screenshot({ path: 'docs/screenshots/product_detail_desktop.png' });

  // Mobile Product Detail
  await page.setViewport({ width: 375, height: 812 });
  await delay(1000);
  await page.screenshot({ path: 'docs/screenshots/product_detail_mobile.png' });

  console.log('Screenshots completed!');
  await browser.close();
})();
