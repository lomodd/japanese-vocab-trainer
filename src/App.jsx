import React, { useState } from 'react';
import WordModule from './WordModule';
import GrammarModule from './GrammarModule';

export default function App() {
  const [activeModule, setActiveModule] = useState('word'); // 'words' 或 'grammar'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white">
      <div className="max-w-6xl mx-auto rounded-2xl p-2">
          {/* 顶部标题和模块切换 */}
        <div className="flex justify-center my-2">
          <div className="bg-gray-200 p-1 rounded-full flex space-x-1 relative">
            <button
              className={`px-4 py-2 rounded-full transition-all duration-300 ${
                activeModule === 'word'
                  ? 'bg-blue-500 text-white shadow'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => setActiveModule('word')}
            >
              单词记忆
            </button>
            <button
              className={`px-4 py-2 rounded-full transition-all duration-300 ${
                activeModule === 'grammar'
                  ? 'bg-blue-500 text-white shadow'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
              onClick={() => setActiveModule('grammar')}
            >
              语法笔记
            </button>
          </div>
        </div>


        {/* 模块内容 */}
        <div className="transition-opacity duration-500" key={activeModule}>
          {activeModule === 'word' ? <WordModule /> : <GrammarModule />}
        </div>
      </div>
    </div>
  );
}
