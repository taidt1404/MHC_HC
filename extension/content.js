(function () {
  console.log('[MHC Extension v1.0.4] Đã kích hoạt trên trang HIS (Khám bệnh & CĐHA).');

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

  const URL_BLACKLIST = [
    'emr-storage', 'storage-sign', 'ky-so',
    'tiep-nhan', 'reception',
    'thanh-toan', 'cashier', 'vien-phi',
    'duoc', 'pharmacy', 'kho',
    'noi-tru', 'ipd',
    'he-thong', 'system', 'danh-muc'
  ];

  function getBreadcrumbText() {
    const bc = document.querySelector('.el-breadcrumb, [class*="breadcrumb"], .breadcrumb');
    return bc ? removeAccents(bc.innerText || '') : '';
  }

  function getTabsText() {
    const tabs = document.querySelectorAll('.el-tabs__item, [role="tab"], .nav-tabs li, .tab-title');
    let res = '';
    tabs.forEach((t) => {
      res += ' ' + removeAccents(t.innerText || '');
    });
    return res;
  }

  // Determine current screen: 'CDHA', 'EXAM', or null
  function getScreenType() {
    const url = (window.location.href || '').toLowerCase();
    for (const b of URL_BLACKLIST) {
      if (url.includes(b)) return null;
    }

    const bcText = getBreadcrumbText();
    const tabsText = getTabsText();
    const bodyText = removeAccents(document.body.innerText || '');

    // CĐHA (Chẩn đoán hình ảnh: Siêu âm, X-quang, v.v.)
    if (
      bcText.includes('bao cao chan doan hinh anh') ||
      bcText.includes('chan doan hinh anh') ||
      tabsText.includes('lam bao cao cdha') ||
      tabsText.includes('cho thuc hien') ||
      bodyText.includes('bao cao chan doan hinh anh') ||
      bodyText.includes('lam bao cao cdha')
    ) {
      return 'CDHA';
    }

    // Examination (Khám bệnh ngoại trú)
    if (
      bcText.includes('kham benh') ||
      tabsText.includes('tham kham ngoai tru') ||
      tabsText.includes('thong tin ngoai tru') ||
      bodyText.includes('danh sach tham kham ngoai tru') ||
      bodyText.includes('chi tiet thong tin ngoai tru')
    ) {
      return 'EXAM';
    }

    return null;
  }

  function isSupportedScreen() {
    return getScreenType() !== null;
  }

  function showToast(message, isSuccess = true) {
    if (!isSupportedScreen()) return;
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
        showToast('Chưa chọn phòng trong tiện ích MHC! Bấm icon MHC ở góc trình duyệt để chọn phòng.', false);
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

      console.log(`[MHC Extension] Đang gửi sang MHC (${cfg.mhcAreaName || areaId}): "${patientName}" (STT: ${seqNum || '--'})`);

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
            showToast(`MHC: Đã gọi [${patientName || ('Số ' + seqNum)}] lên màn hình chờ!`, true);
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

      lastSentKey = ''; // reset so user can call again if re-entering

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

  function cleanRowPatientName(str) {
    if (!str) return null;
    return str
      .replace(/\[.*?\]/g, '') // remove bracket tags like [SA], [SA.305], [XQ]
      .replace(/mãn\s*tính|man\s*tinh|ưu\s*tiên|uu\s*tien|cấp\s*cứu|cap\s*cuu|bhyt/gi, '')
      .trim();
  }

  // Find column indexes in a table header
  function getTableColumnIndexes(table) {
    const headers = table.querySelectorAll('th');
    let nameCol = -1;
    let ttCol = -1;
    let sttCol = -1;
    headers.forEach((th, idx) => {
      const text = removeAccents(th.innerText || '');
      if (text.includes('ho ten') || text.includes('ho va ten') || text === 'ten') {
        nameCol = idx;
      }
      if (text.includes('tt kham') || text.includes('so kham') || text.includes('stt kham')) {
        ttCol = idx;
      }
      if (text === 'stt' || text.includes('so thu tu')) {
        sttCol = idx;
      }
    });
    return { nameCol, ttCol, sttCol };
  }

  // Extract patient name and sequence number from table row
  function extractFromRow(row) {
    const cells = row.querySelectorAll('td');
    let patientName = null;
    let seqNum = null;

    const table = row.closest('table');
    if (table && cells.length > 0) {
      const { nameCol, ttCol, sttCol } = getTableColumnIndexes(table);
      if (nameCol !== -1 && cells[nameCol]) {
        patientName = cleanRowPatientName(cells[nameCol].innerText);
      }
      if (ttCol !== -1 && cells[ttCol]) {
        const num = cells[ttCol].innerText.trim();
        if (/^\d+$/.test(num)) seqNum = num;
      } else if (sttCol !== -1 && cells[sttCol]) {
        const num = cells[sttCol].innerText.trim();
        if (/^\d+$/.test(num)) seqNum = num;
      }
    }

    if (!patientName || !seqNum) {
      cells.forEach((cell, idx) => {
        const text = cell.innerText.trim();
        const cleaned = cleanRowPatientName(text);

        if (!patientName && cleaned && cleaned.length >= 4 && !/\d/.test(cleaned) && cleaned.includes(' ')) {
          const norm = removeAccents(cleaned);
          if (
            !norm.includes('benh vien') &&
            !norm.includes('phong kham') &&
            !norm.includes('bac si') &&
            !norm.includes('da co ket qua') &&
            !norm.includes('sieu am') &&
            !norm.includes('x-quang')
          ) {
            patientName = cleaned;
          }
        }

        if (!seqNum && (idx === 0 || idx === 1 || idx > 2) && /^\d{1,4}$/.test(text)) {
          seqNum = text;
        }
      });
    }

    return { patientName, seqNum };
  }

  function cleanBannerName(name) {
    if (!name) return null;
    let cleaned = name
      .replace(/\[.*?\]/g, '')
      .replace(/mãn\s*tính|man\s*tinh|ưu\s*tiên|uu\s*tien|cấp\s*cứu|cap\s*cuu|bhyt/gi, '')
      .trim();
    const norm = removeAccents(cleaned);
    if (
      norm.includes('benh vien') ||
      norm.includes('phong kham') ||
      norm.includes('bac si') ||
      norm.includes('ky thuat vien') ||
      norm.length < 3
    ) {
      return null;
    }
    return cleaned;
  }

  // Extract patient from active view banner (both Exam & CĐHA)
  function extractPatientFromBanner() {
    const raw = document.body.innerText || '';

    // 1. Match raw text for original casing and accents:
    // e.g. "PID 0008686 [SA.305] KHỔNG THỊ ĐANG Nữ 61 tuổi"
    const mRaw = raw.match(/(?:PID\s*)?\d{4,9}\s+(?:\[[^\]]*\]\s*)?([A-ZÀ-Ỹa-zà-ỹ\s]{2,35})\s+(?:Nam|Nữ|nam|nữ)\s+\d+\s+tuổi/iu);
    if (mRaw) {
      const candidate = cleanBannerName(mRaw[1]);
      if (candidate) return candidate;
    }

    // 2. Fallback using normalized text
    const norm = removeAccents(raw);

    const m1 = norm.match(/(?:pid\s*)?\d{4,9}\s+(?:\[[^\]]*\]\s*)?([a-z\s]{2,35})\s+(?:nam|nu)\s+\d+\s+tuoi/i);
    if (m1) {
      const candidate = cleanBannerName(m1[1]);
      if (candidate) return candidate;
    }

    const m2 = norm.match(/(?:\[[^\]]*\]\s*)?([a-z\s]{3,35})\s+(?:nam|nu).*?\(\s*ns\s*:/i);
    if (m2) {
      const candidate = cleanBannerName(m2[1]);
      if (candidate) return candidate;
    }

    const m3 = norm.match(/([a-z\s]{4,35})\s+(?:nam|nu)\s+\d+\s+tuoi/i);
    if (m3) {
      const candidate = cleanBannerName(m3[1]);
      if (candidate) return candidate;
    }

    return null;
  }

  function removeQuickButtons() {
    const qBtn = document.getElementById('mhc-quick-call-btn');
    if (qBtn) qBtn.remove();
    const cBtn = document.getElementById('mhc-cancel-call-btn');
    if (cBtn) cBtn.remove();
  }

  function isDetailScreenOpen(screenType) {
    const raw = document.body.innerText || '';
    const norm = removeAccents(raw);

    if (screenType === 'CDHA') {
      const isCdhaTab =
        norm.includes('lam bao cao cdha') &&
        (norm.includes('ket qua mau') || norm.includes('mau bao cao') || norm.includes('luu lai') || norm.includes('hoan thanh'));
      return isCdhaTab;
    }

    if (screenType === 'EXAM') {
      return (
        norm.includes('chi tiet thong tin ngoai tru') ||
        norm.includes('tom tat cls') ||
        norm.includes('kq chi dinh')
      );
    }

    return false;
  }

  // 1. Detection via Click
  document.addEventListener('click', (e) => {
    try {
      const screenType = getScreenType();
      if (!screenType) return;

      const target = e.target;
      if (!target) return;

      const text = removeAccents(target.innerText || target.textContent || '');

      // User exits the patient record back to the search list or finishes:
      const isExitAction =
        text.includes('tim kiem') ||
        text.includes('lam moi') ||
        text.includes('danh sach tham kham') ||
        text.includes('cho thuc hien') ||
        text.includes('da lam bao cao') ||
        text.includes('hoi chan cdha') ||
        text.includes('vat tu tieu hao') ||
        text.includes('huy kham') ||
        text.includes('hoan thanh');

      if (isExitAction) {
        clearMhcCalling(true);
        removeQuickButtons();
        return;
      }

      // Check click on patient row in table
      const row = target.closest('tr') || target.closest('.el-table__row') || target.closest('[class*="row"]');
      if (row) {
        if (screenType === 'CDHA') {
          // In CĐHA "Chờ thực hiện", all patients are waiting to be called into the room
          const { patientName, seqNum } = extractFromRow(row);
          if (patientName || seqNum) {
            notifyMhc(patientName, seqNum);
            return;
          }
        } else if (screenType === 'EXAM') {
          // In Exam rooms, only patients with "Đã có kết quả" are returning to room
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
      }

      // Check if viewing detail banner
      setTimeout(handlePatientDetailView, 400);
    } catch (err) {
      console.error('[MHC Extension] Click error:', err);
    }
  }, true);

  // 2. Auto-trigger when viewing patient detail (completely automatic, no injected floating buttons)
  function handlePatientDetailView() {
    removeQuickButtons(); // Always clean up any floating buttons if they exist

    const screenType = getScreenType();
    if (!screenType || !isDetailScreenOpen(screenType)) {
      return;
    }

    const patientName = extractPatientFromBanner();
    if (!patientName) return;

    // Auto trigger
    const raw = document.body.innerText || '';
    const norm = removeAccents(raw);

    if (screenType === 'CDHA') {
      // In CĐHA: if doctor is in "Làm báo cáo CĐHA", call patient to TV
      notifyMhc(patientName, null);
    } else if (screenType === 'EXAM') {
      // In Exam: only if patient has results
      if (norm.includes('kq chi dinh') || norm.includes('tom tat cls') || norm.includes('da co ket qua')) {
        notifyMhc(patientName, null);
      }
    }
  }

  let throttleTimer = null;
  const observer = new MutationObserver(() => {
    const screenType = getScreenType();
    if (!screenType) {
      removeQuickButtons();
      return;
    }
    if (throttleTimer) return;
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      handlePatientDetailView();
    }, 600);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(handlePatientDetailView, 1000);
})();
