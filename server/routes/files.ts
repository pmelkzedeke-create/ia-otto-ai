import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { WORKSPACE_DIR } from '../memoryStore.js';
import { isInside } from '../paths.js';

export const filesRouter = Router();

const PROJECTS_FILE = path.join(WORKSPACE_DIR, '.otto_projects.json');

export interface ServerProjectItem {
  id: string;
  name: string;
  description: string;
  color?: string;
  folderPath?: string;
  tags?: string[];
  createdAt: string;
}

export function loadProjects(): ServerProjectItem[] {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const data = fs.readFileSync(PROJECTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading projects file:', err);
  }

  const initialProjects: ServerProjectItem[] = [
    {
      id: 'proj_default',
      name: 'Geral',
      description: 'Espaço padrão para arquivos, scripts e pesquisas soltas do OTTO',
      color: '#38bdf8',
      folderPath: '',
      tags: ['workspace', 'geral'],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'proj_core',
      name: 'OTTO Core',
      description: 'Projeto central de automação e integração de sistema operacional',
      color: '#a78bfa',
      folderPath: 'Projetos',
      tags: ['ia', 'core', 'arquitetura'],
      createdAt: new Date().toISOString(),
    },
  ];

  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(initialProjects, null, 2), 'utf-8');
  } catch {}

  return initialProjects;
}

export function saveProjects(projects: ServerProjectItem[]) {
  try {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving projects file:', err);
  }
}

// 1. Listar arquivos do workspace
filesRouter.get('/api/fs/list', (req, res) => {
  try {
    const relativePath = (req.query.path as string) || '';
    const targetDir = path.resolve(WORKSPACE_DIR, relativePath);

    if (!isInside(WORKSPACE_DIR, targetDir)) {
      return res.status(403).json({ error: 'Acesso negado: fora do diretório do workspace' });
    }

    if (!fs.existsSync(targetDir)) {
      return res.status(404).json({ error: 'Diretório não encontrado' });
    }

    const items = fs.readdirSync(targetDir, { withFileTypes: true });
    const formatted = items
      .filter((item) => !item.name.startsWith('.'))
      .map((item) => {
        const itemPath = path.join(targetDir, item.name);
        const stats = fs.statSync(itemPath);
        return {
          name: item.name,
          path: path.relative(WORKSPACE_DIR, itemPath),
          isDirectory: item.isDirectory(),
          size: stats.size,
          updatedAt: stats.mtime.toISOString(),
        };
      });

    res.json({
      currentPath: path.relative(WORKSPACE_DIR, targetDir),
      items: formatted,
    });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao listar arquivos', details: String(err) });
  }
});

