const express = require('express');
const puppeteer = require('puppeteer');
const HLSDownloader = require('./hls-downloader');


// Crea la instancia de la aplicación Express
const app = express();

// Configura las rutas
app.use(express.urlencoded({ extended: true }));
app.use(express.json());



async function getPlaylistUrls(tweetUrl) {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });
  const page = await browser.newPage();

  const playlistUrls = {};
  let lastInterceptedTimestamp = Date.now();
  const maxWaitTime = 10000;

  await page.setRequestInterception(true);
  page.on('request', (interceptedRequest) => {
    if (interceptedRequest.isInterceptResolutionHandled()) return;
    const requestUrl = interceptedRequest.url();

    if (requestUrl.endsWith('.m3u8?container=fmp4')) {
      const resolutionMatch = requestUrl.match(/(\d+x\d+)/);
      if (resolutionMatch) {
        const resolution = resolutionMatch[0];
        playlistUrls[resolution] = requestUrl;
        lastInterceptedTimestamp = Date.now();
      }
    }

    interceptedRequest.continue();
  });

  await page.goto(tweetUrl);

  while (Date.now() - lastInterceptedTimestamp < maxWaitTime) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  await browser.close();

  return playlistUrls;
}


app.get('/', (req, res) => {
  res.send(`
  <form action="/download" method="post" onsubmit="event.preventDefault(); submitForm();">
    <label for="tweetUrl">Tweet URL:</label>
    <input type="text" id="tweetUrl" name="tweetUrl" required>
    <button type="submit">Get resolutions</button>
  </form>
  <script>
    async function submitForm() {
      const tweetUrl = document.getElementById('tweetUrl').value;
      const response = await fetch('/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tweetUrl }),
      });
      const html = await response.text();
      document.body.innerHTML = html;
    }
  </script>
`);

});

app.post('/download', async (req, res) => {
  const tweetUrl = req.body.tweetUrl;
  const playlistUrls = await getPlaylistUrls(tweetUrl);

  let optionsHtml = '';
  for (const resolution in playlistUrls) {
    optionsHtml += `<option value="${playlistUrls[resolution]}">${resolution}</option>`;
  }

  res.send(`
    <form action="/download-video" method="post">
      <label for="playlistUrl">Select resolution:</label>
      <select name="playlistUrl" required>
        ${optionsHtml}
      </select>
      <button type="submit">Download video</button>
    </form>
  `);
});

app.post('/download-video', async (req, res) => {
  const playlistUrl = req.body.playlistUrl;
  const downloader = new HLSDownloader();

  try {
    const videoStream = await downloader.start(playlistUrl);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename=output.mp4');
    videoStream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error downloading video');
  }
});

// Inicia el servidor Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
