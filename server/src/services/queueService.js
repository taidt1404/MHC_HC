const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
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
        INNER JOIN patient_visit pv ON pv.patient_visit_id = pq.patient_visit_id
        WHERE pq.process_date >= now()::date - 7
          AND pq.active_flag IN (1, 2, 4, 6)
          AND (pq.active_status = true OR pq.work_queue_type_rcd <> 'CLI')
          AND (pv.health_contract_id ISNULL OR pv.health_contract_receive_date_time NOTNULL)
          AND (pq.work_queue_type_rcd <> 'CLI' OR COALESCE(pq.ipd_queue_flag, FALSE) = FALSE)
          AND COALESCE(pq.ipd_consultation_flag, FALSE) = FALSE
          AND EXISTS (
              SELECT 1
              FROM cpoe_placer_order cpo
              WHERE cpo.processing_queue_id = pq.processing_queue_id
                AND cpo.creation_visit_id = pq.patient_visit_id
                AND cpo.active_flag = 1
                AND cpo.cpoe_placer_order_status_rcd NOT IN ('NEW', 'COMPLETED', 'RSLTD', 'VERIFIED', 'CANCELLED')
                AND (pq.work_queue_type_rcd = 'CLI' OR cpo.cpoe_placer_order_status_rcd <> 'SAVED')
                AND (
                    pq.process_date = now()::date
                    OR (
                        pq.work_queue_type_rcd <> 'CLI'
                        AND cpo.created_date_time >= now()::date
                    )
                )
          )
        ORDER BY pq.area_id, pq.patient_id, COALESCE(pq.seq_num, 0),
                 (CASE WHEN pq.active_flag = 2 THEN 3 WHEN pq.active_flag = 1 THEN 2 ELSE 1 END) DESC
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
                WHEN pq.active_flag = 6 AND pq.priority = TRUE THEN 2
                WHEN pq.active_flag = 6 AND (pq.priority ISNULL OR pq.priority = FALSE) THEN 1
                ELSE -1 END) AS sort_rank
    FROM processing_queue pq
    INNER JOIN patient_visit pv ON pv.patient_visit_id = pq.patient_visit_id
    WHERE pq.active_flag IN (1, 2, 4, 6)
      AND (pq.active_status = true OR pq.work_queue_type_rcd <> 'CLI')
      AND (pv.health_contract_id ISNULL OR pv.health_contract_receive_date_time NOTNULL)
      AND pq.area_id = $1
      AND (pq.work_queue_type_rcd <> 'CLI' OR COALESCE(pq.ipd_queue_flag, FALSE) = FALSE)
      AND COALESCE(pq.ipd_consultation_flag, FALSE) = FALSE
      AND pq.process_date >= now()::date - 7
      AND EXISTS (
          SELECT 1
          FROM cpoe_placer_order cpo
          WHERE cpo.processing_queue_id = pq.processing_queue_id
            AND cpo.creation_visit_id = pq.patient_visit_id
            AND cpo.active_flag = 1
            AND cpo.cpoe_placer_order_status_rcd NOT IN ('NEW', 'COMPLETED', 'RSLTD', 'VERIFIED', 'CANCELLED')
            AND (pq.work_queue_type_rcd = 'CLI' OR cpo.cpoe_placer_order_status_rcd <> 'SAVED')
            AND (
                pq.process_date = now()::date
                OR (
                    pq.work_queue_type_rcd <> 'CLI'
                    AND cpo.created_date_time >= now()::date
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
  async function checkHealth() {
    await dbPool.query('SELECT 1');
    return {
      status: 'ok',
      db: true,
      timestamp: new Date().toISOString(),
    };
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
  };
}

module.exports = {
  isValidUuid,
  partitionQueueRows,
  createQueueService,
};
