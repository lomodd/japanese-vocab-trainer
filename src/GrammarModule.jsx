import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import EditGrammarModal from './components/EditGrammarModal';
import Toast from './components/Toast';

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

  // 导入 CSV
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
        setNotes((prev) => [...data, ...prev]);
        showToast('CSV 导入成功',"success");
      },
    });
  };

  // 导入 JSON
  const importJSON = (file) => {
    const fr = new FileReader();
    fr.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          const mapped = data
            .map((n) => ({
              ...n,
              id: uid(),
              title: (n.title || '').trim(),
              content: (n.content || '').trim(),
              example: n.example || '',
              addedAt: n.addedAt || new Date().toISOString(),
            }))
            .filter(n => n.title && n.content);
          setNotes((prev) => [...mapped, ...prev]);
          showToast('导入成功',"success");
        } else {
          showToast('JSON 格式不正确', "warning");
        }
      } catch (err) {
        showToast('解析 JSON 失败', "warning");
      }
    };
    fr.readAsText(file, 'utf-8');
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
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <input
          className="w-full border rounded-lg p-2 mb-3"
          placeholder="语法标题"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="w-full border rounded-lg p-2 mb-3"
          placeholder="语法内容"
          rows={3}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />
        <textarea
          className="w-full border rounded-lg p-2 mb-3"
          placeholder="例句"
          rows={2}
          value={form.example}
          onChange={(e) => setForm({ ...form, example: e.target.value })}
        />
        <div className="flex flex-wrap gap-3">
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
            className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
            onClick={exportJSON}
          >
            导出 JSON
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

      {/* 列表：每项默认限高，点击展开 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {notes.map((note) => {
          const expanded = isExpanded(note.id);
          return (
            <div
              key={note.id}
              className="bg-white rounded-2xl shadow-md p-5 relative group w-full min-w-0 transition-colors duration-200 hover:bg-blue-50 hover:shadow-lg"
            >
              {/* 操作按钮 */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                <button
                  className="p-1 rounded-full hover:bg-yellow-100 cursor-pointer"
                  onClick={() => setEditingNote(note)}
                  title="编辑"
                >
                  ✏️
                </button>
                <button
                  className="p-1 rounded-full hover:bg-red-100 cursor-pointer"
                  onClick={() => deleteNote(note.id)}
                  title="删除"
                >
                  🗑
                </button>
              </div>

              {/* 标题 */}
              <h3 className="font-bold text-lg mb-2 text-blue-600">{note.title}</h3>

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
                  className={`bg-blue-50 text-blue-700 px-3 py-2 rounded-lg mb-3 whitespace-pre-wrap cursor-pointer transition-all duration-200 ${
                    expanded ? 'max-h-[2000px]' : 'max-h-12'
                  } overflow-hidden`}
                >
                  例句: {note.example}
                </div>
              )}

              {/* 底部 */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">添加时间: {formatDate(note.addedAt)}</div>
                <button
                  className="text-sm px-3 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(note.id)}
                >
                  {expanded ? '收起' : '展开全文'}
                </button>
              </div>
            </div>
          );
        })}
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
    </div>
  );
}
