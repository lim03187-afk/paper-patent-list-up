import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParseLib = require("pdf-parse/lib/pdf-parse.js");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
  if (isPdf && file.buffer && file.buffer.length > 0) {
    try {
      if (typeof pdfParseLib === 'function') {
        const result = await pdfParseLib(file.buffer);
        if (result && typeof result.text === 'string' && result.text.trim()) {
          return result.text.trim();
        }
      }
    } catch (err) {
      console.log("PDF parser note:", err);
    }
    // For PDFs, never fallback to buffer.toString("utf-8") as it dumps binary header %PDF-1.6
    return "";
  }

  // Text/Markdown files
  try {
    const raw = file.buffer.toString("utf-8");
    if (!raw.startsWith("%PDF")) {
      return raw;
    }
  } catch {}
  return "";
}

interface DoiMetadata {
  doi?: string;
  title?: string;
  authors?: string;
  year?: string;
  url?: string;
  containerTitle?: string;
  publisher?: string;
  abstract?: string;
}

// 1. Extract DOI pattern from text
function extractDoiFromText(text: string): string | null {
  // Regex to match standard DOI format (10.xxxx/...)
  const doiRegex = /\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/i;
  const match = text.match(doiRegex);
  if (match && match[1]) {
    // Clean trailing punctuation
    return match[1].replace(/[.,;:()\]>]+$/, '').trim();
  }
  return null;
}

// 2. Fetch metadata from official DOI Crossref registry
async function fetchMetadataByDoi(doi: string): Promise<DoiMetadata | null> {
  try {
    const cleanDoi = doi.trim();
    const url = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4500),
      headers: {
        'User-Agent': 'ResearchArchiveApp/1.0 (mailto:lim03187@gmail.com)'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const item = data.message;
      if (item) {
        const title = item.title?.[0] || '';
        const authors = (item.author || []).map((a: any) => {
          return [a.given, a.family].filter(Boolean).join(' ') || a.name || '';
        }).filter(Boolean).join(', ');

        let year = '';
        if (item.issued?.['date-parts']?.[0]?.[0]) {
          year = String(item.issued['date-parts'][0][0]);
        } else if (item.created?.['date-parts']?.[0]?.[0]) {
          year = String(item.created['date-parts'][0][0]);
        } else if (item['published-print']?.['date-parts']?.[0]?.[0]) {
          year = String(item['published-print']['date-parts'][0][0]);
        } else if (item['published-online']?.['date-parts']?.[0]?.[0]) {
          year = String(item['published-online']['date-parts'][0][0]);
        }

        const abstract = item.abstract ? item.abstract.replace(/<[^>]*>/g, '').trim() : '';

        return {
          doi: item.DOI || cleanDoi,
          title: title || undefined,
          authors: authors || undefined,
          year: year || undefined,
          url: item.URL || `https://doi.org/${cleanDoi}`,
          containerTitle: item['container-title']?.[0],
          publisher: item.publisher,
          abstract
        };
      }
    }
  } catch (err) {
    console.warn("Crossref DOI fetch notice:", err);
  }
  return null;
}

