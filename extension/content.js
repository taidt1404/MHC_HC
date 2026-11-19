(function () {
  console.log('[MHC Extension v1.3] Đã kích hoạt trên trang HIS.');

  let lastSentKey = '';
  let lastSentTime = 0;

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

  function showToast(message, isSuccess = true) {
    let toast = document.getElementById('mhc-sync-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'mhc-sync-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999999;
        padding: 12px 18px;
        background: ${isSuccess ? '#166534' : '#991b1b'};
        color: #ffffff;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 14px;
        font-weight: 700;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: opacity 0.3s ease;
        opacity: 0;
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }

    toast.style.background = isSuccess ? '#166534' : '#991b1b';
    toast.innerHTML = (isSuccess ? '📢 ' : '⚠️ ') + message;
    toast.style.opacity = '1';

    setTimeout(() => {
      if (toast) toast.style.opacity = '0';
    }, 4500);
  }

  function notifyMhc(patientName, seqNum) {
    chrome.storage.local.get(['mhcServerUrl', 'mhcAreaId', 'mhcAreaName', 'mhcEnabled'], (cfg) => {
      if (cfg.mhcEnabled === false) return;
      if (!cfg.mhcAreaId) {
        showToast('Chưa chọn phòng khám trong tiện ích MHC! Bấm vào icon MHC ở góc trình duyệt để chọn phòng.', false);
        return;
      }

      const serverUrl = (cfg.mhcServerUrl || 'http://192.168.110.184:55637').replace(/\/+$/, '');
      const areaId = cfg.mhcAreaId;

      const cacheKey = `${patientName || ''}-${seqNum || ''}`;
      const now = Date.now();
      if (cacheKey === lastSentKey && now - lastSentTime < 2500) {
        return; // debounce 2.5s
      }
      lastSentKey = cacheKey;
      lastSentTime = now;

      console.log(`[MHC Extension] Đang gửi sang MHC: "${patientName}" (TT khám: ${seqNum || '--'})`);

      fetch(`${serverUrl}/api/queue/calling-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaId,
          patientName,
          seqNum,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showToast(`MHC: Đã gọi trả KQ [${patientName || ('Số ' + seqNum)}] lên màn hình chờ!`, true);
          } else {
            showToast(`MHC: ${data.message || 'Lỗi xử lý'}`, false);
          }
        })
        .catch((err) => {
          console.error('[MHC Extension] Lỗi kết nối:', err);
          showToast(`Lỗi kết nối máy chủ MHC: ${err.message}`, false);
        });
    });
  }

  function clearMhcCalling(showMsg = true) {
    chrome.storage.local.get(['mhcServerUrl', 'mhcAreaId', 'mhcEnabled'], (cfg) => {
      if (cfg.mhcEnabled === false || !cfg.mhcAreaId) return;
      const serverUrl = (cfg.mhcServerUrl || 'http://192.168.110.184:55637').replace(/\/+$/, '');
      const areaId = cfg.mhcAreaId;

      fetch(`${serverUrl}/api/queue/clear-calling-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId }),
      })
        .then(() => {
          if (showMsg) {
            showToast('MHC: Đã hủy gọi, trả về danh sách chờ!', true);
          }
        })
        .catch(() => { });
    });
  }

  // Find column indexes in a table header
  function getTableColumnIndexes(table) {
    const headers = table.querySelectorAll('th');
    let nameCol = -1;
    let ttCol = -1;
    headers.forEach((th, idx) => {
      const text = removeAccents(th.innerText || '');
      if (text.includes('ho ten') || text.includes('ho va ten') || text === 'ten') {
        nameCol = idx;
      }
      if (text.includes('tt kham') || text.includes('so kham') || text.includes('stt kham')) {
        ttCol = idx;
      }
    });
    return { nameCol, ttCol };
  }

  // Extract patient name and sequence number from table row
  function extractFromRow(row) {
    const cells = row.querySelectorAll('td');
    let patientName = null;
    let seqNum = null;

    const table = row.closest('table');
    if (table && cells.length > 0) {
      const { nameCol, ttCol } = getTableColumnIndexes(table);
      if (nameCol !== -1 && cells[nameCol]) {
        patientName = cells[nameCol].innerText.replace(/mãn\s*tính|ưu\s*tiên|cấp\s*cứu|bhyt/gi, '').trim();
      }
      if (ttCol !== -1 && cells[ttCol]) {
        const num = cells[ttCol].innerText.trim();
        if (/^\d+$/.test(num)) seqNum = num;
      }
    }

    if (!patientName || !seqNum) {
      cells.forEach((cell, idx) => {
        const text = cell.innerText.trim();
        const cleaned = text.replace(/mãn\s*tính|ưu\s*tiên|cấp\s*cứu|bhyt/gi, '').trim();

        if (!patientName && cleaned.length >= 4 && !/\d/.test(cleaned) && cleaned.includes(' ')) {
          const norm = removeAccents(cleaned);
          if (!norm.includes('benh vien') && !norm.includes('phong kham') && !norm.includes('bac si') && !norm.includes('da co ket qua')) {
            patientName = cleaned;
          }
        }

        if (!seqNum && idx > 2 && /^\d{1,3}$/.test(text)) {
          seqNum = text;
        }
      });
    }

    return { patientName, seqNum };
  }

  // Extract patient from active view banner ("Chi tiết thông tin ngoại trú")
  function extractPatientFromBanner() {
    const raw = document.body.innerText || '';
    const norm = removeAccents(raw);

    const match = norm.match(/\d{5,8}\s+([a-z\s]{3,30})\s+(?:nam|nu)\s+\d+\s+tuoi/);
    if (match) {
      return match[1].trim();
    }

    const match2 = norm.match(/([a-z\s]{4,30})\s+(?:nam|nu).*?\(\s*ns\s*:/);
    if (match2) {
      return match2[1].trim();
    }

    return null;
  }

  // 1. Detection via Click
  document.addEventListener('click', (e) => {
    try {
      const target = e.target;
      if (!target) return;

      const text = removeAccents(target.innerText || target.textContent || '');

      // When doctor clicks "Tìm kiếm", "Làm mới", tab "Danh sách thăm khám ngoại trú", "Hủy khám":
      // Doctor has exited the patient record back to the search list -> Clear calling!
      if (
        text.includes('tim kiem') ||
        text.includes('lam moi') ||
        text.includes('danh sach tham kham') ||
        text.includes('huy kham')
      ) {
        clearMhcCalling(true);
        const qBtn = document.getElementById('mhc-quick-call-btn');
        if (qBtn) qBtn.remove();
        const cBtn = document.getElementById('mhc-cancel-call-btn');
        if (cBtn) cBtn.remove();
        return;
      }

      // Check click on patient row in table
      const row = target.closest('tr') || target.closest('.el-table__row') || target.closest('[class*="row"]');
      if (row) {
        const norm = removeAccents(row.innerText || row.textContent || '');
        const hasResult =
          norm.includes('da co ket qua') ||
          norm.includes('da co kq') ||
          norm.includes('co ket qua') ||
          norm.includes('co kq');

        if (hasResult) {
          const { patientName, seqNum } = extractFromRow(row);
          if (patientName || seqNum) {
            notifyMhc(patientName, seqNum);
            return;
          }
        }
      }

      // Check if viewing "Chi tiết thông tin ngoại trú"
      setTimeout(injectOrTriggerBanner, 400);
    } catch (err) {
      console.error('[MHC Extension] Click error:', err);
    }
  }, true);

  // 2. Inject Buttons and Auto-trigger when viewing patient detail
  function injectOrTriggerBanner() {
    const raw = document.body.innerText || '';
    const norm = removeAccents(raw);

    const isDetailOpen =
      norm.includes('chi tiet thong tin ngoai tru') ||
      norm.includes('tom tat cls') ||
      norm.includes('kq chi dinh');

    if (!isDetailOpen) {
      // If not in detail view, remove buttons if any
      const qBtn = document.getElementById('mhc-quick-call-btn');
      if (qBtn) qBtn.remove();
      const cBtn = document.getElementById('mhc-cancel-call-btn');
      if (cBtn) cBtn.remove();
      return;
    }

    const patientName = extractPatientFromBanner();
    if (!patientName) return;

    // Inject "Gọi Trả KQ" green button
    if (!document.getElementById('mhc-quick-call-btn')) {
      const btn = document.createElement('button');
      btn.id = 'mhc-quick-call-btn';
      btn.style.cssText = `
        position: fixed;
        top: 68px;
        right: 170px;
        z-index: 99999;
        background: #16a34a;
        color: #ffffff;
        border: 2px solid #ffffff;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        gap: 6px;
      `;
      btn.innerHTML = '📢 Gọi Trả KQ (TV)';
      btn.title = 'Bấm để hiển thị bệnh nhân này lên cột Mời Vào Phòng ngoài màn hình chờ';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentName = extractPatientFromBanner();
        notifyMhc(currentName, null);
      });
      document.body.appendChild(btn);
    }

    // Inject "Hủy Gọi TV" red button
    if (!document.getElementById('mhc-cancel-call-btn')) {
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'mhc-cancel-call-btn';
      cancelBtn.style.cssText = `
        position: fixed;
        top: 68px;
        right: 40px;
        z-index: 99999;
        background: #dc2626;
        color: #ffffff;
        border: 2px solid #ffffff;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        gap: 6px;
      `;
      cancelBtn.innerHTML = '✖ Hủy Gọi TV';
      cancelBtn.title = 'Bấm để gỡ bệnh nhân khỏi cột Mời Vào Phòng ngoài TV và trả về danh sách chờ';
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearMhcCalling(true);
      });
      document.body.appendChild(cancelBtn);
    }

    if (norm.includes('kq chi dinh') || norm.includes('tom tat cls') || norm.includes('da co ket qua')) {
      notifyMhc(patientName, null);
    }
  }

  let throttleTimer = null;
  const observer = new MutationObserver(() => {
    if (throttleTimer) return;
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      injectOrTriggerBanner();
    }, 600);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(injectOrTriggerBanner, 1000);
})();
