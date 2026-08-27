import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
const upload = multer({ storage: multer.memoryStorage() });

// API endpoint to analyze uploaded computer files (PDF, TXT, MD, etc.) using Gemini AI
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
      
      let extractedText = "";
      try {
        if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
          const pdfData = await pdfParse(file.buffer);
          extractedText = pdfData.text || "";
        } else if (file.mimetype.startsWith("text/") || file.originalname.toLowerCase().endsWith(".txt") || file.originalname.toLowerCase().endsWith(".md")) {
          extractedText = file.buffer.toString("utf-8");
        }
      } catch (parseErr) {
        console.log("Local text/pdf extract note:", parseErr);
      }

      let analysisResult = {
        title: cleanName,
        authors: "로컬 연구자",
        year: new Date().getFullYear().toString(),
        summary: extractedText.trim() ? extractedText.slice(0, 300) + "..." : `${file.originalname} 파일이 성공적으로 업로드 및 아카이브되었습니다.`,
        keywords: [isPatent ? "특허" : "학술논문", "로컬문서", "연구자료"],
        type: isPatent ? "patent" : "paper" as const
      };

      if (apiKey && extractedText.trim()) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `다음 첨부된 문서의 내용 일부를 분석하여 JSON 형식으로 정확히 추출해주세요.
반드시 아래 JSON 포맷으로만 응답하세요 (마크다운 백틱 없이 순수 JSON 객체만):
{
  "title": "문서의 실제 논문 또는 특허 제목",
  "authors": "저자 이름들 (쉼표로 구분, 예: 홍길동, 김철수)",
  "year": "발행 연도 (예: 2026)",
  "summary": "핵심 내용 요약 (3~4문장 내외, 한국어)",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "type": "paper 또는 patent"
}

문서 내용 발췌:
${extractedText.slice(0, 4000)}`;

          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("AI analysis timeout")), 15000)
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
            
            analysisResult = {
              title: parsed.title || analysisResult.title,
              authors: parsed.authors || analysisResult.authors,
              year: parsed.year || analysisResult.year,
              summary: parsed.summary || analysisResult.summary,
              keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 ? parsed.keywords : analysisResult.keywords,
              type: parsed.type === 'patent' ? 'patent' : 'paper'
            };
          }
        } catch (aiErr) {
          console.error("AI parse quota/error (using extracted text fallback):", aiErr);
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

// API endpoint to analyze paper/patent text using Gemini AI
app.post("/api/analyze-document", async (req, res) => {
  try {
    const { rawText, fileType } = req.body;
    if (!rawText) {
      return res.status(400).json({ error: "rawText is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback if key is missing
      return res.json({
        title: "자동 분석된 문서 제목",
        authors: "미상 저자",
        year: new Date().getFullYear().toString(),
        summary: rawText.slice(0, 150) + "...",
        keywords: ["연구", "분석", "문서"],
        type: fileType || "paper",
        fileUrl: "https://arxiv.org/"
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `다음 텍스트(논문 초록, 특허 요약 또는 설명)를 분석하여 JSON 형식으로 정확히 추출해주세요.
반드시 아래 JSON 포맷으로만 응답하세요 (마크다운 백틱 제외):
{
  "title": "문서 제목",
  "authors": "저자 이름들 (쉼표로 구분)",
  "year": "발행 연도 (예: 2024)",
  "summary": "핵심 내용 요약 (3~4문장 내외, 한국어)",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "type": "${fileType || 'paper'}",
  "fileUrl": "https://arxiv.org/"
}

대상 텍스트:
${rawText}`,
    });

    const text = response.text ? response.text.trim() : "";
    // Clean markdown code blocks if any
    const cleanJson = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleanJson);
    res.json(parsed);
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    res.status(500).json({ error: error.message || "문서 분석 중 오류가 발생했습니다." });
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