// 3. Fallback: Search Crossref by candidate paper title
async function searchCrossrefByTitle(candidateTitle: string): Promise<DoiMetadata | null> {
  try {
    if (!candidateTitle || candidateTitle.trim().length < 6) return null;
    const cleanTitle = candidateTitle.trim().slice(0, 150);
    const url = `https://api.crossref.org/works?query.title=${encodeURIComponent(cleanTitle)}&rows=1`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4500),
      headers: {
        'User-Agent': 'ResearchArchiveApp/1.0 (mailto:lim03187@gmail.com)'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const item = data.message?.items?.[0];
      if (item && item.title?.[0]) {
        const title = item.title[0];
        const authors = (item.author || []).map((a: any) => {
          return [a.given, a.family].filter(Boolean).join(' ') || a.name || '';
        }).filter(Boolean).join(', ');

        let year = '';
        if (item.issued?.['date-parts']?.[0]?.[0]) {
          year = String(item.issued['date-parts'][0][0]);
        } else if (item.created?.['date-parts']?.[0]?.[0]) {
          year = String(item.created['date-parts'][0][0]);
        } else if (item['published-print']?.['date-parts']?.[0]?.[0]) {
          year = String(item['published-print']['date-parts'][0][0]);
        } else if (item['published-online']?.['date-parts']?.[0]?.[0]) {
          year = String(item['published-online']['date-parts'][0][0]);
        }

        const abstract = item.abstract ? item.abstract.replace(/<[^>]*>/g, '').trim() : '';

        return {
          doi: item.DOI,
          title,
          authors: authors || undefined,
          year: year || undefined,
          url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : undefined),
          containerTitle: item['container-title']?.[0],
          publisher: item.publisher,
          abstract
        };
      }
    }
  } catch (err) {
    console.warn("Crossref title search notice:", err);
  }
  return null;
}

// Helper to clean and parse authors, years, and titles
function cleanMetadata(
  titleCandidate?: string,
  authorsCandidate?: any,
  yearCandidate?: any,
  fallbackFilename?: string
) {
  let cleanTitle = (titleCandidate || "").trim();
  // Strip leading page numbers if any (e.g. "209\nTitle" -> "Title")
  cleanTitle = cleanTitle.replace(/^\d+\s+/, "").replace(/\s+/g, " ");

  // Detect corrupted title (e.g. %PDF-1.6 or binary symbols)
  if (
    !cleanTitle ||
    cleanTitle.startsWith("%PDF") ||
    cleanTitle.startsWith("%") ||
    cleanTitle.includes("\uFFFD") ||
    cleanTitle === "제목 없음"
  ) {
    if (fallbackFilename) {
      cleanTitle = fallbackFilename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();
    } else {
      cleanTitle = "학술 연구 문서";
    }
  }

  let cleanAuthors = "저자 미상";
  if (Array.isArray(authorsCandidate)) {
    const list = authorsCandidate
      .map(a => String(a).trim())
      .filter(a => a && !a.startsWith("%") && !a.includes("\uFFFD"));
    if (list.length > 0) cleanAuthors = list.join(", ");
  } else if (typeof authorsCandidate === "string" && authorsCandidate.trim()) {
    const trimmed = authorsCandidate.trim();
    if (!trimmed.startsWith("%") && !trimmed.includes("\uFFFD") && trimmed !== "저자 미상") {
      cleanAuthors = trimmed;
    }
  }

  let cleanYear = new Date().getFullYear().toString();
  if (yearCandidate) {
    const match = String(yearCandidate).match(/\b(19\d\d|20\d\d)\b/);
    if (match) {
      cleanYear = match[1];
    } else if (String(yearCandidate).trim().length === 4) {
      cleanYear = String(yearCandidate).trim();
    }
  }

  return { cleanTitle, cleanAuthors, cleanYear };
}

