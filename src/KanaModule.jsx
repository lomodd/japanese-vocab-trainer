// src/KanaModule.jsx
import React, { useMemo, useState } from "react";
import useReviewProgress from "./hooks/useReviewProgress";
import ConfirmModal from "./components/ConfirmModal";

/**
 * 重构版 KanaModule
 * - 按 mode 为每个模式单独缓存（key 包含 mode）
 * - 题库从原始数据直接生成（避免闭包 / useMemo 依赖问题）
 * - 恢复缓存时做越界保护
 * - 自定义 ConfirmModal 用于「继续上次练习」
 * - 回车逻辑：第一次 check 显示结果；若已答对 (isAnswered true)，再按回车会再判一次 -> 对则跳题，错则更新提示并留在题目
 */

const colHeaders = ["", "あ段", "い段", "う段", "え段", "お段"];
const rowHeaders = [
  "あ行", "か行", "さ行", "た行", "な行",
  "は行", "ま行", "や行", "ら行", "わ行", "ん"
];

const hiraganaData = [
  [{ kana: "あ", roma: "a" }, { kana: "い", roma: "i" }, { kana: "う", roma: "u" }, { kana: "え", roma: "e" }, { kana: "お", roma: "o" }],
  [{ kana: "か", roma: "ka" }, { kana: "き", roma: "ki" }, { kana: "く", roma: "ku" }, { kana: "け", roma: "ke" }, { kana: "こ", roma: "ko" }],
  [{ kana: "さ", roma: "sa" }, { kana: "し", roma: "shi" }, { kana: "す", roma: "su" }, { kana: "せ", roma: "se" }, { kana: "そ", roma: "so" }],
  [{ kana: "た", roma: "ta" }, { kana: "ち", roma: "chi" }, { kana: "つ", roma: "tsu" }, { kana: "て", roma: "te" }, { kana: "と", roma: "to" }],
  [{ kana: "な", roma: "na" }, { kana: "に", roma: "ni" }, { kana: "ぬ", roma: "nu" }, { kana: "ね", roma: "ne" }, { kana: "の", roma: "no" }],
  [{ kana: "は", roma: "ha" }, { kana: "ひ", roma: "hi" }, { kana: "ふ", roma: "fu" }, { kana: "へ", roma: "he" }, { kana: "ほ", roma: "ho" }],
  [{ kana: "ま", roma: "ma" }, { kana: "み", roma: "mi" }, { kana: "む", roma: "mu" }, { kana: "め", roma: "me" }, { kana: "も", roma: "mo" }],
  [{ kana: "や", roma: "ya" }, { kana: "", roma: "" }, { kana: "ゆ", roma: "yu" }, { kana: "", roma: "" }, { kana: "よ", roma: "yo" }],
  [{ kana: "ら", roma: "ra" }, { kana: "り", roma: "ri" }, { kana: "る", roma: "ru" }, { kana: "れ", roma: "re" }, { kana: "ろ", roma: "ro" }],
  [{ kana: "わ", roma: "wa" }, { kana: "", roma: "" }, { kana: "", roma: "" }, { kana: "", roma: "" }, { kana: "を", roma: "wo" }],
  [{ kana: "ん", roma: "n" }, { kana: "", roma: "" }, { kana: "", roma: "" }, { kana: "", roma: "" }, { kana: "", roma: "" }]
];

