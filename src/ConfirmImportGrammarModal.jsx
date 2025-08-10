import React from "react";

export default function ConfirmImportGrammarModal({
  note,
  onCover,
  onSkip,
  onCoverAll,
  onSkipAll
}) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-96">
        <h2 className="text-lg font-bold mb-4 text-blue-600">发现重复笔记</h2>
        <p className="mb-4">
          标题 <span className="font-semibold">“{note.title}”</span> 已存在，是否覆盖？
        </p>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={onCover}
            className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 cursor-pointer"
          >
            覆盖
          </button>
          <button
            onClick={onSkip}
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-300 cursor-pointer"
          >
            跳过
          </button>
          <button
            onClick={onCoverAll}
            className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 cursor-pointer"
          >
            全部覆盖
          </button>
          <button
            onClick={onSkipAll}
            className="bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600 cursor-pointer"
          >
            全部跳过
          </button>
        </div>
      </div>
    </div>
  );
}
