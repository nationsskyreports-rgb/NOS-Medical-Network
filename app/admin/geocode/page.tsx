'use client';

import { useState, useCallback } from 'react';
import { MapPin, CheckCircle, XCircle, Loader2, Play, RotateCcw } from 'lucide-react';

interface BatchResult {
  name: string;
  ok: boolean;
  coords?: string;
}

interface BatchResponse {
  processed: number;
  success: number;
  failed: number;
  remaining: number;
  done: boolean;
  results: BatchResult[];
}

export default function GeocodePage() {
  const [running, setRunning]      = useState(false);
  const [done, setDone]            = useState(false);
  const [totalSuccess, setSuccess] = useState(0);
  const [totalFailed, setFailed]   = useState(0);
  const [remaining, setRemaining]  = useState<number | null>(null);
  const [initial, setInitial]      = useState<number | null>(null);
  const [log, setLog]              = useState<BatchResult[]>([]);
  const [eta, setEta]              = useState<string>('');

  const addLog = (items: BatchResult[]) =>
    setLog((prev) => [...items, ...prev].slice(0, 300));

  const handleStart = useCallback(async () => {
    setRunning(true);
    setDone(false);
    setLog([]);
    setSuccess(0);
    setFailed(0);
    setEta('');

    // جيب العدد الأولي
    const res0   = await fetch('/api/geocode-providers');
    const data0  = await res0.json();
    const total  = data0.remaining as number;
    setRemaining(total);
    setInitial(total);

    if (total === 0) {
      setDone(true);
      setRunning(false);
      return;
    }

    // حساب الوقت المتوقع (10 providers كل ~12 ثانية)
    const totalMins = Math.ceil((total / 10) * 12 / 60);
    setEta(`~${totalMins} دقيقة`);

    let isDone = false;
    while (!isDone) {
      const res  = await fetch('/api/geocode-providers', { method: 'POST' });
      const data: BatchResponse = await res.json();

      setSuccess((s) => s + data.success);
      setFailed((f)  => f + data.failed);
      setRemaining(data.remaining);
      addLog(data.results || []);

      if (data.done || data.remaining === 0) isDone = true;

      // تحديث الوقت المتوقع
      if (!isDone && data.remaining > 0) {
        const mins = Math.ceil((data.remaining / 10) * 12 / 60);
        setEta(`~${mins} دقيقة`);
      }
    }

    setEta('');
    setDone(true);
    setRunning(false);
  }, []);

  const reset = () => {
    setDone(false);
    setInitial(null);
    setRemaining(null);
    setLog([]);
    setSuccess(0);
    setFailed(0);
    setEta('');
  };

  const progress = initial && initial > 0
    ? Math.round(((initial - (remaining ?? initial)) / initial) * 100)
    : done ? 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <MapPin size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">تحديد مواقع الـ Providers</h1>
            <p className="text-xs text-gray-500">بيملى lat/lng تلقائي عشان الـ nearby يشتغل</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">

          {/* Stats */}
          {initial !== null && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-gray-800">{initial}</p>
                <p className="text-xs text-gray-500 mt-0.5">المجموع</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-green-700">{totalSuccess}</p>
                <p className="text-xs text-gray-500 mt-0.5">اتحدد ✅</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-2xl font-bold text-red-500">{totalFailed}</p>
                <p className="text-xs text-gray-500 mt-0.5">فشل ⚠️</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {initial !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{progress}%  {eta && !done ? `— باقي ${eta}` : ''}</span>
                <span>باقي {remaining ?? '...'} provider</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Warning - keep tab open */}
          {running && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
              <span className="text-yellow-500 text-sm mt-0.5">⚠️</span>
              <p className="text-xs text-yellow-700">
                خلي التاب مفتوح وهو شغال — متقفلوش.
              </p>
            </div>
          )}

          {/* Done */}
          {done && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-medium">
                خلص! دلوقتي الـ nearby هيشتغل. ✅
              </p>
            </div>
          )}

          {/* Buttons */}
          {!running && !done && (
            <button
              onClick={handleStart}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Play size={16} />
              ابدأ
            </button>
          )}
          {running && (
            <button disabled className="w-full h-11 bg-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 opacity-80">
              <Loader2 size={16} className="animate-spin" />
              جاري التحديد...
            </button>
          )}
          {done && (
            <button
              onClick={reset}
              className="w-full h-11 border border-gray-200 text-gray-700 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw size={16} />
              تشغيل مرة تانية
            </button>
          )}
        </div>

        {/* Log */}
        {log.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">السجل</p>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {log.map((item, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                  {item.ok
                    ? <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    : <XCircle    size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{item.name}</p>
                    {item.ok && item.coords && (
                      <p className="text-xs text-gray-400">{item.coords}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
