require('dotenv').config();
const { createDbPool } = require('./src/config/db');
const { createCache } = require('./src/services/cache');
const { createQueueService } = require('./src/services/queueService');
const { createApp } = require('./src/app');

const port = Number(process.env.PORT || 55637);
const dbPool = createDbPool();
const cache = createCache(1500);
const queueService = createQueueService(dbPool, cache);
const app = createApp(queueService);

app.listen(port, '0.0.0.0', () => {
  console.log(`[MHC Server] Đang chạy tại http://localhost:${port}`);
});
