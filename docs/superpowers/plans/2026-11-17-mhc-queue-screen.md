# MHC Queue Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, real-time Hospital Queue Display System (MHC) with a read-only Node.js/PostgreSQL backend and a 2-column TV-optimized ReactJS frontend compatible with HIS routes (`/subclinical-queue/:areaId`, `/clinical-queue/:areaId`, and `/`).

**Architecture:** A monorepo at `D:\WorkSpace\Projects\MHC` containing `server/` (Express + `pg` + 1.5s TTL cache + SPA static file serving) and `client/` (React 19 + Vite + React Router + Web Audio API chime + auto-scrolling waiting list). The backend runs read-only SQL directly against the HIS PostgreSQL database, solving inpatient visibility, multi-service `active_status = false` bugs, and cross-day orders without requiring HIS token authentication.

**Tech Stack:** Node.js v26+, Express 4, `pg`, `cors`, `dotenv`, React 18/19, React Router DOM 6/7, Vite.

## Global Constraints

- Database access MUST be 100% read-only (`SELECT` only).
- Database credentials MUST be loaded from environment variables (`server/.env`), and `.env` MUST be listed in `.gitignore`.
- Routes MUST match HIS conventions: `/`, `/subclinical-queue/:areaId`, `/clinical-queue/:areaId`.
- Server port defaults to `55637` (configurable via `PORT`).
- Cache TTL is `1500ms` per key; frontend polling interval is `3000ms`.

---

### Task 1: Backend Foundation, TTL Cache & Queue Service

**Files:**
- Create: `D:\WorkSpace\Projects\MHC\.gitignore`
- Create: `D:\WorkSpace\Projects\MHC\server\package.json`
- Create: `D:\WorkSpace\Projects\MHC\server\.env.example`
- Create: `D:\WorkSpace\Projects\MHC\server\src\config\db.js`
- Create: `D:\WorkSpace\Projects\MHC\server\src\services\cache.js`
- Create: `D:\WorkSpace\Projects\MHC\server\src\services\queueService.js`
- Test: `D:\WorkSpace\Projects\MHC\server\test\queueService.test.js`

**Interfaces:**
- Produces:
  - `createCache(ttlMs)` -> `{ get(key), set(key, value), clear() }`
  - `isValidUuid(value)` -> `boolean`
  - `partitionQueueRows(rows)` -> `{ calling, waiting, waitingResult, missed, summary }`
  - `createQueueService(dbPool, cache)` -> `{ checkHealth(), listAreas(), getQueueByAreaId(areaId) }`

- [ ] **Step 1: Create `.gitignore`, `server/package.json`, and `server/.env.example`**

```gitignore
node_modules/
dist/
.env
*.log
```

```json
{
  "name": "mhc-server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node index.js",
    "test": "node --test test/*.test.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "pg": "^8.13.3"
  }
}
```

- [ ] **Step 2: Write unit tests in `server/test/queueService.test.js`**

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const { createCache } = require('../src/services/cache');
const { isValidUuid, partitionQueueRows, createQueueService } = require('../src/services/queueService');

test('createCache stores and expires entries', async () => {
  const cache = createCache(50);
  cache.set('k1', { ok: true });
  assert.deepEqual(cache.get('k1'), { ok: true });
  await new Promise((r) => setTimeout(r, 70));
  assert.equal(cache.get('k1'), null);
});

test('isValidUuid validates standard UUID strings', () => {
  assert.equal(isValidUuid('73c84d7a-b0a4-4e71-981a-ff8d94641cf1'), true);
  assert.equal(isValidUuid('00000000-0000-4000-0000-000000000000'), true);
  assert.equal(isValidUuid('not-a-uuid'), false);
});

