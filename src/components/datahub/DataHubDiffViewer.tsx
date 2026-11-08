/**
 * OTTO DATA HUB - Visual Diff & Version History Viewer
 * Displays before/after changes with clear line-by-line additions and removals.
 */

import React, { useState } from 'react';
import { History, RotateCcw, Check, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { FileVersion, OttoFile } from '../../types/dataHub';

interface DataHubDiffViewerProps {
  file: OttoFile;
  versions: FileVersion[];
  onRestoreVersion?: (versionId: string) => void;
  className?: string;
}

export const DataHubDiffViewer: React.FC<DataHubDiffViewerProps> = ({
  file,
  versions,
  onRestoreVersion,
  className = '',
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    versions.length > 0 ? versions[versions.length - 1].versionId : ''
  );
  const [restored, setRestored] = useState(false);

  if (versions.length === 0) {
    return (
      <div className={`p-8 text-center flex flex-col items-center justify-center text-slate-400 font-mono text-xs ${className}`}>
        <History className="w-8 h-8 mb-2 opacity-40 text-cyan-400" />
        <p className="text-white font-medium mb-1">Nenhuma edição registrada ainda</p>
        <p className="text-slate-400 text-[11px] max-w-xs">
          Quando o OTTO ou você editar este documento, as versões e o diff visual aparecerão aqui automaticamente.
        </p>
      </div>
    );
  }

  const currentVersion = versions.find((v) => v.versionId === selectedVersionId) || versions[versions.length - 1];

  const handleRestore = () => {
    if (onRestoreVersion) {
      onRestoreVersion(currentVersion.versionId);
      setRestored(true);
      setTimeout(() => setRestored(false), 2500);
    }
  };

  return (
    <div className={`flex flex-col gap-3 font-sans ${className}`}>
      {/* Version Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white tracking-wide">
            HISTÓRICO DE VERSÕES ({versions.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {versions.map((ver) => (
            <button
              key={ver.versionId}
              onClick={() => setSelectedVersionId(ver.versionId)}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                ver.versionId === currentVersion.versionId
                  ? 'bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 font-bold shadow-sm'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10'
              }`}
            >
              v{ver.versionNumber}
            </button>
          ))}
        </div>

        {onRestoreVersion && (
          <button
            onClick={handleRestore}
            className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-200 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
            title="Restaurar conteúdo para esta versão"
          >
            {restored ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <RotateCcw className="w-3.5 h-3.5" />}
            <span>{restored ? 'Restaurado!' : 'Restaurar esta versão'}</span>
          </button>
        )}
      </div>

      {/* Version Summary & Stats */}
      <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-400">
        <span className="text-cyan-300 truncate max-w-[280px]">
          {currentVersion.summaryOfChanges || `Versão ${currentVersion.versionNumber}`}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-emerald-400 font-semibold">
            +{currentVersion.diff?.addedLines || 0}
          </span>
          <span className="text-rose-400 font-semibold">
            -{currentVersion.diff?.removedLines || 0}
          </span>
          <span className="text-slate-500 text-[10px]">
            {new Date(currentVersion.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Diff Table */}
      <div className="rounded-2xl border border-white/15 bg-black/60 backdrop-blur-xl overflow-hidden text-xs font-mono max-h-[380px] overflow-y-auto">
        <div className="grid grid-cols-2 border-b border-white/10 bg-white/[0.04] p-2 text-[11px] font-bold text-slate-300">
          <div className="flex items-center gap-1.5 px-2">
            <span className="w-2 h-2 rounded-full bg-rose-500/80" />
            <span>ANTES (Original)</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 border-l border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
            <span>DEPOIS (Modificado por OTTO)</span>
          </div>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {currentVersion.diff?.changes && currentVersion.diff.changes.length > 0 ? (
            currentVersion.diff.changes.map((line, idx) => {
              if (line.type === 'remove') {
                return (
                  <div key={idx} className="grid grid-cols-2 bg-rose-950/20 text-rose-200 py-1 px-3">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] text-rose-500 select-none w-6 shrink-0 text-right">
                        {line.lineNumBefore}
                      </span>
                      <span className="text-rose-400 select-none">-</span>
                      <span className="break-all">{line.text}</span>
                    </div>
                    <div className="border-l border-white/10 opacity-30 select-none bg-black/20" />
                  </div>
                );
              } else if (line.type === 'add') {
                return (
                  <div key={idx} className="grid grid-cols-2 bg-emerald-950/25 text-emerald-200 py-1 px-3">
                    <div className="border-r border-white/10 opacity-30 select-none bg-black/20" />
                    <div className="flex items-start gap-2 pl-3">
                      <span className="text-[10px] text-emerald-500 select-none w-6 shrink-0 text-right">
                        {line.lineNumAfter}
                      </span>
                      <span className="text-emerald-400 select-none">+</span>
                      <span className="break-all">{line.text}</span>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={idx} className="grid grid-cols-2 text-slate-300 py-1 px-3 hover:bg-white/[0.02]">
                    <div className="flex items-start gap-2 pr-2">
                      <span className="text-[10px] text-slate-600 select-none w-6 shrink-0 text-right">
                        {line.lineNumBefore}
                      </span>
                      <span className="break-all">{line.text}</span>
                    </div>
                    <div className="flex items-start gap-2 pl-3 border-l border-white/10">
                      <span className="text-[10px] text-slate-600 select-none w-6 shrink-0 text-right">
                        {line.lineNumAfter}
                      </span>
                      <span className="break-all">{line.text}</span>
                    </div>
                  </div>
                );
              }
            })
          ) : (
            <div className="p-4 text-center text-slate-500 font-mono text-xs">
              Conteúdo inalterado nesta versão.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
