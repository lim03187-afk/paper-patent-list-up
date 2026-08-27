import React, { useState, useRef } from 'react';
import { X, FolderOpen, HardDrive, CheckCircle2, RefreshCw, FolderSync } from 'lucide-react';
import { FolderConfig, ResearchDocument } from '../types';

interface FolderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolder: FolderConfig;
  onSaveFolder: (newFolder: FolderConfig, importedDocs?: ResearchDocument[]) => void;
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
  const [scanLoading, setScanLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle native folder picker API
  const handleSelectLocalFolder = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        setScanLoading(true);
        const dirHandle = await (window as any).showDirectoryPicker();
        const folderName = dirHandle.name;
        const folderPath = `Desktop/${folderName}`;
        
        const importedDocs: ResearchDocument[] = [];
        
        for await (const entry of (dirHandle as any).values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            const lowerName = file.name.toLowerCase();
            if (lowerName.endsWith('.pdf') || lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.docx')) {
              importedDocs.push({
                id: 'local_' + Math.random().toString(36).substring(2, 9),
                title: file.name.replace(/\.[^/.]+$/, ""),
                authors: '내 컴퓨터 / 바탕화면 연동',
                year: new Date(file.lastModified || Date.now()).getFullYear().toString(),
                summary: `${file.name} (로컬 바탕화면 폴더에서 자동 연동된 연구 문서입니다.)`,
                keywords: ['LocalSync', folderName, 'Desktop'],
                type: lowerName.includes('patent') || lowerName.includes('특허') ? 'patent' : 'paper',
                folderPath: folderPath,
                fileUrl: '',
                createdAt: new Date(file.lastModified || Date.now()).toISOString(),
                citationCount: 0
              });
            }
          }
        }

        setPathInput(folderPath);
        setNameInput(folderName);
        setDescInput(`바탕화면 로컬 연동 폴더 (${importedDocs.length}개 파일 감지됨)`);

        onSaveFolder({
          path: folderPath,
          name: folderName,
          description: `바탕화면 로컬 연동 폴더`
        }, importedDocs);

        setSuccessMsg(true);
        setTimeout(() => {
          setSuccessMsg(false);
          onClose();
        }, 1000);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error("Directory picker error:", e);
          alert('폴더 접근 중 오류가 발생했습니다.');
        }
      } finally {
        setScanLoading(false);
      }
    } else {
      // Fallback to webkitdirectory input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  // Fallback directory input handler
  const handleDirectoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const importedDocs: ResearchDocument[] = [];
    let folderName = 'Desktop_Sync';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.pdf') || lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
        importedDocs.push({
          id: 'local_' + Math.random().toString(36).substring(2, 9),
          title: file.name.replace(/\.[^/.]+$/, ""),
          authors: '바탕화면 로컬 연동',
          year: new Date().getFullYear().toString(),
          summary: `${file.name} (바탕화면 폴더에서 불러온 문서)`,
          keywords: ['DesktopSync'],
          type: lowerName.includes('patent') || lowerName.includes('특허') ? 'patent' : 'paper',
          folderPath: 'Desktop/SyncedFolder',
          fileUrl: '',
          createdAt: new Date().toISOString(),
          citationCount: 0
        });
      }
    }

    setPathInput('Desktop/SyncedFolder');
    setNameInput('바탕화면 연동함');
    setDescInput(`바탕화면에서 ${importedDocs.length}개 파일 연동됨`);

    onSaveFolder({
      path: 'Desktop/SyncedFolder',
      name: '바탕화면 연동함',
      description: '바탕화면 파일 동기화'
    }, importedDocs);

    alert(`바탕화면에서 총 ${importedDocs.length}개의 문서를 성공적으로 연동했습니다!`);
    onClose();
  };

  const presetPaths = [
    { name: "바탕화면 (Desktop)", path: "C:/Users/User/Desktop" },
    { name: "내 문서 (Documents)", path: "C:/Users/User/Documents/Research" },
    { name: "Mac 바탕화면", path: "/Users/username/Desktop" },
    { name: "다운로드 폴더 (Downloads)", path: "C:/Users/User/Downloads" }
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
              <h2 className="text-sm font-semibold text-slate-800">내 컴퓨터 / 바탕화면 폴더 연동</h2>
              <p className="text-xs text-slate-500">컴퓨터 바탕화면의 폴더와 파일을 선택하여 즉시 동기화합니다.</p>
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
          
          {/* Direct Local Folder Selection Button */}
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-indigo-900 flex items-center space-x-1.5">
                <FolderSync className="w-4 h-4 text-indigo-600" />
                <span>내 컴퓨터 폴더/바탕화면 실시간 스캔 & 연동</span>
              </h3>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                버튼을 눌러 컴퓨터의 바탕화면이나 연구 폴더를 선택하면 안에 있는 문서들이 자동으로 연동됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSelectLocalFolder}
              disabled={scanLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all shrink-0 ml-3 flex items-center space-x-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{scanLoading ? '스캔 중...' : '폴더 선택하기'}</span>
            </button>
            {/* Hidden directory input fallback */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleDirectoryInputChange}
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
            />
          </div>

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
                placeholder="예: C:/Users/User/Desktop"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              현재 연동된 문서 수: <span className="font-semibold text-indigo-600">{documentCount}개</span>
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
            <span className="block text-xs font-medium text-slate-500 mb-2">자주 사용하는 경로 프리셋:</span>
            <div className="grid grid-cols-1 gap-1.5">
              {presetPaths.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPathInput(preset.path);
                    setNameInput(preset.name.split(' ')[0]);
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
                  <span>경로 저장</span>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

