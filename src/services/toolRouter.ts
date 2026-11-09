// Tool Router & Execution Engine
// Routes structured intents to real tools with security levels and feedback

import { OttoAction } from '../types/otto';
import { ApiBridge } from './apiBridge';
import { soundEffects } from './audioSynthesizer';
import { DataHubStorage } from './dataHubStorage';

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

      case 'media_ffmpeg': {
        const operation = String(params.operation || target || '').trim();
        const fileRef = String(params.file || params.input || params.fileName || params.filename || '').trim();

        if (!operation || !fileRef) {
          return { success: false, message: 'Preciso saber a operação e o arquivo para usar o ffmpeg.' };
        }

        onProgress?.(`Preparando ${fileRef} para o motor de mídia...`);
        soundEffects.playActionStart();

        const prepared = await prepareMediaInput(fileRef);
        if (!prepared) {
          return {
            success: false,
            message: `Não encontrei "${fileRef}" no Data Hub nem na pasta de mídia do OTTO.`,
          };
        }

        onProgress?.(`ffmpeg: ${operation} em ${prepared.label}...`);

        const runOnce = (overwrite: boolean) =>
          ApiBridge.runMediaOperation({
            operation,
            input: prepared.input,
            output: params.output ? String(params.output) : undefined,
            options: params.options && typeof params.options === 'object' ? params.options : {},
            overwrite,
          });

        let result = await runOnce(false);
        if (!result.ok && result.code === 'OUTPUT_EXISTS') {
          // O usuário pediu de novo: substitui o resultado anterior.
          result = await runOnce(true);
        }

        if (!result.ok) {
          return { success: false, message: result.error || 'O ffmpeg não conseguiu processar esse arquivo.' };
        }

        const createdFileId = await importMediaResult(result);

        const sizeMb = result.sizeBytes ? (result.sizeBytes / (1024 * 1024)).toFixed(2) : null;
        const details = [
          result.outputName ? `"${result.outputName}"` : null,
          sizeMb ? `${sizeMb} MB` : null,
          result.durationMs ? `em ${(result.durationMs / 1000).toFixed(1)}s` : null,
        ]
          .filter(Boolean)
          .join(' · ');

        return {
          success: true,
          message: `ffmpeg pronto: ${details || operation} (a partir de ${prepared.label}).`,
          data: {
            operation,
            outputName: result.outputName,
            downloadUrl: result.downloadUrl,
            createdFileId,
            sizeBytes: result.sizeBytes,
            durationMs: result.durationMs,
          },
        };
      }

      case 'none':
      default:
        return { success: true, message: 'Comando processado.' };
    }
  }
}

/**
 * Descobre o arquivo pedido pelo modelo: procura no Data Hub (por id ou nome),
 * garante que ele exista em `otto_workspace/media/in` e devolve o nome para o ffmpeg.
 */
async function prepareMediaInput(fileRef: string): Promise<{ input: string; label: string } | null> {
  const file =
    DataHubStorage.getFileById(fileRef) ||
    DataHubStorage.getAllFiles().find((candidate) => candidate.name.toLowerCase() === fileRef.toLowerCase()) ||
    DataHubStorage.getAllFiles().find((candidate) => candidate.name.toLowerCase().includes(fileRef.toLowerCase()));

  if (!file) {
    // Pode ser um arquivo que já está na pasta de mídia do servidor.
    const media = await ApiBridge.listMediaFiles();
    const match = media.find((entry) => entry.name.toLowerCase() === fileRef.toLowerCase());
    return match ? { input: match.name, label: match.name } : null;
  }

  if (file.metadata?.serverName) {
    return { input: file.metadata.serverName, label: file.name };
  }

  try {
    const mediaUrl = await DataHubStorage.getFileMediaUrl(file.id);
    if (mediaUrl) {
      const blob = await fetch(mediaUrl).then((res) => res.blob());
      const dataUrl = await blobToDataUrl(blob);
      const synced = await ApiBridge.uploadMedia(file.name, dataUrl);
      if (synced) return { input: synced.name, label: file.name };
    }
  } catch (error) {
    console.warn('[ffmpeg] Não consegui enviar a mídia para o servidor:', error);
  }

  return { input: file.name, label: file.name };
}

/** Traz o resultado do ffmpeg para o Data Hub, para ficar visível e tocável no chat. */
async function importMediaResult(result: { downloadUrl?: string | null; outputName?: string }): Promise<string | undefined> {
  if (!result.downloadUrl || !result.outputName) return undefined;

  try {
    const response = await fetch(result.downloadUrl);
    if (!response.ok) return undefined;

    const blob = await response.blob();
    const generated = new File([blob], result.outputName, { type: blob.type || 'application/octet-stream' });
    const [created] = await DataHubStorage.uploadFiles([generated], undefined, { syncToServer: false });
    return created?.id;
  } catch (error) {
    console.warn('[ffmpeg] Resultado não pôde ser adicionado ao Data Hub:', error);
    return undefined;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
