(function () {
  console.log('[MHC Extension v1.0.6] Đã kích hoạt trên trang HIS (tối ưu thông minh, không spam API).');

  let activeCallingPatientKey = null;

  // Clean up any existing toast if present
  const existingToast = document.getElementById('mhc-sync-toast');
  if (existingToast) existingToast.remove();

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

  const INVALID_NAME_WORDS = [
    'benh vien', 'phong kham', 'bac si', 'ky thuat vien', 'dieu duong',
    'da co ket qua', 'sieu am', 'x-quang', 'chup', 'xet nghiem',
    'danh muc', 'vat tu', 'dinh kem', 'hoa chat', 'thuoc',
    'dich vu', 'chi dinh', 'tong so', 'so ca', 'chan doan',
    'mo ta', 'ket qua', 'noi dung', 'ghi chu', 'bao cao',
    'thong tin', 'nhan vien', 'thao tac', 'khoa', 'kho',
    'thoi gian', 'ngay sinh', 'dia chi', 'bao hiem'
  ];

  function isValidPatientName(str) {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (trimmed.length < 3 || trimmed.length > 35) return false;
    if (/\d/.test(trimmed)) return false;
    if (!trimmed.includes(' ')) return false;
    const norm = removeAccents(trimmed);
    for (const w of INVALID_NAME_WORDS) {
      if (norm.includes(w)) return false;
    }
    return true;
  }

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

  function notifyMhc(patientName, seqNum) {
    if (!isValidPatientName(patientName) && !seqNum) return;

    const patientKey = `${removeAccents(patientName || '')}_${seqNum || ''}`;
    // If this patient is already currently active on MHC, DO NOT send duplicate API requests!
    if (patientKey === activeCallingPatientKey) {
      return;
    }

    chrome.storage.local.get(['mhcServerUrl', 'mhcAreaId', 'mhcAreaName', 'mhcEnabled'], (cfg) => {
      if (cfg.mhcEnabled === false || !cfg.mhcAreaId) return;

      const serverUrl = (cfg.mhcServerUrl || 'http://192.168.110.184:55637').replace(/\/+$/, '');
      const areaId = cfg.mhcAreaId;

      activeCallingPatientKey = patientKey;

      console.log(`[MHC Extension] Gọi bệnh nhân mới sang MHC (${cfg.mhcAreaName || areaId}): "${patientName}" (STT: ${seqNum || '--'})`);

      fetch(`${serverUrl}/api/queue/calling-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaId,
          patientName,
          seqNum,
        }),
      }).catch((err) => {
        console.error('[MHC Extension] Lỗi kết nối:', err);
      });
    });
  }

  function clearMhcCalling() {
    if (activeCallingPatientKey === null) {
      return; // Already cleared, no need to spam API
    }

    chrome.storage.local.get(['mhcServerUrl', 'mhcAreaId', 'mhcEnabled'], (cfg) => {
      if (cfg.mhcEnabled === false || !cfg.mhcAreaId) return;
      const serverUrl = (cfg.mhcServerUrl || 'http://192.168.110.184:55637').replace(/\/+$/, '');
      const areaId = cfg.mhcAreaId;

      activeCallingPatientKey = null;

      console.log(`[MHC Extension] Hủy gọi trả về danh sách chờ cho phòng: ${areaId}`);

      fetch(`${serverUrl}/api/queue/clear-calling-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaId }),
      }).catch(() => { });
    });
  }

  function cleanRowPatientName(str) {
    if (!str) return null;
    const cleaned = str
      .replace(/\[.*?\]/g, '') // remove bracket tags like [SA], [SA.305], [XQ]
      .replace(/mãn\s*tính|man\s*tinh|ưu\s*tiên|uu\s*tien|cấp\s*cứu|cap\s*cuu|bhyt/gi, '')
      .trim();
    return isValidPatientName(cleaned) ? cleaned : null;
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

    if (!patientName && cells.length >= 3) {
      cells.forEach((cell, idx) => {
        const text = cell.innerText.trim();
        const cleaned = cleanRowPatientName(text);
        if (!patientName && cleaned) {
          patientName = cleaned;
        }
        if (!seqNum && (idx === 0 || idx === 1) && /^\d{1,4}$/.test(text)) {
          seqNum = text;
        }
      });
    }

    return { patientName, seqNum };
  }

  function cleanBannerName(name) {
    if (!name) return null;
    const cleaned = name
      .replace(/\[.*?\]/g, '')
      .replace(/mãn\s*tính|man\s*tinh|ưu\s*tiên|uu\s*tien|cấp\s*cứu|cap\s*cuu|bhyt/gi, '')
      .trim();
    return isValidPatientName(cleaned) ? cleaned : null;
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

  // 1. Detection via Click (strictly targeted, never fires on blank space)
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
        clearMhcCalling();
        return;
      }

      // Check click on patient row in table
      const row = target.closest('tr') || target.closest('.el-table__row');
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

      // Only re-check detail if user specifically clicked a tab element
      const isTabClick = target.closest('.el-tabs__item, [role="tab"], .nav-tabs li');
      if (isTabClick) {
        setTimeout(handlePatientDetailView, 400);
      }
    } catch (err) {
      console.error('[MHC Extension] Click error:', err);
    }
  }, true);

  // 2. Auto-trigger when viewing patient detail (runs once per patient change, silent)
  function handlePatientDetailView() {
    const screenType = getScreenType();
    if (!screenType || !isDetailScreenOpen(screenType)) {
      // If user has left the detail screen, reset calling
      if (activeCallingPatientKey !== null) {
        clearMhcCalling();
      }
      return;
    }

    const patientName = extractPatientFromBanner();
    if (!patientName) return;

    const raw = document.body.innerText || '';
    const norm = removeAccents(raw);

    if (screenType === 'CDHA') {
      // In CĐHA: if doctor is in "Làm báo cáo CĐHA", call patient to TV (once)
      notifyMhc(patientName, null);
    } else if (screenType === 'EXAM') {
      // In Exam: only if patient has results (once)
      if (norm.includes('kq chi dinh') || norm.includes('tom tat cls') || norm.includes('da co ket qua')) {
        notifyMhc(patientName, null);
      }
    }
  }

  let throttleTimer = null;
  const observer = new MutationObserver(() => {
    const screenType = getScreenType();
    if (!screenType) return;

    if (throttleTimer) return;
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      handlePatientDetailView();
    }, 500);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(handlePatientDetailView, 800);
})();
