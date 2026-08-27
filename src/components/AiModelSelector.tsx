import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, Check, Cpu, Edit3, Info, X } from 'lucide-react';
import { AVAILABLE_GEMINI_MODELS, GeminiModelOption } from '../types';

interface AiModelSelectorProps {
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  customModelName: string;
  setCustomModelName: (name: string) => void;
  compact?: boolean;
}

export const AiModelSelector: React.FC<AiModelSelectorProps> = ({
  selectedModel,
  setSelectedModel,
  customModelName,
  setCustomModelName,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = AVAILABLE_GEMINI_MODELS.find(m => m.id === selectedModel);
  const displayName = selectedModel === 'custom'
    ? (customModelName.trim() ? `Custom: ${customModelName}` : 'Custom Model (직접 입력)')
    : (currentOption?.name || selectedModel);

  const popularCustomModels = [
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-2.5-flash-preview-12-2025'
  ];

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-full font-medium transition-all ${
          compact
            ? 'px-2.5 py-1 text-xs bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/70'
            : 'px-3.5 py-1.5 text-xs sm:text-sm bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-800 hover:from-indigo-100 hover:to-blue-100 border border-indigo-200 shadow-2xs'
        }`}
        title="Gemini AI 모델 선택 및 직접 모델명 입력"
      >
        <Sparkles className={`text-indigo-600 shrink-0 ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
        <span className="truncate max-w-[150px] sm:max-w-[200px] font-semibold">
          {displayName}
        </span>
        <ChevronDown className={`text-indigo-400 transition-transform ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Gemini AI 분석 모델 선택
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-2.5 space-y-1.5 max-h-[380px] overflow-y-auto">
            {AVAILABLE_GEMINI_MODELS.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    if (model.id !== 'custom') {
                      setIsOpen(false);
                    }
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {model.name}
                      </span>
                      {model.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          isSelected ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {model.badge}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {model.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Custom Model Input Area */}
          {selectedModel === 'custom' && (
            <div className="mt-2 pt-3 border-t border-slate-100 bg-slate-50/80 -mx-4 -mb-4 p-4 rounded-b-2xl">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  Gemini 모델 이름 직접 입력
                </span>
                <span className="text-[10px] text-slate-400 font-normal">API 모델 ID</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customModelName}
                  onChange={(e) => setCustomModelName(e.target.value)}
                  placeholder="예: gemini-3.7-flash, gemini-2.5-flash-preview..."
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono"
                  autoFocus
                />
              </div>

              {/* Quick suggestions */}
              <div className="mt-2">
                <span className="text-[10px] text-slate-400 font-medium block mb-1">빠른 추천 템플릿:</span>
                <div className="flex flex-wrap gap-1">
                  {popularCustomModels.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomModelName(preset)}
                      className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-md font-mono text-slate-600 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs"
                >
                  모델 적용하기
                </button>
              </div>
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-400" />
              업로드, 텍스트 분석, 재분석에 적용됨
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
