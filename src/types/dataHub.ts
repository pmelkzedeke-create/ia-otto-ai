/**
 * OTTO DATA HUB - Type Definitions
 * Sistema de espaço de trabalho, armazenamento e análise inteligente de arquivos
 */

export type FileCategory =
  | 'document'
  | 'data'
  | 'image'
  | 'code'
  | 'video'
  | 'audio'
  | 'other';

export type FileStatus =
  | 'uploaded'
  | 'indexed'
  | 'analyzing'
  | 'ready'
  | 'error';

export interface FileMetadata {
  pageCount?: number;
  lineCount?: number;
  wordCount?: number;
  summary?: string;
  tags?: string[];
  keywords?: string[];
  dimensions?: { width: number; height: number };
  relatedFileIds?: string[];
  duplicateOfId?: string;
  isDuplicate?: boolean;
  duplicateScore?: number;
  versionsCount?: number;
  lastEditedBy?: string;
  sha256?: string;
  mimeType?: string;
  topic?: string;
}

export interface OttoFile {
  id: string;
  name: string;
  path: string; // e.g. "/Projetos/relatorio.pdf"
  category: FileCategory;
  extension: string;
  size: number;
  parentId?: string; // Folder ID or undefined for root
  createdAt: string;
  updatedAt: string;
  status: FileStatus;
  content?: string; // Text content extracted for analysis & semantic search
  dataUrl?: string; // Preview URL or blob/base64
  metadata?: FileMetadata;
}

export interface OttoFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  description?: string;
}

export interface DiffLine {
  type: 'add' | 'remove' | 'same';
  text: string;
  lineNumBefore?: number;
  lineNumAfter?: number;
}

export interface FileVersion {
  versionId: string;
  id?: string;
  fileId: string;
  versionNumber: number;
  content: string;
  updatedAt: string;
  timestamp?: string;
  summaryOfChanges?: string;
  changeReason?: string;
  diff?: {
    addedLines: number;
    removedLines: number;
    changes: DiffLine[];
  };
}

export interface DuplicateGroup {
  original: OttoFile;
  duplicates: OttoFile[];
  matchType: 'hash' | 'content_similarity' | 'name_and_size';
  confidence: number;
}

export interface DataHubAnalysisResult {
  totalFiles: number;
  totalFolders: number;
  totalSizeBytes: number;
  categories: Record<FileCategory, number>;
  duplicateGroups: DuplicateGroup[];
  largeFiles: OttoFile[];
  recentFiles: OttoFile[];
  relatedGroups: Array<{
    primaryFile: OttoFile;
    relatedFiles: OttoFile[];
    topic: string;
  }>;
  suggestedActions: string[];
}

export interface DataHubPlanStep {
  id: string;
  action:
    | 'create_folder'
    | 'move_file'
    | 'rename_file'
    | 'identify_duplicates'
    | 'delete_file';
  description: string;
  fileId?: string;
  folderId?: string;
  targetName?: string;
  destinationPath?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface DataHubPlan {
  id: string;
  title: string;
  description: string;
  folderPath: string;
  stats: {
    documents: number;
    images: number;
    videos: number;
    spreadsheets: number;
    code: number;
    others: number;
    duplicates: number;
  };
  steps: DataHubPlanStep[];
  status: 'proposed' | 'executing' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface OttoStorage {
  uploadFiles(files: File[], parentFolderId?: string): Promise<OttoFile[]>;
  downloadFile(fileId: string): Promise<{ blob: Blob; filename: string }>;
  listFiles(folderId?: string): Promise<{ files: OttoFile[]; folders: OttoFolder[] }>;
  readFile(fileId: string): Promise<string>;
  writeFile(fileId: string, content: string, reason?: string): Promise<OttoFile>;
  moveFile(fileId: string, targetFolderId?: string): Promise<OttoFile>;
  copyFile(fileId: string, targetFolderId?: string): Promise<OttoFile>;
  renameFile(fileId: string, newName: string): Promise<OttoFile>;
  deleteFile(fileId: string): Promise<boolean>;
  createFolder(name: string, parentId?: string): Promise<OttoFolder>;
  deleteFolder(folderId: string): Promise<boolean>;
  renameFolder(folderId: string, newName: string): Promise<OttoFolder>;
  search(query: string): Promise<OttoFile[]>;
  detectDuplicates(): Promise<DuplicateGroup[]>;
  analyze(folderId?: string): Promise<DataHubAnalysisResult>;
  createPlan(folderId?: string): Promise<DataHubPlan>;
  executePlan(planId: string): Promise<{ success: boolean; completedSteps: number }>;
}
