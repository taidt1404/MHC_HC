const defaultServer = 'http://192.168.110.184:55637';

const inputServer = document.getElementById('serverUrl');
const selectArea = document.getElementById('areaSelect');
const checkSync = document.getElementById('enableSync');
const btnConnect = document.getElementById('btnConnect');
const btnSave = document.getElementById('btnSave');
const statusBox = document.getElementById('statusBox');

function setStatus(msg, isOk = false) {
  statusBox.textContent = msg;
  statusBox.className = 'status-box' + (isOk ? ' status-ok' : '');
}

function doSave() {
  const server = inputServer.value.trim().replace(/\/+$/, '') || defaultServer;
  const areaId = selectArea.value;
  const selectedText = selectArea.options[selectArea.selectedIndex]?.textContent || '';
  const enabled = checkSync.checked;

  if (!areaId) {
    setStatus('⚠️ Vui lòng chọn 1 phòng khám trước khi lưu!');
    return false;
  }

  chrome.storage.local.set({
    mhcServerUrl: server,
    mhcAreaId: areaId,
    mhcAreaName: selectedText,
    mhcEnabled: enabled,
  }, () => {
    setStatus(`✅ ĐÃ LƯU: ${selectedText}\n👉 F5 lại tab HIS 1 lần để kích hoạt nhé!`, true);
  });
  return true;
}

async function fetchAreas(serverUrl, selectedId = '') {
  try {
    setStatus('Đang tải danh sách phòng khám...');
    const url = serverUrl.replace(/\/+$/, '') + '/api/areas';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const areas = data.areas || [];

    selectArea.innerHTML = '<option value="">-- Chọn phòng khám này --</option>';
    for (const a of areas) {
      const opt = document.createElement('option');
      opt.value = a.area_id;
      opt.textContent = `${a.area_name} (${a.short_code || a.queue_type})`;
      if (a.area_id === selectedId) opt.selected = true;
      selectArea.appendChild(opt);
    }

    if (selectedId) {
      setStatus(`Đang dùng: ${selectArea.options[selectArea.selectedIndex]?.textContent || selectedId}`, true);
    } else {
      setStatus(`Đã tải ${areas.length} phòng khám. Vui lòng chọn phòng và bấm Lưu.`, true);
    }
  } catch (err) {
    setStatus(`Không kết nối được: ${err.message}`);
  }
}

// Load saved config
chrome.storage.local.get(['mhcServerUrl', 'mhcAreaId', 'mhcAreaName', 'mhcEnabled'], async (res) => {
  const server = res.mhcServerUrl || defaultServer;
  inputServer.value = server;
  checkSync.checked = res.mhcEnabled !== false;

  await fetchAreas(server, res.mhcAreaId);
});

btnConnect.addEventListener('click', () => {
  const server = inputServer.value.trim() || defaultServer;
  fetchAreas(server, selectArea.value);
});

// Auto save whenever user changes the dropdown!
selectArea.addEventListener('change', () => {
  doSave();
});

btnSave.addEventListener('click', () => {
  doSave();
});

const btnClear = document.getElementById('btnClearCalling');
if (btnClear) {
  btnClear.addEventListener('click', async () => {
    const server = inputServer.value.trim().replace(/\/+$/, '') || defaultServer;
    const areaId = selectArea.value;
    if (!areaId) {
      setStatus('⚠️ Vui lòng chọn phòng khám!');
      return;
    }
    try {
      await fetch(`${server}/api/queue/clear-calling-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId }),
      });
      setStatus('✅ Đã hủy gọi trên TV, bệnh nhân đã về danh sách chờ!', true);
    } catch (err) {
      setStatus(`Lỗi: ${err.message}`);
    }
  });
}