const katakanaData = [
  [{ kana: "ア", roma: "a" }, { kana: "イ", roma: "i" }, { kana: "ウ", roma: "u" }, { kana: "エ", roma: "e" }, { kana: "オ", roma: "o" }],
  [{ kana: "カ", roma: "ka" }, { kana: "キ", roma: "ki" }, { kana: "ク", roma: "ku" }, { kana: "ケ", roma: "ke" }, { kana: "コ", roma: "ko" }],
  [{ kana: "サ", roma: "sa" }, { kana: "シ", roma: "shi" }, { kana: "ス", roma: "su" }, { kana: "セ", roma: "se" }, { kana: "ソ", roma: "so" }],
  [{ kana: "タ", roma: "ta" }, { kana: "チ", roma: "chi" }, { kana: "ツ", roma: "tsu" }, { kana: "テ", roma: "te" }, { kana: "ト", roma: "to" }],
  [{ kana: "ナ", roma: "na" }, { kana: "ニ", roma: "ni" }, { kana: "ヌ", roma: "nu" }, { kana: "ネ", roma: "ne" }, { kana: "ノ", roma: "no" }],
  [{ kana: "ハ", roma: "ha" }, { kana: "ヒ", roma: "hi" }, { kana: "フ", roma: "fu" }, { kana: "ヘ", roma: "he" }, { kana: "ホ", roma: "ho" }],
  [{ kana: "マ", roma: "ma" }, { kana: "ミ", roma: "mi" }, { kana: "ム", roma: "mu" }, { kana: "メ", roma: "me" }, { kana: "モ", roma: "mo" }],
  [{ kana: "ヤ", roma: "ya" }, { kana: "", roma: "" }, { kana: "ユ", roma: "yu" }, { kana: "", roma: "" }, { kana: "ヨ", roma: "yo" }],
  [{ kana: "ラ", roma: "ra" }, { kana: "リ", roma: "ri" }, { kana: "ル", roma: "ru" }, { kana: "レ", roma: "re" }, { kana: "ロ", roma: "ro" }],
  [{ kana: "ワ", roma: "wa" }, { kana: "", roma: "" }, { kana: "", roma: "" }, { kana: "", roma: "" }, { kana: "ヲ", roma: "wo" }],
  [{ kana: "ン", roma: "n" }, { kana: "", roma: "" }, { kana: "", roma: "" }, { kana: "", roma: "" }, { kana: "", roma: "" }]
];

function flattenForMode(mode) {
  if (mode === "hiragana") {
    return hiraganaData.flat().filter(i => i && i.kana).map(i => ({ kana: i.kana, roma: i.roma }));
  } else if (mode === "katakana") {
    return katakanaData.flat().filter(i => i && i.kana).map(i => ({ kana: i.kana, roma: i.roma }));
  } else {
    // both: 合并显示，保留 roma
    return hiraganaData.flat().map((hira, idx) => {
      const kata = katakanaData.flat()[idx] || { kana: "" };
      return { kana: `${hira.kana} / ${kata.kana}`, roma: hira.roma };
    }).filter(i => i && i.kana);
  }
}

export default function KanaModule() {
  const [mode, setMode] = useState("hiragana"); // "hiragana" | "katakana" | "both"
  const storageKey = `kana_review:${mode}`; // per-mode cache key
const initialData = useMemo(() => ({
  practiceList: [],
  practiceIndex: 0,
  mode
}), [mode]);

const { progress, updateProgress, resetProgress } = useReviewProgress(storageKey, initialData);


  // local state (init from progress safely)
  const [practiceList, setPracticeList] = useState(() => Array.isArray(progress.practiceList) ? progress.practiceList : []);
  const [practiceIndex, setPracticeIndex] = useState(() => Number.isInteger(progress.practiceIndex) ? progress.practiceIndex : 0);
  const [isAnswered, setIsAnswered] = useState(false);

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hasStarted, setHasStarted] = useState(false);

  const [showContinuePrompt, setShowContinuePrompt] = useState(false);

  // current safe
  const current = (practiceList && practiceList[practiceIndex]) ? practiceList[practiceIndex] : null;

  // startPractice: 如果本 mode 有缓存且未完成，就提示是否继续；否则（或选择重新开始）用当前 mode 生成新题库
