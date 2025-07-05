const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));

const ACCESS_FILE = './access.json';
let accessData = {};

// Load access codes
function loadAccessData() {
  try {
    accessData = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf-8'));
  } catch (e) {
    console.error('❌ Failed to load access.json:', e.message);
    accessData = {};
  }
}
loadAccessData();

// Save updated access usage
function saveAccessData() {
  fs.writeFileSync(ACCESS_FILE, JSON.stringify(accessData, null, 2));
}

app.post('/comment', upload.single('npFile'), async (req, res) => {
  const { postLink, cookie, password, names, accessCode, delay } = req.body;
  const file = req.file;
  const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (password !== 'RUDRA') return res.send('❌ Invalid password');
  if (!file || !names || !accessCode || !cookie || !postLink) {
    return res.send('❌ Missing required fields');
  }

  const code = accessCode.trim();
  const entry = accessData[code];

  // Access logic
  if (code === 'RUDRAOWNER2025') {
    console.log(`✅ Owner access from ${userIP}`);
  } else if (!entry) {
    return res.send('❌ Invalid access code.');
  } else if (entry.used && entry.ip !== userIP) {
    return res.send('❌ This code is already used by another IP.');
  } else {
    accessData[code] = { used: true, ip: userIP };
    saveAccessData();
  }

  const comments = fs.readFileSync(file.path, 'utf-8').split('\n').filter(Boolean);
  const nameList = names.split(/[, \n]+/).filter(Boolean);
  if (nameList.length === 0) return res.send('❌ No valid names provided');

  const delayTime = parseInt(delay) || 3000;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    const cookies = JSON.parse(cookie);
    await page.setCookie(...cookies);
    await page.goto(postLink, { waitUntil: 'networkidle2', timeout: 60000 });

    // 1 Screenshot for confirmation
    await page.screenshot({ path: 'post-screenshot.png' });
    console.log("📸 Screenshot saved: post-screenshot.png");

    let nameIndex = 0;
    for (let comment of comments) {
      const name = nameList[nameIndex % nameList.length];
      const finalComment = `${name}: ${comment}`;

      try {
        await page.waitForSelector('div[contenteditable="true"]', { timeout: 15000 });
        await page.evaluate(() => {
          document.querySelector('div[contenteditable="true"]').scrollIntoView();
        });
        await page.type('div[contenteditable="true"]', finalComment);
        await page.keyboard.press('Enter');
        console.log("✅ Commented:", finalComment);
        await new Promise(r => setTimeout(r, delayTime));
      } catch (err) {
        console.error('❌ Comment failed:', finalComment, err.message);
      }
      nameIndex++;
    }

    await browser.close();
    res.send('✅ All comments attempted. Screenshot taken ✅');
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.send('❌ Failed: ' + err.message);
  }
});

app.listen(8080, () => console.log('🚀 Server running on http://localhost:8080'));
