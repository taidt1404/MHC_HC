const test = require('node:test');
const assert = require('node:assert/strict');
const { createCache } = require('../src/services/cache');
const { isValidUuid, partitionQueueRows, createQueueService } = require('../src/services/queueService');
const { createApp } = require('../src/app');

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
  assert.equal(isValidUuid(''), false);
});

test('partitionQueueRows separates calling, waiting, waitingResult, and missed', () => {
  const rows = [
    {
      patient_id: '1',
      patient_name: 'MẪN THỊ HOA',
      seq_num: '03',
      active_flag: 2,
      priority: false,
      age: 55,
      year_of_birth: 1971,
      gender: 0,
      ipd_queue_flag: false,
      recomment: null,
    },
    {
      patient_id: '2',
      patient_name: 'ĐẶNG THỊ LỰC',
      seq_num: '05',
      active_flag: 1,
      priority: true,
      age: 84,
      year_of_birth: 1942,
      gender: 0,
      ipd_queue_flag: true,
      recomment: null,
    },
    {
      patient_id: '3',
      patient_name: 'NGUYỄN VĂN A',
      seq_num: '06',
      active_flag: 6,
      priority: false,
      age: 30,
      year_of_birth: 1996,
      gender: 1,
      ipd_queue_flag: false,
      recomment: 'Chờ X-Quang',
    },
    {
      patient_id: '4',
      patient_name: 'NGUYỄN VĂN B',
      seq_num: '01',
      active_flag: 10,
      priority: false,
      age: 25,
      year_of_birth: 2001,
      gender: 1,
      ipd_queue_flag: false,
      recomment: null,
    },
  ];
  const result = partitionQueueRows(rows);
  assert.equal(result.calling.length, 1);
  assert.equal(result.calling[0].patient_name, 'MẪN THỊ HOA');
  assert.equal(result.waiting.length, 1);
  assert.equal(result.waiting[0].patient_name, 'ĐẶNG THỊ LỰC');
  assert.equal(result.waitingResult.length, 1);
  assert.equal(result.missed.length, 1);
  assert.deepEqual(result.summary, {
    total: 3,
    calling_count: 1,
    waiting_count: 1,
    waiting_result_count: 1,
  });
});

test('Express API endpoints return expected status codes and payloads', async () => {
  const mockService = {
    checkHealth: async () => ({ status: 'ok', db: true, timestamp: '2026-11-17T10:00:00.000Z' }),
    listAreas: async () => [
      {
        area_id: '73c84d7a-b0a4-4e71-981a-ff8d94641cf1',
        area_name: 'Phòng nội soi tiêu hóa P311',
        area_type_rcd: 'RAR',
        short_code: 'P311',
        queue_type: 'subclinical',
        waiting_count: 4,
        calling_count: 1,
      },
    ],
    getQueueByAreaId: async (areaId) => {
      if (areaId === '73c84d7a-b0a4-4e71-981a-ff8d94641cf1') {
        return {
          area: {
            area_id: areaId,
            area_name: 'Phòng nội soi tiêu hóa P311',
            area_type_rcd: 'RAR',
            queue_type: 'subclinical',
            doctor_name: null,
            nurse_name: null,
          },
          summary: { total: 1, calling_count: 0, waiting_count: 1, waiting_result_count: 0 },
          calling: [],
          waiting: [{ patient_id: 'p1', patient_name: 'TẠ THỊ LAN', seq_num: '28', age: 38 }],
          waitingResult: [],
          missed: [],
          updated_at: '2026-11-17T10:00:00.000Z',
        };
      }
      return null;
    },
  };

  const app = createApp(mockService, null);
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthBody = await healthRes.json();
    assert.equal(healthBody.status, 'ok');

    const areasRes = await fetch(`${baseUrl}/api/areas`);
    assert.equal(areasRes.status, 200);
    const areasBody = await areasRes.json();
    assert.equal(areasBody.areas.length, 1);

    const invalidRes = await fetch(`${baseUrl}/api/queue/invalid-uuid`);
    assert.equal(invalidRes.status, 400);

    const notFoundRes = await fetch(`${baseUrl}/api/queue/00000000-0000-4000-0000-000000000099`);
    assert.equal(notFoundRes.status, 404);

    const okRes = await fetch(`${baseUrl}/api/queue/73c84d7a-b0a4-4e71-981a-ff8d94641cf1`);
    assert.equal(okRes.status, 200);
    const okBody = await okRes.json();
    assert.equal(okBody.waiting[0].patient_name, 'TẠ THỊ LAN');
  } finally {
    server.close();
  }
});