// 2. Criar pasta
filesRouter.post('/api/fs/create-folder', (req, res) => {
  try {
    const { name, targetPath = '' } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Nome da pasta obrigatório' });
    }

    const sanitized = name.replace(/[<>:"/\\|?*]/g, '').trim();
    const fullPath = path.resolve(WORKSPACE_DIR, targetPath, sanitized);

    if (!isInside(WORKSPACE_DIR, fullPath)) {
      return res.status(403).json({ error: 'Acesso proibido fora do workspace' });
    }

    if (fs.existsSync(fullPath)) {
      return res.json({ success: true, message: `Pasta '${sanitized}' já existe`, path: path.relative(WORKSPACE_DIR, fullPath) });
    }

    fs.mkdirSync(fullPath, { recursive: true });
    res.json({
      success: true,
      message: `Pasta '${sanitized}' criada com sucesso`,
      path: path.relative(WORKSPACE_DIR, fullPath),
    });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao criar pasta', details: String(err) });
  }
});

// 3. Escrever arquivo
filesRouter.post('/api/fs/write-file', (req, res) => {
  try {
    const { filename, content = '', targetPath = '' } = req.body;
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Nome do arquivo obrigatório' });
    }

    const normalizedRelative = filename.replace(/\\/g, '/').replace(/^\/+/, '');
    const fullPath = path.resolve(WORKSPACE_DIR, targetPath, normalizedRelative);

    if (!isInside(WORKSPACE_DIR, fullPath)) {
      return res.status(403).json({ error: 'Acesso proibido fora do workspace' });
    }

    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
    res.json({
      success: true,
      message: `Arquivo '${normalizedRelative}' salvo com sucesso`,
      path: path.relative(WORKSPACE_DIR, fullPath),
      size: Buffer.byteLength(content, 'utf-8'),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao escrever arquivo', details: String(err?.message || err) });
  }
});

// 4. Ler arquivo
filesRouter.post('/api/fs/read-file', (req, res) => {
  try {
    const { filename, targetPath = '' } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Nome do arquivo obrigatório' });
    }

    const normalizedRelative = filename.replace(/\\/g, '/').replace(/^\/+/, '');
    const fullPath = path.resolve(WORKSPACE_DIR, targetPath, normalizedRelative);
    if (!isInside(WORKSPACE_DIR, fullPath)) {
      return res.status(403).json({ error: 'Acesso proibido fora do workspace' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({
      success: true,
      filename: normalizedRelative,
      content,
      size: fs.statSync(fullPath).size,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao ler arquivo', details: String(err?.message || err) });
  }
});

// 5. Excluir arquivo ou pasta
filesRouter.post('/api/fs/delete-file', (req, res) => {
  try {
    const { filename, targetPath = '' } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Nome do arquivo ou pasta obrigatório' });
    }

    const fullPath = path.resolve(WORKSPACE_DIR, targetPath, filename);
    if (!isInside(WORKSPACE_DIR, fullPath)) {
      return res.status(403).json({ error: 'Acesso proibido fora do workspace' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Item não encontrado para exclusão' });
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }

    res.json({
      success: true,
      message: `'${filename}' foi excluído permanentemente do computador`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao excluir item', details: String(err) });
  }
});

// 6. Renomear arquivo
filesRouter.post('/api/fs/rename', (req, res) => {
  try {
    const { oldName, newName, targetPath = '' } = req.body;
    if (!oldName || !newName) {
      return res.status(400).json({ error: 'Nome atual e novo nome são obrigatórios' });
    }

    const oldPath = path.resolve(WORKSPACE_DIR, targetPath, oldName);
    const newPath = path.resolve(WORKSPACE_DIR, targetPath, newName);

    if (!isInside(WORKSPACE_DIR, oldPath) || !isInside(WORKSPACE_DIR, newPath)) {
      return res.status(403).json({ error: 'Acesso proibido fora do workspace' });
    }

    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ error: 'Arquivo de origem não encontrado' });
    }

    fs.renameSync(oldPath, newPath);
    res.json({
      success: true,
      message: `'${oldName}' renomeado para '${newName}'`,
      path: path.relative(WORKSPACE_DIR, newPath),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao renomear arquivo', details: err?.message || String(err) });
  }
});

// 7. Diff de arquivo
filesRouter.post('/api/fs/diff', (req, res) => {
  try {
    const { filename, targetPath = '', newContent } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Nome do arquivo obrigatório' });
    }

    const fullPath = path.resolve(WORKSPACE_DIR, targetPath, filename);
    if (!isInside(WORKSPACE_DIR, fullPath)) {
      return res.status(403).json({ error: 'Acesso proibido fora do workspace' });
    }

    let originalContent = '';
    const fileExists = fs.existsSync(fullPath);
    if (fileExists) {
      originalContent = fs.readFileSync(fullPath, 'utf-8');
    }

    res.json({
      success: true,
      filename,
      exists: fileExists,
      originalContent,
      newContent: newContent ?? originalContent,
      hasChanges: fileExists && typeof newContent === 'string' ? originalContent !== newContent : false,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Falha ao calcular diff', details: err?.message || String(err) });
  }
});

// 8. Projetos
filesRouter.get('/api/projects', (req, res) => {
  const projects = loadProjects();
  res.json({ projects });
});

filesRouter.post('/api/projects', (req, res) => {
  const { name, description, color, folderPath, tags } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do projeto é obrigatório.' });

  const projects = loadProjects();
  const newProj: ServerProjectItem = {
    id: `proj_${Date.now()}`,
    name,
    description: description || 'Novo projeto no workspace do OTTO',
    color: color || '#38bdf8',
    folderPath: folderPath || name.toLowerCase().replace(/\s+/g, '_'),
    tags: tags || ['projeto'],
    createdAt: new Date().toISOString(),
  };

  projects.push(newProj);
  saveProjects(projects);

  if (newProj.folderPath) {
    const projDir = path.resolve(WORKSPACE_DIR, newProj.folderPath);
    if (!fs.existsSync(projDir)) {
      fs.mkdirSync(projDir, { recursive: true });
    }
  }

  res.json({ success: true, project: newProj, projects });
});

filesRouter.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  if (id === 'proj_default') {
    return res.status(400).json({ error: 'O projeto Geral não pode ser excluído.' });
  }
  let projects = loadProjects();
  projects = projects.filter((p) => p.id !== id);
  saveProjects(projects);
  res.json({ success: true, projects });
});

// 9. Scratchpad (Memória Temporária por Tarefa)
const temporaryScratchpad = new Map<string, string>();

filesRouter.get('/api/scratchpad', (req, res) => {
  res.json({ scratchpad: Object.fromEntries(temporaryScratchpad) });
});

filesRouter.post('/api/scratchpad', (req, res) => {
  const { entries } = req.body;
  if (entries && typeof entries === 'object') {
    for (const [k, v] of Object.entries(entries)) {
      if (typeof v === 'string') {
        temporaryScratchpad.set(k, v);
      }
    }
  }
  res.json({ success: true, scratchpad: Object.fromEntries(temporaryScratchpad) });
});

filesRouter.delete('/api/scratchpad', (req, res) => {
  temporaryScratchpad.clear();
  res.json({ success: true, scratchpad: {} });
});
