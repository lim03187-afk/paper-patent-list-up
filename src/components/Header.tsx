import React from 'react';
import { FolderOpen, Plus, Search, BookOpen } from 'lucide-react';
import { FolderConfig } from '../types';

interface HeaderProps {
  folder: FolderConfig;
  onOpenFolderModal: () => void;
  onOpenAddModal: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  folder,
  onOpenFolderModal,
  onOpenAddModal,
  searchQuery,
  setSearchQuery,
  totalCount
}) => {
  return (
    <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs shrink-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shadow-2xs">
          <BookOpen className="w-5 h-5" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-800 flex items-center">
          연구·특허 문서 라이브러리
          <span className="text-xs font-normal text-slate-400 ml-2 bg-slate-100 px-2 py-0.5 rounded-full">v2.4.0</span>
        </h1>
      </div>

      <div className="flex items-center gap-4 flex-1 max-w-xl mx-8">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제목, 저자, 내용 요약, 키워드로 통합 검색..."
            className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-xs sm:text-sm focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all outline-none text-slate-800"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenFolderModal}
          className="px-3.5 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1.5 shadow-2xs"
          title="폴더 지정 및 관리"
        >
          <FolderOpen className="w-4 h-4" />
          <span className="hidden sm:inline truncate max-w-[140px]">{folder.name}</span>
        </button>
        <button
          onClick={onOpenAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>문서 추가 / AI 분석</span>
        </button>
      </div>
    </header>
  );
};

