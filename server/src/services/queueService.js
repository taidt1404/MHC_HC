const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

function removeAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

function partitionQueueRows(rows) {
  const calling = [];
  const waiting = [];
  const waitingResult = [];
  const missed = [];

  for (const row of rows) {
    const item = {
      processing_queue_id: row.processing_queue_id || null,
      patient_id: row.patient_id,
      patient_name: row.patient_name,
      seq_num: row.seq_num,
      age: row.age,
      year_of_birth: row.year_of_birth,
      date_of_birth: row.dob_str || row.date_of_birth || null,
      gender: row.gender,
      priority: Boolean(row.priority),
      active_flag: Number(row.active_flag),
      ipd_queue_flag: Boolean(row.ipd_queue_flag),
      scheduled_booking_time: row.scheduled_booking_time || null,
      recomment: row.recomment || null,
    };

    if (item.active_flag === 2) {
      calling.push(item);
    } else if (item.active_flag === 1 || item.active_flag === 4) {
      waiting.push(item);
    } else if (item.active_flag === 6) {
      waitingResult.push(item);
    } else if (item.active_flag === 10) {
      missed.push(item);
    }
  }

  return {
    calling,
    waiting,
    waitingResult,
    missed,
    summary: {
      total: calling.length + waiting.length + waitingResult.length,
      calling_count: calling.length,
      waiting_count: waiting.length,
      waiting_result_count: waitingResult.length,
    },
  };
}

const LIST_AREAS_SQL = `
SELECT a.area_id,
       a.area_name_l AS area_name,
       a.area_type_rcd,
       a.short_code,
       CASE WHEN a.area_type_rcd = 'CLR' THEN 'clinical' ELSE 'subclinical' END AS queue_type,
       COALESCE(q.waiting_count, 0)::int AS waiting_count,
       COALESCE(q.calling_count, 0)::int AS calling_count
FROM area a
LEFT JOIN (
    SELECT d.area_id,
           COUNT(*) FILTER (WHERE d.active_flag IN (1, 4, 6)) AS waiting_count,
           COUNT(*) FILTER (WHERE d.active_flag = 2) AS calling_count
    FROM (
        SELECT DISTINCT ON (pq.area_id, pq.patient_id, COALESCE(pq.seq_num, 0))
               pq.area_id,
               pq.patient_id,
               pq.seq_num,
               pq.active_flag
        FROM processing_queue pq
        INNER JOIN area ar ON ar.area_id = pq.area_id
        INNER JOIN patient_visit pv ON pv.patient_visit_id = pq.patient_visit_id
        WHERE pq.process_date >= now()::date - 7
          AND pq.active_flag IN (1, 2, 4, 6)
          AND (pq.active_status = true OR pq.work_queue_type_rcd <> 'CLI')
          AND (pv.health_contract_id ISNULL OR pv.health_contract_receive_date_time NOTNULL)
          AND (ar.area_type_rcd <> 'CLR' OR pq.work_queue_type_rcd = 'CLI')
          AND COALESCE(pq.ipd_consultation_flag, FALSE) = FALSE
          AND EXISTS (
              SELECT 1
              FROM cpoe_placer_order cpo
              WHERE cpo.processing_queue_id = pq.processing_queue_id
                AND cpo.creation_visit_id = pq.patient_visit_id
                AND cpo.active_flag = 1
                AND (
                    (pq.active_flag = 4 AND ar.area_type_rcd = 'CLR' AND pq.process_date = now()::date)
                    OR (
                        cpo.cpoe_placer_order_status_rcd NOT IN ('NEW', 'SAVED', 'COMPLETED', 'RSLTD', 'VERIFIED', 'CANCELLED')
                        AND (
                            pq.process_date = now()::date
                            OR (
                                pq.work_queue_type_rcd <> 'CLI'
                                AND cpo.created_date_time >= now()::date
                            )
                        )
                    )
                )
          )
        ORDER BY pq.area_id, pq.patient_id, COALESCE(pq.seq_num, 0),
                 (CASE WHEN pq.active_flag = 2 THEN 4 WHEN pq.active_flag = 1 THEN 3 WHEN pq.active_flag = 4 THEN 2 ELSE 1 END) DESC
    ) d
    GROUP BY d.area_id
) q ON q.area_id = a.area_id
WHERE a.active_flag = 1
  AND a.area_type_rcd IN ('CLR', 'RAR', 'BLD', 'WAI')
ORDER BY (COALESCE(q.calling_count, 0) + COALESCE(q.waiting_count, 0)) DESC, a.area_name_l
`;

const GET_AREA_SQL = `
SELECT a.area_id,
       a.area_name_l AS area_name,
       a.area_type_rcd,
       a.short_code,
       CASE WHEN a.area_type_rcd = 'CLR' THEN 'clinical' ELSE 'subclinical' END AS queue_type
FROM area a
WHERE a.area_id = $1
LIMIT 1
`;

