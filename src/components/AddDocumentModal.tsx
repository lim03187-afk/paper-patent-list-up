import React, { useState } from 'react';
import { X, Sparkles, FileText, Shield, Loader2, Link as LinkIcon, PlusCircle } from 'lucide-react';
import { ResearchDocument, DocType } from '../types';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (doc: ResearchDocument) => void;
  currentFolderPath: string;
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  onClose,
  onAddDocument,
  currentFolderPath
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [rawText, setRawText] = useState('');
  const [aiDocType, setAiDocType] = useState<DocType>('paper');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Manual form state
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [summary, setSummary] = useState('');
  const [keywordsStr, setKeywordsStr] = useState('');
  const [docType, setDocType] = useState<DocType>('paper');
  const [fileUrl, setFileUrl] = useState('');

  if (!isOpen) return null;

  const handleAiAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setIsAnalyzing(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, fileType: aiDocType })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '분석 중 오류 발생');

      const newDoc: ResearchDocument = {
        id: 'doc-' + Date.now(),
        title: data.title || '제목 없음',
        authors: data.authors || '저자 미상',
        year: data.year || '2026',
        summary: data.summary || rawText.slice(0, 200),
        keywords: Array.isArray(data.keywords) ? data.keywords : ['연구', '신규문서'],
        type: data.type === 'patent' ? 'patent' : 'paper',
        fileUrl: data.fileUrl || 'https://arxiv.org/',
        folderPath: currentFolderPath,
        createdAt: new Date().toISOString().split('T')[0],
        citationCount: 1
      };

      onAddDocument(newDoc);
      onClose();
      setRawText('');
    } catch (err: any) {
      setErrorMsg(err.message || 'AI 분석에 실패했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !authors.trim()) return;

    const newDoc: ResearchDocument = {
      id: 'doc-' + Date.now(),
      title: title.trim(),
      authors: authors.trim(),
      year: year.trim() || '2026',
      summary: summary.trim() || '요약 내용이 없습니다.',
      keywords: keywordsStr ? keywordsStr.split(',').map(k => k.trim()).filter(Boolean) : ['기타'],
      type: docType,
      fileUrl: fileUrl.trim() || 'https://arxiv.org/',
      folderPath: currentFolderPath,
      createdAt: new Date().toISOString().split('T')[0],
      citationCount: 1
    };

    onAddDocument(newDoc);
    onClose();
    // Reset manual form
    setTitle('');
    setAuthors('');
    setSummary('');
    setKeywordsStr('');
    setFileUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">새 문서 등록 및 분석</h2>
              <p className="text-xs text-slate-500">논문 또는 특허 문서를 추가합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 pt-3 bg-slate-50/40">
          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'ai'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI 자동 분석 추가 (초록/텍스트 붙여넣기)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>직접 입력</span>
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'ai' ? (
            <form onSubmit={handleAiAnalyze} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  문서 유형 선택
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAiDocType('paper')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 transition-all ${
                      aiDocType === 'paper'
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>학술 논문 (Paper)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiDocType('patent')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 transition-all ${
                      aiDocType === 'patent'
                        ? 'border-teal-500 bg-teal-50/50 text-teal-700 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>특허 문서 (Patent)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  논문 초록(Abstract) 또는 특허 요약 텍스트 붙여넣기
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="예: 논문의 Abstract 내용이나 특허의 주요 청구항 및 요약 텍스트를 이곳에 붙여넣으세요. Gemini AI가 제목, 저자, 연도, 키워드를 자동으로 추출하여 정리해 줍니다."
                  rows={6}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {errorMsg}
                </div>
              )}

              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">AI 스마트 파싱:</span> 붙여넣은 텍스트를 분석하여 발행연도, 제목, 저자, 내용 요약 및 태그 키워드를 자동으로 구조화합니다.
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs flex items-center space-x-2 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI 분석 및 등록 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>AI 자동 분석 등록</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">문서 유형</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDocType('paper')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 ${
                      docType === 'paper' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>논문</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocType('patent')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 ${
                      docType === 'patent' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>특허</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">제목 (Title)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="문서 제목을 입력하세요"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">저자 (Authors)</label>
                  <input
                    type="text"
                    value={authors}
                    onChange={(e) => setAuthors(e.target.value)}
                    placeholder="예: 홍길동, 김철수"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">발행연도 (Year)</label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="예: 2026"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">내용 요약 (Summary)</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="핵심 내용 요약을 입력하세요"
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">키워드 (쉼표로 구분)</label>
                  <input
                    type="text"
                    value={keywordsStr}
                    onChange={(e) => setKeywordsStr(e.target.value)}
                    placeholder="예: AI, Transformer, 특허"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">파일 링크 (URL / DOI / 경로)</label>
                  <input
                    type="text"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https:// 또는 로컬 경로"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs"
                >
                  문서 등록
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
