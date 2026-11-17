import React, { useEffect, useRef } from 'react';
import GenderIcon, { formatDob } from './GenderIcon';

export default function WaitingListPanel({
  waitingList = [],
  waitingResultList = [],
}) {
  const scrollRef = useRef(null);
  const combined = [
    ...waitingList.map((item) => ({ ...item, _group: 'WAITING' })),
    ...waitingResultList.map((item) => ({ ...item, _group: 'WAITING_RESULT' })),
  ];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    let direction = 1;
    let pauseTicks = 0;

    const interval = setInterval(() => {
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 10) {
        el.scrollTop = 0;
        return;
      }

      if (pauseTicks > 0) {
        pauseTicks -= 1;
        return;
      }

      el.scrollTop += direction * 1.5;

      if (el.scrollTop >= maxScroll - 2) {
        direction = -1;
        pauseTicks = 50; // Pause ~2.5s at bottom
      } else if (el.scrollTop <= 0) {
        direction = 1;
        pauseTicks = 50; // Pause ~2.5s at top
      }
    }, 50);

    return () => clearInterval(interval);
  }, [combined.length]);

  return (
    <section className="mhc-panel mhc-waiting-panel">
      <div className="mhc-panel-header mhc-waiting-header">
        <h2>DANH SÁCH CHỜ TIẾP THEO</h2>
        <span className="mhc-panel-count">{combined.length}</span>
      </div>

      <div className="mhc-table-head">
        <div className="col-stt">STT</div>
        <div className="col-name">HỌ VÀ TÊN BỆNH NHÂN</div>
        <div className="col-dob">NGÀY SINH</div>
        <div className="col-status">TRẠNG THÁI</div>
      </div>

      <div className="mhc-waiting-body" ref={scrollRef}>
        {combined.length === 0 ? (
          <div className="mhc-empty-waiting">Hiện không có bệnh nhân trong danh sách chờ</div>
        ) : (
          combined.map((patient, idx) => {
            const key =
              patient.processing_queue_id ||
              `${patient.patient_id}-${patient.seq_num}-${patient._group}-${idx}`;
            return (
              <div key={key} className="mhc-waiting-row">
                <div className="col-stt">
                  <span className={`mhc-seq-badge ${patient.priority ? 'priority' : ''}`}>
                    {patient.seq_num || '--'}
                  </span>
                </div>
                <div className="col-name">
                  <GenderIcon gender={patient.gender} size={30} />
                  <span className="mhc-patient-name">{patient.patient_name}</span>
                  {patient.ipd_queue_flag && <span className="mhc-tag mhc-tag-ipd">Nội trú</span>}
                </div>
                <div className="col-dob">{formatDob(patient)}</div>
                <div className="col-status">
                  {patient._group === 'WAITING_RESULT' ? (
                    <span className="mhc-status-pill result">Chờ KQ CLS</span>
                  ) : patient.active_flag === 4 ? (
                    <span className="mhc-status-pill has-result">Đã có kết quả</span>
                  ) : patient.priority ? (
                    <span className="mhc-status-pill priority">Ưu tiên</span>
                  ) : (
                    <span className="mhc-status-pill waiting">Chờ thực hiện</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
