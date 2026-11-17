import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AreaSelectorPage from './pages/AreaSelectorPage';
import QueueScreenPage from './pages/QueueScreenPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AreaSelectorPage />} />
      <Route path="/subclinical-queue/:areaId" element={<QueueScreenPage mode="subclinical" />} />
      <Route path="/clinical-queue/:areaId" element={<QueueScreenPage mode="clinical" />} />
      <Route path="/queue/:areaId" element={<QueueScreenPage mode="auto" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
