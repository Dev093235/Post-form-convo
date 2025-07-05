// server.js const express = require('express'); const multer = require('multer'); const fs = require('fs'); const path = require('path'); const bodyParser = require('body-parser'); const puppeteer = require('puppeteer');

const app = express(); const upload = multer({ dest: 'uploads/' });

app.use(express.static(__dirname)); app.use(bodyParser.urlencoded({ extended: true }));

app.post('/comment', upload.single('npFile'), async (req, res) => { const { postLink, cookie, password } = req.body; const file = req.file;

if (password !== 'RUDRA') return res.send('❌ Invalid password'); if (!file) return res.send('❌ np.txt file missing');

const comments = fs.readFileSync(file.path, 'utf-8').split('\n').filter(Boolean); const browser = await puppeteer.launch({ headless: true }); const page = await browser.newPage();

try { const cookies = JSON.parse(cookie); await page.setCookie(...cookies); await page.goto(postLink, { waitUntil: 'networkidle2' });

for (let comment of comments) {
  try {
    await page.waitForSelector('div[contenteditable="true"]', { timeout: 10000 });
    await page.type('div[contenteditable="true"]', comment);
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 3000));
  } catch (err) {
    console.error('Comment failed:', err);
  }
}

await browser.close();
res.send('✅ All comments attempted.');

} catch (err) { console.error(err); res.send('❌ Error occurred: ' + err.message); } });

app.listen(8080, () => console.log('🚀 Server running on http://localhost:8080'));

