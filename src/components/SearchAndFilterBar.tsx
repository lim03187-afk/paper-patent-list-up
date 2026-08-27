import React from 'react';
import { Search, Filter, LayoutGrid, List, Calendar, Tag, Trash2, ExternalLink } from 'lucide-react';
import { DocType } from '../types';

interface SearchAndFilterBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedType: DocType | 'all';
  setSelectedType: (t: DocType | 'all') => void;
  selectedYear: string;
  setSelectedYear: (y: string) => void;
  availableYears: string[];
  viewMode: 'card' | 'table';
  setViewMode: (m: 'card' | 'table') => void;
  totalResults: number;
}

export const SearchAndFilterBar: React.FC<SearchAndFilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  selectedType,
  setSelectedType,
  selectedYear,
  setSelectedYear,
  availableYears,
  viewMode,
  setViewMode,
  totalResults
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 mb-6 space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제목, 저자, 내용 요약, 키워드로 통합 검색..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-600"
            >
              지우기
            </button>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center space-x-2 shrink-0 justify-end">
          <div className="text-xs text-slate-500 mr-2">
            검색결과 <span className="font-semibold text-slate-800">{totalResults}건</span>
          </div>
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200/60">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                viewMode === 'card'
                  ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="카드 보기"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">카드</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="테이블 보기"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">테이블</span>
            </button>
          </div>
        </div>

      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        
        {/* Type filters */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> 유형:
          </span>
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setSelectedType('paper')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedType === 'paper'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            학술 논문
          </button>
          <button
            onClick={() => setSelectedType('patent')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedType === 'patent'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            특허 문서
          </button>
        </div>

        {/* Year filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> 연도:
          </span>
          <button
            onClick={() => setSelectedYear('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedYear === 'all'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            전체연도
          </button>
          {availableYears.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedYear === y
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {y}년
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};
