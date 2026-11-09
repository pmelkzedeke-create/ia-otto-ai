// Barrel enxuto: reexportar os modais pesados aqui puxaria todo o Data Hub
// para o bundle inicial, mesmo com React.lazy em App.tsx.
export * from './DataHubChatCard';

// Os modais devem ser importados diretamente pelo caminho completo:
//   ./components/datahub/DataHubModal
//   ./components/datahub/DataHubPreviewModal
//   ./components/datahub/DataHubPlanModal
//   ./components/datahub/DataHubDiffViewer
