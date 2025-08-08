import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import EditModal from './EditModal';  // 引入 EditModal 组件

const STORAGE_KEY = 'jp_vocab_v1';
const WRONG_KEY = 'jp_vocab_wrong_v1';
const DAILY_KEY = 'jp_vocab_daily_v1';

function uid() { return Math.random().toString(36).slice(2,9); }

export default function App() {
  const [words, setWords] = useState([]);
  const [wrongBook, setWrongBook] = useState({});
  const [mode, setMode] = useState('list'); // list | review
  const [form, setForm] = useState({ word:'', reading:'', meaning:'' });
  const [current, setCurrent] = useState(null);
  const [answer, setAnswer] = useState('');
  const [dailyStats, setDailyStats] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editWordData, setEditWordData] = useState(null);
  const dailyGoalRef = useRef(20);

  useEffect(()=>{
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const w = JSON.parse(localStorage.getItem(WRONG_KEY) || '{}');
    const d = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    setWords(s);
    setWrongBook(w);
    setDailyStats(d);
  },[]);

  useEffect(()=>{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  },[words]);

  useEffect(()=>{
    localStorage.setItem(WRONG_KEY, JSON.stringify(wrongBook));
  },[wrongBook]);

  useEffect(()=>{
    localStorage.setItem(DAILY_KEY, JSON.stringify(dailyStats));
  },[dailyStats]);

  // add
  function addWord() {
    if (!form.word.trim() || !form.reading.trim() ) { //|| !form.meaning.trim()
      alert('请输入单词、读音（释义可以选填）');
      return;
    }
    setWords(prev => [...prev, { id: uid(), ...form }]);
    setForm({ word:'', reading:'', meaning:'' });
  }

  function deleteWord(id) {
    if (!confirm('确定删除这个单词吗？')) return;
    setWords(prev => prev.filter(w => w.id !== id));
    // remove from wrongBook if present
    setWrongBook(prev => { const copy = {...prev}; for(const k in copy){ if(copy[k].id===id) delete copy[k]; } return copy; });
  }

  function editWord(id, newData) {
    setWords(prev => prev.map(w => w.id===id ? {...w, ...newData}: w));
    // if in wrongBook update reading/meaning etc
    setWrongBook(prev => {
      const copy = {...prev};
      for(const k in copy) if(copy[k].id===id) copy[k] = {...copy[k], ...newData};
      return copy;
    });
  }

  // CSV Export (BOM)
  function exportCSV() {
    if (!words || words.length===0) { alert('单词表为空'); return; }
    const rows = [['word','reading','meaning'], ...words.map(w => [w.word, w.reading, w.meaning])];
    const csv = rows.map(r => r.map(c => `"${(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const bom = new Uint8Array([0xEF,0xBB,0xBF]);
    const csvArray = new TextEncoder().encode(csv);
    const blob = new Blob([bom, csvArray], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `jp_words_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

function importCSVFile(file) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      const data = results.data
        .filter(r => r.word && r.reading)  // 只检查 word 和 reading 是否存在
        .map(r => ({
          id: uid(),
          word: r.word.trim(),
          reading: r.reading.trim(),
          meaning: r.meaning ? r.meaning.trim() : ''  // 如果缺少释义，设置为默认空字符串
        }));

      if (data.length === 0) {
        alert('文件没有有效行 (需要 word, reading, meaning 列)');
        return;
      }
      setWords(prev => [...prev, ...data]);
      alert('导入完成');
    }
  });
}


  // review logic: show word only, check reading
  function startReview(onlyWrong=false) {
    const pool = onlyWrong ? Object.values(wrongBook) : words;
    if (!pool || pool.length===0) { alert(onlyWrong ? '错题本为空' : '单词表为空'); return; }
    setMode('review');
    setAnswer('');
    const pick = pool[Math.floor(Math.random()*pool.length)];
    setCurrent(pick);
  }

  function nextReview() {
    const pool = (Object.keys(wrongBook).length>0 && mode==='review' && current && wrongBook[current.word]) ? Object.values(wrongBook) : (mode==='review' ? Object.values(wrongBook) : words);
    if (!pool || pool.length===0) { setCurrent(null); setMode('list'); return; }
    const pick = pool[Math.floor(Math.random()*pool.length)];
    setCurrent(pick);
    setAnswer('');
  }

  function normalize(s){ return (s||'').trim().toLowerCase().replace(/[。.,!！，]/g,''); }

  function checkAnswer() {
    if (!current) return;
    const user = normalize(answer);
    const correct = normalize(current.reading);
    if (!user) { alert('请输入读音再提交'); return; }
    // exact or partial
    const similarity = (correct.includes(user) || user.includes(correct));
    if (user === correct || similarity) {
      // correct
      alert('✅ 正确');
      // remove from wrongBook if present
      setWrongBook(prev => { const c = {...prev}; if (c[current.word]) delete c[current.word]; return c; });
      updateDaily(true);
    } else {
      alert(`❌ 错误，正确读音：${current.reading}`);
      // add to wrongBook
      setWrongBook(prev => ({...prev, [current.word]: current}));
      updateDaily(false);
    }
    nextReview();
  }

  function updateDaily(correct) {
    const day = new Date().toISOString().slice(0,10);
    setDailyStats(prev => {
      const copy = {...prev};
      if (!copy[day]) copy[day] = { total:0, correct:0 };
      copy[day].total++;
      if (correct) copy[day].correct++;
      return copy;
    });
  }

  function exportBackup() {
    const payload = { exportedAt: new Date().toISOString(), words, wrongBook, dailyStats };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `jp_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file) {
    const fr = new FileReader();
    fr.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.words && Array.isArray(data.words)) {
          setWords(prev => [...prev, ...data.words.map(w=>({...w, id: uid()}))]);
        }
        if (data.wrongBook) setWrongBook(prev => ({...prev, ...data.wrongBook}));
        if (data.dailyStats) setDailyStats(prev => ({...prev, ...data.dailyStats}));
        alert('导入备份成功');
      } catch(err) {
        alert('备份文件格式错误');
      }
    };
    fr.readAsText(file, 'utf-8');
  }
  
   // 显示编辑弹窗
  function openEditModal(word) {
    setEditWordData(word);
    setIsEditing(true);
  }

  // 关闭编辑弹窗
  function closeEditModal() {
    setIsEditing(false);
  }

  // 保存编辑后的单词
  function saveWordEdit(updatedWord) {
    setWords(prev => prev.map(w => w.id === updatedWord.id ? updatedWord : w));
    // 如果在错题本中也更新
    setWrongBook(prev => {
      const copy = { ...prev };
      if (copy[updatedWord.word]) {
        copy[updatedWord.word] = updatedWord;
      }
      return copy;
    });
  }
  // 监听回车键，提交表单
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      addWord();
    }
  };

  // UI render
  const today = new Date().toISOString().slice(0,10);
  const todayStats = dailyStats[today] || { total:0, correct:0 };
  const goal = dailyGoalRef.current || 20;
  const progress = Math.min(Math.round((todayStats.total / goal) * 100), 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">📘 日语单词记忆</h1>
          <div className="text-sm text-gray-500">本地存储 · 离线可用</div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <input className="border rounded p-2" placeholder="日语单词 (例: ありがとう)" value={form.word} onChange={e => setForm({...form, word: e.target.value})} 
            onKeyDown={handleKeyDown} />
          <input className="border rounded p-2" placeholder="读音 (例: ありがとう)" value={form.reading} onChange={e => setForm({...form, reading: e.target.value})} 
            onKeyDown={handleKeyDown} />
          <input className="border rounded p-2" placeholder="释义 (例: 谢谢)" value={form.meaning} onChange={e => setForm({...form, meaning: e.target.value})} 
            onKeyDown={handleKeyDown} />
          <div className="flex gap-4">
            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={addWord}>添加</button>
            <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={exportCSV}>导出 CSV</button>
            <button className="bg-gray-200 text-black px-4 py-2 rounded" onClick={exportBackup}>导出备份 (JSON)</button>
          </div>
        </div>

        {/* Main */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Word List */}
          <div className="bg-gray-50 rounded p-4">
            <h2 className="font-semibold text-lg mb-4">单词列表</h2>
            <div className="overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2">日语</th>
                    <th className="px-4 py-2">读音</th>
                    <th className="px-4 py-2">释义</th>
                    <th className="px-4 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map(w => (
                    <tr key={w.id} className="border-b">
                      <td className="px-4 py-2">{w.word}</td>
                      <td className="px-4 py-2">{w.reading}</td>
                      <td className="px-4 py-2">{w.meaning}</td>
                      <td className="px-4 py-2">
                        <button className="bg-yellow-200 text-black px-2 py-1 rounded mr-2" onClick={() => openEditModal(w)}>编辑</button>
                        <button className="bg-red-200 text-black px-2 py-1 rounded" onClick={() => deleteWord(w.id)}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Review Section */}
          <div className="bg-gray-50 rounded p-4">
            <h2 className="font-semibold text-lg mb-4">复习</h2>
            <div className="flex gap-4">
              <button className="bg-purple-600 text-white px-4 py-2 rounded" onClick={() => startReview(false)}>复习全部</button>
              <button className="bg-orange-500 text-white px-4 py-2 rounded" onClick={() => startReview(true)}>复习错题本</button>
            </div>

            <div className="border rounded p-3 mt-6">
              <div className="text-xl font-bold mb-2">{current ? current.word : '点击开始复习'}</div>
              <div className="text-sm text-gray-600 mb-2">{current ? current.meaning : ''}</div>
              <input className="w-full border rounded p-2 mb-2" placeholder="输入读音并回车或点击检查" value={answer} onChange={e => setAnswer(e.target.value)} />
              <div className="flex gap-4">
                <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={checkAnswer}>检查</button>
                <button className="bg-gray-300 text-black px-4 py-2 rounded" onClick={nextReview}>下一题</button>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <EditModal
            wordData={editWordData}
            onClose={closeEditModal}
            onSave={saveWordEdit}
          />
        )}
      </div>
    </div>
  );
}
