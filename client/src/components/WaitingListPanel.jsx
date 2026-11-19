import React, { useEffect, useRef } from 'react';
import GenderIcon, { formatDob } from './GenderIcon';

export default function WaitingListPanel({
  waitingList = [],
  waitingResultList = [],
}) {
  const combined = [
    ...waitingList.map((item) => ({ ...item, _group: 'WAITING' })),
    ...waitingResultList.map((item) => ({ ...item, _group: 'WAITING_RESULT' })),
  ];

  return (
    <section className="mhc-panel mhc-waiting-panel">
      <div className="mhc-panel-header mhc-waiting-header">
        <h2>DANH SÁCH CHỜ TIẾP THEO</h2>
        <span className="mhc-panel-count">{combined.length}</span>
      </div>

      <div className="mhc-table-head">
        <div className="col-stt">STT</div>
        <div className="col-patient">HỌ VÀ TÊN BỆNH NHÂN &amp; NGÀY SINH</div>
      </div>

      <div className="mhc-waiting-body">
        {combined.length === 0 ? (
          <div className="mhc-empty-waiting">Hiện không có bệnh nhân trong danh sách chờ</div>
        ) : (
          combined.map((patient, idx) => {
            const key =
              patient.processing_queue_id ||
              `${patient.patient_id}-${patient.seq_num}-${patient._group}-${idx}`;
            const isHasResult = patient.active_flag === 4;
            return (
              <div key={key} className={`mhc-waiting-row ${isHasResult ? 'has-result' : ''}`}>
                <div className="col-stt">
                  <span className={`mhc-seq-badge ${patient.priority ? 'priority' : ''}`}>
                    {patient.seq_num || '--'}
                  </span>
                </div>
                <div className="col-patient">
                  <div className="mhc-patient-main">
                    <GenderIcon gender={patient.gender} size={34} />
                    <span className="mhc-patient-name">{patient.patient_name}</span>
                    {patient.priority && (
                      <span className="mhc-tag mhc-tag-priority">ƯU TIÊN</span>
                    )}
                    {isHasResult && (
                      <span className="mhc-tag mhc-tag-has-result">ĐÃ CÓ KQ</span>
                    )}
                    {patient._group === 'WAITING_RESULT' && (
                      <span className="mhc-tag mhc-tag-result">CHỜ KQ CLS</span>
                    )}
                  </div>
                  <div className="mhc-patient-sub">
                    <span className="mhc-dob-text">NS: {formatDob(patient)}</span>
                    {patient.age ? <span className="mhc-age-text">({patient.age} tuổi)</span> : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
