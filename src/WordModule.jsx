import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import EditWordModal from './components/EditWordModal';
import ConfirmUpdateModal from './components/ConfirmUpdateModal';
import ConfirmImportWordModal from './components/ConfirmImportWordModal';
import Toast from './components/Toast';
import ConfirmModal from "./components/ConfirmModal";

const STORAGE_KEY = 'jp_vocab_v1';
const WRONG_KEY = 'jp_vocab_wrong_v1';
const DAILY_KEY = 'jp_vocab_daily_v1';
const REVIEW_PROGRESS_KEY = 'word_review_progress';

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function WordModule() {
  const [words, setWords] = useState([]);
  const [wrongBook, setWrongBook] = useState({});
  const [form, setForm] = useState({ word: '', reading: '', meaning: '' });
  const [current, setCurrent] = useState(null);
  const [answer, setAnswer] = useState('');
  const [dailyStats, setDailyStats] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editWordData, setEditWordData] = useState(null);
  const dailyGoalRef = useRef(20);
  const [isCorrect, setIsCorrect] = useState(null);
  const [reviewOnlyWrong, setReviewOnlyWrong] = useState(false);
  const toastTimeoutRef = useRef(null);
  const wordInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const backupInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('words');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wordToUpdate, setWordToUpdate] = useState(null);
  const [overwriteAll, setOverwriteAll] = useState(false);
  const [reviewList, setReviewList] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [toast, setToast] = useState(null);
  const [pendingImports, setPendingImports] = useState([]);
  const [currentImportIndex, setCurrentImportIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // 新增：表单折叠状态
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [existingMatches, setExistingMatches] = useState([]);


  // 监听 tab 切换
  useEffect(() => {
    if (activeTab === 'review') {
      setIsFormCollapsed(true);
    } else {
      setIsFormCollapsed(false);
    }
  }, [activeTab]);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const w = JSON.parse(localStorage.getItem(WRONG_KEY) || '{}');
    const d = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
    setWords(s);
    setWrongBook(w);
    setDailyStats(d);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  }, [words]);

  useEffect(() => {
    localStorage.setItem(WRONG_KEY, JSON.stringify(wrongBook));
  }, [wrongBook]);

  useEffect(() => {
    localStorage.setItem(DAILY_KEY, JSON.stringify(dailyStats));
  }, [dailyStats]);

  const switchTab = (tab) => {
    setActiveTab(tab);
  };

  const isWordExist = (newWord) => {
    return words.some((word) => word.word === newWord.word);
  };

  const addWord = () => {
    if (!form.word.trim() || !form.reading.trim()) {
      showToast('请输入单词和读音','error');
      return;
    }

    const existingWord = words.find((w) => w.word === form.word.trim());

    if (existingWord) {
      setWordToUpdate({
        currentWord: existingWord,
        updatedWord: { ...existingWord, ...form },
      });
      setIsModalOpen(true);
    } else {
      const newWord = {
        id: uid(),
        ...form,
        addedAt: new Date().toISOString(),
        lastReviewedAt: new Date().toISOString(),
      };

      setWords((prev) => [newWord, ...prev]);
      showToast(`单词 "${form.word}" 已添加`,'success');
    }

    setForm({ word: '', reading: '', meaning: '' });
    if (wordInputRef.current) {
      wordInputRef.current.focus();
    }
  };

  const handleConfirmUpdate = () => {
    setWords((prevWords) =>
      prevWords.map((w) =>
        w.word === wordToUpdate.currentWord.word
          ? { ...w, ...wordToUpdate.updatedWord }
          : w
      )
    );
    showToast(`单词 "${wordToUpdate.updatedWord.word}" 已更新`,'success');
    setIsModalOpen(false);
    setForm({ word: '', reading: '', meaning: '' });
  };

  const handleCancelUpdate = () => {
    setIsModalOpen(false);
    setForm({ word: '', reading: '', meaning: '' });
  };

  function deleteWord(id) {
    setWords((prev) => prev.filter((w) => w.id !== id));
    setWrongBook((prev) => {
      const copy = { ...prev };
      for (const k in copy) {
        if (copy[k].id === id) delete copy[k];
      }
      return copy;
    });
  }

  function openEditWordModal(word) {
    setEditWordData(word);
    setIsEditing(true);
  }

  function closeEditWordModal() {
    setIsEditing(false);
  }

  function saveWordEdit(updatedWord) {
    setWords((prev) => prev.map((w) => (w.id === updatedWord.id ? updatedWord : w)));
    setWrongBook((prev) => {
      const copy = { ...prev };
      if (copy[updatedWord.word]) {
        copy[updatedWord.word] = updatedWord;
      }
      return copy;
    });
    showToast(`编辑成功，单词 "${updatedWord.word}" 已更新`,'success');
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      addWord();
    }
  };

  function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }


  function exportCSV() {
    if (!words || words.length === 0) {
      showToast('单词表为空','error');
      return;
    }

    const rows = [
      ['word', 'reading', 'meaning', 'addedAt', 'lastReviewedAt'],
      ...words.map((w) => [
        w.word,
        w.reading,
        w.meaning,
        w.addedAt || '',
        w.lastReviewedAt || '',
      ]),
    ];

    const csv = rows
      .map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const csvArray = new TextEncoder().encode(csv);
    const blob = new Blob([bom, csvArray], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jp_words_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  function importCSVFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const data = results.data.map((r) => ({
          id: uid(),
          word: r.word.trim(),
          reading: r.reading.trim(),
          meaning: r.meaning ? r.meaning.trim() : '',
          addedAt: r.addedAt ? r.addedAt.trim() : '',
          lastReviewedAt: r.lastReviewedAt ? r.lastReviewedAt.trim() : '',
        }));

        let overwriteAllPrompt = window.confirm(
          '是否覆盖所有现有单词？如果选择是，所有重复单词将直接更新。'
        );
        setOverwriteAll(overwriteAllPrompt);

        const newList = [];
        data.forEach((newWord) => {
          if (isWordExist(newWord)) {
            if (overwriteAllPrompt) {
              setWords((prevWords) =>
                prevWords.map((w) =>
                  w.word === newWord.word ? { ...w, ...newWord } : w
                )
              );
              showToast(`单词 "${newWord.word}" 已更新`,'success');
            } else {
              const confirmUpdate = window.prompt(
                `单词 "${newWord.word}" 已存在，是否更新？ 直接回车更新，输入1 更新所有`
              );
              if (confirmUpdate == null) {
                setWords((prevWords) =>
                  prevWords.map((w) =>
                    w.word === newWord.word ? { ...w, ...newWord } : w
                  )
                );
                showToast(`单词 "${newWord.word}" 已更新`,'success');
              } else if (confirmUpdate == 1) {
                overwriteAllPrompt = true;
                setOverwriteAll(true);
                showToast(`本次已经存在单词都将被更新`,'success');
              }
            }
          } else {
            newList.push(newWord);
          }
        });

        if (newList.length > 0) {
          setWords((prev) => [...newList, ...prev]);
        }
      },
    });
  }

  function importBackup(file) {
    const fr = new FileReader();
    fr.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.words && Array.isArray(data.words)) {
          setWords((prev) => [
            ...data.words.map((w) => ({
              ...w,
              id: uid(),
              addedAt: w.addedAt ? w.addedAt.trim() : '',
              lastReviewedAt: w.lastReviewedAt ? w.lastReviewedAt.trim() : '',
            })),
            ...prev,
          ]);
        }
        if (data.wrongBook) setWrongBook((prev) => ({ ...prev, ...data.wrongBook }));
        if (data.dailyStats) setDailyStats((prev) => ({ ...prev, ...data.dailyStats }));
        showToast('导入备份成功','success');
      } catch (err) {
        showToast('备份文件格式错误','error');
      }
    };
    fr.readAsText(file, 'utf-8');
  }


