import React, { useEffect, useState } from 'react';

export default function Toast({ message, type = "info", onClose, duration = 3000 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 延迟一点触发渐入，让动画明显
    const enterTimer = setTimeout(() => {
      setVisible(true);
    }, 30);

    // 持续一段时间后触发渐出
    const exitTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // 等渐出动画结束后再移除
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [duration, onClose]);

  const typeStyles = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white",
    warning: "bg-yellow-500 text-white",
  };

  return (
    <div
      className={`fixed top-12 left-1/2 transform -translate-x-1/2 px-6 py-3 min-w-[240px] max-w-[80%] text-center text-base rounded-xl shadow-lg 
        ${typeStyles[type]} transition-all duration-300 ease-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
      style={{ zIndex: 9999 }}
    >
      {message}
    </div>
  );
}
