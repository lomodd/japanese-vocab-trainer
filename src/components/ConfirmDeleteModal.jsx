// src/components/ConfirmModal.jsx
import React from 'react';

export default function ConfirmModal({ title = '确认', message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={onCancel}
            aria-label="关闭"
          >
            ✖
          </button>
        </div>

        <p className="text-gray-700 mt-4 whitespace-pre-wrap">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}
