const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const path = require("path");
const { parseCookies } = require("./cookies");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/comment", async (req, res) => {
  const { postLink, commentText, cookie, password } = req.body;
  if (password !== "RUDRA") return res.status(403).send("❌ Wrong password.");

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    const cookies = parseCookies(cookie, ".facebook.com");
    await page.setCookie(...cookies);

    await page.goto(postLink, { waitUntil: "networkidle2" });

    await page.waitForSelector('[aria-label="Write a comment"]', { timeout: 10000 });
    await page.click('[aria-label="Write a comment"]');
    await page.keyboard.type(commentText);
    await page.keyboard.press("Enter");

    await browser.close();
    res.send("✅ Comment posted successfully!");
  } catch (error) {
    console.error("❌ Error posting comment:", error);
    res.status(500).send("❌ Failed to post comment. " + error.toString());
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));