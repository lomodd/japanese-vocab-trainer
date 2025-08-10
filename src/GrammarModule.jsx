import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import EditGrammarModal from './components/EditGrammarModal';
import Toast from './components/Toast';
import ConfirmImportGrammarModal from './components/ConfirmImportGrammarModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';

const STORAGE_KEY = 'jp_grammar_notes_v1';

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function GrammarModule() {
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', example: '' });
  const fileInputCSVRef = useRef(null);
  const fileInputJSONRef = useRef(null);
  const [editingNote, setEditingNote] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set()); // 存储已展开的笔记 id
  const [toast, setToast] = useState(null);
const [pendingImports, setPendingImports] = useState([]);
const [currentImportIndex, setCurrentImportIndex] = useState(0);
const [applyToAll, setApplyToAll] = useState(null); // 'coverAll' | 'skipAll'
const [viewingNote, setViewingNote] = useState(null);
const [noteToDelete, setNoteToDelete] = useState(null);



  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    setNotes(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    if (!form.title.trim() || !form.content.trim()) {
      showToast('请输入标题和内容',"success");
      return;
    }
    const newNote = { id: uid(), ...form, addedAt: new Date().toISOString() };
    setNotes((prev) => [newNote, ...prev]);
    setForm({ title: '', content: '', example: '' });
  };

  const deleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    // 如果正在展开或编辑，也清理状态
    setExpandedIds((s) => {
      const copy = new Set(s);
      copy.delete(id);
      return copy;
    });
    if (editingNote && editingNote.id === id) setEditingNote(null);
  };

  const saveEditNote = (updatedNote) => {
    setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
    setEditingNote(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 导出 CSV
  const exportCSV = () => {
    if (!notes.length) {
      showToast('语法笔记为空', "warning");
      return;
    }
    const rows = [
      ['title', 'content', 'example', 'addedAt'],
      ...notes.map((n) => [
        n.title,
        n.content,
        n.example || '',
        n.addedAt || '',
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
    a.download = `jp_grammar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导出 JSON
  const exportJSON = () => {
    if (!notes.length) {
      showToast('语法笔记为空', "warning");
      return;
    }
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jp_grammar_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const data = results.data.map((r) => ({
          id: uid(),
          title: (r.title || '').trim(),
          content: (r.content || '').trim(),
          example: r.example ? r.example.trim() : '',
          addedAt: r.addedAt ? r.addedAt.trim() : new Date().toISOString(),
        })).filter(d => d.title && d.content);

        handleImportWithCheck(data);
      },
    });
  };

  const importJSON = (file) => {
    const fr = new FileReader();
    fr.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          const mapped = data
            .map((n) => ({
              id: uid(),
              title: (n.title || '').trim(),
              content: (n.content || '').trim(),
              example: n.example || '',
              addedAt: n.addedAt || new Date().toISOString(),
            }))
            .filter(n => n.title && n.content);

          handleImportWithCheck(mapped);
        } else {
          showToast('JSON 格式不正确', 'error');
        }
      } catch (err) {
        showToast('解析 JSON 失败', 'error');
      }
    };
    fr.readAsText(file, 'utf-8');
  };

const handleImportWithCheck = (data) => {
  const existingTitles = new Set(notes.map(n => n.title));
  const duplicates = data.filter(n => existingTitles.has(n.title));
  const uniques = data.filter(n => !existingTitles.has(n.title));

  // 先导入不重复的
  if (uniques.length > 0) {
    setNotes(prev => [...uniques, ...prev]);
    showToast(`已导入 ${uniques.length} 条新笔记`, 'success');
  }

  if (duplicates.length > 0) {
    setPendingImports(duplicates);
    setCurrentImportIndex(0);
    setApplyToAll(null);
  }
};

const handleCover = () => {
  const noteToImport = pendingImports[currentImportIndex];
  setNotes(prev =>
    prev.map(n => (n.title === noteToImport.title ? noteToImport : n))
  );
  nextImport();
};

const handleSkip = () => {
  nextImport();
};

const handleCoverAll = () => {
  setNotes(prev => {
    const others = prev.filter(n => !pendingImports.some(pi => pi.title === n.title));
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


  // 切换某条的展开状态
  const toggleExpand = (id) => {
    setExpandedIds((s) => {
      const copy = new Set(s);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  // 判断是否展开
  const isExpanded = (id) => expandedIds.has(id);

  return (
    <div>
      {/* 表单 */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-lg rounded-2xl p-6">
        <div className="">
          <input
            className="w-full rounded-xl p-3 mb-4 bg-black border border-gray-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-4003"
            placeholder="语法标题"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="w-full rounded-xl p-3 mb-4 bg-black border border-gray-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400"
            placeholder="语法内容"
            rows={3}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <textarea
            className="w-full rounded-xl p-3 mb-4 bg-black border border-gray-600 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400"
            placeholder="例句"
            rows={2}
            value={form.example}
            onChange={(e) => setForm({ ...form, example: e.target.value })}
          />
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              className="text-white bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-green-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2"
              onClick={addNote}
            >
              添加笔记
            </button>
            <button
              className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
              onClick={exportCSV}
            >
              导出 CSV
            </button>
            <button
              className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
              onClick={() => fileInputCSVRef.current.click()}
            >
              导入 CSV
            </button>
            <input
              type="file"
              accept=".csv"
              ref={fileInputCSVRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files.length > 0) {
                  importCSV(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            <button
              className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
              onClick={exportJSON}
            >
              导出 JSON
            </button>
            <button
              className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
              onClick={() => fileInputJSONRef.current.click()}
            >
              导入 JSON
            </button>
            <input
              type="file"
              accept=".json"
              ref={fileInputJSONRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files.length > 0) {
                  importJSON(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>
      </div>

      {/*主块区 语法列表 */}
<div class="backdrop-blur-md bg-white/90 border border-gray-200 rounded-xl px-6 py-2 mt-4 shadow-sm">

      {/* 列表：每项默认限高，点击展开 */}
      <div className="rounded p-4">
          {notes.length === 0 ? (
            <div className="text-center text-gray-400 py-6">
              📥 请导入或者输入语法笔记
            </div>
          ) : (
            <h2 className="font-semibold text-lg mb-4">语法列表（共 {notes.length} 个）</h2>
          )} 

        <div className="grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-1">
        {notes.map((note) => {
          const expanded = isExpanded(note.id);
          return (
              <div key={note.id}  className="w-full bg-white rounded-xl shadow border border-gray-400 px-6 py-4 
                           hover:border-purple-400 hover:shadow-lg transition-all duration-300 relative group"       >

                {/* 操作按钮 */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-1 rounded-full hover:bg-yellow-100 cursor-pointer"
                    onClick={() => setEditingNote(note)}
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    className="p-1 rounded-full hover:bg-red-100 cursor-pointer"
                    // 点击删除按钮时
                    onClick={() => setNoteToDelete(note)}
                    title="删除"
                  >
                    🗑
                  </button>
                  <button
                    className="p-1 rounded-full hover:bg-blue-100 cursor-pointer"
                    onClick={() => setViewingNote(note)}
                    title="全屏查看"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4m12 0v-4h-4" />
                    </svg>
                  </button>


                </div>


                {/* 标题 */}
                <h3 className="font-bold text-lg mb-2 text-gray-800">{note.title}</h3>

                {/* 内容 */}
                <div
                  onClick={() => toggleExpand(note.id)}
                  className={`text-gray-700 mb-3 whitespace-pre-wrap cursor-pointer transition-all duration-200 ${
                    expanded ? 'max-h-[2000px]' : 'max-h-24'
                  } overflow-hidden`}
                >
                  {note.content}
                </div>

                {/* 例句 */}
                {note.example && (
                <div
                  onClick={() => toggleExpand(note.id)}
                  className={`border-l-4 border-blue-400 pl-3 text-gray-600 italic mb-3 whitespace-pre-wrap cursor-pointer transition-all duration-200 ${
                    expanded ? 'max-h-[2000px]' : 'max-h-12'
                  } overflow-hidden`}
                >
                  例句: {note.example}
                </div>

                )}

                {/* 底部 展开和收起 */}
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-gray-400">
                    添加时间: {formatDate(note.addedAt)}
                  </div>
                  <button
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm font-medium transition-colors"
                    onClick={() => toggleExpand(note.id)}
                  >
                    {expanded ? (
                      <>
                        收起
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        展开全文
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>

            </div>
          );
        })}

        </div>
      </div>

</div>
      {/* 编辑模态框 */}
      {editingNote && (
        <EditGrammarModal
          note={editingNote}
          onSave={saveEditNote}
          onClose={() => setEditingNote(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {pendingImports.length > 0 && (
        <ConfirmImportGrammarModal
          note={pendingImports[currentImportIndex]}
          onCover={handleCover}
          onSkip={handleSkip}
          onCoverAll={handleCoverAll}
          onSkipAll={handleSkipAll}
        />
      )}
      {/* 删除确认 */}
      {noteToDelete && (
        <ConfirmDeleteModal
          title="删除笔记"
          message={`确定要删除笔记 “${noteToDelete.title}” 吗？此操作无法撤销。`}
          onCancel={() => setNoteToDelete(null)}
          onConfirm={() => {
            deleteNote(noteToDelete.id);
            setNoteToDelete(null);
            showToast(`已删除: ${noteToDelete.title}`, 'success');
          }}
        />
      )}

      {viewingNote && (
      <div className="fixed inset-0 bg-gray-500/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
          <button
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            onClick={() => setViewingNote(null)}
          >
            ✖
          </button>
          <h2 className="text-2xl font-bold text-blue-700 mb-4">{viewingNote.title}</h2>
          <div className="text-gray-700 whitespace-pre-wrap mb-4">{viewingNote.content}</div>
          {viewingNote.example && (
            <div className="border-l-4 border-blue-400 pl-3 text-gray-600 italic whitespace-pre-wrap">
              例句: {viewingNote.example}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-4">
            添加时间: {formatDate(viewingNote.addedAt)}
          </div>
        </div>
      </div>
    )}


    </div>
  );
}
