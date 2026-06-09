import React from 'react';
import { formatDisplayDate, formatDisplayTime } from '../../utils/dateTime';
import { Icon } from './DashboardUI';

export default function ClashAlert({ error, onDismiss }) {
  if (!error || error.code !== 'SCHEDULE_CONFLICT') return null;

  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-100 text-red-700">
            <Icon name="alert" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-red-900">Schedule Conflict Detected</h3>
            <p className="mt-1 text-sm text-red-700">{error.message}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-100 hover:text-red-700"
            aria-label="Dismiss conflict alert"
          >
            x
          </button>
        )}
      </div>

      {error.conflicts?.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">Conflicting Exams</p>
          {error.conflicts.map((conflict) => (
            <div key={conflict.id} className="rounded-lg border border-red-200 bg-white p-3 text-sm">
              <div className="font-bold text-red-950">{conflict.subject}</div>
              <div className="mt-2 grid gap-2 text-xs text-red-700 sm:grid-cols-3">
                <span className="flex items-center gap-1.5">
                  <Icon name="calendar" className="h-3.5 w-3.5" />
                  {formatDisplayDate(conflict.examDate)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" className="h-3.5 w-3.5" />
                  {formatDisplayTime(conflict.startTime)} - {formatDisplayTime(conflict.endTime)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="building" className="h-3.5 w-3.5" />
                  Hall {conflict.hall}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
