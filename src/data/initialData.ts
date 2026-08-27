import { ResearchDocument, FolderConfig } from '../types';

export const DEFAULT_FOLDER: FolderConfig = {
  path: "/Users/researcher/Documents/Research_Patents_2026",
  name: "Research_Patents_2026",
  description: "기본 지정된 연구 논문 및 특허 통합 아카이브 폴더"
};

export const INITIAL_DOCUMENTS: ResearchDocument[] = [
  {
    id: "doc-1",
    title: "Attention Is All You Need",
    authors: "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin",
    year: "2017",
    summary: "기존의 순환 신경망(RNN)과 합성곱 신경망(CNN) 구조를 완전히 배제하고 오직 어텐션 메커니즘(Attention Mechanism)만으로 구성된 Transformer 아키텍처를 최초로 제안한 논문. 자연어 처리 및 현대 생성형 AI의 기반이 됨.",
    keywords: ["Transformer", "Attention", "NLP", "Deep Learning"],
    type: "paper",
    fileUrl: "https://arxiv.org/abs/1706.03762",
    folderPath: "/Users/researcher/Documents/Research_Patents_2026",
    createdAt: "2026-01-15",
    citationCount: 105400
  },
  {
    id: "doc-2",
    title: "Method and apparatus for neural network-based machine translation",
    authors: "Google LLC (Inventor: Yonghui Wu, Mike Schuster, Zhifeng Chen)",
    year: "2018",
    summary: "심층 신경망을 활용한 다국어 기계 번역 시스템 및 인코더-디코더 아키텍처 구현에 관한 핵심 특허. 문맥 기반 어텐션 가중치 계산 및 실시간 추론 최적화 방법론 포함.",
    keywords: ["Neural Machine Translation", "Encoder-Decoder", "Patent", "AI System"],
    type: "patent",
    fileUrl: "https://patents.google.com/patent/US10127471B2/en",
    folderPath: "/Users/researcher/Documents/Research_Patents_2026",
    createdAt: "2026-01-18",
    citationCount: 420
  },
  {
    id: "doc-3",
    title: "LoRA: Low-Rank Adaptation of Large Language Models",
    authors: "Edward J. Hu, Yelong Shen, Phillip Wallis, Zeyuan Allen-Zhu, Yuanzhi Li, Shean Wang, Lu Wang, Weizhu Chen",
    year: "2021",
    summary: "거대 언어 모델의 전체 파라미터 미세조정 대신 저랭크(Low-Rank) 행렬 분해 방식을 도입하여, 학습 가능한 파라미터 수를 극적으로 줄이면서도 성능을 유지하는 고효율 파인튜닝 기법.",
    keywords: ["LoRA", "Fine-Tuning", "LLM", "Parameter Efficiency"],
    type: "paper",
    fileUrl: "https://arxiv.org/abs/2106.09685",
    folderPath: "/Users/researcher/Documents/Research_Patents_2026",
    createdAt: "2026-02-01",
    citationCount: 7800
  },
  {
    id: "doc-4",
    title: "High-Resolution Image Synthesis with Latent Diffusion Models",
    authors: "Robin Rombach, Andreas Blattmann, Dominik Lorenz, Patrick Esser, Björn Ommer",
    year: "2022",
    summary: "픽셀 공간이 아닌 압축된 잠재 공간(Latent Space)에서 확산 모델을 작동시켜 계산 비용을 대폭 절감하면서도 고품질 이미지 생성 능력을 입증한 Stable Diffusion의 기반 논문.",
    keywords: ["Stable Diffusion", "Latent Space", "Generative AI", "Image Synthesis"],
    type: "paper",
    fileUrl: "https://arxiv.org/abs/2112.10752",
    folderPath: "/Users/researcher/Documents/Research_Patents_2026",
    createdAt: "2026-02-10",
    citationCount: 9400
  },
  {
    id: "doc-5",
    title: "System and Method for Efficient Prompt Processing in Generative Models",
    authors: "OpenAI, L.L.C. (Inventor: Ilya Sutskever, Alec Radford)",
    year: "2023",
    summary: "생성형 AI 모델에서 사용자 프롬프트 토큰의 캐싱 및 컨텍스트 윈도우 처리 속도를 가속화하기 위한 하이브리드 메모리 관리 특허 기술.",
    keywords: ["Prompt Processing", "Caching", "Patent", "Generative AI"],
    type: "patent",
    fileUrl: "https://patents.google.com/",
    folderPath: "/Users/researcher/Documents/Research_Patents_2026",
    createdAt: "2026-02-15",
    citationCount: 85
  },
  {
    id: "doc-6",
    title: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
    authors: "Tri Dao, Daniel Y. Fu, Stefano Ermon, Atli Rudal, Christopher Ré",
    year: "2022",
    summary: "GPU 하드웨어의 메모리 계층 구조(SRAM과 HBM)를 고려한 I/O 인식 타일링(Tiling) 기법을 통해 트랜스포머의 어텐션 연산 속도를 2~4배 가속화하고 메모리 사용량을 O(N^2)에서 O(N)으로 개선한 논문.",
    keywords: ["FlashAttention", "GPU Optimization", "Memory Efficiency", "Transformer"],
    type: "paper",
    fileUrl: "https://arxiv.org/abs/2205.14135",
    folderPath: "/Users/researcher/Documents/Research_Patents_2026",
    createdAt: "2026-03-02",
    citationCount: 5600
  }
];
