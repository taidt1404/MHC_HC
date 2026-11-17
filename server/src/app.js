const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');
const { createApiRouter } = require('./routes/api');

function createApp(queueService, clientDistPath = path.join(__dirname, '../../client/dist')) {
  const app = express();

  app.use(cors());
  app.use(express.json());

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
