import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Captura erros de renderização para evitar tela branca.
 * Sem isso, qualquer exceção em um componente derruba toda a aplicação.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[OTTO] Erro de renderização capturado:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#07090e] p-6">
        <div className="max-w-lg w-full rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-slate-100">
          <h1 className="text-lg font-semibold text-rose-300 mb-2">O OTTO encontrou um erro inesperado</h1>
          <p className="text-sm text-slate-300 mb-4">
            A interface foi interrompida para não corromper seus dados. Você pode tentar continuar ou recarregar
            a página.
          </p>

          <pre className="text-[11px] font-mono whitespace-pre-wrap break-words bg-black/40 rounded-lg p-3 mb-4 text-rose-200/80 max-h-40 overflow-auto">
            {error.message}
          </pre>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-colors cursor-pointer"
            >
              Tentar continuar
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold transition-colors cursor-pointer"
            >
              Recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
