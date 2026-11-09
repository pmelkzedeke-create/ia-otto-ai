# Motor de mídia (ffmpeg)

O OTTO usa o **ffmpeg** como ferramenta de agente: o modelo decide quando converter, cortar ou
analisar um áudio/vídeo, exatamente como faz com `search_web` ou `execute_command`. Não existe
tela separada de "conversor" — você pede no chat.

> "extrai o áudio desse vídeo"
> "corta os primeiros 30 segundos e faz um gif"
> "comprime esse vídeo para caber no WhatsApp"
> "qual a duração e a resolução desse arquivo?"

## Como o modelo chega no arquivo

```
usuário solta um vídeo no chat
        │
        ├─ Data Hub (IndexedDB)  ── blob local, player, metadados
        │
        └─ espelho no servidor ─── otto_workspace/media/in/<nome>
                                       ▲
                                       │ só esta pasta é visível para o ffmpeg
modelo chama a ferramenta ─────────────┘
```

O espelhamento é automático em `DataHubStorage.uploadFiles()`, apenas para `video`/`audio`
até 100 MB. Se o arquivo já estava no Data Hub antes desta versão, o `ToolRouter` envia
sob demanda no primeiro uso (`prepareMediaInput`).

## Operações (allowlist fechada)

| id | o que faz | arquivo |
| --- | --- | --- |
| `extract_audio` | separa a faixa de áudio em MP3 | `-vn -c:a libmp3lame -q:a 0..9` |
| `convert` | troca o formato (mp4, webm, mp3, wav, m4a, ogg…) | codec escolhido pela extensão |
| `compress` | reduz tamanho mantendo proporção | `scale=-2:<144..2160> -crf 18..40` |
| `thumbnail` | capa do vídeo em JPG/PNG | `-ss <tempo> -frames:v 1` |
| `trim` | corte por início/duração | `-ss` + `-t` + `-c copy` |
| `to_gif` | GIF com paleta | `fps 5..30, scale 120..960, lanczos` |
| `extract_frames` | folha de contato 3×3 (um único JPG) | `fps, scale, tile=CxR` |
| `normalize_audio` | volume de podcast | `loudnorm=I=-16:TP=-1.5:LRA=11` |
| `probe` | metadados (duração, codecs, resolução) | `-f null -`, lê o stderr |

`probe` não gera arquivo: devolve `details` com duração, vídeo e áudio já parseados.

## Segurança

- **Nunca** shell string. Tudo vai por `spawn(bin, args[])`; um nome como `$(rm -rf ~).mp4`
  continua sendo um único argumento.
- Entrada e saída resolvidas com `resolveInside` e conferidas com `isInside`; qualquer
  `..`, caminho absoluto fora da pasta ou symlink para fora vira `BAD_PATH` (404).
- Números passam por clamp, enums são fechados, tempos só aceitam `HH:MM:SS(.ms)` ou
  segundos (≤ 86400). Valor estranho cai no padrão — nunca é interpolado.
- Limites: 120 MB de entrada, 400 MB de saída, timeout 5–300 s (padrão 120 s).
- Saída existente não é sobrescrita sem `overwrite: true` (`OUTPUT_EXISTS`, 409).
- Nome de saída sanitizado (`../etc/passwd` → `passwd.bin`), sempre minúsculo, sem acento.

## Detecção do binário

Ordem: `FFMPEG_PATH` → `node_modules/ffmpeg-static/ffmpeg` → `PATH`. O resultado fica em
cache (`detectMediaEngine(true)` revalida). Sem binário, o retorno é `503 ENGINE_MISSING`
com a instrução de instalação do sistema operacional — o app continua funcionando, o badge
do chat mostra **ffmpeg ausente**.

`ffmpeg-static` está em `optionalDependencies`: se o download falhar na instalação, o
`npm install` não quebra e o OTTO apenas fica sem o motor até você instalar o ffmpeg no
sistema (`brew install ffmpeg`, `sudo apt install ffmpeg`, `winget install Gyan.FFmpeg`).

## API

| método | rota | para quê |
| --- | --- | --- |
| `GET` | `/api/media/status` | disponibilidade, versão, dica e catálogo |
| `GET` | `/api/media/list` | arquivos em `media/in` e `media/out` |
| `POST` | `/api/media/upload` | `{ name, data }` base64 → `media/in` (parser próprio, 180 MB) |
| `POST` | `/api/media/ffmpeg` | `{ operation, input, output?, options?, overwrite? }` |
| `GET` | `/api/media/file/*` | download/stream do resultado |

Todas exigem o token de sessão (`x-otto-token`), como o resto da API.

## Ferramentas para o modelo

- **Chat (intent JSON):** ação `media_ffmpeg` com
  `parameters: { operation, file, output, options }`. O resultado vira um arquivo no Data Hub
  e abre no visualizador automaticamente.
- **Agente Groq (function calling):** ferramenta `ffmpeg_media`, mesmo contrato, executada em
  `server/toolExecutor.ts`.

## Onde está o quê

| arquivo | papel |
| --- | --- |
| `server/mediaTools.ts` | allowlist, montagem de argumentos, spawn, limites, detecção |
| `server/routes/media.ts` | rotas HTTP acima |
| `server/groqService.ts` | ferramenta `ffmpeg_media` para o modelo |
| `server/toolExecutor.ts` | execução da ferramenta no agente |
| `src/services/toolRouter.ts` | ação `media_ffmpeg` no chat, espelho e importação do resultado |
| `src/services/dataHubStorage.ts` | espelhamento automático de áudio/vídeo |
| `src/components/OttoLiquidBetaView.tsx` | badge "ffmpeg pronto / ausente" no compositor |

## Testes

`tests/mediaTools.test.ts` cobre allowlist, injeção de argumentos, clamps, sanitização de
nome, travessia de caminho, upload e o caminho `ENGINE_MISSING`. A conversão real foi
validada ponta a ponta com um ffmpeg estático (9/9 operações).
