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
  const { postLink, cookie, password, names, accessCode } = req.body;
  const file = req.file;
  const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (password !== 'RUDRA') return res.send('❌ Invalid password');
  if (!file || !names || !accessCode) return res.send('❌ Missing file, names or access code');

  // Check access code
  const code = accessCode.trim();
  const entry = accessData[code];

  if (code === 'RUDRAOWNER2025') {
    console.log(`✅ Owner access from ${userIP}`);
  } else if (!entry) {
    return res.send('❌ Invalid access code.');
  } else if (entry.used && entry.ip !== userIP) {
    return res.send('❌ This code is already used by another IP.');
  } else {
    // Bind code to IP
    accessData[code] = { used: true, ip: userIP };
    saveAccessData();
  }

  const comments = fs.readFileSync(file.path, 'utf-8').split('\n').filter(Boolean);
  const nameList = names.split(/[, \n]+/).filter(Boolean);
  if (nameList.length === 0) return res.send('❌ No valid names provided');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const cookies = JSON.parse(cookie);
    await page.setCookie(...cookies);
    await page.goto(postLink, { waitUntil: 'networkidle2' });

    let nameIndex = 0;
    for (let comment of comments) {
      const name = nameList[nameIndex % nameList.length];
      const finalComment = `${name}: ${comment}`;
      try {
        await page.waitForSelector('div[contenteditable="true"]', { timeout: 10000 });
        await page.type('div[contenteditable="true"]', finalComment);
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 3000));
      } catch (err) {
        console.error('❌ Comment failed:', err);
      }
      nameIndex++;
    }

    await browser.close();
    res.send('✅ All comments attempted.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.send('❌ Failed: ' + err.message);
  }
});

app.listen(8080, () => console.log('🚀 Server running on http://localhost:8080'));
