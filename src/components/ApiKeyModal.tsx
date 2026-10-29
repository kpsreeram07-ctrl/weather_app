import React, { useState } from 'react';
import { X, Key, ExternalLink, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { testOpenWeatherMapKey } from '../services/weatherApi';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  onSaveKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  currentKey,
  onSaveKey,
}) => {
  const [keyInput, setKeyInput] = useState(currentKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!keyInput.trim()) {
      setTestResult({ valid: false, message: 'Please enter an API key to test.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testOpenWeatherMapKey(keyInput.trim());
      setTestResult(res);
    } catch {
      setTestResult({ valid: false, message: 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveKey(keyInput.trim());
    onClose();
  };

  const handleClear = () => {
    setKeyInput('');
    setTestResult(null);
    onSaveKey('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 relative"
        role="dialog"
        aria-labelledby="api-modal-title"
        aria-modal="true"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 id="api-modal-title" className="text-lg font-bold text-white">
              OpenWeatherMap API Key
            </h2>
            <p className="text-xs text-slate-400">
              Configure real-time weather and forecast data
            </p>
          </div>
        </div>

        {/* Informational description */}
        <div className="text-sm text-slate-300 space-y-3 mb-5">
          <p className="text-xs text-slate-400 leading-relaxed">
            The application natively supports OpenWeatherMap API for live atmospheric data,
            5-day forecasts, and pollution metrics. When no personal key is entered, the app
            automatically streams high-precision live weather via Open-Meteo.
          </p>

          <a
            href="https://home.openweathermap.org/api_keys"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium underline underline-offset-2"
          >
            <span>Get a free OpenWeatherMap API key (home.openweathermap.org)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Input box */}
        <div className="space-y-2 mb-4">
          <label htmlFor="owm-api-key" className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Your API Key
          </label>
          <input
            id="owm-api-key"
            type="text"
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value);
              setTestResult(null);
            }}
            placeholder="Paste your 32-character OpenWeatherMap key"
            className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-sky-500 rounded-lg text-sm text-white placeholder-slate-500 font-mono focus:outline-none transition-colors"
          />
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div
            className={`p-3 rounded-lg text-xs mb-4 flex items-start gap-2.5 ${
              testResult.valid
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
            }`}
          >
            {testResult.valid ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="leading-snug">{testResult.message}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div>
            {currentKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1.5"
              >
                Remove Key
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !keyInput.trim()}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Key'
              )}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
