import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function HeaderBar({
  areaName,
  totalWaiting,
  isOffline,
  soundEnabled,
  onToggleSound,
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateStr = now.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <header className="mhc-header">
      <div className="mhc-header-left">
        <Link to="/" className="mhc-hospital-badge" title="Danh sách phòng">
          BỆNH VIỆN ĐA KHOA HÙNG CƯỜNG
        </Link>
        <h1 className="mhc-room-title">{areaName || 'ĐANG TẢI PHÒNG...'}</h1>
      </div>

      <div className="mhc-header-right">
        <div className="mhc-total-pill">
          <span className="mhc-total-label">TỔNG CHỜ</span>
          <span className="mhc-total-number">{totalWaiting ?? 0}</span>
        </div>

        <div className="mhc-clock-box">
          <div className="mhc-clock-time">{timeStr}</div>
          <div className="mhc-clock-date">{dateStr}</div>
        </div>

        <div className="mhc-header-actions">
          {isOffline && (
            <span className="mhc-offline-badge" title="Mất kết nối tạm thời, đang tự động thử lại...">
              Mất kết nối
            </span>
          )}
          <button
            type="button"
            className={`mhc-icon-btn ${soundEnabled ? 'active' : ''}`}
            onClick={onToggleSound}
            title={soundEnabled ? 'Đang bật chuông gọi số' : 'Bấm để bật chuông gọi số'}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>
          <button
            type="button"
            className="mhc-icon-btn"
            onClick={handleFullscreen}
            title="Toàn màn hình"
          >
            ⛶
          </button>
        </div>
      </div>
    </header>
  );
}
