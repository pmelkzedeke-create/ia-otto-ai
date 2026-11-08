import React, { useState } from 'react';
import {
  Code2,
  Play,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Download,
  ChevronLeft,
  ChevronRight,
  Presentation,
  Table,
  FileText,
  Globe,
  Plus,
  Trash2,
  BarChart3,
  Printer,
  Sparkles,
  Smartphone,
  Monitor,
} from 'lucide-react';

export interface ArtifactData {
  id: string;
  type: 'website' | 'slides' | 'spreadsheet' | 'document' | 'code';
  title: string;
  language?: string;
  code: string;
  slidesData?: Array<{ title: string; subtitle?: string; content: string[]; notes?: string }>;
  sheetData?: { headers: string[]; rows: Array<Record<string, string | number>> };
  docData?: { title: string; subtitle?: string; sections: Array<{ heading: string; body: string }> };
}

interface ArtifactViewerProps {
  artifact: ArtifactData;
  initialMode?: 'preview' | 'code';
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({ artifact, initialMode = 'preview' }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>(initialMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const [sheetRows, setSheetRows] = useState<Array<Record<string, string | number>>>(
    artifact.sheetData?.rows || [
      { Item: 'Licenças de Software', Custo: 1200, Categoria: 'TI', Status: 'Aprovado' },
      { Item: 'Servidores Cloud', Custo: 2400, Categoria: 'Infraestrutura', Status: 'Pendente' },
      { Item: 'Marketing Digital', Custo: 1800, Categoria: 'Marketing', Status: 'Aprovado' },
    ]
  );
  const [sheetHeaders] = useState<string[]>(
    artifact.sheetData?.headers || ['Item', 'Custo', 'Categoria', 'Status']
  );
  const [showChart, setShowChart] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(artifact.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let filename = `${artifact.title.toLowerCase().replace(/\s+/g, '_')}`;
    let ext = 'txt';
    let mime = 'text/plain';

    if (artifact.type === 'website') {
      ext = 'html';
      mime = 'text/html';
    } else if (artifact.type === 'spreadsheet') {
      ext = 'csv';
      mime = 'text/csv';
    } else if (artifact.type === 'slides') {
      ext = 'json';
      mime = 'application/json';
    } else if (artifact.type === 'document') {
      ext = 'html';
      mime = 'text/html';
    } else if (artifact.language) {
      ext = artifact.language;
    }

    const blob = new Blob([artifact.code], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintDoc = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${artifact.title}</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
              h1 { border-bottom: 2px solid #000; padding-bottom: 8px; }
              h2 { margin-top: 24px; color: #333; }
              p { font-size: 15px; }
            </style>
          </head>
          <body>
            ${artifact.code}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getArtifactBadge = () => {
    switch (artifact.type) {
      case 'website':
        return { label: 'Website HTML5', icon: Globe, color: 'text-white bg-white/10 border-white/30' };
      case 'slides':
        return { label: 'Apresentação de Slides', icon: Presentation, color: 'text-white bg-white/10 border-white/30' };
      case 'spreadsheet':
        return { label: 'Planilha / Tabela', icon: Table, color: 'text-white bg-white/10 border-white/30' };
      case 'document':
        return { label: 'Documento PDF', icon: FileText, color: 'text-white bg-white/10 border-white/30' };
      default:
        return { label: artifact.language?.toUpperCase() || 'Código', icon: Code2, color: 'text-white bg-white/10 border-white/30' };
    }
  };

  const badge = getArtifactBadge();
  const BadgeIcon = badge.icon;

  const formatWebsiteSrcDoc = (code: string) => {
    if (!code) return '';
    let processed = code;
    if (!processed.includes('viewport')) {
      if (processed.includes('<head>')) {
        processed = processed.replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1.0">');
      } else {
        processed = `<meta name="viewport" content="width=device-width, initial-scale=1.0">${processed}`;
      }
    }
    return processed;
  };

  const websiteSrcDoc = artifact.type === 'website' ? formatWebsiteSrcDoc(artifact.code) : '';

  const slidesList = artifact.slidesData || [
    {
      title: artifact.title || 'Apresentação Executiva',
      subtitle: 'Gerado autonomamente pelo OTTO',
      content: ['Visão Geral do Projeto', 'Arquitetura de Alta Performance', 'Resultados Esperados'],
    },
    {
      title: 'Principais Recursos & Inovações',
      subtitle: 'Tecnologia de Ponta',
      content: [
        'Interatividade em tempo real com reação auditiva',
        'Controle de permissões e segurança em camadas',
        'Interface responsiva com suporte a arrastar e soltar',
      ],
    },
    {
      title: 'Próximos Passos & Conclusão',
      subtitle: 'Plano de Ação',
      content: [
        'Implementação contínua de melhorias neurais',
        'Integração com ecossistema de APIs corporativas',
        'Finalização e entrega do artefato digital',
      ],
    },
  ];

  return (
    <div
      className={`my-3 rounded-2xl overflow-hidden backdrop-blur-2xl bg-[#0d1017]/90 border border-white/20 shadow-[0_12px_36px_rgba(0,0,0,0.6)] transition-all duration-300 font-sans ${
        isFullscreen ? 'fixed inset-4 sm:inset-8 z-[100] my-0 flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.95)] border-white/50 ring-1 ring-white/30' : 'w-full'
      }`}
    >
      {/* HEADER TOOLBAR */}
      <div className="px-3.5 py-2.5 bg-[#141822]/95 border-b border-white/10 flex items-center justify-between gap-3 shrink-0 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium flex items-center gap-1.5 shrink-0 ${badge.color}`}>
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
          </div>
          <span className="text-xs sm:text-sm font-medium text-slate-200 truncate" title={artifact.title}>
            {artifact.title}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('code')}
            className={`p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
              activeTab === 'code'
                ? 'bg-white/20 text-white border border-white/50 shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Ver Código Fonte (</>)"
          >
            <Code2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`w-9 h-9 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center ${
              activeTab === 'preview'
                ? 'bg-[#222834] text-white border border-white/60 shadow-[0_0_16px_rgba(255,255,255,0.35)] ring-1 ring-white/30'
                : 'bg-[#181c26] text-slate-300 hover:text-white hover:bg-white/15 border border-white/10'
            }`}
            title="Ver Prévia Interativa (Play / Preview)"
          >
            <Play className="w-4 h-4 fill-current translate-x-0.5" />
          </button>

          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className={`p-2 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
              isFullscreen
                ? 'bg-white/20 text-white border border-white/50 shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className={`relative ${isFullscreen ? 'flex-1 overflow-hidden flex flex-col' : 'min-h-[300px] max-h-[580px]'}`}>
        {activeTab === 'preview' && (
          <div className="w-full h-full flex flex-col bg-[#090b10] relative overflow-hidden flex-1">
            {artifact.type === 'website' && (
              <div className="w-full h-full min-h-[360px] flex flex-col items-center justify-start bg-[#06080d] p-2 sm:p-4 overflow-y-auto">
                <div className="mb-2 px-3 py-1 bg-[#121622] rounded-full border border-white/10 flex items-center gap-1.5 text-xs text-slate-300 shrink-0">
                  <span className="text-[10px] font-mono uppercase text-slate-400 mr-1">Dispositivo:</span>
                  <button
                    onClick={() => setDeviceMode('desktop')}
                    className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                      deviceMode === 'desktop'
                        ? 'bg-white/20 text-white border border-white/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop (100%)</span>
                  </button>
                  <button
                    onClick={() => setDeviceMode('mobile')}
                    className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                      deviceMode === 'mobile'
                        ? 'bg-white/20 text-white border border-white/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile (375px)</span>
                  </button>
                </div>

                <div
                  className={`transition-all duration-300 ease-out bg-white shadow-2xl relative flex flex-col ${
                    deviceMode === 'mobile'
                      ? 'w-[375px] max-w-full h-[520px] rounded-[2.2rem] border-[8px] border-[#1e2330] ring-1 ring-white/10 overflow-hidden my-auto shrink-0'
                      : 'w-full h-full min-h-[380px] rounded-xl overflow-hidden'
                  }`}
                >
                  {deviceMode === 'mobile' && (
                    <div className="w-full bg-[#1e2330] py-1 flex justify-center items-center shrink-0 border-b border-black/20">
                      <div className="w-14 h-1 bg-slate-500/60 rounded-full" />
                    </div>
                  )}
                  <iframe
                    srcDoc={websiteSrcDoc}
                    title={artifact.title}
                    className="w-full h-full border-0 bg-white flex-1"
                    sandbox="allow-scripts allow-modals allow-popups allow-forms"
                  />
                </div>
              </div>
            )}

            {artifact.type === 'slides' && (
              <div className="w-full h-full min-h-[360px] flex flex-col justify-between p-6 sm:p-10 bg-gradient-to-br from-[#0e131f] via-[#121826] to-[#0a0d14] text-white relative">
                <div className="absolute top-10 right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-white/10 pb-4 z-10">
                  <span className="text-xs font-mono uppercase tracking-widest text-white font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>SLIDE {currentSlideIndex + 1} DE {slidesList.length}</span>
                  </span>
                  <span className="text-xs text-slate-400 font-sans">{artifact.title}</span>
                </div>

                <div className="my-auto py-6 z-10 max-w-2xl mx-auto w-full">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 leading-tight">
                    {slidesList[currentSlideIndex]?.title}
                  </h2>
                  {slidesList[currentSlideIndex]?.subtitle && (
                    <p className="text-sm text-slate-300 font-medium mb-6">
                      {slidesList[currentSlideIndex]?.subtitle}
                    </p>
                  )}
                  <ul className="space-y-3">
                    {slidesList[currentSlideIndex]?.content.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm sm:text-base text-slate-200 leading-relaxed">
                        <span className="w-2 h-2 rounded-full bg-white mt-2 shrink-0 shadow-[0_0_8px_#ffffff]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 z-10">
                  <button
                    disabled={currentSlideIndex === 0}
                    onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {slidesList.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          currentSlideIndex === idx ? 'w-6 bg-white shadow-[0_0_8px_#ffffff]' : 'w-2 bg-white/20 hover:bg-white/40'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    disabled={currentSlideIndex === slidesList.length - 1}
                    onClick={() => setCurrentSlideIndex((prev) => Math.min(slidesList.length - 1, prev + 1))}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-950 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <span>Próximo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {artifact.type === 'spreadsheet' && (
              <div className="w-full h-full min-h-[360px] flex flex-col bg-[#0b0e14] text-slate-200">
                <div className="px-4 py-2 bg-[#121622] border-b border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowChart((prev) => !prev)}
                      className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                        showChart
                          ? 'bg-white/20 border-white text-white font-bold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>{showChart ? 'Ver Tabela' : 'Gerar Gráfico'}</span>
                    </button>
                    <button
                      onClick={() => {
                        const newRow: Record<string, string | number> = {};
                        sheetHeaders.forEach((h) => (newRow[h] = 'Novo'));
                        setSheetRows((prev) => [...prev, newRow]);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      <span>Nova Linha</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {sheetRows.length} linhas × {sheetHeaders.length} colunas
                  </span>
                </div>

                {showChart ? (
                  <div className="p-6 flex flex-col items-center justify-center flex-1 space-y-4">
                    <h4 className="text-xs font-mono uppercase text-white tracking-wider">
                      Análise Gráfica de Custos por Categoria
                    </h4>
                    <div className="w-full max-w-md space-y-3">
                      {sheetRows.map((row, idx) => {
                        const val = typeof row['Custo'] === 'number' ? row['Custo'] : parseFloat(String(row['Custo'])) || 1000;
                        const pct = Math.min(100, Math.round((val / 3000) * 100));
                        return (
                          <div key={idx} className="space-y-1 text-xs">
                            <div className="flex justify-between text-slate-300 font-medium">
                              <span>{String(row['Item'] || `Item ${idx + 1}`)}</span>
                              <span className="font-mono text-white font-bold">R$ {val}</span>
                            </div>
                            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-slate-200 to-white transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#151a26] border-b border-white/10 text-slate-300 font-mono text-[11px]">
                          <th className="p-3 w-10 text-center border-r border-white/5">#</th>
                          {sheetHeaders.map((header, idx) => (
                            <th key={idx} className="p-3 border-r border-white/5 font-semibold">
                              {header}
                            </th>
                          ))}
                          <th className="p-3 w-10 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sheetRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white/[0.04] transition-colors group">
                            <td className="p-3 text-center text-slate-500 font-mono text-[10px] border-r border-white/5">
                              {rIdx + 1}
                            </td>
                            {sheetHeaders.map((header, cIdx) => (
                              <td key={cIdx} className="p-3 border-r border-white/5 text-slate-200 font-sans">
                                {String(row[header] || '')}
                              </td>
                            ))}
                            <td className="p-3 text-center">
                              <button
                                onClick={() => setSheetRows((prev) => prev.filter((_, i) => i !== rIdx))}
                                className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Excluir linha"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {artifact.type === 'document' && (
              <div className="w-full h-full min-h-[380px] p-6 sm:p-8 bg-[#f8fafc] text-slate-900 overflow-y-auto font-sans leading-relaxed shadow-inner">
                <div className="max-w-2xl mx-auto bg-white p-8 sm:p-12 rounded-xl shadow-lg border border-slate-200">
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {artifact.title}
                      </h1>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mt-1 font-semibold">
                        Documento Oficial OTTO OS
                      </p>
                    </div>
                    <button
                      onClick={handlePrintDoc}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir / PDF</span>
                    </button>
                  </div>

                  <div className="prose prose-slate max-w-none text-sm space-y-4">
                    <p className="text-slate-700 leading-relaxed">
                      Este documento foi gerado automaticamente pelo assistente neural OTTO em resposta à sua solicitação. Todos os parâmetros e estruturas foram consolidados com formatação profissional.
                    </p>
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800">
                      <code>{artifact.code.slice(0, 300)}...</code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {artifact.type === 'code' && (
              <div className="w-full h-full min-h-[320px] p-4 bg-[#090b10] font-mono text-xs text-slate-200 overflow-auto">
                <pre className="whitespace-pre">
                  <code>{artifact.code}</code>
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="w-full h-full min-h-[340px] bg-[#080a0f] p-4 font-mono text-xs text-slate-100 overflow-auto flex flex-col justify-between">
            <pre className="whitespace-pre overflow-x-auto leading-relaxed select-text">
              <code>{artifact.code}</code>
            </pre>

            <div className="pt-3 mt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-[11px] font-mono text-slate-400">
                {artifact.code.length} caracteres • {artifact.code.split('\n').length} linhas
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Código'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-950 font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arquivo</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
