import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchAreas } from '../api/queueApi';

export default function AreaSelectorPage() {
  const [areas, setAreas] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await fetchAreas();
        if (mounted) {
          setAreas(data.areas || []);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    load();
    const timer = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const filteredAreas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return areas.filter((a) => {
      if (filterType !== 'ALL' && a.queue_type !== filterType) return false;
      if (!q) return true;
      return (
        (a.area_name || '').toLowerCase().includes(q) ||
        (a.short_code || '').toLowerCase().includes(q) ||
        (a.area_id || '').toLowerCase().includes(q)
      );
    });
  }, [areas, search, filterType]);

  return (
    <div className="mhc-selector-page">
      <div className="mhc-selector-header">
        <div>
          <div className="mhc-selector-subtitle">BỆNH VIỆN ĐA KHOA HÙNG CƯỜNG</div>
          <h1>HỆ THỐNG MÀN HÌNH CHỜ PHÒNG KHÁM &amp; CẬN LÂM SÀNG</h1>
        </div>
        <div className="mhc-selector-controls">
          <input
            type="text"
            className="mhc-search-input"
            placeholder="Tìm tên phòng, mã phòng (VD: P311, P302, P204)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mhc-filter-tabs">
            <button
              type="button"
              className={filterType === 'ALL' ? 'active' : ''}
              onClick={() => setFilterType('ALL')}
            >
              Tất cả ({areas.length})
            </button>
            <button
              type="button"
              className={filterType === 'subclinical' ? 'active' : ''}
              onClick={() => setFilterType('subclinical')}
            >
              Cận lâm sàng
            </button>
            <button
              type="button"
              className={filterType === 'clinical' ? 'active' : ''}
              onClick={() => setFilterType('clinical')}
            >
              Phòng khám
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="mhc-state-box">Đang tải danh sách phòng...</div>}
      {error && (
        <div className="mhc-state-box error">
          Không kết nối được CSDL: {error}. Vui lòng kiểm tra cấu hình trong <code>server/.env</code>.
        </div>
      )}

      {!loading && !error && (
        <div className="mhc-area-grid">
          {filteredAreas.map((area) => {
            const path =
              area.queue_type === 'clinical'
                ? `/clinical-queue/${area.area_id}`
                : `/subclinical-queue/${area.area_id}`;
            const totalActive = (area.calling_count || 0) + (area.waiting_count || 0);

            return (
              <Link key={area.area_id} to={path} className="mhc-area-card">
                <div className="mhc-area-card-top">
                  <span className={`mhc-area-badge ${area.queue_type}`}>
                    {area.queue_type === 'clinical' ? 'Phòng khám' : 'Cận lâm sàng'}
                  </span>
                  {area.short_code && <span className="mhc-area-code">{area.short_code}</span>}
                </div>
                <div className="mhc-area-name">{area.area_name}</div>
                <div className="mhc-area-stats">
                  <span className={area.calling_count > 0 ? 'stat-calling active' : 'stat-calling'}>
                    Đang thực hiện: <strong>{area.calling_count || 0}</strong>
                  </span>
                  <span className={totalActive > 0 ? 'stat-waiting active' : 'stat-waiting'}>
                    Đang chờ: <strong>{area.waiting_count || 0}</strong>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
