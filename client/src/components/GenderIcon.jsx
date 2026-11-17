import React from 'react';

export function formatDob(patient) {
  if (!patient) return '--';
  const raw = patient.date_of_birth;
  if (typeof raw === 'string') {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      return raw;
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  }
  if (patient.year_of_birth) {
    return String(patient.year_of_birth);
  }
  return '--';
}

export default function GenderIcon({ gender, size = 28 }) {
  const isMale = Number(gender) === 1;
  const isFemale = Number(gender) === 0;

  if (!isMale && !isFemale) return null;

  if (isMale) {
    return (
      <span className="mhc-gender-icon male" title="Nam">
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="4.5" r="3" />
          <path d="M8.5 9h7c1.1 0 2 .9 2 2v4.5h-2V22h-2.5v-6.5h-2V22H8.5v-6.5h-2V11c0-1.1.9-2 2-2z" />
        </svg>
      </span>
    );
  }

  return (
    <span className="mhc-gender-icon female" title="Nữ">
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="4.5" r="3" />
        <path d="M15.4 9.8C14.9 9 14 8.5 13 8.5h-2c-1 0-1.9.5-2.4 1.3L6 15.5h3V22h2v-6.5h2V22h2v-6.5h3l-2.6-5.7z" />
      </svg>
    </span>
  );
}
