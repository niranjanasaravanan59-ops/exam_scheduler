import React from 'react';
import { format } from 'date-fns';

export default function ClashAlert({ error, onDismiss }) {
  if (!error || error.code !== 'SCHEDULE_CONFLICT') return null;

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-red-800">Schedule Conflict Detected</h3>
            <p className="text-sm text-red-700 mt-1">{error.message}</p>
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        )}
      </div>

      {error.conflicts?.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Conflicting Exams:</p>
          {error.conflicts.map((c) => (
            <div key={c.id} className="bg-red-100 border border-red-200 rounded-md p-3 text-sm">
              <div className="font-medium text-red-900">{c.subject}</div>
              <div className="text-red-700 text-xs mt-1">
                📅 {c.examDate} &nbsp;|&nbsp; 🕐 {c.startTime} – {c.endTime} &nbsp;|&nbsp; 🏛 {c.hall}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
