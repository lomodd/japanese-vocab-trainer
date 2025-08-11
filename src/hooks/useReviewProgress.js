import { useState, useEffect, useCallback } from "react";

export default function useReviewProgress(key, initialData) {
  const storageKey = `reviewProgress:${key}`;

  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : initialData;
    } catch {
      return initialData;
    }
  });

  // 1) 监听 storageKey 变化时读取（只在数据真的不同才 setProgress）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : initialData;
      // 只有在数据内容不同的时候才更新，避免死循环
      if (JSON.stringify(parsed) !== JSON.stringify(progress)) {
        setProgress(parsed);
      }
    } catch {
      if (JSON.stringify(initialData) !== JSON.stringify(progress)) {
        setProgress(initialData);
      }
    }
  // 注意：依赖 progress 会造成循环，这里只依赖 storageKey / initialData
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, initialData]);

  // 2) 写入 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch (e) {}
  }, [progress, storageKey]);

  const updateProgress = useCallback((updates) => {
    setProgress((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(initialData);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}
  }, [initialData, storageKey]);

  return { progress, updateProgress, resetProgress };
}