test('partitionQueueRows separates calling, waiting, waitingResult, and missed', () => {
  const rows = [
    { patient_id: '1', patient_name: 'A', seq_num: '03', active_flag: 2, priority: false, age: 55, year_of_birth: 1971, gender: 0, ipd_queue_flag: false, recomment: null },
    { patient_id: '2', patient_name: 'B', seq_num: '05', active_flag: 1, priority: true, age: 40, year_of_birth: 1986, gender: 1, ipd_queue_flag: true, recomment: null },
    { patient_id: '3', patient_name: 'C', seq_num: '06', active_flag: 6, priority: false, age: 30, year_of_birth: 1996, gender: 0, ipd_queue_flag: false, recomment: 'X-Quang' },
    { patient_id: '4', patient_name: 'D', seq_num: '01', active_flag: 10, priority: false, age: 25, year_of_birth: 2001, gender: 1, ipd_queue_flag: false, recomment: null },
  ];
  const result = partitionQueueRows(rows);
  assert.equal(result.calling.length, 1);
  assert.equal(result.waiting.length, 1);
  assert.equal(result.waitingResult.length, 1);
  assert.equal(result.missed.length, 1);
  assert.deepEqual(result.summary, {
    total: 3,
    calling_count: 1,
    waiting_count: 1,
    waiting_result_count: 1,
  });
});
```

- [ ] **Step 3: Implement `server/src/config/db.js`, `server/src/services/cache.js`, and `server/src/services/queueService.js`**

- [ ] **Step 4: Run `npm test` in `server/` to verify unit tests pass**

---

### Task 2: Express App, REST Endpoints & API Integration Tests

**Files:**
- Create: `D:\WorkSpace\Projects\MHC\server\src\routes\api.js`
- Create: `D:\WorkSpace\Projects\MHC\server\src\app.js`
- Create: `D:\WorkSpace\Projects\MHC\server\index.js`
- Modify: `D:\WorkSpace\Projects\MHC\server\test\queueService.test.js`

**Interfaces:**
- Consumes: `createQueueService`, `isValidUuid`
- Produces:
  - `createApp(queueService, clientDistPath)` -> Express application
  - `GET /api/health`
  - `GET /api/areas`
  - `GET /api/queue/:areaId`

- [ ] **Step 1: Add HTTP route tests to `server/test/queueService.test.js`**
- [ ] **Step 2: Implement `server/src/routes/api.js`, `server/src/app.js`, and `server/index.js`**
- [ ] **Step 3: Run `npm test` in `server/` and verify all tests pass**
- [ ] **Step 4: Commit backend implementation**

---

### Task 3: Frontend ReactJS (Vite) Application & Production Build

**Files:**
- Create: `D:\WorkSpace\Projects\MHC\client\package.json`
- Create: `D:\WorkSpace\Projects\MHC\client\vite.config.js`
- Create: `D:\WorkSpace\Projects\MHC\client\index.html`
- Create: `D:\WorkSpace\Projects\MHC\client\src\main.jsx`
- Create: `D:\WorkSpace\Projects\MHC\client\src\App.jsx`
- Create: `D:\WorkSpace\Projects\MHC\client\src\index.css`
- Create: `D:\WorkSpace\Projects\MHC\client\src\api\queueApi.js`
- Create: `D:\WorkSpace\Projects\MHC\client\src\utils\sound.js`
- Create: `D:\WorkSpace\Projects\MHC\client\src\components\HeaderBar.jsx`
- Create: `D:\WorkSpace\Projects\MHC\client\src\components\CallingPanel.jsx`
- Create: `D:\WorkSpace\Projects\MHC\client\src\components\WaitingListPanel.jsx`
- Create: `D:\WorkSpace\Projects\MHC\client\src\pages\AreaSelectorPage.jsx`
- Create: `D:\WorkSpace\Projects\MHC\client\src\pages\QueueScreenPage.jsx`

**Interfaces:**
- Consumes: `GET /api/areas`, `GET /api/queue/:areaId`
- Produces:
  - `/` -> `AreaSelectorPage`
  - `/subclinical-queue/:areaId` -> `QueueScreenPage`
  - `/clinical-queue/:areaId` -> `QueueScreenPage`
  - Built static bundle at `D:\WorkSpace\Projects\MHC\client\dist`

- [ ] **Step 1: Create `client/` Vite + React configuration and install dependencies**
- [ ] **Step 2: Implement API client, Web Audio Ding-Dong chime, HeaderBar, CallingPanel, WaitingListPanel, AreaSelectorPage, and QueueScreenPage**
- [ ] **Step 3: Run `npm run build` in `client/` and verify static assets compile cleanly**
- [ ] **Step 4: Verify end-to-end server + live DB integration with P311 (`73c84d7a-b0a4-4e71-981a-ff8d94641cf1`) and P302 (`50a1993f-c63d-4a09-accb-2cda6d788a5c`)**
- [ ] **Step 5: Commit frontend implementation**
