export type DocType = 'paper' | 'patent';

export interface ResearchDocument {
  id: string;
  title: string;
  authors: string;
  year: string;
  summary: string;
  keywords: string[];
  type: DocType;
  fileUrl: string;
  folderPath: string;
  createdAt: string;
  citationCount?: number;
}

export interface FolderConfig {
  path: string;
  name: string;
  description: string;
}