const GET_QUEUE_BY_AREA_SQL = `
WITH raw_waiting AS (
    SELECT pq.processing_queue_id,
           pq.patient_id,
           pq.seq_num,
           pq.priority,
           pq.active_flag,
           pq.schedule_date_time,
           pq.recomment,
           pq.last_result_date_time,
           pq.ipd_queue_flag,
           (CASE
                WHEN pq.active_flag = 2 AND pq.priority = TRUE THEN 6
                WHEN pq.active_flag = 2 AND (pq.priority ISNULL OR pq.priority = FALSE) THEN 5
                WHEN pq.active_flag = 1 AND pq.priority = TRUE THEN 4
                WHEN pq.active_flag = 1 AND (pq.priority ISNULL OR pq.priority = FALSE) THEN 3
                WHEN pq.active_flag = 4 THEN 2
                WHEN pq.active_flag = 6 AND pq.priority = TRUE THEN 1
                WHEN pq.active_flag = 6 AND (pq.priority ISNULL OR pq.priority = FALSE) THEN 0
                ELSE -1 END) AS sort_rank
    FROM processing_queue pq
    INNER JOIN area ar ON ar.area_id = pq.area_id
    INNER JOIN patient_visit pv ON pv.patient_visit_id = pq.patient_visit_id
    WHERE pq.active_flag IN (1, 2, 4, 6)
      AND (pq.active_status = true OR pq.work_queue_type_rcd <> 'CLI')
      AND (pv.health_contract_id ISNULL OR pv.health_contract_receive_date_time NOTNULL)
      AND pq.area_id = $1
      AND (ar.area_type_rcd <> 'CLR' OR pq.work_queue_type_rcd = 'CLI')
      AND COALESCE(pq.ipd_consultation_flag, FALSE) = FALSE
      AND pq.process_date >= now()::date - 7
      AND EXISTS (
          SELECT 1
          FROM cpoe_placer_order cpo
          WHERE cpo.processing_queue_id = pq.processing_queue_id
            AND cpo.creation_visit_id = pq.patient_visit_id
            AND cpo.active_flag = 1
            AND (
                (pq.active_flag = 4 AND ar.area_type_rcd = 'CLR' AND pq.process_date = now()::date)
                OR (
                    cpo.cpoe_placer_order_status_rcd NOT IN ('NEW', 'SAVED', 'COMPLETED', 'RSLTD', 'VERIFIED', 'CANCELLED')
                    AND (
                        pq.process_date = now()::date
                        OR (
                            pq.work_queue_type_rcd <> 'CLI'
                            AND cpo.created_date_time >= now()::date
                        )
                    )
                )
            )
      )
),
waiting AS (
    SELECT DISTINCT ON (rw.patient_id, COALESCE(rw.seq_num, 0))
           rw.*
    FROM raw_waiting rw
    ORDER BY rw.patient_id, COALESCE(rw.seq_num, 0), rw.sort_rank DESC, rw.last_result_date_time NULLS LAST
)
(SELECT w.processing_queue_id,
        p.full_name AS patient_name,
        p.gender,
        p.date_of_birth,
        to_char(p.date_of_birth, 'DD/MM/YYYY') AS dob_str,
        EXTRACT(YEAR FROM p.date_of_birth)::int AS year_of_birth,
        w.patient_id,
        CASE WHEN length(w.seq_num::text) = 1 THEN lpad(w.seq_num::text, 2, '0') ELSE w.seq_num::text END AS seq_num,
        COALESCE(w.priority, false) AS priority,
        w.active_flag,
        COALESCE(w.ipd_queue_flag, false) AS ipd_queue_flag,
        w.schedule_date_time AS scheduled_booking_time,
        w.recomment,
        date_part('year', age(now()::date, p.date_of_birth::date))::int AS age
 FROM waiting w
 INNER JOIN person p ON w.patient_id = p.id
 ORDER BY w.sort_rank DESC,
          w.last_result_date_time,
          COALESCE(w.seq_num, 0))
UNION ALL
(SELECT pq.processing_queue_id,
        p.full_name AS patient_name,
        p.gender,
        p.date_of_birth,
        to_char(p.date_of_birth, 'DD/MM/YYYY') AS dob_str,
        EXTRACT(YEAR FROM p.date_of_birth)::int AS year_of_birth,
        pq.patient_id,
        CASE WHEN length(pq.seq_num::text) = 1 THEN lpad(pq.seq_num::text, 2, '0') ELSE pq.seq_num::text END AS seq_num,
        COALESCE(pq.priority, false) AS priority,
        pq.active_flag,
        COALESCE(pq.ipd_queue_flag, false) AS ipd_queue_flag,
        pq.schedule_date_time AS scheduled_booking_time,
        pq.recomment,
        date_part('year', age(now()::date, p.date_of_birth::date))::int AS age
 FROM processing_queue pq
 INNER JOIN patient_visit pv ON pv.patient_visit_id = pq.patient_visit_id
 INNER JOIN person p ON pq.patient_id = p.id
 WHERE pq.active_flag = 10
   AND pq.active_status = true
   AND pq.area_id = $1
   AND pq.process_date = now()::date
 ORDER BY pq.last_result_date_time,
          COALESCE(pq.seq_num, 0))
`;

