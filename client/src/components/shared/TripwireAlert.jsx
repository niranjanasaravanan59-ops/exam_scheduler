import React from 'react';

export default function TripwireAlert({ error, onDismiss }) {
  if (!error || error.code !== 'EXAM_NOT_COMPLETED') return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="text-amber-500 text-xl">🔒</span>
          <div>
            <h3 className="font-semibold text-amber-800">Marks Entry Not Allowed Yet</h3>
            <p className="text-sm text-amber-700 mt-1">{error.message}</p>
            {error.examDate && (
              <p className="text-xs text-amber-600 mt-2">
                Exam ends: <strong>{error.examDate}</strong> at <strong>{error.examEndTime}</strong>.
                Marks entry will be unlocked after the exam concludes.
              </p>
            )}
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-amber-400 hover:text-amber-600 text-lg leading-none">×</button>
        )}
      </div>
    </div>
  );
}
