/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FolderConfigModal } from './components/FolderConfigModal';
import { AddDocumentModal } from './components/AddDocumentModal';
import { DocumentListView } from './components/DocumentListView';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { ResearchDocument, FolderConfig, DocType } from './types';
import { INITIAL_DOCUMENTS, DEFAULT_FOLDER } from './data/initialData';
import { LayoutGrid, List } from 'lucide-react';

export default function App() {
  const [documents, setDocuments] = useState<ResearchDocument[]>(() => {
    const saved = localStorage.getItem('research_vault_docs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved docs", e);
      }
    }
    return INITIAL_DOCUMENTS;
  });

  const [folder, setFolder] = useState<FolderConfig>(() => {
    const saved = localStorage.getItem('research_vault_folder');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved folder", e);
      }
    }
    return DEFAULT_FOLDER;
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<DocType | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Modals state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDocForDetail, setSelectedDocForDetail] = useState<ResearchDocument | null>(null);

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('research_vault_docs', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('research_vault_folder', JSON.stringify(folder));
  }, [folder]);

  // Extract available years sorted descending
  const availableYears = Array.from(new Set(documents.map(d => d.year))).sort((a, b) => b.localeCompare(a));

  // Counts
  const totalCount = documents.length;
  const paperCount = documents.filter(d => d.type === 'paper').length;
  const patentCount = documents.filter(d => d.type === 'patent').length;

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    // Type filter
    if (selectedType !== 'all' && doc.type !== selectedType) return false;
    // Year filter
    if (selectedYear !== 'all' && doc.year !== selectedYear) return false;
    // Search query filter (title, authors, summary, keywords)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchAuthors = doc.authors.toLowerCase().includes(q);
      const matchSummary = doc.summary.toLowerCase().includes(q);
      const matchKeywords = doc.keywords.some(kw => kw.toLowerCase().includes(q));
      if (!matchTitle && !matchAuthors && !matchSummary && !matchKeywords) {
        return false;
      }
    }
    return true;
  });

  const handleAddDocument = (newDoc: ResearchDocument) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleResetData = () => {
    setDocuments(INITIAL_DOCUMENTS);
    setFolder(DEFAULT_FOLDER);
    localStorage.removeItem('research_vault_docs');
    localStorage.removeItem('research_vault_folder');
  };

  return (
    <div className="h-screen bg-[#F7F9FC] text-slate-700 flex flex-col font-sans overflow-hidden">
      
      {/* Top Header with Embedded Search */}
      <Header
        folder={folder}
        onOpenFolderModal={() => setIsFolderModalOpen(true)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalCount={totalCount}
      />

      {/* Main Container with Sidebar */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 shrink-0 overflow-y-auto">
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Current Folder</h3>
            <div 
              onClick={() => setIsFolderModalOpen(true)}
              className="p-3 bg-blue-50 rounded-xl border border-blue-100 cursor-pointer hover:bg-blue-100/50 transition-colors"
            >
              <p className="text-xs font-medium text-blue-700 truncate">{folder.path}</p>
              <p className="text-[10px] text-blue-400 mt-1">{totalCount} Files • {folder.name}</p>
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Filter by Category</h3>
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => setSelectedType('all')}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === 'all'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>전체 문서</span>
                <span className="text-xs opacity-60">{totalCount}</span>
              </button>
              <button
                onClick={() => setSelectedType('patent')}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === 'patent'
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>특허 문서</span>
                <span className="text-xs opacity-60">{patentCount}</span>
              </button>
              <button
                onClick={() => setSelectedType('paper')}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === 'paper'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>학술 논문</span>
                <span className="text-xs opacity-60">{paperCount}</span>
              </button>
            </nav>
          </div>

          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Recent Years</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedYear('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedYear === 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                }`}
              >
                전체연도
              </button>
              {availableYears.map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedYear === y
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  {y}년
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-1 flex flex-col bg-[#F7F9FC] overflow-hidden">
          <div className="p-6 pb-2 flex justify-between items-end shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Research Inventory</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedType === 'all' ? '전체 문서' : selectedType === 'paper' ? '학술 논문' : '특허 문서'} {selectedYear !== 'all' ? `(${selectedYear}년)` : ''} 아카이브 목록
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-400">
                Showing {filteredDocuments.length} of {totalCount} documents
              </div>
              <div className="bg-white p-1 rounded-xl flex items-center space-x-1 border border-slate-200 shadow-2xs">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
                    viewMode === 'card'
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="카드 보기"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">카드</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
                    viewMode === 'table'
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
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

          <div className="p-6 pt-2 flex-1 overflow-y-auto">
            <DocumentListView
              documents={filteredDocuments}
              viewMode={viewMode}
              onDeleteDocument={handleDeleteDocument}
              onSelectDocument={(doc) => setSelectedDocForDetail(doc)}
            />
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="h-8 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-tighter shrink-0">
        <div>System Status: Ready • Connected to ResearchDB_Node_01</div>
        <div>Layout: High Density View • Single Iframe Mode</div>
      </footer>

      {/* Modals */}
      <FolderConfigModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        currentFolder={folder}
        onSaveFolder={(newFolder) => setFolder(newFolder)}
        onResetData={handleResetData}
        documentCount={documents.length}
      />

      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddDocument={handleAddDocument}
        currentFolderPath={folder.path}
      />

      <DocumentDetailModal
        document={selectedDocForDetail}
        onClose={() => setSelectedDocForDetail(null)}
      />

    </div>
  );
}