// API endpoint to analyze uploaded computer files (PDF, TXT, MD, etc.) using Gemini AI & DOI Lookup
app.post("/api/upload-and-analyze", upload.array("files"), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "업로드된 파일이 없습니다." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const results = [];

    for (const file of files) {
      const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
      const cleanName = file.originalname.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const isPatent = cleanName.toLowerCase().includes("patent") || cleanName.toLowerCase().includes("특허") || cleanName.toLowerCase().includes("출원");
      
      const extractedText = await extractTextFromFile(file);

      // Smart rule extraction baseline from text
      const rawLines = extractedText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.match(/^\d+$/) && !l.toLowerCase().includes("downloaded from") && !l.startsWith("%PDF") && !l.startsWith("%"));
      
      const firstLineTitle = rawLines[0]?.slice(0, 150) || cleanName;
      const secondLineAuthors = rawLines[1]?.slice(0, 100) || "저자 미상";
      const firstParagraphSummary = rawLines.slice(2, 7).join(' ').slice(0, 350) || `${file.originalname} 파일이 등록되었습니다.`;

      // Extract year from text or filename if present
      const yearMatch = (file.originalname + " " + extractedText).match(/\b(19\d\d|20\d\d)\b/);
      const textYear = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

      // 1. Check for DOI in the extracted document text
      const extractedDoi = extractDoiFromText(extractedText);
      let doiMeta: DoiMetadata | null = null;
      
      if (extractedDoi) {
        doiMeta = await fetchMetadataByDoi(extractedDoi);
      }
      
      // If no direct DOI found yet, attempt title/filename search via Crossref for scholarly papers
      if (!doiMeta && !isPatent) {
        if (firstLineTitle && firstLineTitle.length > 5 && !firstLineTitle.startsWith("%")) {
          doiMeta = await searchCrossrefByTitle(firstLineTitle);
        }
        if (!doiMeta && cleanName && cleanName.length > 2) {
          doiMeta = await searchCrossrefByTitle(cleanName);
        }
      }

      const initialClean = cleanMetadata(
        doiMeta?.title || firstLineTitle,
        doiMeta?.authors || secondLineAuthors,
        doiMeta?.year || textYear,
        file.originalname
      );

      let analysisResult = {
        title: initialClean.cleanTitle,
        authors: initialClean.cleanAuthors,
        year: initialClean.cleanYear,
        summary: `[제목: ${initialClean.cleanTitle} | 저자: ${initialClean.cleanAuthors} | 발행: ${initialClean.cleanYear}년] ${firstParagraphSummary}`,
        keywords: [isPatent ? "특허" : "학술논문", "연구자료", "문헌분석"],
        type: isPatent ? "patent" : "paper" as const,
        doi: doiMeta?.doi || extractedDoi || undefined,
        fileUrl: doiMeta?.url || "https://arxiv.org/",
        journal: doiMeta?.containerTitle
      };

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const promptInstructions = `당신은 전 세계 학술 논문 및 특허 문헌 분석 최고 전문가입니다.
주어진 파일(파일명: ${file.originalname})의 내용을 정밀 분석하여 학술 서지 정보(정확한 논문 Title, 전체 저자명 Writer/Authors, 출판 연도 Published Year)와 상세 요약을 반드시 아래 JSON 형식으로 추출하세요.
파일명이나 본문에 축약어(예: lok1985 -> Canadian Journal of Chemistry 1985년 논문 'Particle size control in dispersion polymerization of polystyrene')가 있다면 실제 논문 정보로 정확하게 분석해 주세요.

[필수 추출 규칙]
1. title: 문서의 공식 논문 제목 또는 특허 명칭. (상단 머리말, %PDF 문구, 페이지 번호 등은 제외하고 실제 연구 제목만 추출)
2. authors: 저자 전체 성명 목록 (쉼표로 구분, 예: "Kar P. Lok, Christopher K. Ober")
3. year: 출판 또는 발행 연도 4자리 숫자 (예: "1985")
4. summary: **[제목: {title} | 저자: {authors} | 발행연도: {year}년]** 서지 표기를 요약 첫 줄에 포함하고, 연구의 목적, 핵심 분석 내용, 도출된 결론을 2~4문장으로 명확하게 한국어로 작성
5. keywords: 문서의 핵심 기술 키워드 3~5개 배열
6. type: "${isPatent ? 'patent' : 'paper'}"
7. doi: 본문에 기재된 DOI (예: 10.xxxx/...)가 있다면 추출 (없으면 null)
8. journal: 학술지명 또는 출판기관 (예: "Canadian Journal of Chemistry" 등)

반드시 마크다운 백틱 없이 순수 JSON 객체만 응답하세요:
{
  "title": "정확한 논문/특허 제목",
  "authors": "저자1, 저자2",
  "year": "1985",
  "summary": "[제목: ... | 저자: ... | 발행연도: 1985년] 핵심 요약 내용",
  "keywords": ["키워드1", "키워드2"],
  "type": "paper",
  "doi": null,
  "journal": "학술지명"
}`;

          const contentText = promptInstructions + "\n\n[파일 정보]\n- 파일명: " + file.originalname + "\n- 추출 텍스트:\n" + (extractedText.slice(0, 8000) || cleanName);

          let response: any = null;
          try {
            response = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite",
              contents: contentText,
            });
          } catch {
            response = await ai.models.generateContent({
              model: "gemini-3.5-flash-lite",
              contents: contentText,
            });
          }

          const text = response?.text ? response.text.trim() : "";
          if (text) {
            const cleanJson = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
            const parsed = JSON.parse(cleanJson);
            
            // If AI discovered a valid DOI and we don't have metadata yet, lookup
            if (!doiMeta && parsed.doi && typeof parsed.doi === 'string' && parsed.doi.includes('10.')) {
              const aiDoiMeta = await fetchMetadataByDoi(parsed.doi);
              if (aiDoiMeta) {
                doiMeta = aiDoiMeta;
              }
            }

            // If Crossref lookup needed with refined title
            if (!doiMeta && !isPatent && parsed.title && parsed.title.length > 5 && !parsed.title.startsWith("%")) {
              const searchedDoi = await searchCrossrefByTitle(parsed.title);
              if (searchedDoi) {
                doiMeta = searchedDoi;
              }
            }

            const { cleanTitle, cleanAuthors, cleanYear } = cleanMetadata(
              doiMeta?.title || parsed.title || analysisResult.title,
              doiMeta?.authors || parsed.authors || analysisResult.authors,
              doiMeta?.year || parsed.year || analysisResult.year,
              file.originalname
            );

            let finalSummary = parsed.summary || analysisResult.summary;
            if (!finalSummary.startsWith("[제목:")) {
              finalSummary = `[제목: ${cleanTitle} | 저자: ${cleanAuthors} | 발행연도: ${cleanYear}년] ${finalSummary}`;
            }

            analysisResult = {
              title: cleanTitle,
              authors: cleanAuthors,
              year: cleanYear,
              summary: finalSummary,
              keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 ? parsed.keywords : analysisResult.keywords,
              type: parsed.type === 'patent' ? 'patent' : 'paper',
              doi: doiMeta?.doi || parsed.doi || analysisResult.doi,
              fileUrl: doiMeta?.url || analysisResult.fileUrl,
              journal: doiMeta?.containerTitle || parsed.journal || analysisResult.journal
            };
          }
        } catch (aiErr) {
          console.error("AI analysis notice:", aiErr);
        }
      }

      const { cleanTitle, cleanAuthors, cleanYear } = cleanMetadata(
        analysisResult.title,
        analysisResult.authors,
        analysisResult.year,
        file.originalname
      );

      results.push({
        ...analysisResult,
        title: cleanTitle,
        authors: cleanAuthors,
        year: cleanYear,
        originalFilename: file.originalname,
        size: file.size
      });
    }

    return res.json({ documents: results });
  } catch (error: any) {
    console.error("File upload and analysis error:", error);
    return res.status(500).json({ error: error.message || "파일 업로드 및 분석 중 오류가 발생했습니다." });
  }
});

