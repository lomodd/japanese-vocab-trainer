import React, { useState } from 'react';

export default function EditGrammarModal({ note, onSave, onClose }) {
  const [form, setForm] = useState({
    title: note.title,
    content: note.content,
    example: note.example,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-lg">
        <h2 className="text-lg font-bold mb-4">编辑语法笔记</h2>
        <input
          className="w-full border rounded-lg p-2 mb-3"
          placeholder="语法标题"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="w-full border rounded-lg p-2 mb-3"
          placeholder="语法内容"
          rows={3}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />
        <textarea
          className="w-full border rounded-lg p-2 mb-3"
          placeholder="例句"
          rows={2}
          value={form.example}
          onChange={(e) => setForm({ ...form, example: e.target.value })}
        />
        <div className="flex justify-end gap-3">
          <button
            className="bg-gray-200 px-4 py-2 rounded"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={() => onSave({ ...note, ...form })}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
