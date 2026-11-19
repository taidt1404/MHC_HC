const test = require('node:test');
const assert = require('node:assert/strict');
const { createQueueService, isValidUuid } = require('../src/services/queueService');
const { createCache } = require('../src/services/cache');

test('setResultCalling moves resulted patient from waiting to calling', async () => {
  let hasResultPatients = [
    {
      patient_id: 'p-1',
      patient_name: 'Nguyễn Văn A',
      seq_num: '01',
      active_flag: 1,
    },
    {
      patient_id: 'p-2',
      patient_name: 'Nguyễn Thị Thu',
      seq_num: '06',
      active_flag: 4,
    },
  ];

  const fakeDbPool = {
    query: async (sql, params) => {
      if (sql.includes('SELECT a.area_id')) {
        return {
          rows: [
            {
              area_id: '28d33f33-84e3-4ce5-b8bd-236b10249605',
              area_name: 'Phòng khám Sản Phụ khoa P312',
              area_type_rcd: 'CLR',
              short_code: 'P312',
              queue_type: 'clinical',
            },
          ],
        };
      }
      if (sql.includes('WITH raw_waiting AS')) {
        return { rows: hasResultPatients };
      }
      return { rows: [] };
    },
  };

  const cache = createCache();
  const queueService = createQueueService(fakeDbPool, cache);

  // Before setResultCalling:
  let queue = await queueService.getQueueByAreaId('28d33f33-84e3-4ce5-b8bd-236b10249605');
  assert.equal(queue.calling.length, 0);
  assert.equal(queue.waiting.length, 2);

  // Call Thu for results:
  queueService.setResultCalling('28d33f33-84e3-4ce5-b8bd-236b10249605', {
    patientName: 'Nguyễn Thị Thu',
    seqNum: '06',
  });

  // After setResultCalling:
  queue = await queueService.getQueueByAreaId('28d33f33-84e3-4ce5-b8bd-236b10249605');
  assert.equal(queue.calling.length, 1);
  assert.equal(queue.calling[0].patient_name, 'Nguyễn Thị Thu');
  assert.equal(queue.calling[0].active_flag, 2);
  assert.equal(queue.waiting.length, 1);
  assert.equal(queue.waiting[0].patient_name, 'Nguyễn Văn A');

  // When doctor completes exam in HIS, Thu is removed from active_flag = 4:
  hasResultPatients = [
    {
      patient_id: 'p-1',
      patient_name: 'Nguyễn Văn A',
      seq_num: '01',
      active_flag: 1,
    },
  ];
  cache.clear();

  queue = await queueService.getQueueByAreaId('28d33f33-84e3-4ce5-b8bd-236b10249605');
  assert.equal(queue.calling.length, 0);
  assert.equal(queue.waiting.length, 1);
});