const handleImportWithCheck = (data) => {
  const existingWords = new Set(words.map(w => w.word));
  const duplicates = data.filter(w => existingWords.has(w.word));
  const uniques = data.filter(w => !existingWords.has(w.word));

  if (uniques.length > 0) {
    setWords(prev => [...uniques, ...prev]);
    showToast(`已导入 ${uniques.length} 个新单词`, 'success');
  }

  if (duplicates.length > 0) {
    setPendingImports(duplicates);
    setCurrentImportIndex(0);
  }
};

const importCSV = (file) => {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const data = results.data.map(r => ({
        id: uid(),
        word: (r.word || '').trim(),
        reading: (r.reading || '').trim(),
        meaning: (r.meaning || '').trim(),
        addedAt: r.addedAt || new Date().toISOString(),
      })).filter(w => w.word && w.meaning);
      handleImportWithCheck(data);
    }
  });
};

const importJSON = (file) => {
  const fr = new FileReader();
  fr.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data)) {
        const mapped = data.map(w => ({
          id: uid(),
          word: (w.word || '').trim(),
          reading: (w.reading || '').trim(),
          meaning: (w.meaning || '').trim(),
          addedAt: w.addedAt || new Date().toISOString(),
        })).filter(w => w.word && w.meaning);
        handleImportWithCheck(mapped);
      } else {
        showToast("JSON 格式不正确", "error");
      }
    } catch {
      showToast("解析 JSON 失败", "error");
    }
  };
  fr.readAsText(file, 'utf-8');
};
 
