import React, { useState } from 'react';
import WordModule from './WordModule';
import GrammarModule from './GrammarModule';
import KanaModule from './KanaModule';

export default function App() {
  const [activeModule, setActiveModule] = useState('word'); // 'words' 或 'grammar'

  return (
<div className="min-h-screen bg-zinc-900 relative overflow-hidden">
  {/* 深色渐变底色 */}
  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900"></div>

  {/* 光斑层 */}
  <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
  <div className="absolute top-2/3 left-2/4 w-[28rem] h-[28rem] bg-blue-400/10 rounded-full blur-[100px]"></div>
  <div className="absolute top-0 left-0 w-[20rem] h-[20rem] bg-purple-500/10 rounded-full blur-[120px]"></div>
  <div className="absolute bottom-0 right-0 w-[25rem] h-[25rem] bg-pink-400/10 rounded-full blur-[120px]"></div>

  {/* 内容区域 */}
  <div className="relative z-10 ">
    {/* 这里放你的内容 */}

      <div className="max-w-6xl mx-auto rounded-2xl p-2">
          {/* 顶部标题和模块切换 */}
<div className="flex justify-center my-4">
  <div className="p-1 rounded-full flex space-x-2 bg-zinc-800/60 backdrop-blur-md border border-white/10">
    <button
      className={`px-6 py-2 rounded-full font-medium transition-all duration-300
        ${activeModule === 'word'
          ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-blue-500/30'
          : 'bg-transparent text-gray-300 hover:text-white hover:shadow-lg hover:shadow-blue-500/30'
        }`}
      onClick={() => setActiveModule('word')}
    >
      单词记忆
    </button>
    <button
      className={`px-6 py-2 rounded-full font-medium transition-all duration-300
        ${activeModule === 'grammar'
          ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-pink-500/30'
          : 'bg-transparent text-gray-300 hover:text-white hover:shadow-lg hover:shadow-pink-500/30'
        }`}
      onClick={() => setActiveModule('grammar')}
    >
      语法笔记
    </button>
    <button
      className={`px-6 py-2 rounded-full font-medium transition-all duration-300
        ${activeModule === 'kana'
          ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-pink-500/30'
          : 'bg-transparent text-gray-300 hover:text-white hover:shadow-lg hover:shadow-pink-500/30'
        }`}
      onClick={() => setActiveModule('kana')}
    >
      五十音图
    </button>
  </div>
</div>

        {/* 模块内容 */}
        <div className="transition-opacity duration-500" key={activeModule}>
          {activeModule === 'word' && <WordModule />}
          {activeModule === 'grammar' && <GrammarModule />}
          {activeModule === 'kana' && <KanaModule />}
        </div>
      </div>
  </div>
</div>

  );
}