const startPractice = () => {
    // 空题保护
    const flatTest = flattenForMode(mode);
    if (!flatTest.length) {
        setFeedback('⚠ 当前模式没有可练习的假名');
        return;
    }
  // 直接从 progress（当前 mode 对应 key）里取缓存
  const cachedList = Array.isArray(progress.practiceList) ? progress.practiceList : [];
  const cachedIndex = Number.isInteger(progress.practiceIndex) ? progress.practiceIndex : 0;

  const hasUnfinished = cachedList.length > 0 && cachedIndex < cachedList.length;

  if (hasUnfinished) {
    setShowContinuePrompt(true);
    return;
  }

  // 否则全新开始
  const flat = flattenForMode(mode);
  if (!flat.length) {
    setFeedback("没有可练习的假名");
    return;
  }

  setPracticeList(flat);
  setPracticeIndex(0);
  setAnswer("");
  setFeedback("");
  setIsAnswered(false);
  setHasStarted(true);
  updateProgress({practiceList: flat, practiceIndex: 0, mode});
  setViewToPractice();
};


  // helper to switch to practice view
  const setViewToPractice = () => {
    // 保持兼容旧结构（你的 UI 里用 view 控制 table/practice）
    setView("practice");
  };

  // ConfirmModal 的「继续」：恢复缓存（安全恢复）
  const restoreFromCache = () => {
    const cachedList = Array.isArray(progress.practiceList) ? progress.practiceList : [];
    let cachedIndex = Number.isInteger(progress.practiceIndex) ? progress.practiceIndex : 0;

    // 越界保护
    if (!cachedList.length) {
      cachedIndex = 0;
    } else if (cachedIndex >= cachedList.length) {
      cachedIndex = 0;
    }

    setPracticeList(cachedList);
    setPracticeIndex(cachedIndex);
    setAnswer("");
    setFeedback("");
    setIsAnswered(false);
    setHasStarted(true);
    setViewToPractice();
  };

  // checkAnswer: 只在答对时把 isAnswered 设为 true（你之前修正过的逻辑）
  const checkAnswer = () => {
    if (!current) return;
    const norm = (s) => (s || "").trim().toLowerCase();
    if (norm(answer) === (current.roma || "").toLowerCase()) {
      setFeedback("✅ 正确");
      setIsAnswered(true);
    } else {
      setFeedback(`❌ 错误，正确读音是：${current.roma || "（无）"}`);
      setIsAnswered(false);
    }
  };

  // nextPractice: 只有在切题时更新缓存进度
  const nextPractice = () => {
    if (!practiceList || !practiceList.length) return;
    if (practiceIndex + 1 < practiceList.length) {
      const nextIdx = practiceIndex + 1;
      setPracticeIndex(nextIdx);
      updateProgress && updateProgress({practiceIndex: nextIdx, mode});
      setAnswer("");
      setFeedback("");
      setIsAnswered(false);
      setHasStarted(true);
    } else {
      // 已到最后
      setFeedback("🎉 已经完成本轮练习！");
      setHasStarted(false);
      setIsAnswered(false);
    }
  };

  // endPractice: 清 UI 状态并清掉缓存（你想要保留缓存也可以只清 UI，不清 cache）
  const endPractice = () => {
    setView("table");
    setPracticeList([]);
    setPracticeIndex(0);
    resetProgress();
    setAnswer("");
    setFeedback("");
    setHasStarted(false);
    setIsAnswered(false);
  };

  // 点击表格格子进入某题（直接使用当前 mode 的题库）
  const handleCellClick = (rowIndex, colIndex) => {
    const hira = hiraganaData[rowIndex][colIndex];
    const kata = katakanaData[rowIndex][colIndex];

    let kanaToMatch = "";
    if (mode === "hiragana") kanaToMatch = hira.kana;
    if (mode === "katakana") kanaToMatch = kata.kana;
    if (mode === "both") kanaToMatch = `${hira.kana} / ${kata.kana}`;

    if (!kanaToMatch.trim()) return;

    // 根据当前 mode 构造扁平化列表（与 startPractice 一致）
    const flat = flattenForMode(mode);
    const idx = flat.findIndex(i => i.kana === kanaToMatch);
    if (idx >= 0) {
      setPracticeList(flat);
      setPracticeIndex(idx);
      updateProgress({practiceList: flat, practiceIndex: idx, mode});
      setAnswer("");
      setFeedback("");
      setIsAnswered(false);
      setHasStarted(true);
      setViewToPractice();
    }
  };

  // UI 控制 view（table/practice）
  const [view, setView] = useState("table");

  // 切换模式按钮时直接切换 mode（缓存是 per-mode 的，因此不必 resetProgress）
  const changeMode = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    // 切换模式时重置UI状态但不清缓存
    setPracticeList([]);
    setPracticeIndex(0);
    setAnswer('');
    setFeedback('');
    setIsAnswered(false);
    setView('table');
    // 切换 mode 时，不要去读取别的 mode 的缓存（useReviewProgress keyed by mode）
    // 为了避免 UI 冲突，先清当前 UI 练习状态
    setPracticeList([]);
    setPracticeIndex(0);
    setAnswer("");
    setFeedback("");
    setIsAnswered(false);
    setHasStarted(false);
    setView("table");
  };

  return (
    <div className="p-4">
      {/* 控制按钮 */}
      <div className="flex flex-wrap gap-3 items-center justify-center mb-4">
        <div className="inline-flex rounded-full bg-zinc-800/40 p-1">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${mode === "hiragana" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow" : "text-gray-300 hover:text-white"}`}
            onClick={() => changeMode("hiragana")}
          >
            平假名
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${mode === "katakana" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow" : "text-gray-300 hover:text-white"}`}
            onClick={() => changeMode("katakana")}
          >
            片假名
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${mode === "both" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow" : "text-gray-300 hover:text-white"}`}
            onClick={() => changeMode("both")}
          >
            合并显示
          </button>
        </div>

        <div className="ml-2 inline-flex gap-2">
          <button
            className="px-4 py-2 rounded-md text-sm font-medium bg-green-500 text-white hover:scale-105 transition"
            onClick={startPractice}
          >
            开始练习
          </button>
          <button
            className="px-4 py-2 rounded-md text-sm font-medium bg-red-500 text-white hover:scale-105 transition"
            onClick={endPractice}
            title="结束练习并返回表格"
          >
            结束练习
          </button>
        </div>
      </div>

      {/* 表格视图 */}
      {view === "table" && (
        <div className="overflow-x-auto">
          <table className="border-collapse mx-auto shadow-lg rounded-lg overflow-hidden">
            <thead>
              <tr>
                {colHeaders.map((header, idx) => (
                  <th key={idx} className="p-2 text-center font-semibold bg-gradient-to-b from-blue-50 to-blue-100 border border-gray-200">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hiraganaData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <th className="py-4 px-2 text-center font-medium bg-gradient-to-r from-blue-50 to-blue-100 border border-gray-200">
                    {rowHeaders[rowIndex]}
                  </th>
                  {row.map((item, colIndex) => {
                    const hira = hiraganaData[rowIndex][colIndex];
                    const kata = katakanaData[rowIndex][colIndex];

                    return (
                      <td key={colIndex}
                        className={`w-15 h-15 text-center border border-gray-200 bg-white hover:bg-blue-50 transition-all duration-150 hover:scale-105 cursor-default`}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                      >
                        {mode === "hiragana" && (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xl font-bold">{hira.kana}</span>
                            <span className="text-xs text-gray-500">{hira.roma}</span>
                          </div>
                        )}

                        {mode === "katakana" && (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xl font-bold">{kata.kana}</span>
                            <span className="text-xs text-gray-500">{kata.roma}</span>
                          </div>
                        )}

                        {mode === "both" && (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-lg font-bold">{hira.kana} / {kata.kana}</span>
                            <span className="text-xs text-gray-500">{hira.roma}</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 练习视图 */}
      {view === "practice" && (
        <div className="mt-4 bg-white/95 rounded-2xl p-6 max-w-xl mx-auto shadow-md">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-3">
            <div className="text-center sm:text-left">
              <div className="text-4xl sm:text-5xl font-bold">
                {current ? (
                  <>
                    {current.kana}
                  </>
                ) : "—"}
              </div>
            </div>

            <div className="text-sm text-gray-600">
              {hasStarted ? `进度：${(practiceIndex || 0) + 1} / ${practiceList ? practiceList.length : 0}` : "练习尚未开始"}
            </div>
          </div>

          <div>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (e.nativeEvent && e.nativeEvent.isComposing) return;

                  if (!isAnswered) {
                    // 第一次回车：先判定（只有判对会把 isAnswered 设为 true）
                    checkAnswer();
                  } else {
                    // 已经答对过一次：再次回车时再判一次，若正确则跳题，否则更新提示并停在本题
                    const norm = (s) => (s || "").trim().toLowerCase();
                    const correct = (current && current.roma ? current.roma.toLowerCase() : "");
                    if (norm(answer) === correct) {
                      nextPractice();
                    } else {
                      checkAnswer();
                    }
                  }
                }
              }}
              className="w-full border border-gray-300 rounded-xl p-3 mb-3"
              placeholder="输入罗马音并按 Enter 或点击检查"
            />
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl" onClick={checkAnswer}>检查</button>
              <button className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-xl" onClick={nextPractice}>下一题</button>
              <button className="px-4 py-2 bg-red-500 text-white rounded-xl" onClick={endPractice}>结束</button>
            </div>
            {feedback && <div className="mt-4 text-center text-gray-700">{feedback}</div>}
          </div>
        </div>
      )}

      {/* 继续未完成的练习的自定义弹窗 */}
      <ConfirmModal
        isOpen={showContinuePrompt}
        title="继续上次练习？"
        message="检测到上次有未完成练习，是否继续本模式下的上次进度？"
        confirmText="继续"
        cancelText="重新开始"
        onConfirm={() => {
          restoreFromCache();
          setShowContinuePrompt(false);
        }}
        onCancel={() => {
          resetProgress();
          setShowContinuePrompt(false);
          // 重新从头开始
          const flat = flattenForMode(mode);
          setPracticeList(flat);
          setPracticeIndex(0);
          updateProgress({practiceList: flat, practiceIndex: 0, mode});
          setAnswer("");
          setFeedback("");
          setIsAnswered(false);
          setHasStarted(true);
          setViewToPractice();
        }}
      />
    </div>
  );
}
