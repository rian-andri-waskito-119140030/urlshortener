require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dns = require('dns').promises;
const urlparser = require('url');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Log the MONGO_URI for debugging
console.log('MONGO_URI:', process.env.MONGO_URI);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err.message));

// Define URL Schema and Model
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true }
});

const URL = mongoose.model('URL', urlSchema);

let shortUrlCounter = 1;

// POST endpoint to create short URL
app.post('/api/shorturl', async function(req, res) {
  const originalUrl = req.body.url;
  const urlObj = urlparser.parse(originalUrl);

  try {
    await dns.lookup(urlObj.hostname);

    const foundUrl = await URL.findOne({ original_url: originalUrl });

    if (foundUrl) {
      return res.json({ original_url: foundUrl.original_url, short_url: foundUrl.short_url });
    } else {
      const newUrl = new URL({ original_url: originalUrl, short_url: shortUrlCounter++ });
      const savedUrl = await newUrl.save();
      return res.json({ original_url: savedUrl.original_url, short_url: savedUrl.short_url });
    }
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }
});

// GET endpoint to redirect to original URL
app.get('/api/shorturl/:short_url', async function(req, res) {
  const shortUrl = parseInt(req.params.short_url);

  try {
    const foundUrl = await URL.findOne({ short_url: shortUrl });

    if (!foundUrl) {
      return res.json({ error: 'No short URL found for the given input' });
    }
    res.redirect(foundUrl.original_url);
  } catch (err) {
    return res.json({ error: 'No short URL found for the given input' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
