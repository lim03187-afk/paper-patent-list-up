import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParseLib = require("pdf-parse");

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
  if (isPdf) {
    try {
      if (pdfParseLib && pdfParseLib.PDFParse) {
        const parser = new pdfParseLib.PDFParse({ data: file.buffer });
        const result = await parser.getText();
        if (result && typeof result.text === 'string' && result.text.trim()) {
          return result.text;
        }
      }
      if (typeof pdfParseLib === 'function') {
        const result = await pdfParseLib(file.buffer);
        if (result && typeof result.text === 'string' && result.text.trim()) {
          return result.text;
        }
      }
    } catch (err) {
      console.log("PDF parser note:", err);
    }
  }

  // Text/Markdown or raw fallback
  try {
    return file.buffer.toString("utf-8");
  } catch {
    return "";
  }
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
      const cleanName = file.originalname.replace(/\.[^/.]+$/, "");
      const isPatent = cleanName.toLowerCase().includes("patent") || cleanName.toLowerCase().includes("특허") || cleanName.toLowerCase().includes("출원");
      
      const extractedText = await extractTextFromFile(file);

      // Smart rule extraction baseline:
      // Line 1: Title, Line 2: Author, Paragraph 1: Summary
      const lines = extractedText.split('\n').map(l => l.trim()).filter(Boolean);
      const firstLineTitle = lines[0]?.slice(0, 150) || cleanName;
      const secondLineAuthors = lines[1]?.slice(0, 100) || "연구자";
      const firstParagraphSummary = lines.slice(2, 6).join(' ').slice(0, 350) || `${file.originalname} 파일이 성공적으로 등록되었습니다.`;

      // 1. Check for DOI in the extracted document text
      const extractedDoi = extractDoiFromText(extractedText);
      let doiMeta: DoiMetadata | null = null;
      
      if (extractedDoi) {
        doiMeta = await fetchMetadataByDoi(extractedDoi);
      }
      
      // If no direct DOI or metadata found yet, attempt title search via Crossref for scholarly papers
      if (!doiMeta && !isPatent && firstLineTitle && firstLineTitle.length > 5) {
        doiMeta = await searchCrossrefByTitle(firstLineTitle);
      }

      let analysisResult = {
        title: doiMeta?.title || firstLineTitle,
        authors: doiMeta?.authors || secondLineAuthors,
        year: doiMeta?.year || new Date().getFullYear().toString(),
        summary: firstParagraphSummary,
        keywords: [isPatent ? "특허" : "학술논문", "연구자료", "문헌분석"],
        type: isPatent ? "patent" : "paper" as const,
        doi: doiMeta?.doi || extractedDoi || undefined,
        fileUrl: doiMeta?.url || "https://arxiv.org/",
        journal: doiMeta?.containerTitle
      };

      if (apiKey && extractedText.trim()) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `다음 문서 텍스트(논문 또는 특허)를 분석하여 아래 규칙에 맞춰 JSON 형식으로 추출해주세요.
- 규칙: 
  1. 보통 문서의 첫 줄이나 상단 표제부가 제목(title)입니다. (DOI 조회 정보가 있다면 이를 우선 참고: "${doiMeta?.title || ''}")
  2. 두 번째 줄이나 상단 저자 표기 부근이 저자(authors)입니다. (DOI 조회 저자: "${doiMeta?.authors || ''}")
  3. 문서 도입부/초록의 첫 문단이 핵심 요약(summary)입니다. 한국어로 자연스럽게 2~4문장으로 요약해주세요.
  4. 문서 성격에 따라 논문(paper)인지 특허(patent)인지 정확히 분류(type: "paper" 또는 "patent")해주세요.
  5. 문서 내에 표기된 DOI가 있다면 추출해주세요. (예: 10.xxxx/yyyy)

반드시 아래 JSON 포맷으로만 응답하세요 (마크다운 백틱 없이 순수 JSON 객체만):
{
  "title": "추출된 제목",
  "authors": "추출된 저자 (쉼표로 구분)",
  "year": "발행 연도 (예: 2026)",
  "summary": "첫 번째 문단 기반의 핵심 내용 요약 (한국어)",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "type": "paper 또는 patent",
  "doi": "발견된 DOI (없으면 null)"
}

문서 내용 발췌:
${extractedText.slice(0, 4000)}`;

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("AI analysis timeout")), 12000)
          );

          const response = await Promise.race([
            ai.models.generateContent({
              model: "gemini-3.7-flash",
              contents: prompt,
            }),
            timeoutPromise
          ]) as any;

          const text = response.text ? response.text.trim() : "";
          if (text) {
            const cleanJson = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
            const parsed = JSON.parse(cleanJson);
            
            // If AI found a new DOI and we didn't have metadata yet, try looking it up
            if (!doiMeta && parsed.doi && typeof parsed.doi === 'string') {
              const aiDoiMeta = await fetchMetadataByDoi(parsed.doi);
              if (aiDoiMeta) {
                doiMeta = aiDoiMeta;
              }
            }

            analysisResult = {
              title: doiMeta?.title || parsed.title || analysisResult.title,
              authors: doiMeta?.authors || parsed.authors || analysisResult.authors,
              year: doiMeta?.year || parsed.year || analysisResult.year,
              summary: parsed.summary || analysisResult.summary,
              keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 ? parsed.keywords : analysisResult.keywords,
              type: parsed.type === 'patent' ? 'patent' : 'paper',
              doi: doiMeta?.doi || parsed.doi || analysisResult.doi,
              fileUrl: doiMeta?.url || analysisResult.fileUrl,
              journal: doiMeta?.containerTitle || analysisResult.journal
            };
          }
        } catch (aiErr) {
          console.error("AI parse notice (using extracted DOI and text):", aiErr);
        }
      }

      results.push({
        ...analysisResult,
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

// API endpoint to analyze paper/patent text using Gemini AI & DOI Lookup
app.post("/api/analyze-document", async (req, res) => {
  const { rawText, fileType } = req.body;
  if (!rawText) {
    return res.status(400).json({ error: "rawText is required" });
  }

  const lines = rawText.split('\n').map((l: string) => l.trim()).filter(Boolean);
  const firstLineTitle = lines[0]?.slice(0, 150) || "연구 분석 문서";
  const secondLineAuthors = lines[1]?.slice(0, 100) || "로컬 연구자";
  const firstParagraphSummary = lines.slice(2, 6).join(' ').slice(0, 350) || rawText.slice(0, 200) + "...";

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
    year: doiMeta?.year || new Date().getFullYear().toString(),
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
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `다음 텍스트(논문 초록, 특허 요약 또는 설명)를 분석하여 JSON 형식으로 정확히 추출해주세요.
- 규칙:
  1. 첫 줄이 제목, 둘째 줄이 저자, 첫 문단이 핵심 요약입니다. (DOI 조회 정보 참고: 제목="${doiMeta?.title || ''}", 저자="${doiMeta?.authors || ''}")
  2. 한국어로 자연스럽고 정갈하게 2~4문장으로 요약해주세요.
  3. 문서 내 DOI가 있다면 함께 추출하세요.

반드시 아래 JSON 포맷으로만 응답하세요 (마크다운 백틱 제외):
{
  "title": "문서 제목",
  "authors": "저자 이름들 (쉼표로 구분)",
  "year": "발행 연도 (예: 2026)",
  "summary": "핵심 내용 요약 (3~4문장 내외, 한국어)",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "type": "${fileType || 'paper'}",
  "doi": "발견된 DOI (없으면 null)",
  "fileUrl": "${doiMeta?.url || 'https://arxiv.org/'}"
}

대상 텍스트:
${rawText}`,
    });

    const text = response.text ? response.text.trim() : "";
    if (text) {
      const cleanJson = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(cleanJson);
      return res.json({
        ...fallbackResult,
        ...parsed,
        title: doiMeta?.title || parsed.title || fallbackResult.title,
        authors: doiMeta?.authors || parsed.authors || fallbackResult.authors,
        year: doiMeta?.year || parsed.year || fallbackResult.year,
        doi: doiMeta?.doi || parsed.doi || fallbackResult.doi,
        fileUrl: doiMeta?.url || parsed.fileUrl || fallbackResult.fileUrl
      });
    }
    return res.json(fallbackResult);
  } catch (error: any) {
    console.error("Gemini analysis quota/error (using fallback):", error);
    return res.json(fallbackResult);
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
