import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchQueueByAreaId } from '../api/queueApi';
import { playDingDong } from '../utils/sound';
import HeaderBar from '../components/HeaderBar';
import CallingPanel from '../components/CallingPanel';
import WaitingListPanel from '../components/WaitingListPanel';

export default function QueueScreenPage() {
  const { areaId } = useParams();
  const [data, setData] = useState(null);
  const [notFoundError, setNotFoundError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highlightedKeys, setHighlightedKeys] = useState(() => new Set());
  const prevCallingKeysRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    prevCallingKeysRef.current = null;

    async function pollQueue() {
      try {
        const res = await fetchQueueByAreaId(areaId);
        if (!mounted) return;

        setData(res);
        setNotFoundError(null);
        setIsOffline(false);

        const currentKeys = new Set(
          (res.calling || []).map((p) => `${p.patient_id}-${p.seq_num}`)
        );

        if (prevCallingKeysRef.current !== null) {
          const newlyCalled = [];
          for (const key of currentKeys) {
            if (!prevCallingKeysRef.current.has(key)) {
              newlyCalled.push(key);
            }
          }

          if (newlyCalled.length > 0) {
            if (soundEnabled) {
              playDingDong();
            }
            setHighlightedKeys(new Set(newlyCalled));
            setTimeout(() => {
              if (mounted) setHighlightedKeys(new Set());
            }, 5000);
          }
        }

        prevCallingKeysRef.current = currentKeys;
      } catch (err) {
        if (!mounted) return;
        if (err.status === 400 || err.status === 404) {
          setNotFoundError(err.message);
        } else {
          setIsOffline(true);
        }
      }
    }

    pollQueue();
    const timer = setInterval(pollQueue, 3000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [areaId, soundEnabled]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      playDingDong();
    }
  };

  if (notFoundError) {
    return (
      <div className="mhc-error-screen">
        <h2>{notFoundError}</h2>
        <p>Mã phòng: {areaId}</p>
        <Link to="/" className="mhc-back-btn">
          Quay về trang chọn phòng
        </Link>
      </div>
    );
  }

  return (
    <div className="mhc-screen-layout">
      <HeaderBar
        areaName={data?.area?.area_name}
        totalWaiting={data?.summary?.total ?? 0}
        isOffline={isOffline}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      <main className="mhc-main-grid">
        <CallingPanel
          callingList={data?.calling || []}
          highlightedKeys={highlightedKeys}
        />
        <WaitingListPanel
          waitingList={data?.waiting || []}
          waitingResultList={data?.waitingResult || []}
        />
      </main>
    </div>
  );
}
