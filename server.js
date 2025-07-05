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

function loadAccessData() {
  try {
    accessData = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf-8'));
  } catch (e) {
    console.error('❌ Failed to load access.json:', e.message);
    accessData = {};
  }
}
loadAccessData();

function saveAccessData() {
  fs.writeFileSync(ACCESS_FILE, JSON.stringify(accessData, null, 2));
}

app.post('/comment', upload.single('npFile'), async (req, res) => {
  const { postLink, cookie, password, names, accessCode, delay } = req.body;
  const file = req.file;
  const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (password !== 'RUDRA') return res.send('❌ Invalid password');
  if (!file || !names || !accessCode) return res.send('❌ Missing fields');

  const code = accessCode.trim();
  const entry = accessData[code];

  if (code === 'RUDRAOWNER2025') {
    console.log(`✅ Owner access from ${userIP}`);
  } else if (!entry) {
    return res.send('❌ Invalid access code.');
  } else if (entry.used && entry.ip !== userIP) {
    return res.send('❌ Code already used on another IP.');
  } else {
    accessData[code] = { used: true, ip: userIP };
    saveAccessData();
  }

  const comments = fs.readFileSync(file.path, 'utf-8').split('\n').filter(Boolean);
  const nameList = names.split(/[, \n]+/).filter(Boolean);
  if (nameList.length === 0) return res.send('❌ No valid names provided');

  const delayTime = parseInt(delay) || 3000;

  try {
    // ✅ STEP 1: HEADLESS MODE FOR FIRST COMMENT (Render-compatible)
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const cookies = JSON.parse(cookie);
    await page.setCookie(...cookies);
    await page.goto(postLink, { waitUntil: 'networkidle2' });

    const name = nameList[0];
    const firstComment = `${name}: ${comments[0]}`;
    await page.waitForSelector('div[contenteditable="true"]', { timeout: 10000 });
    await page.type('div[contenteditable="true"]', firstComment);
    await page.keyboard.press('Enter');
    console.log("🟢 First comment posted (headless):", firstComment);

    await new Promise(r => setTimeout(r, 5000)); // Optional wait
    await browser.close();

    // ✅ STEP 2: BACKGROUND COMMENTS
    const browser2 = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page2 = await browser2.newPage();
    await page2.setCookie(...cookies);
    await page2.goto(postLink, { waitUntil: 'networkidle2' });

    let nameIndex = 1;
    for (let i = 1; i < comments.length; i++) {
      const comment = comments[i];
      const name = nameList[nameIndex % nameList.length];
      const finalComment = `${name}: ${comment}`;
      try {
        await page2.waitForSelector('div[contenteditable="true"]', { timeout: 10000 });
        await page2.type('div[contenteditable="true"]', finalComment);
        await page2.keyboard.press('Enter');
        console.log('✅ Commented:', finalComment);
        await new Promise(r => setTimeout(r, delayTime));
      } catch (err) {
        console.error('❌ Comment failed:', err.message);
      }
      nameIndex++;
    }

    await browser2.close();
    res.send('✅ Pehla comment headless me hua. Baaki sab background me post ho gaye.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.send('❌ Failed: ' + err.message);
  }
});

app.listen(8080, () => console.log('🚀 Server running on http://localhost:8080'));
