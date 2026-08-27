import React from 'react';
import { X, FileText, Shield, Calendar, Users, Tag, ExternalLink, HardDrive, Copy, Check, Globe, BookOpen } from 'lucide-react';
import { ResearchDocument } from '../types';

interface DocumentDetailModalProps {
  document: ResearchDocument | null;
  onClose: () => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!document) return null;

  const isPatent = document.type === 'patent';
  const doiUrl = document.doi ? (document.doi.startsWith('http') ? document.doi : `https://doi.org/${document.doi}`) : null;

  const handleCopyCitation = () => {
    const doiPart = document.doi ? ` DOI: https://doi.org/${document.doi}` : '';
    const citation = `${document.authors} (${document.year}). "${document.title}". ${isPatent ? 'Patent.' : (document.journal ? `${document.journal}.` : 'Research Paper.')}${doiPart} Link: ${document.fileUrl}`;
    navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                isPatent
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              {isPatent ? <Shield className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{isPatent ? '특허 문서' : '학술 논문'}</span>
            </span>
            <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              {document.year}년 발행
            </span>
            {document.doi && (
              <span className="text-xs font-medium text-indigo-700 bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center space-x-1">
                <Globe className="w-3 h-3 text-indigo-500" />
                <span>DOI: {document.doi}</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Title */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {document.title}
            </h2>
            {document.journal && (
              <div className="flex items-center space-x-1.5 text-xs text-indigo-600 font-medium mt-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{document.journal}</span>
              </div>
            )}
          </div>

          {/* Authors */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              저자 (Authors)
            </span>
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-800">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{document.authors}</span>
            </div>
          </div>

          {/* DOI Direct Web Link Box */}
          {doiUrl && (
            <div className="bg-indigo-50/30 border border-indigo-100 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs">
                <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="truncate">
                  <span className="font-semibold text-slate-700 mr-2">공식 DOI 웹페이지:</span>
                  <span className="font-mono text-indigo-600">{doiUrl}</span>
                </div>
              </div>
              <a
                href={doiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center space-x-1 px-3 py-1 bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-medium transition-colors shadow-2xs"
              >
                <span>사이트 이동</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Summary */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              내용 요약 (Summary)
            </span>
            <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100 text-xs text-slate-700 leading-relaxed">
              {document.summary}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              핵심 키워드 (Keywords)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {document.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="inline-flex items-center space-x-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
                >
                  <Tag className="w-3 h-3 text-slate-400" />
                  <span>{kw}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Folder & File Path info */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-1.5">
              <HardDrive className="w-4 h-4 text-amber-600" />
              <span className="font-mono text-[11px]">{document.folderPath}</span>
            </div>
            {document.citationCount && (
              <div className="text-slate-400 font-medium">
                인용수: {document.citationCount.toLocaleString()}회
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleCopyCitation}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-colors shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? '인용구 복사됨!' : '인용구 복사하기'}</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              닫기
            </button>
            <a
              href={doiUrl || document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-colors shadow-xs"
            >
              <span>{doiUrl ? 'DOI 원문 사이트 열기' : '파일 열기'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
