import React from 'react';

/**
 * ConcurrencyModal — shown when server returns CONCURRENCY_CONFLICT (409).
 * Offers three actions: Reload Latest, Retry with My Changes, Compare Versions.
 */
export default function ConcurrencyModal({ error, myData, onReload, onRetry, onCompare, onClose }) {
  if (!error || error.code !== 'CONCURRENCY_CONFLICT') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚡</span>
          <div>
            <h2 className="font-bold text-gray-900">Edit Conflict</h2>
            <p className="text-sm text-gray-500">Someone else modified this record</p>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4">{error.message}</p>

        {error.currentData && myData && (
          <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-medium text-blue-800 mb-2">📡 Current (Server)</p>
              <p>Marks: <span className="font-bold">{error.currentData.marks}</span></p>
              <p>Grade: <span className="font-bold">{error.currentData.grade}</span></p>
              <p className="text-blue-600">v{error.currentData.version}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="font-medium text-orange-800 mb-2">✏️ Your Changes</p>
              <p>Marks: <span className="font-bold">{myData.marks}</span></p>
              <p className="text-orange-600">v{error.yourVersion}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={onReload}
            className="w-full btn-primary text-sm py-2.5"
          >
            🔄 Reload Latest — discard my changes
          </button>
          <button
            onClick={onRetry}
            className="w-full btn-secondary text-sm py-2.5"
          >
            ♻️ Retry with My Changes — force overwrite
          </button>
          <button
            onClick={onCompare}
            className="w-full btn-secondary text-sm py-2.5"
          >
            🔍 Compare Versions — review side by side
          </button>
          <button
            onClick={onClose}
            className="w-full text-sm py-2 text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