// Route alias
app.post("/upload-and-analyze", upload.array("files"), (req, res, next) => {
  req.url = "/api/upload-and-analyze";
  (app as any)(req, res, next);
});

// API endpoint to analyze paper/patent text using Gemini AI & DOI Lookup
app.post("/api/analyze-document", async (req, res) => {
  const { rawText, fileType } = req.body;
  if (!rawText) {
    return res.status(400).json({ error: "rawText is required" });
  }

  const lines = rawText
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l && !l.match(/^\d+$/) && !l.toLowerCase().includes("downloaded from"));
  
  const firstLineTitle = lines[0]?.slice(0, 150) || "연구 분석 문서";
  const secondLineAuthors = lines[1]?.slice(0, 100) || "로컬 연구자";
  const firstParagraphSummary = lines.slice(2, 6).join(' ').slice(0, 350) || rawText.slice(0, 200) + "...";

  const yearMatch = rawText.match(/\b(19\d\d|20\d\d)\b/);
  const textYear = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

  // Check for DOI in raw text
  const extractedDoi = extractDoiFromText(rawText);
  let doiMeta: DoiMetadata | null = null;
  if (extractedDoi) {
    doiMeta = await fetchMetadataByDoi(extractedDoi);
  }
  if (!doiMeta && fileType !== 'patent' && firstLineTitle.length > 5) {
    doiMeta = await searchCrossrefByTitle(firstLineTitle);
  }

  const fallbackResult = {
    title: doiMeta?.title || firstLineTitle,
    authors: doiMeta?.authors || secondLineAuthors,
    year: doiMeta?.year || textYear,
    summary: firstParagraphSummary,
    keywords: ["연구자료", "분석문서", fileType === 'patent' ? "특허" : "학술논문"],
    type: fileType || "paper",
    doi: doiMeta?.doi || extractedDoi || undefined,
    fileUrl: doiMeta?.url || "https://arxiv.org/",
    journal: doiMeta?.containerTitle
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json(fallbackResult);
    }

    const ai = new GoogleGenAI({ apiKey });
    let response: any = null;
    const prompt = `당신은 전 세계 학술 논문 및 특허 문헌 분석 전문가입니다.
다음 텍스트(논문 초록, 본문, 특허 설명)를 정밀 분석하여 JSON 형식으로 정확히 추출해주세요.
- 규칙:
  1. title: 문서의 정확한 논문 제목 또는 특허 명칭 (DOI 조회 정보 참고: "${doiMeta?.title || ''}")
  2. authors: 저자 전체명 (쉼표로 구분, 예: "Kar P. Lok, Christopher K. Ober")
  3. year: 출판/발행 연도 4자리 (예: "1985")
  4. summary: 초록 또는 핵심 내용을 한국어로 2~3문장으로 간결하고 자연스럽게 요약
  5. keywords: 키워드 3~5개 배열
  6. type: "${fileType || 'paper'}"
  7. doi: 발견된 DOI (없으면 null)
  8. journal: 학술지명 또는 출판기관

반드시 마크다운 백틱 없이 순수 JSON 포맷으로만 응답하세요:
{
  "title": "문서 제목",
  "authors": "저자 이름들 (쉼표로 구분)",
  "year": "발행 연도 (예: 1985)",
  "summary": "핵심 내용 요약 (한국어)",
  "keywords": ["키워드1", "키워드2"],
  "type": "${fileType || 'paper'}",
  "doi": null,
  "journal": "학술지명"
}

대상 텍스트:
${rawText.slice(0, 5000)}`;

    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
      });
    } catch {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });
    }

    const text = response?.text ? response.text.trim() : "";
    if (text) {
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(cleanJson);

      if (!doiMeta && parsed.title && parsed.title.length > 6) {
        const searchedDoi = await searchCrossrefByTitle(parsed.title);
        if (searchedDoi) {
          doiMeta = searchedDoi;
        }
      }

      const { cleanTitle, cleanAuthors, cleanYear } = cleanMetadata(
        doiMeta?.title || parsed.title || fallbackResult.title,
        doiMeta?.authors || parsed.authors || fallbackResult.authors,
        doiMeta?.year || parsed.year || fallbackResult.year
      );

      let finalSummary = parsed.summary || fallbackResult.summary;
      if (!finalSummary.includes(cleanAuthors) && cleanAuthors !== "저자 미상") {
        finalSummary = `[저자: ${cleanAuthors} (${cleanYear})] ${finalSummary}`;
      }

      return res.json({
        ...fallbackResult,
        ...parsed,
        title: cleanTitle,
        authors: cleanAuthors,
        year: cleanYear,
        summary: finalSummary,
        doi: doiMeta?.doi || parsed.doi || fallbackResult.doi,
        fileUrl: doiMeta?.url || parsed.fileUrl || fallbackResult.fileUrl,
        journal: doiMeta?.containerTitle || parsed.journal || fallbackResult.journal
      });
    }
    return res.json(fallbackResult);
  } catch (error: any) {
    console.error("Gemini analysis error (using fallback):", error);
    return res.json(fallbackResult);
  }
});

