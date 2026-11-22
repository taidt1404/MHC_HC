const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');
const { createApiRouter } = require('./routes/api');

function createApp(queueService, clientDistPath = path.join(__dirname, '../../client/dist')) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Direct download route for the Chrome Extension zip package
  app.get('/mhc-extension.zip', (req, res) => {
    const candidates = [
      path.join(clientDistPath, 'mhc-extension.zip'),
      path.join(__dirname, '../../mhc-extension.zip'),
      path.join(__dirname, '../../release/client/dist/mhc-extension.zip'),
      path.join(__dirname, '../../client/public/mhc-extension.zip'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return res.download(p, 'mhc-extension.zip');
      }
    }
    return res.status(404).send('Không tìm thấy file mhc-extension.zip');
  });

  app.use('/api', createApiRouter(queueService));

  if (clientDistPath && fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  return app;
}

module.exports = { createApp };
