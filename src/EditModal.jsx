// EditModal.jsx
import React, { useState } from 'react';

function EditModal({ wordData, onClose, onSave }) {
  const [word, setWord] = useState(wordData.word);
  const [reading, setReading] = useState(wordData.reading);
  const [meaning, setMeaning] = useState(wordData.meaning);

  const handleSave = () => {
    onSave({ ...wordData, word, reading, meaning });
    onClose(); // 关闭弹窗
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">编辑单词</h2>
        <div className="mb-4">
          <label className="block text-sm mb-1">日语单词</label>
          <input
            className="w-full border rounded p-2"
            value={word}
            onChange={(e) => setWord(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1">读音</label>
          <input
            className="w-full border rounded p-2"
            value={reading}
            onChange={(e) => setReading(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1">释义</label>
          <input
            className="w-full border rounded p-2"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditModal;
