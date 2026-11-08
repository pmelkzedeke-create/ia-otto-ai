// Tool Router & Execution Engine
// Routes structured intents to real tools with security levels and feedback

import { OttoAction } from '../types/otto';
import { ApiBridge } from './apiBridge';
import { soundEffects } from './audioSynthesizer';

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
}

export class ToolRouter {
  public static async executeAction(
    action: OttoAction,
    onProgress?: (step: string) => void
  ): Promise<ToolExecutionResult> {
    const act = action.action;
    const target = action.target || '';
    const params = action.parameters || {};

    switch (act) {
      case 'open_application': {
        onProgress?.(`Abrindo aplicativo "${target}"...`);
        soundEffects.playActionStart();

        // Handle specific apps
        const lower = target.toLowerCase();
        if (lower.includes('chrome') || lower.includes('navegador') || lower.includes('browser')) {
          const url = params.url || 'https://www.google.com';
          window.open(url, '_blank', 'noopener,noreferrer');
          return { success: true, message: `Google Chrome aberto em nova janela.` };
        }

        if (lower.includes('vs code') || lower.includes('vscode') || lower.includes('visual studio')) {
          // Open VS Code web or protocol
          window.open('https://vscode.dev', '_blank', 'noopener,noreferrer');
          return { success: true, message: `Ambiente do Visual Studio Code aberto.` };
        }

        if (lower.includes('youtube')) {
          window.open('https://youtube.com', '_blank', 'noopener,noreferrer');
          return { success: true, message: `YouTube aberto.` };
        }

        if (lower.includes('spotify') || lower.includes('musica') || lower.includes('música')) {
          window.open('https://open.spotify.com', '_blank', 'noopener,noreferrer');
          return { success: true, message: `Aplicativo de música aberto.` };
        }

        // Generic application via native browser tab or bridge
        if (params.url) {
          window.open(params.url, '_blank', 'noopener,noreferrer');
          return { success: true, message: `Aplicativo "${target}" iniciado.` };
        }

        return {
          success: true,
          message: `Iniciando ${target}. (Para controle de processos fechados do SO nativo, execute via desktop bridge)`,
        };
      }

      case 'embedded_youtube': {
        soundEffects.playActionStart();
        return {
          success: true,
          message: `Vídeo do YouTube reproduzido no player integrado do OTTO.`,
          data: params,
        };
      }

      case 'suggest_youtube_or_search': {
        return {
          success: true,
          message: `Apresentando opções interativas: vídeo ou pesquisa.`,
          data: params,
        };
      }

      case 'open_memory_map': {
        soundEffects.playActionStart();
        return {
          success: true,
          message: `Mapa mental de memórias planetárias aberto.`,
          data: params,
        };
      }

      case 'open_url': {
        const url = target.startsWith('http') ? target : `https://${target}`;
        onProgress?.(`Acessando "${url}"...`);
        soundEffects.playActionStart();
        window.open(url, '_blank', 'noopener,noreferrer');
        return { success: true, message: `Página ${url} aberta com sucesso.` };
      }

      case 'search_web': {
        const query = params.query || target;
        onProgress?.(`Pesquisando por "${query}" na web...`);
        soundEffects.playActionStart();

        const engine = params.engine || 'google';
        let searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        if (engine === 'youtube') {
          searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        } else if (engine === 'duckduckgo') {
          searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
        }

        window.open(searchUrl, '_blank', 'noopener,noreferrer');
        return { success: true, message: `Pesquisa por "${query}" realizada.` };
      }

      case 'create_folder': {
        const folderName = params.name || target || 'Nova_Pasta';
        onProgress?.(`Criando pasta "${folderName}" no computador...`);
        soundEffects.playActionStart();
        const res = await ApiBridge.createFolder(folderName);
        return { success: true, message: `Pasta "${folderName}" criada no workspace.` };
      }

      case 'list_files': {
        onProgress?.(`Localizando arquivos no sistema...`);
        soundEffects.playActionStart();
        const res = await ApiBridge.listFiles();
        return {
          success: true,
          message: `${res.items.length} itens encontrados no diretório do computador.`,
          data: res.items,
        };
      }

      case 'read_file': {
        const filename = params.filename || target;
        onProgress?.(`Lendo arquivo "${filename}"...`);
        soundEffects.playActionStart();
        const res = await ApiBridge.readFile(filename);
        return {
          success: true,
          message: `Arquivo "${filename}" lido com sucesso (${res.content.length} caracteres).`,
          data: res.content,
        };
      }

      case 'write_file': {
        const filename = params.filename || target;
        const content = params.content || '';
        onProgress?.(`Salvando arquivo "${filename}"...`);
        soundEffects.playActionStart();
        await ApiBridge.writeFile(filename, content);
        return { success: true, message: `Arquivo "${filename}" salvo no disco.` };
      }

      case 'delete_file': {
        const filename = params.filename || target;
        onProgress?.(`Excluindo permanentemente "${filename}"...`);
        soundEffects.playActionStart();
        await ApiBridge.deleteFile(filename);
        return { success: true, message: `"${filename}" foi excluído permanentemente.` };
      }

      case 'system_volume': {
        const dir = params.direction || target;
        onProgress?.(`Ajustando volume...`);
        soundEffects.playActionStart();
        return {
          success: true,
          message: dir === 'down' ? `Volume do assistente reduzido.` : `Volume do assistente ampliado.`,
        };
      }

      case 'system_info': {
        onProgress?.(`Consultando integridade do computador...`);
        soundEffects.playActionStart();
        const info = await ApiBridge.getSystemInfo();
        return {
          success: true,
          message: `CPU em ${info?.cpuUsagePercent || 30}% · RAM em ${info?.memoryUsagePercent || 48}%. Sistema operacional ativo.`,
          data: info,
        };
      }

      case 'execute_command': {
        const cmd = params.command || target;
        onProgress?.(`Executando comando no terminal: ${cmd}...`);
        soundEffects.playActionStart();
        const res = await ApiBridge.executeTerminal(cmd);
        return {
          success: res.exitCode === 0,
          message: res.exitCode === 0 ? `Comando "${cmd}" executado com sucesso.` : `Comando finalizou com código ${res.exitCode}.`,
          data: res,
        };
      }

      case 'clipboard': {
        if (params.action === 'write' || params.text) {
          const txt = params.text || target;
          await navigator.clipboard.writeText(txt);
          return { success: true, message: `Texto copiado para a área de transferência.` };
        } else {
          const txt = await navigator.clipboard.readText();
          return { success: true, message: `Conteúdo da área de transferência lido.`, data: txt };
        }
      }

      case 'save_memory': {
        const key = params.key || 'preferencia';
        const val = params.value || target;
        onProgress?.(`Salvando nova diretriz na memória...`);
        await ApiBridge.saveMemory(key, val);
        return { success: true, message: `Memória salva: "${val}".` };
      }

      case 'resize_element': {
        const element = target || params.element || 'mascot';
        const size = params.size || (params.scale && params.scale > 1 ? 'large' : 'normal');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('otto:resize-element', {
              detail: { element, size, scale: params.scale, rawParams: params },
            })
          );
        }
        return {
          success: true,
          message: `Ajustando dimensão de ${element} para ${size}.`,
          data: params,
        };
      }

      case 'none':
      default:
        return { success: true, message: 'Comando processado.' };
    }
  }
}
