import React, { useState } from 'react';
import { X, FolderOpen, HardDrive, CheckCircle2, RefreshCw } from 'lucide-react';
import { FolderConfig } from '../types';

interface FolderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolder: FolderConfig;
  onSaveFolder: (newFolder: FolderConfig) => void;
  onResetData: () => void;
  documentCount: number;
}

export const FolderConfigModal: React.FC<FolderConfigModalProps> = ({
  isOpen,
  onClose,
  currentFolder,
  onSaveFolder,
  onResetData,
  documentCount
}) => {
  const [pathInput, setPathInput] = useState(currentFolder.path);
  const [nameInput, setNameInput] = useState(currentFolder.name);
  const [descInput, setDescInput] = useState(currentFolder.description);
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathInput.trim()) return;

    onSaveFolder({
      path: pathInput.trim(),
      name: nameInput.trim() || 'Custom_Folder',
      description: descInput.trim() || '사용자 지정 연구 폴더'
    });
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 800);
  };

  const presetPaths = [
    { name: "기본 연구 아카이브", path: "/Users/researcher/Documents/Research_Patents_2026" },
    { name: "AI 및 LLM 특허 폴더", path: "/Users/researcher/Workspace/AI_Patents_2026" },
    { name: "학술 논문 모음 (Cloud)", path: "/Volumes/CloudDrive/SharedResearch/Papers" },
    { name: "사내 R&D 특허 문서함", path: "C:/Research/Patents/2026_Q1" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">폴더 경로 지정 및 관리</h2>
              <p className="text-xs text-slate-500">문서를 동기화할 로컬 또는 클라우드 폴더 경로를 설정합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              폴더 경로 (Directory Path)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                placeholder="예: /Users/username/Documents/Research"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              현재 이 폴더에서 감지된 문서: <span className="font-semibold text-indigo-600">{documentCount}개</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">폴더 이름</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">설명</label>
              <input
                type="text"
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Quick Preset Selectors */}
          <div>
            <span className="block text-xs font-medium text-slate-500 mb-2">자주 사용하는 폴더 프리셋 선택:</span>
            <div className="grid grid-cols-1 gap-1.5">
              {presetPaths.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPathInput(preset.path);
                    setNameInput(preset.name.replace(/\s+/g, '_'));
                    setDescInput(preset.name);
                  }}
                  className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs text-slate-700 flex items-center justify-between transition-colors group"
                >
                  <span className="font-medium text-slate-800">{preset.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">{preset.path}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reset / Sample data */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm("기본 예시 데이터(특허 및 논문)로 초기화하시겠습니까?")) {
                  onResetData();
                  onClose();
                }
              }}
              className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-rose-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>기본 샘플 데이터 복원</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs flex items-center space-x-1.5"
              >
                {successMsg ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>저장됨</span>
                  </>
                ) : (
                  <span>폴더 지정 적용</span>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
