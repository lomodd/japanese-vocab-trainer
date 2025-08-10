import React, { useState } from 'react';
import WordModule from './WordModule';
import GrammarModule from './GrammarModule';

export default function App() {
  const [activeModule, setActiveModule] = useState('words'); // 'words' 或 'grammar'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow p-6">
        {/* 顶部标题和模块切换 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            {activeModule === 'words' ? '📘 日语单词记忆' : '📙 日语语法笔记'}
          </h1>
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-lg ${
                activeModule === 'words'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => setActiveModule('words')}
            >
              单词记忆
            </button>
            <button
              className={`px-4 py-2 rounded-lg ${
                activeModule === 'grammar'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
              onClick={() => setActiveModule('grammar')}
            >
              语法笔记
            </button>
          </div>
        </div>

        {/* 模块内容 */}
        {activeModule === 'words' && <WordModule />}
        {activeModule === 'grammar' && <GrammarModule />}
      </div>
    </div>
  );
}
