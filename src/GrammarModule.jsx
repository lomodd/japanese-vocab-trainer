import React, { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import EditGrammarModal from './components/EditGrammarModal'; // 引入新的编辑模态框

const STORAGE_KEY = 'jp_grammar_notes_v1';

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function GrammarModule() {
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', example: '' });
  const fileInputCSVRef = useRef(null);
  const fileInputJSONRef = useRef(null);
  const [editingNote, setEditingNote] = useState(null); // 当前正在编辑的笔记

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    setNotes(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('请输入标题和内容');
      return;
    }
    const newNote = { id: uid(), ...form, addedAt: new Date().toISOString() };
    setNotes((prev) => [newNote, ...prev]);
    setForm({ title: '', content: '', example: '' });
  };

  const deleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
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
      alert('语法笔记为空');
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
      alert('语法笔记为空');
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
          title: r.title.trim(),
          content: r.content.trim(),
          example: r.example ? r.example.trim() : '',
          addedAt: r.addedAt ? r.addedAt.trim() : new Date().toISOString(),
        }));
        setNotes((prev) => [...data, ...prev]);
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
          setNotes((prev) => [
            ...data.map((n) => ({
              ...n,
              id: uid(),
              addedAt: n.addedAt || new Date().toISOString(),
            })),
            ...prev,
          ]);
          alert('导入成功');
        } else {
          alert('JSON 格式不正确');
        }
      } catch (err) {
        alert('解析 JSON 失败');
      }
    };
    fr.readAsText(file, 'utf-8');
  };

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
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            onClick={addNote}
          >
            添加笔记
          </button>
          <button
            className="bg-green-100 text-green-800 px-3 py-2 rounded-lg hover:bg-green-200"
            onClick={exportCSV}
          >
            导出 CSV
          </button>
          <button
            className="bg-green-100 text-green-800 px-3 py-2 rounded-lg hover:bg-green-200"
            onClick={exportJSON}
          >
            导出 JSON
          </button>
          <button
            className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg hover:bg-orange-200"
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
            className="bg-orange-100 text-orange-800 px-3 py-2 rounded-lg hover:bg-orange-200"
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

      {/* 列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className="bg-gray-50 rounded-xl shadow p-4 relative group"
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button
                className="p-1 rounded-full hover:bg-yellow-200"
                onClick={() => setEditingNote(note)}
              >
                ✏️
              </button>
              <button
                className="p-1 rounded-full hover:bg-red-200"
                onClick={() => deleteNote(note.id)}
              >
                🗑
              </button>
            </div>
            <h3 className="font-bold text-lg mb-1">{note.title}</h3>
            <p className="text-gray-700 mb-2 whitespace-pre-wrap">{note.content}</p>
            {note.example && (
              <p className="text-blue-600 mb-2 whitespace-pre-wrap">例句: {note.example}</p>
            )}
            <div className="text-xs text-gray-400">添加时间: {formatDate(note.addedAt)}</div>
          </div>
        ))}
      </div>

      {/* 编辑模态框 */}
      {editingNote && (
        <EditGrammarModal
          note={editingNote}
          onSave={saveEditNote}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  );
}
