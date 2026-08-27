import React, { useState } from 'react';
import { X, Sparkles, FileText, Shield, Loader2, UploadCloud, PlusCircle, FolderUp } from 'lucide-react';
import { ResearchDocument, DocType } from '../types';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDocument: (doc: ResearchDocument) => void;
  currentFolderPath: string;
  existingDocuments: ResearchDocument[];
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  onClose,
  onAddDocument,
  currentFolderPath,
  existingDocuments
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'ai' | 'manual'>('file');
  
  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // AI text analysis state
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

  // Client-side fallback text extractor
  const extractClientText = async (file: File): Promise<string> => {
    try {
      const text = await file.text();
      if (text && text.trim().length > 10) {
        return text;
      }
    } catch {}
    return file.name.replace(/\.[^/.]+$/, "");
  };

  // Client-side Crossref lookup
  const queryCrossrefClient = async (query: string): Promise<any | null> => {
    try {
      const clean = query.replace(/\.(pdf|txt|md|docx?)$/i, '').replace(/[-_]/g, ' ').trim();
      if (clean.length < 3) return null;
      const url = `https://api.crossref.org/works?query.title=${encodeURIComponent(clean)}&rows=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        const item = data.message?.items?.[0];
        if (item && item.title?.[0]) {
          const title = item.title[0];
          const authors = (item.author || []).map((a: any) => [a.given, a.family].filter(Boolean).join(' ') || a.name || '').filter(Boolean).join(', ');
          let year = '';
          if (item.issued?.['date-parts']?.[0]?.[0]) year = String(item.issued['date-parts'][0][0]);
          else if (item.created?.['date-parts']?.[0]?.[0]) year = String(item.created['date-parts'][0][0]);
          return {
            title: title || clean,
            authors: authors || '저자 미상',
            year: year || new Date().getFullYear().toString(),
            doi: item.DOI,
            journal: item['container-title']?.[0],
            url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : undefined)
          };
        }
      }
    } catch {}
    return null;
  };

  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setErrorMsg('');

    try {
      let docsToAdd: any[] = [];
      let usedServer = false;

      // 1. Try server analysis first
      try {
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });

        const res = await fetch('/api/upload-and-analyze', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const json = await res.json();
          if (json.documents && Array.isArray(json.documents)) {
            docsToAdd = json.documents;
            usedServer = true;
          }
        }
      } catch (serverErr) {
        console.warn("Server upload-and-analyze notice, falling back to client processing:", serverErr);
      }

      // 2. If server was unavailable (e.g. 404, network error), process smoothly in client
      if (!usedServer || docsToAdd.length === 0) {
        for (let idx = 0; idx < selectedFiles.length; idx++) {
          const fileObj = selectedFiles[idx];
          const cleanName = fileObj.name.replace(/\.[^/.]+$/, "");
          const isPatent = cleanName.toLowerCase().includes("patent") || cleanName.toLowerCase().includes("특허") || cleanName.toLowerCase().includes("출원");
          const extractedText = await extractClientText(fileObj);

          // Check Crossref directly from browser
          const crossrefMeta = await queryCrossrefClient(cleanName);

          const lines = extractedText.split('\n').map(l => l.trim()).filter(Boolean);
          const rawTitle = crossrefMeta?.title || (lines[0] && lines[0].length < 150 ? lines[0] : cleanName);
          const rawAuthors = crossrefMeta?.authors || (lines[1] && lines[1].length < 80 ? lines[1] : '저자 미상');
          
          const yearMatch = (cleanName + ' ' + extractedText).match(/\b(19\d\d|20\d\d)\b/);
          const rawYear = crossrefMeta?.year || (yearMatch ? yearMatch[1] : new Date().getFullYear().toString());

          const rawSummary = `[제목: ${rawTitle} | 저자: ${rawAuthors} | 발행연도: ${rawYear}년] ${fileObj.name} 파일에서 추출된 연구 자료입니다.`;

          docsToAdd.push({
            title: rawTitle,
            authors: rawAuthors,
            year: rawYear,
            summary: rawSummary,
            keywords: [isPatent ? '특허' : '학술연구', '문헌분석'],
            type: isPatent ? 'patent' : 'paper',
            fileUrl: crossrefMeta?.url || URL.createObjectURL(fileObj),
            doi: crossrefMeta?.doi,
            journal: crossrefMeta?.journal
          });
        }
      }

      let addedCount = 0;
      docsToAdd.forEach((parsedDoc: any, idx: number) => {
        const fileObj = selectedFiles[idx] || selectedFiles[0];
        const localUrl = fileObj ? URL.createObjectURL(fileObj) : 'https://arxiv.org/';
        const docTitle = parsedDoc.title || fileObj?.name || '문서 제목';

        // Check duplicate
        const isDuplicate = existingDocuments.some(
          d => d.title.toLowerCase().trim() === docTitle.toLowerCase().trim()
        );

        if (isDuplicate) {
          const proceed = confirm(`"${docTitle}" 문서는 이미 아카이브에 존재합니다. 중복으로 추가하시겠습니까?`);
          if (!proceed) return;
        }

        const authorsString = Array.isArray(parsedDoc.authors)
          ? parsedDoc.authors.join(', ')
          : (typeof parsedDoc.authors === 'string' && parsedDoc.authors.trim() ? parsedDoc.authors.trim() : '저자 미상');
        const yearString = String(parsedDoc.year || new Date().getFullYear()).replace(/\D/g, '') || String(new Date().getFullYear());

        let finalSummary = parsedDoc.summary || '내용 요약 없음';
        if (!finalSummary.startsWith('[제목:') && !finalSummary.startsWith('[저자:')) {
          finalSummary = `[제목: ${docTitle} | 저자: ${authorsString} | 발행연도: ${yearString}년] ${finalSummary}`;
        }

        const newDoc: ResearchDocument = {
          id: 'doc-' + Date.now() + '-' + idx,
          title: docTitle,
          authors: authorsString,
          year: yearString,
          summary: finalSummary,
          keywords: Array.isArray(parsedDoc.keywords) && parsedDoc.keywords.length > 0 ? parsedDoc.keywords : ['연구자료'],
          type: parsedDoc.type === 'patent' ? 'patent' : 'paper',
          fileUrl: parsedDoc.fileUrl || localUrl,
          folderPath: currentFolderPath,
          createdAt: new Date().toISOString().split('T')[0],
          citationCount: 1,
          doi: parsedDoc.doi || undefined,
          journal: parsedDoc.journal || undefined
        };

        onAddDocument(newDoc);
        addedCount++;
      });

      if (addedCount > 0) {
        onClose();
        setSelectedFiles([]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '파일 처리 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAiAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setIsAnalyzing(true);
    setErrorMsg('');

    try {
      let data: any = null;
      try {
        const res = await fetch('/api/analyze-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText, fileType: aiDocType })
        });

        if (res.ok) {
          data = await res.json();
        }
      } catch (serverErr) {
        console.warn("Server analyze notice, falling back to client extraction:", serverErr);
      }

      if (!data) {
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        const candidateTitle = lines[0]?.slice(0, 150) || '연구 분석 문서';
        const candidateAuthors = lines[1]?.slice(0, 80) || '연구자';
        const yearMatch = rawText.match(/\b(19\d\d|20\d\d)\b/);
        const candidateYear = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
        const crossrefMeta = await queryCrossrefClient(candidateTitle);

        data = {
          title: crossrefMeta?.title || candidateTitle,
          authors: crossrefMeta?.authors || candidateAuthors,
          year: crossrefMeta?.year || candidateYear,
          summary: lines.slice(2, 6).join(' ').slice(0, 300) || rawText.slice(0, 200),
          keywords: ['연구자료', aiDocType === 'patent' ? '특허' : '학술논문'],
          type: aiDocType,
          doi: crossrefMeta?.doi,
          fileUrl: crossrefMeta?.url || 'https://arxiv.org/',
          journal: crossrefMeta?.journal
        };
      }

      const docTitle = data.title || '제목 없음';
      const isDuplicate = existingDocuments.some(
        d => d.title.toLowerCase().trim() === docTitle.toLowerCase().trim()
      );

      if (isDuplicate) {
        const proceed = confirm(`"${docTitle}" 문서는 이미 아카이브에 존재합니다. 중복으로 추가하시겠습니까?`);
        if (!proceed) {
          setIsAnalyzing(false);
          return;
        }
      }

      const authorsString = Array.isArray(data.authors)
        ? data.authors.join(', ')
        : (typeof data.authors === 'string' && data.authors.trim() ? data.authors.trim() : '저자 미상');
      const yearString = String(data.year || new Date().getFullYear()).replace(/\D/g, '') || String(new Date().getFullYear());

      let finalSummary = data.summary || rawText.slice(0, 200);
      if (!finalSummary.startsWith('[제목:') && !finalSummary.startsWith('[저자:')) {
        finalSummary = `[제목: ${docTitle} | 저자: ${authorsString} | 발행연도: ${yearString}년] ${finalSummary}`;
      }

      const newDoc: ResearchDocument = {
        id: 'doc-' + Date.now(),
        title: docTitle,
        authors: authorsString,
        year: yearString,
        summary: finalSummary,
        keywords: Array.isArray(data.keywords) ? data.keywords : ['연구', '신규문서'],
        type: data.type === 'patent' ? 'patent' : 'paper',
        fileUrl: data.fileUrl || (data.doi ? `https://doi.org/${data.doi}` : 'https://arxiv.org/'),
        folderPath: currentFolderPath,
        createdAt: new Date().toISOString().split('T')[0],
        citationCount: 1,
        doi: data.doi || undefined,
        journal: data.journal || undefined
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

    const docTitle = title.trim();
    const isDuplicate = existingDocuments.some(
      d => d.title.toLowerCase().trim() === docTitle.toLowerCase().trim()
    );

    if (isDuplicate) {
      const proceed = confirm(`"${docTitle}" 문서는 이미 아카이브에 존재합니다. 중복으로 추가하시겠습니까?`);
      if (!proceed) return;
    }

    const docYear = year.trim() || '2026';
    let finalSummary = summary.trim() || '요약 내용이 없습니다.';
    if (!finalSummary.startsWith('[제목:') && !finalSummary.startsWith('[저자:')) {
      finalSummary = `[제목: ${docTitle} | 저자: ${authors.trim()} | 발행연도: ${docYear}년] ${finalSummary}`;
    }

    const newDoc: ResearchDocument = {
      id: 'doc-' + Date.now(),
      title: docTitle,
      authors: authors.trim(),
      year: docYear,
      summary: finalSummary,
      keywords: keywordsStr ? keywordsStr.split(',').map(k => k.trim()).filter(Boolean) : ['기타'],
      type: docType,
      fileUrl: fileUrl.trim() || 'https://arxiv.org/',
      folderPath: currentFolderPath,
      createdAt: new Date().toISOString().split('T')[0],
      citationCount: 1
    };

    onAddDocument(newDoc);
    onClose();
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
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">컴퓨터 파일 업로드 및 연구 정리</h2>
              <p className="text-xs text-slate-500">소장 중인 논문/특허 파일(PDF, TXT 등)을 업로드하여 AI 분석과 함께 정리하세요.</p>
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
            onClick={() => setActiveTab('file')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'file'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FolderUp className="w-3.5 h-3.5 text-blue-600" />
            <span>컴퓨터 파일 업로드</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'ai'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>초록 텍스트 붙여넣기</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>직접 입력</span>
          </button>
        </div>

        {/* Content area */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'file' ? (
            <form onSubmit={handleFileUploadSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50 relative group">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.doc,.docx"
                  onChange={(e) => {
                    if (e.target.files) {
                      setSelectedFiles(Array.from(e.target.files));
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    컴퓨터에서 논문·특허 파일 드래그 또는 클릭하여 선택
                  </div>
                  <p className="text-[11px] text-slate-400">
                    지원 형식: PDF, TXT, MD, DOC, DOCX (복수 선택 가능)
                  </p>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    선택된 파일 ({selectedFiles.length}개):
                  </span>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                        <span className="truncate font-medium text-slate-700">{f.name}</span>
                        <span className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {errorMsg}
                </div>
              )}

              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">AI 자동 정리:</span> 업로드하신 컴퓨터 파일을 Gemini AI가 즉시 분석하여 연도, 제목, 저자, 요약, 키워드를 추출하고, 클릭 시 로컬 파일을 바로 열 수 있도록 연결합니다.
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
                  disabled={selectedFiles.length === 0 || isUploading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-xs flex items-center space-x-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>파일 업로드 및 AI 분석 중...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>파일 업로드 및 정리 시작</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : activeTab === 'ai' ? (
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">파일 링크 (URL / 경로)</label>
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
