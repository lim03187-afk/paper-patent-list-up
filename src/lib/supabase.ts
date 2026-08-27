import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ResearchDocument, FolderConfig } from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = localStorage.getItem('supabase_url') || '';
  const anonKey = localStorage.getItem('supabase_anon_key') || '';
  return { url, anonKey };
}

export function saveSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem('supabase_url', url.trim());
  localStorage.setItem('supabase_anon_key', anonKey.trim());
  cachedClient = null; // reset cache
}

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;

  if (cachedClient && cachedUrl === url && cachedKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    cachedUrl = url;
    cachedKey = anonKey;
    return cachedClient;
  } catch (e) {
    console.error("Failed to initialize Supabase client", e);
    return null;
  }
}

// Supabase DB Sync Helpers
export async function fetchDocumentsFromSupabase(userId: string): Promise<ResearchDocument[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('research_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.log("Supabase research_documents table query note:", error.message);
      return null;
    }

    if (data && Array.isArray(data)) {
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        authors: row.authors,
        year: row.year,
        summary: row.summary,
        keywords: Array.isArray(row.keywords) ? row.keywords : (typeof row.keywords === 'string' ? JSON.parse(row.keywords) : []),
        type: row.type || 'paper',
        fileUrl: row.file_url || '',
        folderPath: row.folder_path || '',
        createdAt: row.created_at || new Date().toISOString(),
        citationCount: row.citation_count || 0
      }));
    }
    return [];
  } catch (e) {
    console.error("Error fetching documents from Supabase:", e);
    return null;
  }
}

export async function saveDocumentToSupabase(userId: string, doc: ResearchDocument): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('research_documents')
      .upsert({
        id: doc.id,
        user_id: userId,
        title: doc.title,
        authors: doc.authors,
        year: doc.year,
        summary: doc.summary,
        keywords: doc.keywords,
        type: doc.type,
        file_url: doc.fileUrl,
        folder_path: doc.folderPath,
        created_at: doc.createdAt,
        citation_count: doc.citationCount || 0
      }, { onConflict: 'id' });

    if (error) {
      console.log("Supabase saveDocument error (table might need creation):", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Error saving document to Supabase:", e);
    return false;
  }
}

export async function deleteDocumentFromSupabase(userId: string, docId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('research_documents')
      .delete()
      .eq('id', docId)
      .eq('user_id', userId);

    if (error) {
      console.log("Supabase deleteDocument error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Error deleting document from Supabase:", e);
    return false;
  }
}

export async function fetchFolderFromSupabase(userId: string): Promise<FolderConfig | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('research_folders')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      path: data.path,
      name: data.name,
      description: data.description
    };
  } catch (e) {
    return null;
  }
}

export async function saveFolderToSupabase(userId: string, folder: FolderConfig): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('research_folders')
      .upsert({
        user_id: userId,
        path: folder.path,
        name: folder.name,
        description: folder.description,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.log("Supabase saveFolder error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

