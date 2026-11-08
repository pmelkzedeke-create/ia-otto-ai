import React from 'react';
import { ShieldAlert, X, Check } from 'lucide-react';
import { OttoAction } from '../types/otto';

interface ConfirmationDialogProps {
  isOpen: boolean;
  prompt: string;
  action: OttoAction | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  prompt,
  action,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !action) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 liquid-glass-overlay font-sans select-none">
      <div className="relative w-full max-w-md rounded-[28px] liquid-glass-modal liquid-refraction p-6 flex flex-col gap-4">
        {/* Header with Risk Warning */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/10 border border-white/20 text-white shadow-sm">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-300 uppercase">
                AÇÃO DE ALTO RISCO DETECTADA
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Autorização de Segurança Necessária
            </h3>
          </div>
        </div>

        {/* Details Box */}
        <div className="p-4 rounded-2xl glass-light border border-white/10 text-xs font-mono text-slate-300 flex flex-col gap-2 relative z-10">
          <p className="text-white font-medium">{prompt}</p>
          <div className="pt-2 border-t border-white/10 flex flex-col gap-1 text-[11px] text-slate-400">
            <div>
              <span className="text-slate-500">Ação Operacional: </span>
              <span className="text-white uppercase font-semibold">{action.action}</span>
            </div>
            {action.target && (
              <div>
                <span className="text-slate-500">Alvo do Sistema: </span>
                <span className="text-slate-200">{action.target}</span>
              </div>
            )}
            {action.reasoning && (
              <div>
                <span className="text-slate-500">Justificativa: </span>
                <span className="text-slate-300 italic">{action.reasoning}</span>
              </div>
            )}
          </div>
        </div>

        {/* Buttons: CANCELAR / CONFIRMAR */}
        <div className="flex items-center justify-end gap-3 pt-2 relative z-10">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl liquid-glass-btn text-slate-300 hover:text-white font-mono text-xs font-semibold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
            <span>CANCELAR</span>
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl border border-white bg-white text-black hover:bg-slate-200 font-mono text-xs font-bold tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(255,255,255,0.4)] cursor-pointer active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>CONFIRMAR EXECUÇÃO</span>
          </button>
        </div>
      </div>
    </div>
  );
};
