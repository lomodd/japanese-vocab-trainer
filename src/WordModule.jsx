import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import EditWordModal from './components/EditWordModal';
import ConfirmUpdateModal from './components/ConfirmUpdateModal';

const STORAGE_KEY = 'jp_vocab_v1';
const WRONG_KEY = 'jp_vocab_wrong_v1';
const DAILY_KEY = 'jp_vocab_daily_v1';

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
  const [toast, setToast] = useState(null);
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

  const showAlert = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
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
      showAlert('请输入单词和读音');
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
      showAlert(`单词 "${form.word}" 已添加`);
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
    showAlert(`单词 "${form.word}" 已更新`);
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
      showAlert('单词表为空');
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
              showAlert(`单词 "${newWord.word}" 已更新`);
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
                showAlert(`单词 "${newWord.word}" 已更新`);
              } else if (confirmUpdate == 1) {
                overwriteAllPrompt = true;
                setOverwriteAll(true);
                showAlert(`本次已经存在单词都将被更新`);
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
        showAlert('导入备份成功');
      } catch (err) {
        showAlert('备份文件格式错误');
      }
    };
    fr.readAsText(file, 'utf-8');
  }

  function startReview(onlyWrong = false) {
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
    setAnswer('');
    setIsCorrect(null);
  }

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
      showAlert('错题本为空');
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
    <div>
      {/* 表单区域 */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            ref={wordInputRef}
            className="w-full border rounded-lg p-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            placeholder="日语单词"
            value={form.word}
            onChange={(e) => setForm({ ...form, word: e.target.value })}
            onKeyDown={handleKeyDown}
          />
          <input
            className="w-full border rounded-lg p-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            placeholder="读音"
            value={form.reading}
            onChange={(e) => setForm({ ...form, reading: e.target.value })}
            onKeyDown={handleKeyDown}
          />
          <input
            className="w-full border rounded-lg p-2 shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            placeholder="释义"
            value={form.meaning}
            onChange={(e) => setForm({ ...form, meaning: e.target.value })}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="flex flex-wrap gap-3 justify-center mt-4">
          <button className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200" onClick={addWord}>添加</button>
          <button className="bg-green-100 text-green-800 px-3 py-2 rounded-lg hover:bg-green-200" onClick={exportCSV}>导出 CSV</button>
          <button className="bg-green-100 text-green-800 px-3 py-2 rounded-lg hover:bg-green-200" onClick={exportBackup}>导出 (JSON)</button>
          <button className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg hover:bg-orange-200" onClick={() => fileInputRef.current.click()}>导入 CSV</button>
          <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => { if (e.target.files.length > 0) { importCSVFile(e.target.files[0]); e.target.value = ""; } }} />
          <button className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg hover:bg-orange-200" onClick={() => backupInputRef.current.click()}>导入 (JSON)</button>
          <input type="file" accept=".json" ref={backupInputRef} style={{ display: 'none' }} onChange={(e) => { if (e.target.files.length > 0) { importBackup(e.target.files[0]); e.target.value = ""; } }} />
        </div>
      </div>

      {/* 内部 Tab */}
      <div className="flex mb-6 border-b">
        <button className={`px-4 py-2 text-sm font-semibold ${activeTab === 'words' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`} onClick={() => switchTab('words')}>单词列表</button>
        <button className={`px-4 py-2 text-sm font-semibold ${activeTab === 'review' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`} onClick={() => switchTab('review')}>复习</button>
      </div>

      {/* 列表和复习 */}
      {activeTab === 'words' && (
        <div className="bg-gray-50 rounded p-4">
          <h2 className="font-semibold text-lg mb-4">单词列表（共 {words.length} 个，错题 {Object.keys(wrongBook).length} 个）</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-1">
            {words.map((w) => (
              <div key={w.id} className="bg-white rounded-xl shadow p-4 hover:shadow-lg transition-shadow relative group">
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="bg-gray-50 rounded p-4">
          <h2 className="font-semibold text-lg mb-2">复习</h2>
          <div className="text-sm mb-4 text-gray-600">
            {reviewOnlyWrong ? `❌ 复习范围：错题本（共 ${Object.keys(wrongBook).length} 个）` : `📚 复习范围：全部单词（共 ${words.length} 个）`}
          </div>
          <div className="flex gap-4 mb-4">
            <button className="bg-purple-600 text-white px-4 py-2 rounded" onClick={() => startReview(false)}>复习全部</button>
            <button className="bg-orange-500 text-white px-4 py-2 rounded" onClick={() => startReview(true)}>复习错题本</button>
            <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={exportWrongBookCSV}>导出错题本</button>
          </div>

          <div className="border rounded p-3 mt-6">
            {current && <div className="mb-2 text-sm text-gray-500">进度：{reviewIndex + 1} / {reviewList.length}</div>}
            {!current && <div className="text-center text-lg text-green-600">🎉 已经完成本轮复习！</div>}
            <div className="text-xl font-bold mb-2">{current ? current.word : '点击开始复习'}</div>
            <div className="text-sm text-gray-600 mb-2">{current ? current.meaning : ''}</div>
            <input
              className="w-full border rounded p-2 mb-2"
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
              <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={checkAnswer}>检查</button>
              <button className="bg-gray-300 text-black px-4 py-2 rounded" onClick={nextReview}>下一题</button>
            </div>
            {isCorrect && (
              <div className={`mt-4 ${isCorrect === 'exact' ? 'text-green-500' : isCorrect === 'similar' ? 'text-yellow-500' : 'text-red-500'}`}>
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

      {isEditing && <EditWordModal wordData={editWordData} onClose={closeEditWordModal} onSave={saveWordEdit} />}
      {toast && <div className="toast">{toast}</div>}
      {isModalOpen && <ConfirmUpdateModal currentWord={wordToUpdate.currentWord} updatedWord={wordToUpdate.updatedWord} onConfirm={handleConfirmUpdate} onCancel={handleCancelUpdate} />}
    </div>
  );
}
