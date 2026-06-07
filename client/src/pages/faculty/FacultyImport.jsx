import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function FacultyImport() {
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState(null);

  const onDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setReport(null);
    try {
      const { data } = await api.post('/import/results', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReport(data.report);
      toast.success(`Import complete: ${data.report.imported} imported, ${data.report.skipped} skipped`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Import failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const downloadTemplate = async () => {
    try {
      const { data } = await api.get('/import/template', { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'results_import_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download template');
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Result Import</h1>
        <button onClick={downloadTemplate} className="btn-secondary text-sm">Download Template</button>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-3">CSV Requirements</h2>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Required columns: <code className="bg-gray-100 px-1 rounded">exam_id, roll_no, marks</code></li>
          <li>Marks must be between 0 and 100</li>
          <li>Use completed exams assigned to your faculty account</li>
          <li>Uploading the same file twice is safe; duplicates are skipped</li>
          <li>Grade is computed by the server</li>
        </ul>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-3">CSV</div>
        {uploading ? (
          <p className="text-blue-600 font-medium">Uploading and processing...</p>
        ) : isDragActive ? (
          <p className="text-blue-600 font-medium">Drop the CSV file here</p>
        ) : (
          <>
            <p className="text-gray-700 font-medium">Drag and drop a CSV file here</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
          </>
        )}
      </div>

      {report && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Import Report</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-3"><p className="text-2xl font-bold">{report.total}</p><p className="text-xs text-gray-500">Total Rows</p></div>
            <div className="bg-green-50 rounded-lg p-3"><p className="text-2xl font-bold text-green-700">{report.imported}</p><p className="text-xs text-gray-500">Imported</p></div>
            <div className="bg-yellow-50 rounded-lg p-3"><p className="text-2xl font-bold text-yellow-700">{report.skipped}</p><p className="text-xs text-gray-500">Skipped</p></div>
            <div className="bg-red-50 rounded-lg p-3"><p className="text-2xl font-bold text-red-700">{report.errors?.length || 0}</p><p className="text-xs text-gray-500">Errors</p></div>
          </div>
          {report.errors?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-700 mb-2">Row Errors:</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {report.errors.map((e, i) => (
                  <div key={`${e.row}-${i}`} className="text-xs bg-red-50 border border-red-200 rounded p-2">
                    Row {e.row}: [{e.field}] {e.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
