import React, { useMemo, useState } from "react";

/**
 * KanaModule.jsx
 * - 完整平假名 / 片假名对象数据（kana + roma）
 * - 表格视图（带行/列标题 & roma 小注）
 * - 练习视图（start/next/end/check）
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

export default function KanaModule() {
  const [mode, setMode] = useState("hiragana"); 
  // 可选值: "hiragana", "katakana", "both"

  const displayData = useMemo(() => {
    if (mode === "hiragana") return hiraganaData;
    if (mode === "katakana") return katakanaData;
    if (mode === "both") {
      // both 模式合并两个数组，保证结构对齐
      return hiraganaData.map((row, rowIndex) =>
        row.map((hira, colIndex) => ({
          hira: hira.kana,
          kata: katakanaData[rowIndex][colIndex].kana,
          roma: hira.roma
        }))
      );
    }
  }, [mode]);


  // 视图：table | practice
  const [view, setView] = useState("table");

  // 练习相关状态（**注意**：不要遗漏 setPracticeList）
  const [practiceList, setPracticeList] = useState([]); // 扁平化后的练习数组 [{kana, roma}, ...]
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hasStarted, setHasStarted] = useState(false);


  const current = practiceList[practiceIndex] || null;

  // 开始练习：扁平化 displayData -> practiceList
  const startPractice = () => {
    const flat = displayData.flat().filter(item => item && item.kana);
    if (!flat.length) {
      setFeedback("没有可练习的假名");
      return;
    }
    setPracticeList(flat);
    setPracticeIndex(0);
    setAnswer("");
    setFeedback("");
    setHasStarted(true);
    setView("practice");
  };

  const checkAnswer = () => {
    if (!current) return;
    const norm = (s) => (s || "").trim().toLowerCase();
    if (norm(answer) === (current.roma || "").toLowerCase()) {
      setFeedback("✅ 正确");
    } else {
      setFeedback(`❌ 错误，正确读音是：${current.roma || "（无）"}`);
    }
  };

  const nextPractice = () => {
    if (!practiceList.length) return;
    if (practiceIndex + 1 < practiceList.length) {
      setPracticeIndex(practiceIndex + 1);
      setAnswer("");
      setFeedback("");
      setHasStarted(true);
    } else {
      // 已到最后一题
      setFeedback("🎉 已经完成本轮练习！");
      setHasStarted(false);
      // 保留最后一题的 current，用户可以查看或点击「结束练习」返回表格
    }
  };

  const endPractice = () => {
    setView("table");
    setPracticeList([]);
    setPracticeIndex(0);
    setAnswer("");
    setFeedback("");
    setHasStarted(false);
  };

  // 在组件里定义一个方法
const handleCellClick = (rowIndex, colIndex) => {
  const hira = hiraganaData[rowIndex][colIndex];
  const kata = katakanaData[rowIndex][colIndex];

  let kanaToMatch = "";
  if (mode === "hiragana") kanaToMatch = hira.kana;
  if (mode === "katakana") kanaToMatch = kata.kana;
  if (mode === "both") kanaToMatch = `${hira.kana} / ${kata.kana}`;

  if (!kanaToMatch.trim()) return;

  // 根据当前模式构造扁平化列表
  let flat = [];
  if (mode === "both") {
    flat = displayData.flat().map(i => ({
      kana: `${i.hira} / ${i.kata}`,
      roma: i.roma
    }));
  } else {
    flat = displayData.flat();
  }

  const idx = flat.findIndex(i => i.kana === kanaToMatch);
  if (idx >= 0) {
    setPracticeList(flat);
    setPracticeIndex(idx);
    setAnswer("");
    setFeedback("");
    setHasStarted(true);
    setView("practice");
  }
};


  return (
    <div className="p-4">
      {/* 控制按钮 */}
      <div className="flex flex-wrap gap-3 items-center justify-center mb-4">
        <div className="inline-flex rounded-full bg-zinc-800/40 p-1">
          <button
            className={`px-4 py-2 rounded-full font-medium transition ${mode === "hiragana" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow" : "text-gray-300 hover:text-white"}`}
            onClick={() => {
              setMode("hiragana");
              endPractice();
            }}
          >
            平假名
          </button>
          <button
            className={`px-4 py-2 rounded-full font-medium transition ${mode === "katakana" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow" : "text-gray-300 hover:text-white"}`}
            onClick={() =>  {
              setMode("katakana");
              endPractice();
            }}
          >
            片假名
          </button>
          <button
            className={`px-4 py-2 rounded-full font-medium transition ${mode === "both" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow" : "text-gray-300 hover:text-white"}`}
            onClick={() =>  {
              setMode("both");
              endPractice();
            }}
          >
            合并显示
          </button>
        </div>

        <div className="ml-2 inline-flex gap-2">
          <button
            className="px-3 py-2 rounded-md bg-green-500 text-white hover:scale-105 transition"
            onClick={startPractice}
          >
            开始练习
          </button>
          <button
            className="px-3 py-2 rounded-md bg-red-500 text-white hover:scale-105 transition"
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
                // 点击某个假名也可以直接进入练习（选中那题）
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
                    {mode === "hiragana" && current.kana}
                    {mode === "katakana" && current.kana}
                    {mode === "both" && `${current.kana}`}
                  </>
                ) : "—"}
              </div>
            </div>

            <div className="text-sm text-gray-600">
              {hasStarted ? `进度：${practiceIndex + 1} / ${practiceList.length}` : "练习尚未开始"}
            </div>
          </div>

          <div>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (feedback.startsWith("✅")) {
                    nextPractice();
                  } else {
                    checkAnswer();
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
    </div>
  );
}
