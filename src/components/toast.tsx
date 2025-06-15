"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning";
  message: string;
}

let toastId = 0;
const toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach(listener => listener([...toasts]));
}

export const toast = {
  success: (message: string) => {
    const id = String(++toastId);
    toasts.push({ id, type: "success", message });
    notifyListeners();
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      notifyListeners();
    }, 4000);
  },
  error: (message: string) => {
    const id = String(++toastId);
    toasts.push({ id, type: "error", message });
    notifyListeners();
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      notifyListeners();
    }, 4000);
  },
  warning: (message: string) => {
    const id = String(++toastId);
    toasts.push({ id, type: "warning", message });
    notifyListeners();
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      notifyListeners();
    }, 4000);
  }
};

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setCurrentToasts(newToasts);
    toastListeners.push(listener);
    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) toastListeners.splice(index, 1);
    };
  }, []);

  const removeToast = (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
      {currentToasts.map((toastItem) => (
        <div
          key={toastItem.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg min-w-[300px] ${
            toastItem.type === "success"
              ? "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700"
              : toastItem.type === "error"
              ? "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700"
              : "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700"
          }`}
        >
          {toastItem.type === "success" && <CheckCircle className="h-4 w-4 flex-shrink-0" />}
          {toastItem.type === "error" && <XCircle className="h-4 w-4 flex-shrink-0" />}
          {toastItem.type === "warning" && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          <span className="flex-1">{toastItem.message}</span>
          <button
            onClick={() => removeToast(toastItem.id)}
            className="text-current hover:opacity-70 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
