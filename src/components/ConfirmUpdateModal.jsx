// ConfirmUpdateModal.jsx
import React from 'react';

const ConfirmUpdateModal = ({ currentWord, updatedWord, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-xl font-semibold mb-4">确认更新单词</h3>
        <div className="mb-4">
          <p className="text-sm text-gray-700">当前单词:</p>
          <div className="p-2 border rounded mb-2">
            <p><strong>日语:</strong> {currentWord.word}</p>
            <p><strong>读音:</strong> {currentWord.reading}</p>
            <p><strong>释义:</strong> {currentWord.meaning}</p>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-700">更新后的单词:</p>
          <div className="p-2 border rounded mb-2">
            <p><strong>日语:</strong> {updatedWord.word}</p>
            <p><strong>读音:</strong> {updatedWord.reading}</p>
            <p><strong>释义:</strong> {updatedWord.meaning}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={onConfirm}
          >
            确认更新
          </button>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            onClick={onCancel}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmUpdateModal;
