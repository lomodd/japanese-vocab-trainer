import React from "react";

export default function ConfirmModal({
  isOpen,
  title = "确认操作",
  message = "你确定吗？",
  confirmText = "确定",
  cancelText = "取消",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
