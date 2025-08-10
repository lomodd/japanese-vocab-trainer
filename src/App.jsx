import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import EditModal from './EditModal';  // 引入 EditModal 组件
import ConfirmUpdateModal from './components/ConfirmUpdateModal'; // Import the modal

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
  const [isCorrect, setIsCorrect] = useState(null);  // 用于存储校验结果
  const [reviewOnlyWrong, setReviewOnlyWrong] = useState(false);
    // 新增在 state 之后
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const wordInputRef = useRef(null); // 用于聚焦单词输入框
  // 在 state 下面加
  const fileInputRef = useRef(null);
  const backupInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('words'); // Default tab is 'words'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wordToUpdate, setWordToUpdate] = useState(null);
  const [importing, setImporting] = useState(false);
  const [overwriteAll, setOverwriteAll] = useState(false);  // State to track if all words should be overwritten
  // 在 state 区域加：
const [reviewList, setReviewList] = useState([]);
const [reviewIndex, setReviewIndex] = useState(0);

const handleCSVImportClick = () => {
  if (fileInputRef.current) fileInputRef.current.click();
};

const handleBackupImportClick = () => {
  if (backupInputRef.current) backupInputRef.current.click();
};
  const showAlert = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000); // 3 秒后消失
  };

  useEffect(() => {
    return () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); };
  }, []);

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

  

  // Switch tabs when a button is clicked
  const switchTab = (tab) => {
    setActiveTab(tab);
  };


  // Check if the word already exists in the list
  const isWordExist = (newWord) => {
    return words.some(word => word.word === newWord.word);
  };

  // Handle adding or updating the word
  const addWord = () => {
    if (!form.word.trim() || !form.reading.trim()) {
      showAlert('请输入单词和读音');
      return;
    }

    const existingWord = words.find(w => w.word === form.word.trim());

    if (existingWord) {
      // If word exists, open the modal for confirmation
      setWordToUpdate({
        currentWord: existingWord,
        updatedWord: { ...existingWord, ...form }
      });
      setIsModalOpen(true);
    }  else {
      // Add the new word if not already in the list
      const newWord = {
        id: uid(),
        ...form,
        addedAt: new Date().toISOString(),  // Store the current time as addedAt
        lastReviewedAt: new Date().toISOString()  // Store the same time initially as lastReviewedAt
      };

      setWords(prev => [newWord, ...prev]);
      showAlert(`单词 "${form.word}" 已添加`);
    }

    // Clear form after add or update
    setForm({ word: '', reading: '', meaning: '' });
    if (wordInputRef.current) {
      wordInputRef.current.focus();
    }
  };


  // Confirm the update and update the word
  const handleConfirmUpdate = () => {
    setWords(prevWords =>
      prevWords.map(w => w.word === wordToUpdate.currentWord.word ? { ...w, ...wordToUpdate.updatedWord } : w)
    );
    showAlert(`单词 "${form.word}" 已更新`);
    setIsModalOpen(false);
    setForm({ word: '', reading: '', meaning: '' }); // Reset the form
  };

  // Cancel the update
  const handleCancelUpdate = () => {
    setIsModalOpen(false);
    setForm({ word: '', reading: '', meaning: '' }); // Reset the form
  };

  function deleteWord(id) {
    //if (!confirm('确定删除这个单词吗？')) return;
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
    if (!words || words.length === 0) {
      showAlert('单词表为空');
      return;
    }

    const rows = [
      ['word', 'reading', 'meaning', 'addedAt', 'lastReviewedAt'], // Add headers for addedAt and lastReviewedAt
      ...words.map(w => [
        w.word,
        w.reading,
        w.meaning,
        w.addedAt || '',  // Add addedAt, defaulting to empty string if not available
        w.lastReviewedAt || '',  // Add lastReviewedAt, defaulting to empty string if not available
      ]),
    ];

    const csv = rows
      .map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvArray = new TextEncoder().encode(csv);
    const blob = new Blob([bom, csvArray], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jp_words_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }


  // Handle importing words (CSV)
  // Handle CSV import
  const importCSVFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const data = results.data.map(r => ({
          id: uid(),
          word: r.word.trim(),
          reading: r.reading.trim(),
          meaning: r.meaning ? r.meaning.trim() : '',
          addedAt: r.addedAt ? r.addedAt.trim() : '',
          lastReviewedAt: r.lastReviewedAt ? r.lastReviewedAt.trim() : '',
        }));

        // Ask whether to overwrite all
        let overwriteAllPrompt = window.confirm('是否覆盖所有现有单词？如果选择是，所有重复单词将直接更新。');
        setOverwriteAll(overwriteAllPrompt);

        setImporting(true);

// 原来的导入逻辑改成：
const newList = [];
data.forEach(newWord => {
  if (isWordExist(newWord)) {
    if (overwriteAllPrompt) {
      setWords(prevWords => prevWords.map(w =>
        w.word === newWord.word ? { ...w, ...newWord } : w
      ));
      showAlert(`单词 "${newWord.word}" 已更新`);
    } else {
      const confirmUpdate = window.prompt(`单词 "${newWord.word}" 已存在，是否更新？ 直接回车更新，输入1 更新所有`);
      if (confirmUpdate == null) {
        setWords(prevWords => prevWords.map(w =>
          w.word === newWord.word ? { ...w, ...newWord } : w
        ));
        showAlert(`单词 "${newWord.word}" 已更新`);
      } else if (confirmUpdate == 1){
        overwriteAllPrompt = true;
        setOverwriteAll(true);
        showAlert(`本次已经存在单词都将被更新`);
      }
    }
  } else {
    newList.push(newWord); // 先放到临时数组
  }
});

// 最后一次性加到前面（保持 CSV 原始顺序）
if (newList.length > 0) {
  setWords(prev => [...newList, ...prev]);
}

        setImporting(false);
      },
    });
  };

  // review logic: show word only, check reading
  // 启动复习
