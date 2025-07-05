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

app.post('/comment', upload.single('npFile'), async (req, res) => {
  const { postLink, cookie, password, names } = req.body;
  const file = req.file;

  if (password !== 'RUDRA') return res.send('❌ Invalid password');
  if (!file || !names) return res.send('❌ Missing np.txt file or names');

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
        console.error('Comment failed:', err);
      }
      nameIndex++;
    }

    await browser.close();
    res.send('✅ All comments attempted.');
  } catch (err) {
    console.error(err);
    res.send('❌ Error occurred: ' + err.message);
  }
});

app.listen(8080, () => console.log('🚀 Server running on http://localhost:8080'));