// API endpoint to re-analyze existing documents (e.g. ones with placeholder names like lok1985 or %PDF)
app.post("/api/reanalyze-document", async (req, res) => {
  try {
    const { id, title, authors, year, summary, type, folderPath } = req.body;
    
    // Detect if title is corrupted (e.g. %PDF-1.6, %??, etc.)
    let candidateQuery = (title || "").replace(/\.(pdf|txt|md|docx?)$/i, "").trim();
    
    // Look for original filename inside summary (e.g. "lok1985.pdf 파일에서 추출된...")
    const filenameInSummary = (summary || "").match(/([a-zA-Z0-9_.-]+)\.(pdf|txt|md|docx?)/i);
    const originalFilename = filenameInSummary ? filenameInSummary[0] : "";
    const cleanFilename = filenameInSummary ? filenameInSummary[1].replace(/[-_]/g, " ") : "";

    if (
      !candidateQuery ||
      candidateQuery.startsWith("%PDF") ||
      candidateQuery.startsWith("%") ||
      candidateQuery.includes("\uFFFD") ||
      candidateQuery.includes("") ||
      /^[^a-zA-Z0-9가-힣]+$/.test(candidateQuery)
    ) {
      candidateQuery = cleanFilename || "학술 논문";
    }

    let doiMeta: DoiMetadata | null = null;

    // Check if title or summary has DOI pattern or search Crossref
    const extractedDoi = extractDoiFromText((title || "") + " " + (summary || ""));
    if (extractedDoi) {
      doiMeta = await fetchMetadataByDoi(extractedDoi);
    }
    if (!doiMeta && candidateQuery && candidateQuery.length >= 3 && !candidateQuery.startsWith("%")) {
      doiMeta = await searchCrossrefByTitle(candidateQuery);
    }
    if (!doiMeta && cleanFilename && cleanFilename.length >= 3) {
      doiMeta = await searchCrossrefByTitle(cleanFilename);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `당신은 전 세계 학술 논문 및 특허 문헌 분석 최고 전문가입니다.
기존 아카이브에 등록된 문서의 정보가 불완전하거나 파일명(예: "${candidateQuery}", "${originalFilename}") 또는 깨진 텍스트로 저장된 상태입니다.
해당 문서의 실제 정식 서지 정보(공식 Title, 저자 전체 성명 Writer/Authors, 출판 연도 Published Year)와 한국어 상세 요약을 반드시 아래 JSON 형식으로 추출하여 반환하세요.
(예: lok1985 -> Canadian Journal of Chemistry 1985년 논문 'Particle size control in dispersion polymerization of polystyrene', 저자: Kar P. Lok, Christopher K. Ober)

[입력 정보]
- 식별된 제목/검색어: ${candidateQuery}
- 원본 파일명: ${originalFilename || "없음"}
- 기존 저자: ${authors || "미상"}
- 기존 연도: ${year || "미상"}
- 기존 요약: ${summary || ""}
- 유형: ${type || "paper"}
${doiMeta ? `- Crossref 공식 학술 DB 검색 결과:\n  * 제목: ${doiMeta.title}\n  * 저자: ${doiMeta.authors}\n  * 연도: ${doiMeta.year}\n  * 저널: ${doiMeta.containerTitle || ""}\n  * DOI: ${doiMeta.doi || ""}` : ""}

[필수 추출 규칙]
1. title: 공식 학술 논문 제목 또는 특허 명칭 (절대 '%PDF'나 파일명 확장자 등을 포함하지 말 것)
2. authors: 저자 전체 성명 목록 (쉼표 구분, 예: "Kar P. Lok, Christopher K. Ober")
3. year: 출판 또는 발행 연도 4자리 (예: "1985")
4. summary: **[제목: {title} | 저자: {authors} | 발행연도: {year}년]** 서지 정보를 최상단에 반드시 포함하고, 연구의 목적, 주요 방법론, 핵심 결론을 2~4문장의 명확한 한국어로 작성
5. keywords: 기술 키워드 3~5개 배열
6. type: "${type || 'paper'}"
7. doi: DOI가 있다면 기재 (예: "10.1139/v85-033" 등, 없으면 null)
8. journal: 학술지명 또는 출판기관 (예: "Canadian Journal of Chemistry" 등)

반드시 마크다운 백틱 없이 순수 JSON 객체만 응답하세요:
{
  "title": "공식 논문 제목",
  "authors": "저자1, 저자2",
  "year": "1985",
  "summary": "[제목: ... | 저자: ... | 발행연도: 1985년] 요약 내용",
  "keywords": ["키워드1", "키워드2"],
  "type": "paper",
  "doi": null,
  "journal": "학술지명"
}`;

      let response: any = null;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
        });
      } catch {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: prompt,
        });
      }

      const text = response?.text ? response.text.trim() : "";
      if (text) {
        const cleanJson = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
        const parsed = JSON.parse(cleanJson);

        const { cleanTitle, cleanAuthors, cleanYear } = cleanMetadata(
          parsed.title || doiMeta?.title,
          parsed.authors || doiMeta?.authors,
          parsed.year || doiMeta?.year,
          originalFilename || candidateQuery
        );

        let finalSummary = parsed.summary || summary || "내용 요약";
        if (!finalSummary.startsWith("[제목:")) {
          finalSummary = `[제목: ${cleanTitle} | 저자: ${cleanAuthors} | 발행연도: ${cleanYear}년] ${finalSummary}`;
        }

        return res.json({
          id: id,
          title: cleanTitle,
          authors: cleanAuthors,
          year: cleanYear,
          summary: finalSummary,
          keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 ? parsed.keywords : ["학술연구", "문헌분석"],
          type: parsed.type === "patent" ? "patent" : "paper",
          doi: doiMeta?.doi || parsed.doi || undefined,
          fileUrl: doiMeta?.url || (doiMeta?.doi ? `https://doi.org/${doiMeta.doi}` : undefined) || (parsed.doi ? `https://doi.org/${parsed.doi}` : undefined),
          journal: doiMeta?.containerTitle || parsed.journal || undefined,
          folderPath: folderPath
        });
      }
    }

    // Fallback if no Gemini key or parse error
    const { cleanTitle, cleanAuthors, cleanYear } = cleanMetadata(
      doiMeta?.title,
      doiMeta?.authors,
      doiMeta?.year,
      originalFilename || candidateQuery
    );

    return res.json({
      id,
      title: cleanTitle,
      authors: cleanAuthors,
      year: cleanYear,
      summary: `[제목: ${cleanTitle} | 저자: ${cleanAuthors} | 발행연도: ${cleanYear}년] ` + (summary || "문서 분석 완료"),
      keywords: ["연구자료"],
      type: type || "paper",
      doi: doiMeta?.doi,
      fileUrl: doiMeta?.url,
      journal: doiMeta?.containerTitle,
      folderPath
    });
  } catch (err: any) {
    console.error("Re-analyze error:", err);
    return res.status(500).json({ error: err.message || "문서 재분석 중 오류 발생" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