const startReview = (onlyWrong = false) => {
  const pool = onlyWrong ? Object.values(wrongBook) : words;
  if (!pool || pool.length === 0) {
    showAlert(onlyWrong ? '错题本为空' : '单词表为空');
    return;
  }
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  setReviewList(shuffled);
  setReviewIndex(0);
  setCurrent(shuffled[0]);
  setReviewOnlyWrong(onlyWrong);
  setMode('review');
  setAnswer('');
  setIsCorrect(null);
};

// 修改 nextReview()
function nextReview() {
  if (reviewIndex + 1 >= reviewList.length) {
    setCurrent(null);
    showAlert('🎉 恭喜，已经完成本轮复习！');
    return;
  }
  const nextIdx = reviewIndex + 1;
  setReviewIndex(nextIdx);
  setCurrent(reviewList[nextIdx]);
  setAnswer('');
  setIsCorrect(null);
}

  function normalize(s){ return (s||'').trim().toLowerCase().replace(/[。.,!！，]/g,''); }

// 修改 checkAnswer()
const checkAnswer = () => {
  if (!current) return;
  const user = answer.trim().toLowerCase();
  const correct = current.reading.trim().toLowerCase();
  const normalize = s => (s || '').trim().toLowerCase().replace(/[。.,!！，]/g, '');
  const isExact = normalize(user) === normalize(correct);
  const isSimilar = !isExact && normalize(user) &&
    (normalize(correct).includes(normalize(user)) || normalize(user).includes(normalize(correct)));

  if (isExact) {
    setIsCorrect('exact');
    setWrongBook(prev => {
      const copy = { ...prev };
      if (copy[current.word]) delete copy[current.word];
      return copy;
    });
    updateDaily(true);
    setWords(prev => prev.map(w =>
      w.id === current.id ? { ...w, lastReviewedAt: new Date().toISOString() } : w
    ));
  } else if (isSimilar) {
    setIsCorrect('similar');
    setWrongBook(prev => ({ ...prev, [current.word]: current }));
    updateDaily(false);
  } else {
    setIsCorrect('wrong');
    setWrongBook(prev => ({ ...prev, [current.word]: current }));
    updateDaily(false);
  }

};



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
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jp_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  const fr = new FileReader();
  fr.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.words && Array.isArray(data.words)) {
        setWords(prev => [
          ...data.words.map(w => ({
            ...w,
            id: uid(), // Generate new IDs
            addedAt: w.addedAt ? w.addedAt.trim() : '', // Set to empty string if not available
            lastReviewedAt: w.lastReviewedAt ? w.lastReviewedAt.trim() : '', // Set to empty string if not available
          })),
          ...prev,
        ]);
      }
      if (data.wrongBook) setWrongBook(prev => ({ ...prev, ...data.wrongBook }));
      if (data.dailyStats) setDailyStats(prev => ({ ...prev, ...data.dailyStats }));
      showAlert('导入备份成功');
    } catch (err) {
      showAlert('备份文件格式错误');
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

function formatDate(dateString) {
  const date = new Date(dateString);
  
  // Check if the date is invalid
  if (isNaN(date.getTime())) {
    return '';  // Return empty string if date is invalid or missing
  }

  // Return formatted date if valid
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function exportWrongBookCSV() {
  const wrongList = Object.values(wrongBook);
  if (!wrongList || wrongList.length === 0) {
    showAlert('错题本为空');
    return;
  }

  const rows = [
    ['word', 'reading', 'meaning', 'addedAt', 'lastReviewedAt'],
    ...wrongList.map(w => [
      w.word,
      w.reading,
      w.meaning,
      w.addedAt || '',
      w.lastReviewedAt || '',
    ]),
  ];

  const csv = rows
    .map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const csvArray = new TextEncoder().encode(csv);
  const blob = new Blob([bom, csvArray], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jp_wrongbook_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}



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
{/* Form */}
<div className="bg-white rounded-xl shadow p-4 mb-6">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
    <input
      ref={wordInputRef}
      className="w-full border rounded-lg p-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
      placeholder="日语单词 (例: ありがとう)"
      value={form.word}
      onChange={e => setForm({ ...form, word: e.target.value })}
      onKeyDown={handleKeyDown}
    />
    <input
      className="w-full border rounded-lg p-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
      placeholder="读音 (例: ありがとう)"
      value={form.reading}
      onChange={e => setForm({ ...form, reading: e.target.value })}
      onKeyDown={handleKeyDown}
    />
    <input
      className="w-full border rounded-lg p-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
      placeholder="释义 (例: 谢谢)"
      value={form.meaning}
      onChange={e => setForm({ ...form, meaning: e.target.value })}
      onKeyDown={handleKeyDown}
    />
  </div>

<div className="flex flex-wrap gap-3 justify-center mt-4">
  <button
    className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 transition"
    onClick={addWord}
  >
    添加
  </button>
  <button
    className="bg-green-100 text-green-800 px-3 py-2 rounded-lg hover:bg-green-200 transition"
    onClick={exportCSV}
  >
    导出 CSV
  </button>
  <button
    className="bg-green-100 text-green-800 px-3 py-2 rounded-lg hover:bg-green-200 transition"
    onClick={exportBackup}
  >
    导出 (JSON)
  </button>
  <button
    className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg hover:bg-orange-200 transition"
    onClick={handleCSVImportClick}
  >
    导入 CSV
  </button>
  <input
    type="file"
    accept=".csv"
    ref={fileInputRef}
    style={{ display: 'none' }}
    onChange={(e) => {
      if (e.target.files.length > 0) {
        importCSVFile(e.target.files[0]);
        e.target.value = "";
      }
    }}
  />
  <button
    className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg hover:bg-orange-200 transition"
    onClick={handleBackupImportClick}
  >
    导入 (JSON)
  </button>
  <input
    type="file"
    accept=".json"
    ref={backupInputRef}
    style={{ display: 'none' }}
    onChange={(e) => {
      if (e.target.files.length > 0) {
        importBackup(e.target.files[0]);
        e.target.value = "";
      }
    }}
  />
</div>

</div>



        {/* Main */}
{/* Tab Buttons */}
<div className="flex mb-6 border-b">
  <button
    className={`px-4 py-2 text-sm font-semibold ${
      activeTab === 'words' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'
    }`}
    onClick={() => switchTab('words')}
  >
    单词列表
  </button>
  <button
    className={`px-4 py-2 text-sm font-semibold ${
      activeTab === 'review' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'
    }`}
    onClick={() => switchTab('review')}
  >
    复习
  </button>
</div>{/* Tab Buttons end */}

<div className="grid grid-cols-1 md:grid-cols-1 gap-6">
      {/* Tab Content */}
      {activeTab === 'words' && (
          //{/* Word List */}
          <div className="bg-gray-50 rounded p-4">
            <h2 className="font-semibold text-lg mb-4">
              单词列表（共 {words.length} 个，错题 {Object.keys(wrongBook).length} 个）
            </h2>
            {/* Word List Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-1">
              {words.map(w => (
            <div
              key={w.id}
              className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition-shadow relative group"
            >
              {/* 操作按钮区（默认隐藏，hover 显示） */}
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1 rounded-full hover:bg-yellow-200"
                  onClick={() => openEditModal(w)}
                  title="编辑"
                >
                  ✏️
                </button>
                <button
                  className="p-1 rounded-full hover:bg-red-200"
                  onClick={() => deleteWord(w.id)}
                  title="删除"
                >
                  🗑
                </button>
              </div>

              {/* 单词信息 */}
              <div className="text-lg font-bold text-gray-800">{w.word}</div>
              <div className="text-sm text-blue-600 mb-2">{w.reading}</div>
              <div className="text-gray-600 text-sm mb-2">释义: {w.meaning}</div>
              <div className="text-xs text-gray-400">添加时间: {formatDate(w.addedAt)}</div>
              <div className="text-xs text-gray-400">最新复习: {formatDate(w.lastReviewedAt)}</div>
            </div>

              ))}
            </div>
          </div>
      )}
      {activeTab === 'review' && (
          //{/* Review Section */}
          <div className="bg-gray-50 rounded p-4">
            <h2 className="font-semibold text-lg mb-2">复习</h2>
            <div className="text-sm mb-4 text-gray-600">
              {reviewOnlyWrong
                ? `❌ 复习范围：错题本（共 ${Object.keys(wrongBook).length} 个）`
                : `📚 复习范围：全部单词（共 ${words.length} 个）`
              }
            </div>
            <div className="flex gap-4 mb-4">
                  <button className="bg-purple-600 text-white px-4 py-2 rounded" onClick={() => startReview(false)}>复习全部</button>
                  <button className="bg-orange-500 text-white px-4 py-2 rounded" onClick={() => startReview(true)}>复习错题本</button>
                  <button className="bg-red-500 text-white px-4 py-2 rounded"     onClick={exportWrongBookCSV}>导出错题本</button>
            </div>

            <div className="border rounded p-3 mt-6">
              {current && (
                <div className="mb-2 text-sm text-gray-500">
                  进度：{reviewIndex + 1} / {reviewList.length}
                </div>
              )}
              {!current && (
                <div className="text-center text-lg text-green-600">
                  🎉 已经完成本轮复习！
                </div>
              )}
              <div className="text-xl font-bold mb-2">{current ? current.word : '点击开始复习'}</div>
              <div className="text-sm text-gray-600 mb-2">{current ? current.meaning : ''}</div>
              <input 
                className="w-full border rounded p-2 mb-2"
                placeholder="输入读音并回车或点击检查"
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    checkAnswer();
                    if (isCorrect === 'exact') {
                      nextReview();
                    }
                  }
                }}

              />
              <div className="flex gap-4">
                <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={checkAnswer}>检查</button>
                <button className="bg-gray-300 text-black px-4 py-2 rounded" onClick={nextReview}>下一题</button>
              </div>
              {/* 校验结果显示 */}
              {isCorrect && (
                <div className={`mt-4 ${
                  isCorrect === 'exact' ? 'text-green-500' :
                  isCorrect === 'similar' ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {isCorrect === 'exact' && '✅ 正确'}
                  {isCorrect === 'similar' && '⚠ 接近（计入错题）'}
                  {isCorrect === 'wrong' && '❌ 错误，请再试'}
                  <div className="mt-2">
                    <strong>正确答案:</strong>
                    <div><strong>读音:</strong> {current.reading}</div>
                    <div><strong>释义:</strong> {current.meaning}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
      )}
</div>
      
        {/* Edit Modal */}
        {isEditing && (
          <EditModal
            wordData={editWordData}
            onClose={closeEditModal}
            onSave={saveWordEdit}
          />
        )}
        {/* 自定义提示弹窗 */}
       {toast && <div className="toast">{toast}</div>}

      {/* Confirmation Modal for updating existing word */}
      {isModalOpen && (
        <ConfirmUpdateModal
          currentWord={wordToUpdate.currentWord}
          updatedWord={wordToUpdate.updatedWord}
          onConfirm={handleConfirmUpdate}
          onCancel={handleCancelUpdate}
        />
      )}
      </div>
    </div>
  );
}
