import React from 'react';

export default function CallingPanel({ callingList = [], highlightedKeys = new Set() }) {
  return (
    <section className="mhc-panel mhc-calling-panel">
      <div className="mhc-panel-header mhc-calling-header">
        <span className="mhc-status-dot pulse" />
        <h2>ĐANG THỰC HIỆN / MỜI VÀO PHÒNG</h2>
        <span className="mhc-panel-count">{callingList.length}</span>
      </div>

      <div className="mhc-calling-body">
        {callingList.length === 0 ? (
          <div className="mhc-empty-calling">
            <div className="mhc-empty-icon">🏥</div>
            <p>Vui lòng chờ gọi số theo thứ tự</p>
          </div>
        ) : (
          callingList.map((patient) => {
            const key = `${patient.patient_id}-${patient.seq_num}`;
            const isHighlighted = highlightedKeys.has(key);
            return (
              <div
                key={key}
                className={`mhc-calling-card ${isHighlighted ? 'mhc-card-flash' : ''}`}
              >
                <div className="mhc-calling-seq">{patient.seq_num || '--'}</div>
                <div className="mhc-calling-info">
                  <div className="mhc-calling-name">{patient.patient_name}</div>
                  <div className="mhc-calling-meta">
                    <span>
                      {patient.age ? `${patient.age} tuổi` : ''}
                      {patient.year_of_birth ? ` (${patient.year_of_birth})` : ''}
                    </span>
                    {patient.priority && <span className="mhc-tag mhc-tag-priority">ƯU TIÊN</span>}
                    {patient.ipd_queue_flag && <span className="mhc-tag mhc-tag-ipd">NỘI TRÚ</span>}
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
