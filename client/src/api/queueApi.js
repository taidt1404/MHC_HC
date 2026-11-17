export async function fetchAreas() {
  const res = await fetch('/api/areas');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Lỗi tải danh sách phòng (${res.status})`);
  }
  return res.json();
}

export async function fetchQueueByAreaId(areaId) {
  const res = await fetch(`/api/queue/${encodeURIComponent(areaId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || `Lỗi tải hàng chờ (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}
