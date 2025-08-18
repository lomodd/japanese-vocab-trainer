import React, { useEffect, useRef } from "react";

export default function ConfirmModal({
  isOpen,
  title = "确认操作",
  message = "你确定吗？",
  confirmText = "确定",
  cancelText = "取消",
  onConfirm,
  onCancel,
  children,                 // ✅ 新增：自定义内容（如复选框）
  danger = false,           // ✅ 新增：危险操作样式（红色确认按钮）
  confirmDisabled = false,  // ✅ 新增：可禁用确认按钮
  closeOnOverlayClick = true, // ✅ 新增：点击遮罩关闭
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter" && !confirmDisabled) onConfirm?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onCancel, onConfirm, confirmDisabled]);

  if (!isOpen) return null;

  const confirmBtnCls = danger
    ? "px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
    : "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => { if (closeOnOverlayClick) onCancel?.(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-modal-title" className="text-lg font-semibold mb-4">
          {title}
        </h2>

        {/* 优先渲染自定义内容；没有 children 才显示 message */}
        {children ? (
          <div className="mb-6">{children}</div>
        ) : (
          <p className="text-gray-600 mb-6">{message}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={confirmBtnCls}
            disabled={confirmDisabled}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
