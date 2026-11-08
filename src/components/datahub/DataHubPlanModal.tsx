/**
 * OTTO DATA HUB - Planning Mode Modal
 * Displays proposed organization steps, file count statistics and execution controls.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  FolderPlus,
  ArrowRight,
  Copy,
  AlertTriangle,
  X,
  Play,
  RotateCw,
} from 'lucide-react';
import { DataHubPlan } from '../../types/dataHub';

interface DataHubPlanModalProps {
  plan: DataHubPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onExecute: (planId: string) => Promise<void>;
  onCancel: (planId: string) => void;
}

export const DataHubPlanModal: React.FC<DataHubPlanModalProps> = ({
  plan,
  isOpen,
  onClose,
  onExecute,
  onCancel,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionDone, setExecutionDone] = useState(false);

  if (!isOpen || !plan) return null;

  const handleRun = async () => {
    setIsExecuting(true);
    try {
      await onExecute(plan.id);
      setExecutionDone(true);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    if (plan.status === 'proposed') {
      onCancel(plan.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in font-sans">
      <div className="relative w-full max-w-xl rounded-[28px] glass-medium border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {plan.title}
              </h3>
              <p className="text-[11px] text-slate-300 font-mono">
                {plan.description}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4">
          {/* Analysis Stats Grid */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col gap-2">
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
              Diagnóstico da Pasta ({plan.folderPath})
            </span>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded-xl bg-black/40 border border-white/10 flex flex-col">
                <span className="text-slate-400 text-[10px]">Documentos</span>
                <span className="text-white font-bold text-sm">{plan.stats.documents}</span>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/10 flex flex-col">
                <span className="text-slate-400 text-[10px]">Imagens</span>
                <span className="text-white font-bold text-sm">{plan.stats.images}</span>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/10 flex flex-col">
                <span className="text-slate-400 text-[10px]">Planilhas</span>
                <span className="text-white font-bold text-sm">{plan.stats.spreadsheets}</span>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/10 flex flex-col">
                <span className="text-amber-400 text-[10px]">Duplicados</span>
                <span className="text-amber-300 font-bold text-sm">{plan.stats.duplicates}</span>
              </div>
            </div>
          </div>

          {/* Sequential Action Steps */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                Plano de Execução Sequencial ({plan.steps.length} passos)
              </span>
              <span className="text-cyan-400 text-[10px]">
                {executionDone ? 'Executado com Sucesso' : isExecuting ? 'Executando...' : 'Aguardando Aprovação'}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
              {plan.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-mono transition-all ${
                    step.status === 'completed'
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : 'bg-white/[0.03] border-white/10 text-slate-300'
                  }`}
                >
                  <span className="w-5 h-5 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center text-[10px] text-slate-400 shrink-0 font-bold">
                    {idx + 1}
                  </span>

                  <span className="flex-1 truncate">{step.description}</span>

                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-slate-500 shrink-0">Pendente</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
          <button
            onClick={handleClose}
            disabled={isExecuting}
            className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 text-xs font-medium transition-all cursor-pointer"
          >
            {executionDone ? 'Fechar' : 'Cancelar'}
          </button>

          {!executionDone ? (
            <button
              onClick={handleRun}
              disabled={isExecuting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold font-mono flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.4)] active:scale-95 disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Organizando Arquivos...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Executar Plano no Data Hub</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Organização Concluída!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
