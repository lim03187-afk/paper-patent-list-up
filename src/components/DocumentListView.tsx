import React, { useState } from 'react';
import { ResearchDocument } from '../types';
import { FileText, Shield, ExternalLink, Calendar, Users, Tag, Trash2, ArrowUpRight, CheckSquare, Square, Sparkles, Loader2, Edit3, Check, X } from 'lucide-react';

interface DocumentListViewProps {
  documents: ResearchDocument[];
  viewMode: 'card' | 'table';
  onDeleteDocument: (id: string) => void;
  onDeleteMultipleDocuments: (ids: string[]) => void;
  onSelectDocument: (doc: ResearchDocument) => void;
  onUpdateDocument?: (doc: ResearchDocument) => void;
  onReanalyzeDocument?: (doc: ResearchDocument) => Promise<any>;
}

export const DocumentListView: React.FC<DocumentListViewProps> = ({
  documents,
  viewMode,
  onDeleteDocument,
  onDeleteMultipleDocuments,
  onSelectDocument,
  onUpdateDocument,
  onReanalyzeDocument
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);

  // Quick edit modal state
  const [editingDoc, setEditingDoc] = useState<ResearchDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthors, setEditAuthors] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editKeywordsStr, setEditKeywordsStr] = useState('');

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(documents.map(d => d.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`선택한 ${selectedIds.length}개의 문서를 정말 삭제하시겠습니까?`)) {
      onDeleteMultipleDocuments(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleSingleReanalyze = async (doc: ResearchDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onReanalyzeDocument) return;
    setAnalyzingDocId(doc.id);
    try {
      await onReanalyzeDocument(doc);
    } catch (err: any) {
      alert(`AI 재분석 실패: ${err.message || '오류 발생'}`);
    } finally {
      setAnalyzingDocId(null);
    }
  };

  const handleBulkReanalyze = async () => {
    if (selectedIds.length === 0 || !onReanalyzeDocument) return;
    setBulkAnalyzing(true);
    try {
      const selectedDocs = documents.filter(d => selectedIds.includes(d.id));
      for (const doc of selectedDocs) {
        await onReanalyzeDocument(doc);
      }
      alert(`선택한 ${selectedDocs.length}개 문서의 AI 서지정보 재분석이 완료되었습니다.`);
    } catch (err: any) {
      alert(`일괄 재분석 중 일부 오류: ${err.message}`);
    } finally {
      setBulkAnalyzing(false);
    }
  };

  const handleStartEdit = (doc: ResearchDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditAuthors(doc.authors);
    setEditYear(doc.year);
    setEditSummary(doc.summary);
    setEditKeywordsStr(doc.keywords ? doc.keywords.join(', ') : '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !onUpdateDocument) return;
    const parsedKeywords = editKeywordsStr
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    const updated: ResearchDocument = {
      ...editingDoc,
      title: editTitle.trim() || editingDoc.title,
      authors: editAuthors.trim() || editingDoc.authors,
      year: editYear.trim() || editingDoc.year,
      summary: editSummary.trim() || editingDoc.summary,
      keywords: parsedKeywords.length > 0 ? parsedKeywords : editingDoc.keywords
    };
    onUpdateDocument(updated);
    setEditingDoc(null);
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-6 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">검색 결과가 없습니다</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          검색어 혹은 필터 조건을 변경해 보거나, 상단의 '문서 추가 / AI 분석' 버튼을 통해 새로운 논문과 특허를 등록해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50/80 border border-indigo-200 px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150 shadow-2xs">
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-900">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            <span>총 {selectedIds.length}개 문서 선택됨</span>
          </div>
          <div className="flex items-center space-x-2">
            {onReanalyzeDocument && (
              <button
                onClick={handleBulkReanalyze}
                disabled={bulkAnalyzing}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center space-x-1.5"
              >
                {bulkAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{bulkAnalyzing ? 'AI 서지정보 분석 중...' : '선택 문서 AI 서지정보 재분석'}</span>
              </button>
            )}
            <button
              onClick={handleBulkDelete}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>선택 문서 일괄 삭제</span>
            </button>
          </div>
        </div>
      )}

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => {
            const isPatent = doc.type === 'patent';
            const isSelected = selectedIds.includes(doc.id);
            const isCurrentlyAnalyzing = analyzingDocId === doc.id;

            return (
              <div
                key={doc.id}
                onClick={(e) => handleToggleSelect(doc.id, e)}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group cursor-pointer relative ${
                  isSelected 
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/10 shadow-md' 
                    : 'border-slate-200/80 hover:border-indigo-300/80 shadow-2xs hover:shadow-md'
                }`}
              >
                {isCurrentlyAnalyzing && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs z-20 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs font-semibold text-indigo-700">AI 서지정보 분석 중...</span>
                  </div>
                )}

                <div>
                  {/* Top Badge & Year Bar */}
                  <div className="px-5 pt-3.5 pb-2.5 flex items-center justify-between border-b border-slate-100 bg-slate-50/60">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelect(doc.id, e)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                        title={isSelected ? "선택 해제" : "문서 선택"}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </button>
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                          isPatent
                            ? 'bg-teal-50 text-teal-700 border border-teal-200/60'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                        }`}
                      >
                        {isPatent ? <Shield className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        <span>{isPatent ? '특허' : '논문'}</span>
                      </span>
                      <span className="inline-flex items-center space-x-1 text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{doc.year}년</span>
                      </span>
                    </div>

                    {/* Actions: AI Reanalyze, Edit, Delete */}
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      {onReanalyzeDocument && (
                        <button
                          onClick={(e) => handleSingleReanalyze(doc, e)}
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                          title="AI 서지정보(제목, 저자, 연도, 요약) 다시 정밀 분석"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleStartEdit(doc, e)}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        title="서지정보 직접 수정"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`"${doc.title}" 문서를 삭제하시겠습니까?`)) {
                            onDeleteDocument(doc.id);
                            setSelectedIds(prev => prev.filter(i => i !== doc.id));
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="문서 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Main Body with Clear Title, Writer, Year, Summary */}
                  <div className="p-5 space-y-3">
                    {/* Title */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">제목 (Title)</span>
                      <h3
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDocument(doc);
                        }}
                        className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer line-clamp-2 leading-snug"
                        title={doc.title}
                      >
                        {doc.title}
                      </h3>
                    </div>

                    {/* Authors / Writer */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">저자 (Writer)</span>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="line-clamp-1" title={doc.authors}>{doc.authors}</span>
                      </div>
                    </div>

                    {/* Summary */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">내용 요약 (Summary)</span>
                      <div className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        {doc.summary}
                      </div>
                    </div>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {doc.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60"
                        >
                          <Tag className="w-2.5 h-2.5 text-slate-400" />
                          <span>{kw}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 truncate max-w-[180px] font-mono">
                    {doc.folderPath}
                  </span>
                  <a
                    href={doc.fileUrl || `https://arxiv.org/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                  >
                    <span>파일 열기</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Table View
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-slate-400 hover:text-indigo-600"
                    >
                      {selectedIds.length === documents.length && documents.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 w-20">유형</th>
                  <th className="py-3 px-4 w-20">발행연도</th>
                  <th className="py-3 px-4 min-w-[220px]">제목 (Title)</th>
                  <th className="py-3 px-4 min-w-[160px]">저자 (Writer)</th>
                  <th className="py-3 px-4 min-w-[280px]">내용 요약 (Summary)</th>
                  <th className="py-3 px-4 min-w-[140px]">키워드</th>
                  <th className="py-3 px-4 text-right w-28">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc) => {
                  const isPatent = doc.type === 'patent';
                  const isSelected = selectedIds.includes(doc.id);
                  const isCurrentlyAnalyzing = analyzingDocId === doc.id;

                  return (
                    <tr 
                      key={doc.id} 
                      onClick={(e) => handleToggleSelect(doc.id, e)}
                      className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${isSelected ? 'bg-indigo-50/30' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelect(doc.id, e)}
                          className="text-slate-400 hover:text-indigo-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isPatent
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {isPatent ? <Shield className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          <span>{isPatent ? '특허' : '논문'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-900">
                        {doc.year}년
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDocument(doc);
                          }}
                          className="text-left hover:text-indigo-600 transition-colors line-clamp-2"
                        >
                          {doc.title}
                        </button>
                        {doc.doi && (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center text-[10px] text-indigo-600 font-mono">
                              DOI: {doc.doi}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="line-clamp-1 font-medium" title={doc.authors}>
                          {doc.authors}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <p className="line-clamp-2 leading-relaxed" title={doc.summary}>
                          {doc.summary}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {doc.keywords && doc.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/80 font-medium inline-flex items-center space-x-1"
                            >
                              <Tag className="w-2.5 h-2.5 text-slate-400" />
                              <span>{kw}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          {onReanalyzeDocument && (
                            <button
                              onClick={(e) => handleSingleReanalyze(doc, e)}
                              disabled={isCurrentlyAnalyzing}
                              className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"
                              title="AI 재분석"
                            >
                              {isCurrentlyAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={(e) => handleStartEdit(doc, e)}
                            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            title="수정"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={doc.fileUrl || `https://arxiv.org/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg font-semibold transition-colors shadow-2xs"
                            title="파일 열기"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                          <button
                            onClick={() => {
                              if (confirm(`"${doc.title}" 문서를 삭제하시겠습니까?`)) {
                                onDeleteDocument(doc.id);
                                setSelectedIds(prev => prev.filter(i => i !== doc.id));
                              }
                            }}
                            className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Edit Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>서지 정보 직접 수정</span>
              </h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">제목 (Title)</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">저자 (Writer)</label>
                  <input
                    type="text"
                    value={editAuthors}
                    onChange={(e) => setEditAuthors(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">발행연도 (Year)</label>
                  <input
                    type="text"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">내용 요약 (Summary)</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={4}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">핵심 키워드 (쉼표로 구분)</label>
                <input
                  type="text"
                  value={editKeywordsStr}
                  onChange={(e) => setEditKeywordsStr(e.target.value)}
                  placeholder="예: 분산 중합, 폴리스티렌, 입자 크기 제어, 고분자 합성"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