function createQueueService(dbPool, cache) {
  const activeResultCalls = new Map();

  async function checkHealth() {
    await dbPool.query('SELECT 1');
    return {
      status: 'ok',
      db: true,
      timestamp: new Date().toISOString(),
    };
  }

  async function resolveAreaId(identifier) {
    if (!identifier) return null;
    const trimmed = String(identifier).trim();
    if (isValidUuid(trimmed)) return trimmed;

    const res = await dbPool.query(
      `SELECT area_id FROM area 
       WHERE active_flag = 1 
         AND area_type_rcd IN ('CLR', 'RAR', 'BLD', 'WAI')
         AND (short_code = $1 OR area_name_l ILIKE '%' || $1 || '%')
       ORDER BY (short_code = $1) DESC,
                (CASE WHEN area_type_rcd = 'CLR' THEN 1 ELSE 2 END),
                area_name_l
       LIMIT 1`,
      [trimmed]
    );
    return res.rows.length > 0 ? res.rows[0].area_id : null;
  }

  function setResultCalling(areaId, { patientName, seqNum, patientId }) {
    activeResultCalls.set(areaId, {
      patient_name: patientName ? patientName.trim() : null,
      seq_num: seqNum ? String(seqNum).trim() : null,
      patient_id: patientId ? String(patientId).trim() : null,
      called_at: Date.now(),
    });
    cache.del(`queue:${areaId}`);
  }

  function clearResultCalling(areaId) {
    activeResultCalls.delete(areaId);
    cache.del(`queue:${areaId}`);
  }

  function getActiveResultCalling(areaId) {
    return activeResultCalls.get(areaId) || null;
  }

  async function listAreas() {
    const cacheKey = 'areas:all';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const { rows } = await dbPool.query(LIST_AREAS_SQL);
    cache.set(cacheKey, rows, 3000);
    return rows;
  }

  async function getQueueByAreaId(areaId) {
    const cacheKey = `queue:${areaId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const areaRes = await dbPool.query(GET_AREA_SQL, [areaId]);
    if (areaRes.rows.length === 0) {
      return null;
    }

    const areaRow = areaRes.rows[0];
    const queueRes = await dbPool.query(GET_QUEUE_BY_AREA_SQL, [areaId]);
    const partitioned = partitionQueueRows(queueRes.rows);

    const activeResultCall = activeResultCalls.get(areaId);
    if (activeResultCall) {
      if (Date.now() - activeResultCall.called_at > 45 * 60 * 1000) {
        activeResultCalls.delete(areaId);
      } else {
        const targetIdx = partitioned.waiting.findIndex((p) => {
          if (p.active_flag !== 4 && p.active_flag !== 1) return false;
          if (activeResultCall.patient_id && p.patient_id === activeResultCall.patient_id) return true;
          if (activeResultCall.seq_num && String(p.seq_num).replace(/^0+/, '') === String(activeResultCall.seq_num).replace(/^0+/, '')) return true;
          if (activeResultCall.patient_name && p.patient_name) {
            const pName = removeAccents(p.patient_name);
            const reqName = removeAccents(activeResultCall.patient_name);
            if (pName === reqName || pName.includes(reqName) || reqName.includes(pName)) return true;
          }
          return false;
        });

        if (targetIdx !== -1) {
          const [callingItem] = partitioned.waiting.splice(targetIdx, 1);
          callingItem.active_flag = 2;
          callingItem.is_result_calling = true;
          partitioned.calling.unshift(callingItem);
          partitioned.summary.calling_count = partitioned.calling.length;
          partitioned.summary.waiting_count = partitioned.waiting.length;
        } else {
          if (Date.now() - activeResultCall.called_at > 10000) {
            activeResultCalls.delete(areaId);
          }
        }
      }
    }

    const payload = {
      area: {
        area_id: areaRow.area_id,
        area_name: areaRow.area_name,
        area_type_rcd: areaRow.area_type_rcd,
        short_code: areaRow.short_code,
        queue_type: areaRow.queue_type,
      },
      summary: partitioned.summary,
      calling: partitioned.calling,
      waiting: partitioned.waiting,
      waitingResult: partitioned.waitingResult,
      missed: partitioned.missed,
      updated_at: new Date().toISOString(),
    };

    cache.set(cacheKey, payload, 1500);
    return payload;
  }

  return {
    checkHealth,
    listAreas,
    getQueueByAreaId,
    resolveAreaId,
    setResultCalling,
    clearResultCalling,
    getActiveResultCalling,
  };
}

module.exports = {
  isValidUuid,
  partitionQueueRows,
  createQueueService,
};