const handleCover = () => {
  const wordToImport = pendingImports[currentImportIndex];
  setWords(prev =>
    prev.map(w => (w.word === wordToImport.word ? wordToImport : w))
  );
  nextImport();
};

const handleSkip = () => {
  nextImport();
};

const handleCoverAll = () => {
  setWords(prev => {
    const others = prev.filter(w => !pendingImports.some(pi => pi.word === w.word));
    return [...pendingImports, ...others];
  });
  setPendingImports([]);
};

const handleSkipAll = () => {
  setPendingImports([]);
};

const nextImport = () => {
  if (currentImportIndex + 1 < pendingImports.length) {
    setCurrentImportIndex(currentImportIndex + 1);
  } else {
    setPendingImports([]);
  }
};


  // === 新增：复习缓存逻辑 ===
  function beginNewReview(pool, onlyWrong) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setReviewList(shuffled);
    setReviewIndex(0);
    setCurrent(shuffled[0]);
    setReviewOnlyWrong(onlyWrong);
    setAnswer('');
    setIsCorrect(null);
    setHasStarted(true);

    localStorage.setItem(REVIEW_PROGRESS_KEY, JSON.stringify({
      reviewList: shuffled,
      reviewIndex: 0,
      onlyWrong
    }));
  }

  function restoreFromCache() {
    const saved = JSON.parse(localStorage.getItem(REVIEW_PROGRESS_KEY) || '{}');
    if (!saved.reviewList || saved.reviewList.length === 0) return;

    setReviewList(saved.reviewList);
    setReviewIndex(saved.reviewIndex);
    setCurrent(saved.reviewList[saved.reviewIndex]);
    setHasStarted(true);
    setAnswer('');
    setIsCorrect(null);
  }

  function startReview(onlyWrong = false) {
    setHasStarted(true);
    const pool = onlyWrong ? Object.values(wrongBook) : words;
    if (!pool || pool.length === 0) {
      showToast(onlyWrong ? '错题本为空' : '单词表为空', 'warning');
      return;
    }

    const saved = JSON.parse(localStorage.getItem(REVIEW_PROGRESS_KEY) || '{}');
    if (saved.reviewList && saved.reviewList.length > 0 && saved.reviewIndex < saved.reviewList.length) {
      setShowContinuePrompt(true);
      return;
    }

    beginNewReview(pool, onlyWrong);
  }

  function nextReview() {
    if (reviewIndex + 1 >= reviewList.length) {
      setCurrent(null);
      showToast('🎉 恭喜，已经完成本轮复习！', 'success');
      localStorage.removeItem(REVIEW_PROGRESS_KEY);
      return;
    }
    const nextIdx = reviewIndex + 1;
    setReviewIndex(nextIdx);
    setCurrent(reviewList[nextIdx]);
    setAnswer('');
    setIsCorrect(null);

    localStorage.setItem(REVIEW_PROGRESS_KEY, JSON.stringify({
      reviewList,
      reviewIndex: nextIdx,
      onlyWrong: reviewOnlyWrong
    }));
  }

  const checkAnswer = () => {
    if (!current) return;
    const normalize = (s) => (s || '').trim().toLowerCase().replace(/[。.,!！，]/g, '');
    const user = normalize(answer);
    const correct = normalize(current.reading);
    const isExact = user === correct;
    const isSimilar =
      !isExact && user && (correct.includes(user) || user.includes(correct));

    if (isExact) {
      setIsCorrect('exact');
      setWrongBook((prev) => {
        const copy = { ...prev };
        if (copy[current.word]) delete copy[current.word];
        return copy;
      });
      updateDaily(true);
      setWords((prev) =>
        prev.map((w) =>
          w.id === current.id ? { ...w, lastReviewedAt: new Date().toISOString() } : w
        )
      );
    } else if (isSimilar) {
      setIsCorrect('similar');
      setWrongBook((prev) => ({ ...prev, [current.word]: current }));
      updateDaily(false);
    } else {
      setIsCorrect('wrong');
      setWrongBook((prev) => ({ ...prev, [current.word]: current }));
      updateDaily(false);
    }
  };

  function updateDaily(correct) {
    const day = new Date().toISOString().slice(0, 10);
    setDailyStats((prev) => {
      const copy = { ...prev };
      if (!copy[day]) copy[day] = { total: 0, correct: 0 };
      copy[day].total++;
      if (correct) copy[day].correct++;
      return copy;
    });
  }

  function exportWrongBookCSV() {
    const wrongList = Object.values(wrongBook);
    if (!wrongList || wrongList.length === 0) {
      showToast('错题本为空','error');
      return;
    }

    const rows = [
      ['word', 'reading', 'meaning', 'addedAt', 'lastReviewedAt'],
      ...wrongList.map((w) => [
        w.word,
        w.reading,
        w.meaning,
        w.addedAt || '',
        w.lastReviewedAt || '',
      ]),
    ];

    const csv = rows
      .map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const csvArray = new TextEncoder().encode(csv);
    const blob = new Blob([bom, csvArray], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jp_wrongbook_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayStats = dailyStats[today] || { total: 0, correct: 0 };
  const goal = dailyGoalRef.current || 20;


  return (
    <div className="relative">{/* 表单区域（外层包裹，内容可折叠 + 底部常驻的 Toggle） */}
      {/* 表单区域：加了折叠动画 */}
      <div
        className={`relative rounded-2xl bg-gradient-to-r from-stone-900 via-gray-900 to-zinc-900 shadow-lg 
          overflow-hidden transition-all duration-1000 ease-in-out
          ${isFormCollapsed ? 'max-h-0 opacity-0 p-0' : 'max-h-[600px] opacity-100 p-[2px]'}`}
      >

        {!isFormCollapsed && (
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                ref={wordInputRef}
                className="w-full border rounded-lg p-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-white placeholder-gray-4003"
                placeholder="日语单词"
                value={form.word}
                onChange={(e) => setForm({ ...form, word: e.target.value })}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  const keyword = form.word.trim();
                  if (keyword) {
                    const matches = words.filter(w => w.word === keyword);
                    setExistingMatches(matches);
                    if (wordInputRef.current) {
                      wordInputRef.current.focus();
                    }
                  } else {
                    setExistingMatches([]);
                  }
                }}
              />
              <input
                className="w-full border rounded-lg p-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-white placeholder-gray-4003"
                placeholder="读音"
                value={form.reading}
                onChange={(e) => setForm({ ...form, reading: e.target.value })}
                onKeyDown={handleKeyDown}
              />
              <input
                className="w-full border rounded-lg p-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-white placeholder-gray-4003"
                placeholder="释义"
                value={form.meaning}
                onChange={(e) => setForm({ ...form, meaning: e.target.value })}
                onKeyDown={handleKeyDown}
              />
            </div>
            {existingMatches.length > 0 && (
              <div className="relative p-3 rounded-2xl bg-gray-900 text-white shadow-lg   border border-gray-800  
                   before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r before:from-pink-500 before:to-purple-500 
                before:blur-xl before:opacity-40 before:-z-10">
              <div class="font-medium text-yellow-300 mb-1">⚠️已存在：</div>
              <ul className="space-y-1">
                {existingMatches.map(m => (
                  <li key={m.id} className="flex flex-wrap gap-2">
                    <span className="font-semibold text-gray-200">{m.word}</span>
                    <span className="text-red-500">[{m.reading}]</span>
                    <span className="text-gray-200">{m.meaning}</span>
                  </li>
                ))}
              </ul>
            </div>
            )}


            <div className="flex flex-wrap gap-3 justify-center mt-4">
              <button className="text-white bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 
                font-medium rounded-lg text-xs px-5 py-2.5 text-center me-2 mb-2" 
              onClick={addWord}>添加</button>
              <button className="text-white border border-purple-300 bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 
                font-medium rounded-lg text-xs px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700" 
              onClick={exportCSV}>导出 CSV</button>  
              <button className="text-white border border-pink-300 bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 
                font-medium rounded-lg text-xs px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700" 
              onClick={() => fileInputRef.current.click()}>导入 CSV</button>
              <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => { if (e.target.files.length > 0) { importCSV(e.target.files[0]); e.target.value = ""; } }} />
              
              <button 
                 className="font-medium rounded-lg text-xs px-5 py-2.5 text-center me-2 mb-2
                           bg-gray-800 text-white/80 
                           hover:text-white hover:bg-gray-700
                           border border-gray-600
                           outline outline-1 outline-gray-700 outline-offset-1
                           transition-all duration-200
                           shadow-sm hover:shadow-md"
               onClick={exportBackup}>导出 (JSON)</button>
              <button 
                className="font-medium rounded-lg text-xs px-5 py-2.5 text-center me-2 mb-2
                           bg-gray-800 text-white/80 
                           hover:text-white hover:bg-gray-700
                           border border-gray-600
                           outline outline-1 outline-gray-700 outline-offset-1
                           transition-all duration-200
                           shadow-sm hover:shadow-md"
              onClick={() => backupInputRef.current.click()}>导入 (JSON)</button>
              <input type="file" accept=".json" ref={backupInputRef} style={{ display: 'none' }} onChange={(e) => { if (e.target.files.length > 0) { importJSON(e.target.files[0]); e.target.value = ""; } }} />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setIsFormCollapsed(v => !v)}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm bg-gray-800 text-white/90 hover:bg-gray-700 shadow"
                aria-controls="word-form-panel"
                aria-expanded={!isFormCollapsed}
                title={isFormCollapsed ? '展开单词面板' : '收起'}
              >
                <span>{isFormCollapsed ? '展开单词面板' : '收起'}</span>
                {/* 小箭头图标 */}
                <svg
                  className={`w-4 h-4 transition-transform ${isFormCollapsed ? '' : 'rotate-180'}`}
                  viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
                ><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {isFormCollapsed && (
          <div className="flex justify-end">
            <button
              onClick={() => setIsFormCollapsed(v => !v)}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm bg-gray-800 text-white/90 hover:bg-gray-700 shadow"
              aria-controls="word-form-panel"
              aria-expanded={!isFormCollapsed}
              title='展开单词面板'
            >
              <span>展开单词面板</span>
              <svg
                className="w-4 h-4 transition-transform rotate-180"
                viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
              ><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
       )}

      {/* 主体区 */}
      <div className="backdrop-blur-md bg-white/70 border border-gray-200 rounded-xl px-2 sm:px-6 py-2 mt-4 shadow-sm">
        <div className="flex border-b">
          <button className={`px-4 py-2 font-semibold ${activeTab === 'words' ? 'text-md border-b-2 border-blue-600 text-blue-600' : 'text-sm text-gray-600'}`} onClick={() => switchTab('words')}>单词列表</button>
          <button className={`px-4 py-2 font-semibold ${activeTab === 'review' ? 'text-md border-b-2 border-blue-600 text-blue-600' : 'text-sm text-gray-600'}`} onClick={() => switchTab('review')}>复习</button>
        </div>
        {/* 列表和复习 */}
        {activeTab === 'words' && (
        <div className="rounded p-2 sm:p-4">
          {words.length === 0 ? (
            <div className="text-center text-gray-800 py-6">
              📥 请导入或者输入添加单词
            </div>
          ) : (
            <h2 className="font-semibold text-lg mb-4">单词列表（共 {words.length} 个，错题 {Object.keys(wrongBook).length} 个）</h2>
          )}  
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-1 ">
            {words.map((w) => (
              <div key={w.id} className="bg-white rounded-xl shadow p-4 border border-gray-400 hover:border-blue-400 hover:shadow-lg transition-shadow relative group">
                <div className="absolute top-2 right-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button className="p-1 rounded-full hover:bg-yellow-200" onClick={() => openEditWordModal(w)}>✏️</button>
                  <button className="p-1 rounded-full hover:bg-red-200" onClick={() => deleteWord(w.id)}>🗑</button>
                </div>
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
        <div className="rounded p-2 sm:p-4">
          <div className="text-sm mb-4 text-gray-600">
            {reviewOnlyWrong ? `❌ 复习范围：错题本（共 ${Object.keys(wrongBook).length} 个）` : `📚 复习范围：全部单词（共 ${words.length} 个）`}
          </div>
          <div className="flex gap-4 mb-4">
            <button className="focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-2 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900" 
              onClick={() => startReview(false)}>复习全部</button>
            <button className="text-white bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2" 
              onClick={() => startReview(true)}>复习错题本</button>
            <button className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800"
              onClick={exportWrongBookCSV}>
              <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
              导出错题本
              </span>
            </button>
          </div>

          <div
            className={`mt-6 p-3 sm:p-6 rounded-2xl shadow-lg border transition-all duration-300 backdrop-blur-md bg-white/10 
              ${isCorrect === 'exact'
                ? 'border-green-500'
                : isCorrect === 'similar'
                ? 'border-yellow-500'
                : isCorrect === 'wrong'
                ? 'border-red-500'
                : 'border-gray-500'}`}
          >
            {current && (
              <div className="mb-3 text-sm text-gray-500">
                进度：{reviewIndex + 1} / {reviewList.length}
              </div>
            )}
            {hasStarted && reviewIndex >= reviewList.length && (
              <div className="text-center text-lg text-green-400 font-semibold">
                🎉 已经完成本轮复习！
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
              <div className="text-2xl font-bold mb-3">{current ? current.word : '点击开始复习'}</div>
              <div className="text-lg text-blue-600 mb-4">{current ? current.meaning : ''}</div>
            </div>


            <input
              className="w-full rounded-xl p-3 mb-4 bg-black border border-gray-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400"
              placeholder="输入读音并回车或点击检查"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
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
              <button
                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl transition"
                onClick={checkAnswer}
              >
                检查
              </button>
              <button
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-xl transition"
                onClick={nextReview}
              >
                下一题
              </button>

            </div>

            {hasStarted && reviewIndex < reviewList.length && current && isCorrect && (
              <div
                className={`mt-6 ${
                  isCorrect === 'exact'
                    ? 'text-green-400'
                    : isCorrect === 'similar'
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {isCorrect === 'exact' && '✅ 正确'}
                {isCorrect === 'similar' && '⚠ 接近（计入错题）'}
                {isCorrect === 'wrong' && '❌ 错误，请再试'}

                <div className="mt-3 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                  <strong className="block text-gray-200 mb-1">正确答案:</strong>
                  <div className="text-blue-300">
                    <strong>读音:</strong> {current.reading}
                  </div>
                  <div className="text-gray-300">
                    <strong>释义:</strong> {current.meaning}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>

    {isEditing && <EditWordModal wordData={editWordData} onClose={closeEditWordModal} onSave={saveWordEdit} />}
      {isModalOpen && <ConfirmUpdateModal currentWord={wordToUpdate.currentWord} updatedWord={wordToUpdate.updatedWord} onConfirm={handleConfirmUpdate} onCancel={handleCancelUpdate} />}
      {toast && (
      <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {pendingImports.length > 0 && (
        <ConfirmImportWordModal
          word={pendingImports[currentImportIndex]}
          onCover={handleCover}
          onSkip={handleSkip}
          onCoverAll={handleCoverAll}
          onSkipAll={handleSkipAll}
        />
      )}
      <ConfirmModal
        isOpen={showContinuePrompt}
        title="继续上次复习？"
        message="检测到上次有未完成的复习，是否继续？"
        confirmText="继续"
        cancelText="重新开始"
        onConfirm={() => {
          restoreFromCache();
          setShowContinuePrompt(false);
        }}
        onCancel={() => {
          localStorage.removeItem(REVIEW_PROGRESS_KEY);
          setShowContinuePrompt(false);
          const pool = reviewOnlyWrong ? Object.values(wrongBook) : words;
          beginNewReview(pool, reviewOnlyWrong);
        }}
      />
</div>
  );
}

