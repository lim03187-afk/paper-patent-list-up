import React, { useState } from 'react';
import { ResearchDocument } from '../types';
import { FileText, Shield, ExternalLink, Calendar, Users, Tag, Trash2, ArrowUpRight, CheckSquare, Square } from 'lucide-react';

interface DocumentListViewProps {
  documents: ResearchDocument[];
  viewMode: 'card' | 'table';
  onDeleteDocument: (id: string) => void;
  onDeleteMultipleDocuments: (ids: string[]) => void;
  onSelectDocument: (doc: ResearchDocument) => void;
}

export const DocumentListView: React.FC<DocumentListViewProps> = ({
  documents,
  viewMode,
  onDeleteDocument,
  onDeleteMultipleDocuments,
  onSelectDocument
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
        <div className="bg-rose-50 border border-rose-200 px-5 py-3 rounded-xl flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center space-x-2 text-xs font-semibold text-rose-800">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            <span>총 {selectedIds.length}개 문서가 선택되었습니다.</span>
          </div>
          <button
            onClick={handleBulkDelete}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>선택 문서 일괄 삭제</span>
          </button>
        </div>
      )}

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => {
            const isPatent = doc.type === 'patent';
            const isSelected = selectedIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                onClick={(e) => handleToggleSelect(doc.id, e)}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group cursor-pointer ${
                  isSelected 
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/10 shadow-md' 
                    : 'border-slate-200/80 hover:border-indigo-300/80 shadow-2xs hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Badge & Year Bar */}
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
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
                        <span>{doc.year}</span>
                      </span>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`"${doc.title}" 문서를 삭제하시겠습니까?`)) {
                          onDeleteDocument(doc.id);
                          setSelectedIds(prev => prev.filter(i => i !== doc.id));
                        }
                      }}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="문서 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Main Body */}
                  <div className="p-5 space-y-3">
                    {/* Title */}
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

                    {/* Authors */}
                    <div className="flex items-start space-x-1.5 text-xs text-slate-600">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1 font-medium">{doc.authors}</span>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      {doc.summary}
                    </p>

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
                    href={doc.fileUrl}
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
                  <th className="py-3 px-4 min-w-[220px]">제목</th>
                  <th className="py-3 px-4 min-w-[160px]">저자</th>
                  <th className="py-3 px-4 min-w-[280px]">내용 요약</th>
                  <th className="py-3 px-4 min-w-[140px]">키워드</th>
                  <th className="py-3 px-4 text-right w-24">링크/관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc) => {
                  const isPatent = doc.type === 'patent';
                  const isSelected = selectedIds.includes(doc.id);
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
                        {doc.year}
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
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="line-clamp-1" title={doc.authors}>
                          {doc.authors}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <p className="line-clamp-2 leading-relaxed" title={doc.summary}>
                          {doc.summary}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {doc.keywords.slice(0, 3).map((kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/60"
                            >
                              {kw}
                            </span>
                          ))}
                          {doc.keywords.length > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{doc.keywords.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-2">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg font-semibold transition-colors shadow-2xs"
                            title="파일 열기"
                          >
                            <span>열기</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                          <button
                            onClick={() => {
                              if (confirm(`"${doc.title}" 문서를 삭제하시겠습니까?`)) {
                                onDeleteDocument(doc.id);
                                setSelectedIds(prev => prev.filter(i => i !== doc.id));
                              }
                            }}
                            className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
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
    </div>
  );
};

