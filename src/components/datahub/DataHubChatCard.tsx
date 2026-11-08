/**
 * OTTO DATA HUB - Chat Attachment Card
 * Renders rich file card inside chat when files are dropped or referenced.
 */

import React from 'react';
import { FileText, Sparkles, Eye, Wand2, Search, CheckCircle2 } from 'lucide-react';
import { OttoFile } from '../../types/dataHub';

interface DataHubChatCardProps {
  files: OttoFile[];
  onActionClick?: (actionPrompt: string) => void;
  onOpenFileModal?: (file: OttoFile) => void;
}

export const DataHubChatCard: React.FC<DataHubChatCardProps> = ({
  files,
  onActionClick,
  onOpenFileModal,
}) => {
  if (!files || files.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 my-2 p-3 sm:p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 backdrop-blur-xl font-sans">
      <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold">DATA HUB • ARQUIVOS RECEBIDOS ({files.length})</span>
        </div>
        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Indexado</span>
        </span>
      </div>

      {/* Files List */}
      <div className="flex flex-col gap-1.5">
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => onOpenFileModal && onOpenFileModal(file)}
            className="p-2.5 rounded-xl bg-black/40 hover:bg-white/10 border border-white/10 flex items-center justify-between gap-2.5 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <span className="text-xs font-medium text-white group-hover:text-cyan-200 truncate block">
                  {file.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {(file.size / 1024).toFixed(1)} KB • {file.category}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenFileModal && onOpenFileModal(file);
              }}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              title="Abrir detalhes"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Suggested Fast Prompts */}
      {onActionClick && (
        <div className="pt-2 border-t border-cyan-500/20 flex flex-wrap gap-1.5 text-xs font-mono">
          <button
            onClick={() => onActionClick(`Leia e faça um resumo executivo dos arquivos: ${files.map((f) => f.name).join(', ')}`)}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-200 hover:text-white transition-all cursor-pointer text-[11px]"
          >
            • Resumir
          </button>

          <button
            onClick={() => onActionClick(`Analise e aponte inconsistências ou riscos nos arquivos: ${files.map((f) => f.name).join(', ')}`)}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-200 hover:text-white transition-all cursor-pointer text-[11px]"
          >
            • Analisar problemas
          </button>

          <button
            onClick={() => onActionClick(`Quais são os principais dados e métricas em ${files.map((f) => f.name).join(', ')}?`)}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-200 hover:text-white transition-all cursor-pointer text-[11px]"
          >
            • Extrair dados
          </button>
        </div>
      )}
    </div>
  );
};
