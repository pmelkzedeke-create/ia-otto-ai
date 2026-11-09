# OTTO · Plano de 1.000 melhorias

> **Documento vivo** · criado em 07/11/2026 · branch `arena/6ca2855d-ia-otto-ai`
> 20 áreas × 50 itens = **1.000 itens numerados** (`OTTO-0001` … `OTTO-1000`), derivados do código real do repositório (52 arquivos, ~18,5 mil linhas, 22 rotas de API).

---

## 1. O foco do site (não negociável)

OTTO é um **assistente de computador que conversa**: você fala, ele entende, ele faz, ele responde. Toda a interface — holograma, Data Hub, memória, animações — existe para encurtar esse ciclo.

As cinco regras que filtram **todos** os 1.000 itens:

| # | Regra | Teste prático |
|---|---|---|
| R1 | **Encurtar o ciclo fala → ação** | Este item reduz o tempo entre eu falar e o OTTO agir? |
| R2 | **Dizível em uma frase** | Se eu não conseguir pedir isso falando, o recurso está grande demais |
| R3 | **P0 antes de novidade** | Nenhum recurso novo enquanto existir P0 aberto na mesma área |
| R4 | **Beleza serve à leitura** | O ganho é contraste, ritmo ou silêncio visual — não enfeite |
| R5 | **Silêncio é resposta** | Se o item adiciona ruído, notificação ou passo, ele precisa se justificar |

**Fora de foco por definição:** feed social, jogos, marketplace de plugins antes de API pública, mais de 4 temas visuais, gamificação com pontos, rede de "amigos", qualquer coisa que exija o usuário aprender um segundo produto.

---

## 2. Como ler a tabela

| Coluna | Significado |
|---|---|
| **ID** | `OTTO-0001` … `OTTO-1000` — use em commits e issues |
| **Item** | A melhoria, em uma linha, no imperativo |
| **P** | `P0` quebra o ciclo · `P1` atrito forte · `P2` polimento · `P3` aposta |
| **E** | `S` até 1 dia · `M` 1–3 dias · `L` mais de 3 dias |

**Distribuição real hoje:** 51 P0 (5%), 297 P1 (30%), 469 P2 (47%), 183 P3 (18%). Esforço: 387 curtos, 473 médios, 140 longos. Como quase metade está em P2, o gargalo do plano é **decisão**, não capacidade: a Onda 0 existe para transformar os 51 P0 em zero.

---

## 3. Como executar (7 ondas)

| Onda | Semanas | Meta | Critério de saída |
|---|---|---|---|
| **0 · Estancar** | 1–2 | Zerar os P0 de conversa | Nenhum P0 aberto em Bugs, Voz e Streaming |
| **1 · Confiança** | 3–6 | Voz e sessão deixam de falhar | 20 conversas seguidas sem perder mensagem nem áudio |
| **2 · Profundidade** | 7–10 | Memória e Agente viram confiáveis | Plano de 5 etapas executa e reporta sozinho |
| **3 · Beleza** | 11–14 | Design system fechado | Claro e escuro auditados item a item |
| **4 · Alcance** | 15–18 | Mobile e onboarding | Instalável (PWA), 375 px sem quebra, 1ª tarefa em < 60 s |
| **5 · Escala** | 19–22 | Infra e observabilidade | Latência p95 medida e painel de saúde no ar |
| **6 · Produto** | 23–26 | Integrações e sustentação | 3 integrações de uso diário, custo por conversa conhecido |

**Regra de cadência:** a cada onda, 70% do tempo em itens da onda, 20% em dívida técnica da anterior, 10% em P3 escolhido a dedo.

---

## 4. Definição de pronto (vale para todo item)

1. `npm run typecheck` limpo · 2. `npm test` verde **com** teste novo cobrindo a correção · 3. `npm run build` OK · 4. preview validado no claro **e** no escuro · 5. 375 px e 1440 px sem quebra · 6. navegável só por teclado, foco visível · 7. contraste AA no texto novo · 8. `prefers-reduced-motion` respeitado · 9. mensagem de erro em português claro, com próximo passo · 10. ADR quando muda arquitetura.

---

## 5. Índice das 20 áreas

| Área | Tema | Peso típico |
|---|---|---|
| 01 | Bugs e estabilidade | P0/P1 |
| 02 | Voz: entrada (STT) | P0/P1 |
| 03 | Voz: saída (TTS) | P0/P1 |
| 04 | Conversa, intenção e prompt | P1 |
| 05 | Streaming e latência | P0/P1 |
| 06 | Memória de longo prazo | P1/P2 |
| 07 | Modo Agente e planos | P1/P2 |
| 08 | Ferramentas, arquivos e sandbox | P1/P2 |
| 09 | Data Hub | P1/P2 |
| 10 | Hologramas e visualização | P2/P3 |
| 11 | Design system e temas | P1/P2 |
| 12 | Microinterações e animação | P2 |
| 13 | Acessibilidade | P1/P2 |
| 14 | Responsivo, mobile e PWA | P1/P2 |
| 15 | Performance e bundle | P2 |
| 16 | Segurança e privacidade | P0/P1 |
| 17 | Backend, API e infra | P1/P2 |
| 18 | Observabilidade, testes e CI | P1/P2 |
| 19 | Integrações externas | P2/P3 |
| 20 | Onboarding, docs e produto | P2/P3 |

---

## Área 01 · Bugs e estabilidade
*Objetivo: a conversa nunca quebrar, nunca perder mensagem, nunca mentir sobre o que aconteceu.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0001 | Recarga do bridge de build interrompe o ditado e apaga o rascunho: adiar reload com gravação ativa | P0 | M |
| OTTO-0002 | Estado "pensando" fica preso quando o stream aborta no meio da resposta | P0 | S |
| OTTO-0003 | Envio rápido (duplo clique ou Enter duplo) duplica a mensagem do usuário | P1 | S |
| OTTO-0004 | Resposta do assistente desaparece ao alternar claro/escuro (remontagem da lista) | P1 | M |
| OTTO-0005 | Microfone negado não gera feedback visual nem instrução de desbloqueio | P0 | S |
| OTTO-0006 | Falha de rede no envio deixa mensagem órfã, sem botão "reenviar" | P1 | M |
| OTTO-0007 | Scroll do chat briga com o streaming: usuário rola para cima e é puxado de volta | P1 | S |
| OTTO-0008 | Conversa não sobrevive a F5: nenhuma persistência local do histórico | P0 | M |
| OTTO-0009 | ErrorBoundary recarrega a página e apaga o histórico em memória | P1 | M |
| OTTO-0010 | Modal aberto com teclado mobile empurra o painel para fora da tela | P1 | M |
| OTTO-0011 | AudioContext fica suspenso no iOS até um gesto: a primeira fala sai muda | P1 | M |
| OTTO-0012 | Botão "parar" não cancela a síntese em andamento: o áudio continua | P0 | S |
| OTTO-0013 | Duas instâncias de TTS tocam juntas após hot reload | P1 | M |
| OTTO-0014 | Fila de fala acumula mensagens antigas quando a resposta é longa | P1 | M |
| OTTO-0015 | Trocar de voz no meio da fala deixa o áudio anterior tocando | P2 | S |
| OTTO-0016 | AudioContext não é fechado no unmount: vaza a cada navegação | P2 | S |
| OTTO-0017 | Timers das partículas do holograma continuam rodando com a aba em background | P2 | M |
| OTTO-0018 | Listener de resize acumulado a cada montagem do holograma | P2 | S |
| OTTO-0019 | `setInterval` do relógio do header nunca é limpo | P2 | S |
| OTTO-0020 | Erro de cota (429) aparece como "algo deu errado" genérico | P0 | S |
| OTTO-0021 | Falta de timeout no fetch de streaming deixa spinner infinito | P0 | S |
| OTTO-0022 | Sem retry automático em 502/503 do provedor de IA | P1 | M |
| OTTO-0023 | Trocar de modelo em Configurações só vale depois de recarregar a página | P1 | M |
| OTTO-0024 | Preview do Data Hub abre vazio quando o blob expira | P1 | M |
| OTTO-0025 | Excluir item da memória não atualiza a lista até reabrir o modal | P2 | S |
| OTTO-0026 | Plano continua "rodando" depois de uma etapa falhar | P0 | M |
| OTTO-0027 | Etapa do agente falha em silêncio: sem motivo e sem opção de repetir | P0 | M |
| OTTO-0028 | Upload de imagem grande (acima de 8 MB) trava a UI sem barra de progresso | P1 | M |
| OTTO-0029 | Texto colado com markdown malformado quebra o renderizador | P1 | S |
| OTTO-0030 | Links nas mensagens abrem na mesma aba e perdem a conversa | P1 | S |
| OTTO-0031 | Copiar resposta inclui os rótulos "Você" e "Otto" no clipboard | P2 | S |
| OTTO-0032 | Botão de copiar não devolve feedback de "copiado" | P2 | S |
| OTTO-0033 | Transcrição parcial aparece e some, causando tremor no layout | P1 | M |
| OTTO-0034 | Silêncio total do usuário não encerra a escuta: grava indefinidamente | P0 | M |
| OTTO-0035 | Trocar de aba no Chrome mobile encerra a síntese no meio | P2 | M |
| OTTO-0036 | Data e hora do header não acompanham mudança de fuso sem reload | P3 | S |
| OTTO-0037 | Pinch acidental no iOS quebra o layout do chat | P1 | S |
| OTTO-0038 | Área segura (notch) corta o header no iPhone | P1 | S |
| OTTO-0039 | Tema claro: placeholder do campo de texto fica ilegível | P1 | S |
| OTTO-0040 | Tema claro: sombra escura do painel do Data Hub vaza para o fundo | P1 | S |
| OTTO-0041 | `prefers-reduced-motion` não desliga a animação do mascote | P1 | S |
| OTTO-0042 | Foco de teclado invisível nos botões do header (outline removido) | P1 | S |
| OTTO-0043 | Tab não alcança o campo de texto depois de fechar um modal | P2 | M |
| OTTO-0044 | Esc fecha o modal errado quando dois estão empilhados | P2 | M |
| OTTO-0045 | Texto longo sem quebra estoura a bolha horizontalmente | P2 | S |
| OTTO-0046 | Emoji e acentos quebram o efeito de digitação (caractere solto) | P2 | M |
| OTTO-0047 | Mensagens antigas perdem formatação ao restaurar a sessão | P2 | M |
| OTTO-0048 | Console poluído por warning de `key` duplicada na lista de mensagens | P2 | S |
| OTTO-0049 | Erros de runtime não são reportados a lugar nenhum além do console | P1 | M |
| OTTO-0050 | Nenhuma tela de "offline" explícita: usuário acha que o app travou | P1 | S |

## Área 02 · Voz: entrada (STT)
*Objetivo: falar uma vez, ser entendido de primeira, mesmo com ruído.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0051 | Wake word "Otto" processada no dispositivo, sem nuvem | P1 | L |
| OTTO-0052 | VAD para cortar silêncio no início e no fim da fala antes do upload | P0 | L |
| OTTO-0053 | Push-to-talk (segurar espaço) como alternativa ao modo contínuo | P1 | M |
| OTTO-0054 | Atalho global Ctrl+Espaço para iniciar a fala em qualquer tela | P1 | M |
| OTTO-0055 | Esc cancela a transcrição em andamento sem enviar | P1 | S |
| OTTO-0056 | Seleção de dispositivo de entrada nas Configurações | P1 | M |
| OTTO-0057 | Medidor de nível de entrada (VU) ao lado do botão de microfone | P2 | S |
| OTTO-0058 | Aviso quando o microfone está mudo no sistema operacional | P1 | M |
| OTTO-0059 | Reconexão automática do STT em queda de rede | P1 | M |
| OTTO-0060 | Envio do áudio em blocos de 250 ms em vez de um blob único no fim | P1 | L |
| OTTO-0061 | Transcrição parcial em streaming, em vez de esperar o fim | P1 | L |
| OTTO-0062 | Pontuação automática nas transcrições | P2 | M |
| OTTO-0063 | Dicionário pessoal para corrigir nomes próprios recorrentes | P2 | M |
| OTTO-0064 | Comando de voz para corrigir a última mensagem ("não, eu quis dizer…") | P2 | L |
| OTTO-0065 | Conversão de números e datas falados ("doze de março" para 12/03) | P2 | M |
| OTTO-0066 | Detecção automática de idioma PT, EN e ES | P2 | L |
| OTTO-0067 | Modo sussurro com ganho adaptativo para fala baixa | P3 | M |
| OTTO-0068 | Redução de ruído antes do STT | P2 | L |
| OTTO-0069 | Half-duplex: microfone atenuado enquanto o TTS fala, evitando eco | P0 | M |
| OTTO-0070 | Barge-in: falar interrompe o OTTO imediatamente | P0 | L |
| OTTO-0071 | Contagem regressiva opcional de 3–2–1 antes de gravar | P3 | S |
| OTTO-0072 | Limite de duração por gravação, com aviso aos 55 segundos | P2 | S |
| OTTO-0073 | Silêncio longo pede repetição em vez de devolver erro | P1 | S |
| OTTO-0074 | Retomar a última gravação se o envio falhar | P1 | M |
| OTTO-0075 | Teste de microfone nas Configurações (ouvir a si mesmo) | P2 | M |
| OTTO-0076 | Compressão opus 16 kHz para reduzir o upload pela metade | P2 | M |
| OTTO-0077 | Transcrição local opcional (Whisper WASM) para privacidade | P3 | L |
| OTTO-0078 | Áudio bruto guardado só 24 h, com expurgo automático e aviso | P2 | M |
| OTTO-0079 | Consentimento explícito na primeira gravação, revogável | P1 | S |
| OTTO-0080 | Estado do botão inequívoco: gravando, transcrevendo, enviado | P1 | S |
| OTTO-0081 | Vibração curta ao iniciar e encerrar a captura no mobile | P3 | S |
| OTTO-0082 | Bloqueio de gravação dupla em cliques com menos de 300 ms | P1 | S |
| OTTO-0083 | Wake word pausada durante o TTS para não se auto-disparar | P1 | M |
| OTTO-0084 | Métrica de duração da fala até a resposta no painel de diagnóstico | P2 | M |
| OTTO-0085 | Fallback para digitação após duas falhas seguidas de STT | P1 | M |
| OTTO-0086 | Encerrar o envio sem cortar a frase quando o usuário pausa no meio | P3 | M |
| OTTO-0087 | Normalização de volume (loudness) antes de enviar | P2 | M |
| OTTO-0088 | Detectar fala sobreposta de duas pessoas e avisar | P3 | L |
| OTTO-0089 | Comandos curtos reconhecidos offline: parar, repetir, limpar | P2 | M |
| OTTO-0090 | Idioma de entrada salvo por dispositivo | P2 | S |
| OTTO-0091 | Iniciar gravação por teclado, com foco visível | P1 | S |
| OTTO-0092 | Compatibilidade com Safari iOS 15+, onde MediaRecorder falta | P1 | M |
| OTTO-0093 | Fallback de captura via AudioWorklet quando MediaRecorder falha | P2 | L |
| OTTO-0094 | Explicar na UI por que o microfone é necessário antes de pedir | P1 | S |
| OTTO-0095 | Indicador discreto e persistente de "OTTO está ouvindo" | P1 | S |
| OTTO-0096 | Teste E2E simulando áudio com fixture WAV | P2 | L |
| OTTO-0097 | Teste unitário do VAD com amostras sintéticas | P2 | M |
| OTTO-0098 | ADR documentando o pipeline de voz | P2 | S |
| OTTO-0099 | Telemetria de falhas de STT por navegador e versão | P2 | M |
| OTTO-0100 | Modo "só escuta" sem envio, para comandos de navegação | P3 | L |

## Área 03 · Voz: saída (TTS)
*Objetivo: o OTTO começa a falar em menos de 500 ms e nunca estala nem se atropela.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0101 | Tocar a primeira frase enquanto o resto ainda é sintetizado | P0 | L |
| OTTO-0102 | Dividir a resposta por sentença para reduzir a latência percebida | P0 | M |
| OTTO-0103 | Fallback em cadeia: Gemini para ElevenLabs para Web Speech | P0 | M |
| OTTO-0104 | Fila com prioridade: barge-in limpa tudo que estava pendente | P0 | M |
| OTTO-0105 | Pré-aquecer o motor de voz na abertura do app | P1 | M |
| OTTO-0106 | Voz padrão por idioma, sem misturar PT e EN na mesma frase | P1 | M |
| OTTO-0107 | Controle de velocidade de fala entre 0.8x e 1.5x | P1 | S |
| OTTO-0108 | Volume e mudo persistentes entre sessões | P1 | S |
| OTTO-0109 | Ignorar blocos de código na leitura, resumindo em uma frase | P1 | M |
| OTTO-0110 | Não ler marcação markdown literal (asteriscos, cerquilhas) | P1 | S |
| OTTO-0111 | Resposta longa: falar a primeira frase e perguntar se continua | P2 | M |
| OTTO-0112 | Modo "fala curto, escreve longo" como padrão | P1 | L |
| OTTO-0113 | Silenciar o TTS enquanto o usuário digita ou fala | P1 | M |
| OTTO-0114 | Web Speech como último recurso quando não há chave de nuvem | P1 | M |
| OTTO-0115 | Erro 401 do provedor diz qual chave falhou e onde trocá-la | P1 | S |
| OTTO-0116 | Aviso imediato quando a chave salva é inválida | P1 | S |
| OTTO-0117 | Dividir automaticamente textos acima do limite de caracteres | P1 | M |
| OTTO-0118 | Voz consistente entre todas as mensagens da mesma sessão | P1 | S |
| OTTO-0119 | Loop de eco (OTTO ouvindo a si mesmo) detectado e interrompido | P1 | M |
| OTTO-0120 | Modo "só texto" para quem não quer áudio | P1 | S |
| OTTO-0121 | Abafar o leitor de tela para não falar em duplicidade | P1 | M |
| OTTO-0122 | Fade-in e fade-out de 60 ms para não estalar no início e no fim | P2 | S |
| OTTO-0123 | Normalizar o volume (loudness) entre provedores diferentes | P2 | M |
| OTTO-0124 | Cache de áudio por frase repetida (saudação, erros) | P2 | M |
| OTTO-0125 | Preview da voz escolhida nas Configurações | P2 | S |
| OTTO-0126 | Seleção de voz por idioma do texto, não do app | P2 | M |
| OTTO-0127 | Pronúncia correta de siglas, URLs, números e valores em reais | P2 | M |
| OTTO-0128 | Ler tabelas como resumo, não célula por célula | P2 | M |
| OTTO-0129 | Retomar a leitura do ponto onde parou | P2 | M |
| OTTO-0130 | Destaque sincronizado do trecho que está sendo lido | P2 | L |
| OTTO-0131 | Continuar tocando com a tela bloqueada (Media Session) | P2 | M |
| OTTO-0132 | Troca de rota de áudio para fones Bluetooth sem cortar a fala | P2 | M |
| OTTO-0133 | Recuperar a reprodução após perda de foco da aba | P2 | M |
| OTTO-0134 | Teste de conexão por provedor de voz em Configurações | P2 | M |
| OTTO-0135 | Métrica de tempo até o primeiro áudio (TTFB) no diagnóstico | P2 | M |
| OTTO-0136 | Contador de caracteres e custo por sessão | P3 | M |
| OTTO-0137 | Controle de pitch | P3 | S |
| OTTO-0138 | Pausa configurável entre frases | P3 | S |
| OTTO-0139 | Suporte mínimo a SSML (pausa e ênfase) | P3 | M |
| OTTO-0140 | Ler emojis como palavras, opcional | P3 | S |
| OTTO-0141 | Ducking: abaixar a música do sistema enquanto fala | P3 | L |
| OTTO-0142 | Estilo de fala por contexto (erro sério, sucesso, conversa) | P3 | L |
| OTTO-0143 | Sotaque regional PT-BR opcional | P3 | M |
| OTTO-0144 | Clonagem de voz com consentimento explícito e aviso legal | P3 | L |
| OTTO-0145 | Download do áudio gerado | P3 | S |
| OTTO-0146 | Transcrição sob demanda ao lado de cada áudio | P3 | M |
| OTTO-0147 | Idioma de saída independente do idioma de entrada | P2 | M |
| OTTO-0148 | Bateria de 20 frases por idioma comparando provedores | P2 | L |
| OTTO-0149 | Documentar limites, cotas e preços de cada provedor de voz | P2 | S |
| OTTO-0150 | Exibir duração estimada da fala antes de tocar | P3 | S |

## Área 04 · Conversa, intenção e prompt
*Objetivo: entender o pedido de primeira e responder em uma frase, sem enrolação.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0151 | Mensagem clara quando falta chave de API, com link para configurar | P0 | S |
| OTTO-0152 | Classificador de intenção com fallback determinístico | P0 | M |
| OTTO-0153 | Confirmação obrigatória antes de ação destrutiva (apagar, sobrescrever) | P0 | M |
| OTTO-0154 | Nunca inventar resultado de ferramenta: dizer o que falhou | P0 | M |
| OTTO-0155 | Sanitizar injeção de prompt vinda de páginas web lidas | P0 | M |
| OTTO-0156 | Desambiguar "isso" e "aquilo" usando a última entidade citada | P1 | M |
| OTTO-0157 | Janela de contexto adaptativa ao tamanho da conversa | P1 | L |
| OTTO-0158 | Sumarização automática quando a janela enche | P1 | L |
| OTTO-0159 | Comandos de controle (pare, repita, resuma, limpe) fora do modelo | P1 | M |
| OTTO-0160 | Responder no idioma do usuário, não no idioma do app | P1 | M |
| OTTO-0161 | Tom conciso por padrão, detalhado só quando pedido | P1 | M |
| OTTO-0162 | Primeira frase é a resposta; o resto é contexto | P1 | S |
| OTTO-0163 | Mostrar de forma resumida o que o OTTO fez (traço de ferramentas) | P1 | M |
| OTTO-0164 | Perguntar antes de operações longas ou caras | P1 | M |
| OTTO-0165 | Uma única pergunta de esclarecimento por turno | P1 | S |
| OTTO-0166 | Recusar com alternativa prática em vez de "não posso" | P1 | S |
| OTTO-0167 | Citar fontes quando usar busca na web | P1 | M |
| OTTO-0168 | Sanitizar injeção em nomes de arquivo e na memória | P1 | M |
| OTTO-0169 | Limite de tamanho de entrada com mensagem clara | P1 | S |
| OTTO-0170 | Conjunto de ouro de 50 casos para regressão de prompt | P1 | L |
| OTTO-0171 | Reconhecer referência a mensagens anteriores ("o segundo item") | P2 | M |
| OTTO-0172 | Truncar histórico por relevância, não por idade | P2 | L |
| OTTO-0173 | Deduplicar mensagens idênticas consecutivas | P2 | S |
| OTTO-0174 | Botão de regenerar a resposta | P2 | S |
| OTTO-0175 | Editar mensagem enviada e reenviar | P2 | M |
| OTTO-0176 | Sugestões contextuais após cada resposta | P2 | M |
| OTTO-0177 | Aceitar follow-ups curtos ("e agora?") | P2 | M |
| OTTO-0178 | Correção do usuário vira fato na memória ("na verdade é X") | P2 | L |
| OTTO-0179 | Nunca repetir a pergunta do usuário na resposta falada | P2 | S |
| OTTO-0180 | Marcar incerteza com um nível de confiança | P2 | M |
| OTTO-0181 | Evitar listas longas em resposta que será falada | P2 | S |
| OTTO-0182 | Guardrails de conteúdo sensível com mensagem honesta | P2 | M |
| OTTO-0183 | Ensinar o OTTO sobre o usuário por um perfil editável | P2 | M |
| OTTO-0184 | Perguntar antes de salvar qualquer coisa na memória | P2 | M |
| OTTO-0185 | Explicar quando o limite de contexto foi atingido | P2 | S |
| OTTO-0186 | Retomar planos pendentes na próxima mensagem | P2 | M |
| OTTO-0187 | Avaliação automática de qualidade (LLM como juiz) | P2 | L |
| OTTO-0188 | Custo estimado por conversa no log de diagnóstico | P2 | M |
| OTTO-0189 | Registrar a decisão do roteador de intenção | P2 | M |
| OTTO-0190 | Reproduzir conversa problemática a partir de um ID | P2 | M |
| OTTO-0191 | Modo demonstração sem nenhuma chave de API | P2 | M |
| OTTO-0192 | Bloco "o que eu entendi" antes de ações arriscadas | P2 | M |
| OTTO-0193 | Personalidade configurável (formal, direto, amigável) | P3 | M |
| OTTO-0194 | Nome do assistente configurável | P3 | S |
| OTTO-0195 | Resumo do dia na abertura do app | P3 | M |
| OTTO-0196 | Fork de conversa a partir de uma mensagem | P3 | L |
| OTTO-0197 | Continuidade de conversa entre dispositivos | P3 | L |
| OTTO-0198 | Reduzir emojis nas respostas | P3 | S |
| OTTO-0199 | Comparação A/B de dois prompts | P3 | M |
| OTTO-0200 | Biblioteca de prompts por tarefa com versão e changelog | P3 | M |

## Área 05 · Streaming e latência
*Objetivo: primeira palavra em menos de 1 s e nenhum travamento enquanto o texto chega.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0201 | Não re-renderizar a lista inteira a cada token recebido | P0 | M |
| OTTO-0202 | Cancelar a requisição de verdade ao fechar, trocar de tela ou sair | P0 | S |
| OTTO-0203 | Timeout escalonado: 10 s para o primeiro byte, 30 s no total | P0 | S |
| OTTO-0204 | Garantir que a rota de stream não bufferize (flush por chunk) | P0 | M |
| OTTO-0205 | Agrupar tokens em lotes de 50 ms antes de atualizar o estado | P1 | M |
| OTTO-0206 | Memoizar as bolhas de mensagem já concluídas | P1 | S |
| OTTO-0207 | Substituir o efeito de digitação por render progressivo por palavra | P1 | M |
| OTTO-0208 | Throttle do autoscroll por requestAnimationFrame | P1 | S |
| OTTO-0209 | Evitar layout thrash no autoscroll durante o streaming | P1 | S |
| OTTO-0210 | Pausar partículas e holograma enquanto o texto streama | P1 | S |
| OTTO-0211 | Retry com backoff exponencial e jitter em falhas transitórias | P1 | M |
| OTTO-0212 | Fallback automático entre provedores quando um cai | P1 | L |
| OTTO-0213 | Compressão gzip/brotli nas respostas JSON | P1 | S |
| OTTO-0214 | Keep-alive e reúso de conexão no servidor | P1 | M |
| OTTO-0215 | Limitar o histórico enviado: resumo mais as últimas N mensagens | P1 | M |
| OTTO-0216 | Desligar o bridge de build e o polling de 2,5 s em produção | P1 | S |
| OTTO-0217 | Medir o tempo até o primeiro token por modelo e exibir no diagnóstico | P1 | M |
| OTTO-0218 | Meta explícita: primeira resposta abaixo de 800 ms no p50 | P1 | M |
| OTTO-0219 | Verificar com performance.mark se a animação causa jank no stream | P1 | L |
| OTTO-0220 | Usar ReadableStream nativo no cliente, sem buffer intermediário | P1 | M |
| OTTO-0221 | Virtualizar a lista de mensagens acima de 100 itens | P2 | L |
| OTTO-0222 | Preconnect e warmup de DNS/TLS para os provedores | P2 | S |
| OTTO-0223 | Circuit breaker por provedor, com aviso na UI | P2 | L |
| OTTO-0224 | Cache HTTP dos assets com hash de conteúdo | P2 | S |
| OTTO-0225 | Service worker para assets estáticos | P2 | L |
| OTTO-0226 | Prefetch das telas pesadas no tempo ocioso | P2 | S |
| OTTO-0227 | Prefetch do próximo passo do plano em execução | P3 | M |
| OTTO-0228 | Dividir o bundle em vendor, ui e services | P2 | M |
| OTTO-0229 | Corrigir o carregamento do CSS crítico | P2 | M |
| OTTO-0230 | Fonte com display swap e preload | P2 | S |
| OTTO-0231 | Imagens com dimensões explícitas para não deslocar o layout | P2 | S |
| OTTO-0232 | Cache das decisões do classificador de intenção | P2 | M |
| OTTO-0233 | Limitar o tamanho do payload de histórico por requisição | P2 | S |
| OTTO-0234 | Compressão dos payloads grandes (exportações, memória) | P2 | S |
| OTTO-0235 | Carregar hologramas só quando visíveis (IntersectionObserver) | P2 | S |
| OTTO-0236 | Adiar animações pesadas para o tempo ocioso | P2 | M |
| OTTO-0237 | Detectar conexão lenta e reduzir efeitos automaticamente | P2 | M |
| OTTO-0238 | Modo economia que desliga animações e partículas | P2 | S |
| OTTO-0239 | Orçamento de bundle com alerta no CI (limite de 450 kB) | P2 | M |
| OTTO-0240 | Relatório visual de composição do bundle | P2 | S |
| OTTO-0241 | Remover dependências não utilizadas do package.json | P2 | S |
| OTTO-0242 | Medir e publicar p50, p95 e p99 no painel de saúde | P2 | M |
| OTTO-0243 | Medir FPS durante o streaming e avisar em desenvolvimento | P2 | M |
| OTTO-0244 | Adiar a síntese de voz até a primeira frase completa | P1 | M |
| OTTO-0245 | Pré-carregar o classificador de intenção leve | P3 | M |
| OTTO-0246 | Cache de respostas frequentes (saudações, status) | P3 | M |
| OTTO-0247 | Compressão de áudio de entrada antes do STT | P2 | M |
| OTTO-0248 | Reduzir o custo do primeiro paint (above the fold enxuto) | P2 | M |
| OTTO-0249 | Instrumentar Web Vitals (LCP, INP, CLS) de verdade | P2 | M |
| OTTO-0250 | Garantir que o proxy repasse o stream sem buffering (cache desligado) | P1 | M |

## Área 06 · Memória de longo prazo
*Objetivo: o OTTO lembrar do que importa, esquecer o que pediram e nunca vazar o que não deve.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0251 | Persistir a memória no servidor com esquema versionado | P1 | L |
| OTTO-0252 | Migrar o que hoje vive em localStorage para o servidor | P1 | M |
| OTTO-0253 | Tela de memória com busca, filtro, edição e exclusão | P1 | M |
| OTTO-0254 | Classificar memória por tipo: fato, preferência, projeto, temporária | P1 | M |
| OTTO-0255 | Expiração automática das memórias temporárias | P1 | M |
| OTTO-0256 | Botão "esquecer isso" em cada mensagem | P1 | M |
| OTTO-0257 | Nunca gravar dado sensível (documento, cartão, senha) | P1 | M |
| OTTO-0258 | Busca por palavra-chave com fallback simples | P1 | M |
| OTTO-0259 | Ordenar resultados por relevância e recência | P1 | M |
| OTTO-0260 | Injetar memória no prompt com orçamento de tokens explícito | P1 | M |
| OTTO-0261 | Não injetar memória irrelevante (ruído piora a resposta) | P1 | M |
| OTTO-0262 | Desfazer a exclusão de uma memória | P1 | S |
| OTTO-0263 | Testes cobrindo gravar, recuperar e apagar | P1 | M |
| OTTO-0264 | Limpar toda a memória em um clique, com confirmação dupla | P1 | S |
| OTTO-0265 | Deduplicar memórias semelhantes antes de gravar | P2 | M |
| OTTO-0266 | Pontuação de confiança por memória | P2 | M |
| OTTO-0267 | Mostrar a mensagem de origem de cada memória | P2 | M |
| OTTO-0268 | Importar e exportar memória em JSON | P2 | M |
| OTTO-0269 | Criptografia em repouso | P2 | L |
| OTTO-0270 | Detecção de PII com mascaramento automático | P2 | L |
| OTTO-0271 | Limite de itens por usuário com aviso ao chegar perto | P2 | S |
| OTTO-0272 | Busca semântica com embeddings | P2 | L |
| OTTO-0273 | Auditoria: quando e por que cada memória foi gravada | P2 | M |
| OTTO-0274 | Memória por projeto, com contextos separados | P2 | M |
| OTTO-0275 | Backup diário rotativo | P2 | M |
| OTTO-0276 | Restauração a partir de backup | P2 | M |
| OTTO-0277 | Índice por tags e filtro combinado | P2 | M |
| OTTO-0278 | Explicar "por que o OTTO lembrou disso" | P2 | M |
| OTTO-0279 | Memória negativa explícita ("não gosto de X") | P2 | M |
| OTTO-0280 | Atualizar memória conflitante em vez de duplicar | P2 | L |
| OTTO-0281 | Modo privado que não grava nada | P2 | M |
| OTTO-0282 | Preferências de UI na memória (tema, voz, velocidade) | P2 | S |
| OTTO-0283 | Preferências por dispositivo versus por conta | P2 | M |
| OTTO-0284 | Visualização planetária com zoom, filtros e legenda | P2 | L |
| OTTO-0285 | Estados vazios explicando o que é memória e para que serve | P2 | S |
| OTTO-0286 | Painel de uso: quantidade, tamanho e crescimento | P2 | S |
| OTTO-0287 | Compatibilidade retroativa do formato ao migrar | P2 | M |
| OTTO-0288 | Documentar o modelo de dados de memória | P2 | S |
| OTTO-0289 | Revisão periódica das memórias não usadas em 90 dias | P3 | M |
| OTTO-0290 | Memória compartilhada entre dispositivos | P3 | L |
| OTTO-0291 | Resolução de conflito de sincronização, com regra explícita | P3 | L |
| OTTO-0292 | Favoritar memórias para injeção prioritária | P3 | S |
| OTTO-0293 | Memória de arquivos indexados | P3 | L |
| OTTO-0294 | Indexar pastas de projeto do usuário | P3 | L |
| OTTO-0295 | Reindexação incremental ao detectar mudança | P3 | L |
| OTTO-0296 | Resumo automático de projetos longos | P3 | M |
| OTTO-0297 | Log de leitura de memória para auditoria de privacidade | P3 | M |
| OTTO-0298 | Alertas quando a cota de memória está próxima do limite | P3 | S |
| OTTO-0299 | Suporte a sinônimos em português na busca | P3 | M |
| OTTO-0300 | Benchmark de recuperação (precisão nos 5 primeiros) | P3 | M |

## Área 07 · Modo Agente e planos
*Objetivo: um plano de 5 etapas executa, falha de forma honesta e pode ser retomado.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0301 | Persistir planos e retomar depois de recarregar a página | P0 | M |
| OTTO-0302 | Estado explícito por etapa: pendente, rodando, concluída, falhou, pulada | P0 | M |
| OTTO-0303 | Falha parcial continua o que é possível e reporta o que não deu | P0 | M |
| OTTO-0304 | Timeout individual por etapa | P0 | S |
| OTTO-0305 | Cancelar o plano inteiro liberando processos e recursos | P0 | M |
| OTTO-0306 | Aprovação humana obrigatória antes de etapa destrutiva | P0 | M |
| OTTO-0307 | Nunca executar comando de shell não revisado em modo seguro | P0 | M |
| OTTO-0308 | Botão de repetir a etapa e de repetir a partir dela | P1 | S |
| OTTO-0309 | Log de execução com entrada e saída de cada etapa | P1 | M |
| OTTO-0310 | Limite de etapas e de tempo total por plano | P1 | S |
| OTTO-0311 | Progresso real, baseado em etapas concluídas | P1 | S |
| OTTO-0312 | Resumo final em até três linhas | P1 | S |
| OTTO-0313 | Editar o plano antes de executar | P1 | M |
| OTTO-0314 | Perguntar quando uma etapa é ambígua, em vez de adivinhar | P1 | M |
| OTTO-0315 | Modo "explicar antes de agir" ligado por padrão | P1 | S |
| OTTO-0316 | Foco preso e navegação por teclado no modal do agente | P1 | S |
| OTTO-0317 | Retomada após queda de rede do servidor | P1 | L |
| OTTO-0318 | Teste E2E de um plano de três etapas | P1 | M |
| OTTO-0319 | Teste de falha proposital na segunda etapa | P1 | M |
| OTTO-0320 | Plano que falha duas vezes pede ajuda ao usuário em vez de insistir | P1 | M |
| OTTO-0321 | Orçamento de custo por plano | P2 | M |
| OTTO-0322 | Detectar plano circular ou repetitivo | P2 | M |
| OTTO-0323 | Deduplicar etapas equivalentes | P2 | M |
| OTTO-0324 | Ordenar etapas por dependência | P2 | L |
| OTTO-0325 | Notificar ao terminar em segundo plano | P2 | M |
| OTTO-0326 | Exportar plano em markdown | P2 | S |
| OTTO-0327 | Templates de plano: relatório, refatoração, pesquisa | P2 | M |
| OTTO-0328 | Histórico de planos com resultado | P2 | M |
| OTTO-0329 | Retry inteligente usando o contexto do erro | P2 | L |
| OTTO-0330 | Sandbox isolado por plano | P1 | L |
| OTTO-0331 | Limpeza de artefatos temporários ao encerrar | P2 | S |
| OTTO-0332 | Aviso quando o plano excede o contexto do modelo | P2 | M |
| OTTO-0333 | Modo "agir e explicar depois" para tarefas simples | P2 | M |
| OTTO-0334 | Estado do agente visível no header sem poluir | P2 | S |
| OTTO-0335 | Idempotência das ferramentas em caso de retry | P2 | L |
| OTTO-0336 | Integrar decisões do plano à memória | P2 | M |
| OTTO-0337 | Relatório de diff ao final da execução | P2 | M |
| OTTO-0338 | Rollback das alterações de arquivos | P2 | L |
| OTTO-0339 | Backup automático antes de qualquer edição | P2 | M |
| OTTO-0340 | Métrica de sucesso por tipo de etapa | P2 | M |
| OTTO-0341 | Auditoria de todas as ações executadas | P2 | M |
| OTTO-0342 | ADR documentando o orquestrador | P2 | S |
| OTTO-0343 | Marcar etapas paralelizáveis com segurança | P3 | L |
| OTTO-0344 | Confirmação em lote de várias ações | P3 | M |
| OTTO-0345 | Fila de planos com prioridade | P3 | M |
| OTTO-0346 | Agendamento de plano por horário | P3 | L |
| OTTO-0347 | Gatilhos automáticos (ao conectar, ao abrir arquivo) | P3 | L |
| OTTO-0348 | Exibir a justificativa de cada etapa | P3 | M |
| OTTO-0349 | Limite de custo por usuário por dia | P3 | M |
| OTTO-0350 | Anunciar o progresso do plano em região aria-live | P1 | S |

## Área 08 · Ferramentas, arquivos e sandbox
*Objetivo: o OTTO mexe no computador com poder real e risco controlado.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0351 | Restringir leitura e escrita à raiz do workspace | P0 | M |
| OTTO-0352 | Testes de path traversal, symlink e sequências codificadas | P0 | M |
| OTTO-0353 | Sandbox com limite de CPU e memória | P0 | M |
| OTTO-0354 | Timeout obrigatório em toda execução de código | P0 | S |
| OTTO-0355 | Acesso ao sistema de arquivos do host bloqueado no sandbox | P0 | L |
| OTTO-0356 | Execução de comando com aprovação e explicação do efeito | P0 | M |
| OTTO-0357 | Diff antes de sobrescrever qualquer arquivo | P1 | M |
| OTTO-0358 | Backup automático antes de escrita | P1 | M |
| OTTO-0359 | Confirmação de exclusão mostrando quantos itens serão afetados | P1 | S |
| OTTO-0360 | Lixeira em vez de exclusão imediata | P1 | M |
| OTTO-0361 | Rede desligada por padrão no sandbox | P1 | M |
| OTTO-0362 | Limpeza de processos órfãos após execução | P1 | M |
| OTTO-0363 | Lista de comandos explicitamente bloqueados | P1 | M |
| OTTO-0364 | Busca em arquivos com limites de tempo e resultado | P1 | M |
| OTTO-0365 | Criar, renomear e mover arquivos e pastas | P1 | M |
| OTTO-0366 | Ler arquivo grande em partes, sem estourar a memória | P1 | M |
| OTTO-0367 | Detectar prompt interativo que travaria a execução | P1 | M |
| OTTO-0368 | Download de arquivos gerados | P1 | M |
| OTTO-0369 | Validação de tipo e tamanho no upload | P1 | S |
| OTTO-0370 | Mensagens de erro de ferramenta em português claro | P1 | S |
| OTTO-0371 | Testes de isolamento e timeout do sandbox | P1 | L |
| OTTO-0372 | Abrir o arquivo citado na resposta com um clique | P1 | M |
| OTTO-0373 | Editor inline de arquivo com salvamento | P2 | L |
| OTTO-0374 | Terminal com saída em streaming | P2 | M |
| OTTO-0375 | Histórico de comandos executados | P2 | M |
| OTTO-0376 | Repetir o último comando | P2 | S |
| OTTO-0377 | Copiar a saída do terminal | P2 | S |
| OTTO-0378 | Limite de tamanho de saída com "ver tudo" | P2 | S |
| OTTO-0379 | Preview de imagem e PDF | P2 | M |
| OTTO-0380 | Renderizar markdown, CSV e JSON com visualização rica | P2 | M |
| OTTO-0381 | Arrastar e soltar arquivos na janela | P2 | M |
| OTTO-0382 | Barra de progresso de upload | P2 | S |
| OTTO-0383 | Limpeza automática de uploads antigos | P2 | S |
| OTTO-0384 | Ambiente com dependências pré-instaladas | P2 | L |
| OTTO-0385 | Versões pinadas de runtime e bibliotecas | P2 | M |
| OTTO-0386 | Preservar quebras de linha CRLF e LF | P2 | S |
| OTTO-0387 | Detecção de encoding na leitura | P3 | S |
| OTTO-0388 | Cache de instalação de pacotes | P3 | L |
| OTTO-0389 | Suporte a stdin nos comandos | P3 | M |
| OTTO-0390 | Referenciar arquivo com @ no chat | P2 | M |
| OTTO-0391 | Autocomplete de caminhos ao digitar @ | P3 | M |
| OTTO-0392 | Preservar permissões de arquivo ao mover | P3 | M |
| OTTO-0393 | Desfazer a última escrita | P3 | L |
| OTTO-0394 | Watcher de arquivos com evento no chat | P3 | L |
| OTTO-0395 | Compartilhar arquivo por link temporário | P3 | L |
| OTTO-0396 | Varredura básica de arquivos maliciosos no upload | P3 | L |
| OTTO-0397 | Catálogo de ferramentas visível na interface | P2 | M |
| OTTO-0398 | Telemetria de uso e falha por ferramenta | P2 | M |
| OTTO-0399 | Documentar capacidades e limites de cada ferramenta | P2 | S |
| OTTO-0400 | Executar no sandbox apenas binários presentes na allowlist | P1 | M |

## Área 09 · Data Hub
*Objetivo: dados que o OTTO produz viram algo que dá para ler, filtrar e levar embora.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0401 | Persistir datasets no IndexedDB com queda graciosa para memória | P1 | M |
| OTTO-0402 | Limite de tamanho por dataset, com aviso antes de estourar | P1 | S |
| OTTO-0403 | Importar CSV, JSON e XLSX arrastando para o painel | P1 | M |
| OTTO-0404 | Detectar delimitador e encoding do CSV automaticamente | P2 | M |
| OTTO-0405 | Erros de parse indicando linha e coluna exatas | P1 | S |
| OTTO-0406 | Tabela com cabeçalho fixo e primeira coluna fixa | P1 | S |
| OTTO-0407 | Paginação com virtualização para muitas linhas | P2 | M |
| OTTO-0408 | Ordenação por coluna | P2 | S |
| OTTO-0409 | Filtros por coluna com busca | P2 | M |
| OTTO-0410 | Agregações rápidas: soma, média, mínimo, máximo, contagem | P2 | M |
| OTTO-0411 | Escolher automaticamente o tipo de gráfico adequado aos dados | P2 | L |
| OTTO-0412 | Exportar gráfico em PNG e SVG | P2 | M |
| OTTO-0413 | Exportar tabela filtrada em CSV | P2 | S |
| OTTO-0414 | Auditar contraste de todos os estados no tema claro | P1 | S |
| OTTO-0415 | Paleta de séries acessível para daltonismo | P2 | M |
| OTTO-0416 | Cópia de célula e de linha | P2 | S |
| OTTO-0417 | Edição inline de célula com validação de tipo | P2 | M |
| OTTO-0418 | Desfazer a edição de célula | P2 | M |
| OTTO-0419 | Navegar entre as mudanças no visualizador de diff | P2 | M |
| OTTO-0420 | Opção de ignorar espaços no diff | P3 | S |
| OTTO-0421 | Descrição do dataset gerada pelo OTTO | P2 | M |
| OTTO-0422 | Perguntar em linguagem natural sobre o dataset | P2 | L |
| OTTO-0423 | Amostragem automática acima de 10 mil linhas | P2 | M |
| OTTO-0424 | Leitura em streaming para arquivos grandes | P2 | L |
| OTTO-0425 | Compressão dos blobs antes de guardar | P2 | M |
| OTTO-0426 | Aviso claro quando um blob expira | P1 | S |
| OTTO-0427 | Monitorar a cota do navegador e limpar o que é antigo | P1 | M |
| OTTO-0428 | Migração de formato de armazenamento com versão | P2 | M |
| OTTO-0429 | Rascunho preservado ao fechar e reabrir o painel | P3 | S |
| OTTO-0430 | Aviso de perda ao fechar com edição não salva | P2 | S |
| OTTO-0431 | Atalhos Cmd/Ctrl+S para salvar e Esc para fechar | P2 | S |
| OTTO-0432 | Foco preso e navegação por teclado no painel | P1 | S |
| OTTO-0433 | Scroll da página travado enquanto o painel abre | P1 | S |
| OTTO-0434 | Sheet no mobile e painel central no desktop | P2 | M |
| OTTO-0435 | Link direto para um dataset específico | P3 | M |
| OTTO-0436 | Compartilhar dataset como arquivo ou link | P3 | L |
| OTTO-0437 | Notas e comentários por dataset | P3 | M |
| OTTO-0438 | Selo "gerado pelo agente" com origem rastreável | P2 | M |
| OTTO-0439 | Ligar cada dataset à etapa do plano que o gerou | P2 | M |
| OTTO-0440 | Estado vazio com exemplos do que dá para fazer | P2 | S |
| OTTO-0441 | Testes de parse para CSV malformado e vazio | P1 | M |
| OTTO-0442 | Teste de performance com 50 mil linhas | P2 | M |
| OTTO-0443 | Detecção de valores fora do padrão (outliers) | P3 | L |
| OTTO-0444 | Histórico de versões do dataset | P3 | L |
| OTTO-0445 | Consulta SQL local sobre o dataset | P3 | L |
| OTTO-0446 | Excluir dataset com confirmação e opção de desfazer | P1 | S |
| OTTO-0447 | Métricas de uso do Data Hub | P3 | S |
| OTTO-0448 | Documentar o formato interno de dataset | P2 | S |
| OTTO-0449 | Revisar o tema escuro depois das mudanças do claro | P2 | S |
| OTTO-0450 | Garantir que nada do Data Hub dependa de hover | P2 | S |

## Área 10 · Hologramas e visualização
*Objetivo: bonito sem custar fluidez — a animação serve à informação, não compete com ela.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0451 | Reduzir a contagem de partículas em aparelhos modestos | P1 | M |
| OTTO-0452 | Limitar partículas a 30 fps | P2 | S |
| OTTO-0453 | Desligar animações com prefers-reduced-motion | P1 | S |
| OTTO-0454 | Parar a animação com a aba em segundo plano | P1 | S |
| OTTO-0455 | Pausar quando o elemento sai da viewport | P2 | S |
| OTTO-0456 | Corrigir vazamento do canvas recriado a cada montagem | P1 | M |
| OTTO-0457 | Respeitar o devicePixelRatio em telas retina | P2 | S |
| OTTO-0458 | Fallback estático quando WebGL não está disponível | P1 | M |
| OTTO-0459 | Contraste dos textos do holograma no tema claro | P1 | M |
| OTTO-0460 | Legibilidade e cópia de texto no holograma de texto | P1 | S |
| OTTO-0461 | Texto alternativo e decodificação tardia nas imagens | P2 | S |
| OTTO-0462 | Navegação por teclado na galeria | P2 | S |
| OTTO-0463 | Eixos, rótulos e valores legíveis no gráfico holográfico | P2 | M |
| OTTO-0464 | Tooltip com valores ao passar o mouse | P2 | M |
| OTTO-0465 | Paleta acessível nos hologramas | P2 | M |
| OTTO-0466 | Respeitar a escala de fonte configurada no sistema | P2 | S |
| OTTO-0467 | Zoom sem quebrar o layout | P3 | M |
| OTTO-0468 | Transição entre hologramas sem piscar | P2 | M |
| OTTO-0469 | Fila de hologramas quando vários chegam juntos | P2 | S |
| OTTO-0470 | Limite de hologramas simultâneos | P2 | S |
| OTTO-0471 | Estado de carregamento consistente entre tipos | P2 | S |
| OTTO-0472 | Placeholder quando a imagem falha (404) | P1 | S |
| OTTO-0473 | Timeout no proxy de imagem | P1 | S |
| OTTO-0474 | Cache das imagens buscadas | P2 | M |
| OTTO-0475 | Evitar deslocamento de layout na formação | P2 | S |
| OTTO-0476 | Fechar com Esc e com clique fora | P1 | S |
| OTTO-0477 | Foco preso no modal do holograma | P1 | S |
| OTTO-0478 | Arrastar a janela sem deixá-la sair da tela | P1 | S |
| OTTO-0479 | Restaurar a posição da janela ao reabrir | P3 | S |
| OTTO-0480 | Redimensionar a janela | P3 | M |
| OTTO-0481 | Encaixe nas bordas (snap) | P3 | S |
| OTTO-0482 | Várias janelas sem sobreposição caótica | P3 | M |
| OTTO-0483 | Empilhamento e z-index coerentes | P2 | S |
| OTTO-0484 | Minimizar e restaurar | P3 | M |
| OTTO-0485 | Título e botão fechar sempre visíveis | P2 | S |
| OTTO-0486 | Arraste por toque na barra de título | P2 | M |
| OTTO-0487 | Não bloquear o scroll da página com janela aberta | P2 | S |
| OTTO-0488 | Entrada em 760 ms nos shells | P2 | S |
| OTTO-0489 | Saída mais rápida que a entrada (280 ms) | P2 | S |
| OTTO-0490 | Sombra consistente entre todas as janelas | P3 | S |
| OTTO-0491 | Adaptar hologramas ao tema claro | P1 | M |
| OTTO-0492 | Reduzir o blur de fundo no mobile (caro) | P1 | M |
| OTTO-0493 | Preferir transform e opacity em vez de top e left | P1 | S |
| OTTO-0494 | Nunca animar filter: blur em painel grande | P1 | S |
| OTTO-0495 | Feedback tátil leve ao formar, no mobile | P3 | S |
| OTTO-0496 | Testes de snapshot visual dos hologramas | P3 | L |
| OTTO-0497 | Documentar o sistema de hologramas | P2 | S |
| OTTO-0498 | Telemetria de FPS médio em produção | P3 | M |
| OTTO-0499 | Revisar todos os estados vazios e de erro | P2 | S |
| OTTO-0500 | Garantir que nenhuma informação exista só na animação | P1 | S |

## Área 11 · Design system e temas
*Objetivo: parar de caçar hex solto — uma fonte de verdade para cor, espaço e estado.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0501 | Auditoria de contraste automatizada por script, rodando no CI | P1 | M |
| OTTO-0502 | Cor única como fonte de verdade em variáveis CSS | P1 | L |
| OTTO-0503 | Trocar classes soltas (slate-300, white-20) por tokens semânticos | P1 | L |
| OTTO-0504 | Padronizar estados: hover, active, focus, disabled e loading | P1 | M |
| OTTO-0505 | Componente único de botão, com variantes e tamanhos | P1 | L |
| OTTO-0506 | Componente base de modal e painel | P1 | L |
| OTTO-0507 | Foco visível global via focus-visible | P1 | S |
| OTTO-0508 | Transição entre temas sem flash branco | P1 | S |
| OTTO-0509 | Toque mínimo de 44 px em todos os alvos | P1 | S |
| OTTO-0510 | Erro sempre com cor, ícone e texto (nunca só cor) | P1 | S |
| OTTO-0511 | Revisar o contraste do tema escuro depois do claro | P1 | M |
| OTTO-0512 | Escala tipográfica com cinco ou seis tamanhos | P2 | M |
| OTTO-0513 | Escala de espaçamento em múltiplos de 4 | P2 | M |
| OTTO-0514 | Raios consistentes (8, 12, 16, 24, 28) | P2 | S |
| OTTO-0515 | Sombras em quatro níveis nomeados | P2 | S |
| OTTO-0516 | Componente de chip e tag | P2 | S |
| OTTO-0517 | Componente de input com rótulo, ajuda e erro | P2 | M |
| OTTO-0518 | Componente de tooltip | P2 | M |
| OTTO-0519 | Componente de toast | P2 | M |
| OTTO-0520 | Componente de skeleton | P2 | M |
| OTTO-0521 | Componente de lista e tabela | P2 | L |
| OTTO-0522 | Modo de alto contraste para baixa visão | P2 | M |
| OTTO-0523 | Tema automático pelo sistema, com escolha manual persistida | P2 | M |
| OTTO-0524 | Ícones consistentes em traço e tamanho | P2 | S |
| OTTO-0525 | Regra clara para uso de gradiente | P2 | S |
| OTTO-0526 | Vidro (glass) com custo controlado no mobile | P2 | M |
| OTTO-0527 | Seleção de texto consistente nos dois temas | P2 | S |
| OTTO-0528 | Barra de rolagem consistente nos dois temas | P2 | S |
| OTTO-0529 | Hierarquia de títulos definida | P2 | S |
| OTTO-0530 | Truncamento com tooltip e sem corte de palavra | P2 | S |
| OTTO-0531 | Skeleton em vez de spinner onde a forma é conhecida | P2 | M |
| OTTO-0532 | Microcopy padronizada (mesmo verbo para a mesma ação) | P2 | M |
| OTTO-0533 | Glossário do produto para nomes de recurso | P2 | S |
| OTTO-0534 | Confirmação de sucesso discreta, sem banner | P2 | S |
| OTTO-0535 | Z-index documentado em camadas | P2 | S |
| OTTO-0536 | Breakpoints documentados | P2 | S |
| OTTO-0537 | Densidade compacta e confortável | P3 | M |
| OTTO-0538 | Cor de acento configurável | P3 | M |
| OTTO-0539 | Ilustrações para estados vazios | P3 | M |
| OTTO-0540 | Bordas de 1 px nítidas em telas retina | P3 | S |
| OTTO-0541 | Rótulos em caixa alta com tracking consistente | P3 | S |
| OTTO-0542 | Números tabulares em métricas | P3 | S |
| OTTO-0543 | Página de componentes (/dev/ui) como catálogo vivo | P3 | L |
| OTTO-0544 | Remover estilos mortos do index.css | P2 | M |
| OTTO-0545 | Guia de contribuição de interface | P2 | S |
| OTTO-0546 | Revisar todos os tons de cinza usados (quantos são?) | P2 | S |
| OTTO-0547 | Verificar legibilidade com fonte maior do sistema | P2 | S |
| OTTO-0548 | Testes visuais de regressão por tema | P3 | L |
| OTTO-0549 | Definir o que é "assinatura visual" do OTTO e proteger | P2 | S |
| OTTO-0550 | Publicar a tabela de tokens na ajuda, como referência única | P2 | S |

## Área 12 · Microinterações e animação
*Objetivo: movimento que informa — 60 fps, curto, e nunca no caminho do usuário.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0551 | Curvas de aceleração padronizadas para entrada e saída | P1 | S |
| OTTO-0552 | Durações por tipo de ação (rápida, média, lenta) | P1 | S |
| OTTO-0553 | Respeitar prefers-reduced-motion em todas as animações | P1 | M |
| OTTO-0554 | Não animar nada durante o streaming de texto | P1 | S |
| OTTO-0555 | Animar a chegada da resposta só uma vez, sem reanimar o histórico | P1 | M |
| OTTO-0556 | Pulso real do microfone ligado ao nível de áudio | P1 | M |
| OTTO-0557 | Nenhuma animação pode bloquear input | P1 | S |
| OTTO-0558 | Estados desabilitados visivelmente distintos | P1 | S |
| OTTO-0559 | Auditar 60 fps em aparelho real de entrada | P1 | M |
| OTTO-0560 | Escalonamento de 40 ms entre itens | P2 | S |
| OTTO-0561 | Animação de envio de mensagem (sai da bolha) | P2 | S |
| OTTO-0562 | Indicador de digitação com três pontos | P2 | S |
| OTTO-0563 | Animação do mascote por estado (ouvindo, pensando, falando) | P2 | M |
| OTTO-0564 | Transição suave ao trocar de tema | P2 | S |
| OTTO-0565 | Feedback de clique com elevação, sem ripple exagerado | P2 | S |
| OTTO-0566 | Botão de enviar com estado de carregamento embutido | P2 | S |
| OTTO-0567 | Scroll suave até a mensagem nova | P2 | S |
| OTTO-0568 | Animação da lista de sugestões ao aparecer | P2 | S |
| OTTO-0569 | Não animar listas longas de uma vez | P2 | S |
| OTTO-0570 | Usar will-change com parcimônia e remover depois | P2 | S |
| OTTO-0571 | Animar só transform e opacity | P2 | S |
| OTTO-0572 | Cancelar animações pendentes no unmount | P2 | S |
| OTTO-0573 | Ações comuns terminam em menos de 400 ms | P2 | S |
| OTTO-0574 | Não usar setTimeout para estado crítico de animação | P2 | M |
| OTTO-0575 | Teste de que nenhuma animação fica presa em zero de opacidade | P2 | M |
| OTTO-0576 | Shimmer no skeleton | P2 | S |
| OTTO-0577 | Cursor e estados de ponteiro consistentes | P2 | S |
| OTTO-0578 | Toast curto ao copiar | P2 | S |
| OTTO-0579 | Animação de abertura do painel do Data Hub | P2 | S |
| OTTO-0580 | Animação do holograma reagindo ao estado do agente | P2 | M |
| OTTO-0581 | Nenhuma animação infinita em repouso (bateria) | P2 | S |
| OTTO-0582 | Catálogo de animações documentado | P2 | S |
| OTTO-0583 | Fade discreto das mensagens antigas ao rolar | P3 | S |
| OTTO-0584 | Transição de modal a partir do elemento que a originou | P3 | M |
| OTTO-0585 | Animação de erro (tremor) usada com parcimônia | P3 | S |
| OTTO-0586 | Animação de sucesso (check) | P3 | S |
| OTTO-0587 | Arrastar para baixo fecha o sheet no mobile | P2 | L |
| OTTO-0588 | Suporte a gesto de swipe para descartar | P2 | L |
| OTTO-0589 | Animação de contagem de números em métricas | P3 | S |
| OTTO-0590 | Sincronizar animação CSS e estado JS | P3 | S |
| OTTO-0591 | Preferir Visibilidade a display para transições | P3 | S |
| OTTO-0592 | Web Animations API onde a lógica é dinâmica | P3 | M |
| OTTO-0593 | Controle de velocidade de animação nas Configurações | P3 | S |
| OTTO-0594 | Modo "movimento reduzido" além do do sistema | P3 | S |
| OTTO-0595 | Animação de transição entre telas | P3 | M |
| OTTO-0596 | Pull to refresh só se houver dado remoto | P3 | M |
| OTTO-0597 | Ripple de toque no mobile | P3 | S |
| OTTO-0598 | Animar entrada de toasts sem empurrar conteúdo | P2 | S |
| OTTO-0599 | Revisar todas as animações em modo claro (sombras e brilho) | P2 | M |
| OTTO-0600 | Garantir que nenhuma animação dependa de dados carregando | P2 | S |

## Área 13 · Acessibilidade
*Objetivo: quem usa teclado, leitor de tela ou enxerga pouco consegue conversar com o OTTO igual.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0601 | Auditoria automática (axe) em todas as telas, no CI | P1 | M |
| OTTO-0602 | Navegação completa por teclado, sem armadilhas | P1 | M |
| OTTO-0603 | Ordem de foco lógica e foco sempre visível | P1 | S |
| OTTO-0604 | Região aria-live para a resposta, anunciada uma vez | P1 | M |
| OTTO-0605 | Nunca anunciar token por token no leitor de tela | P1 | M |
| OTTO-0606 | Rótulo em todos os campos, mesmo os com placeholder | P1 | S |
| OTTO-0607 | aria-label em todos os botões que só têm ícone | P1 | S |
| OTTO-0608 | Contraste AA no texto e nos ícones interativos | P1 | M |
| OTTO-0609 | Contraste do placeholder acima de 4.5:1 | P1 | S |
| OTTO-0610 | Não depender de cor para transmitir estado | P1 | S |
| OTTO-0611 | Contraste garantido sobre superfícies com blur | P1 | M |
| OTTO-0612 | Zoom de 200% sem perda de conteúdo | P1 | M |
| OTTO-0613 | Modais com role dialog, aria-modal e foco preso | P1 | S |
| OTTO-0614 | Devolver o foco ao elemento de origem ao fechar | P1 | S |
| OTTO-0615 | Esc fecha a camada do topo | P1 | S |
| OTTO-0616 | Alvos de toque de no mínimo 44 px | P1 | S |
| OTTO-0617 | Áudio nunca toca sem gesto do usuário | P1 | S |
| OTTO-0618 | Controles de parar e volume acessíveis por teclado | P1 | S |
| OTTO-0619 | Respeitar a preferência de alto contraste do sistema | P1 | S |
| OTTO-0620 | Transcrição visível de tudo que o OTTO fala | P1 | M |
| OTTO-0621 | Corrigir o foco preso no sheet do mobile | P1 | S |
| OTTO-0622 | Teste real com VoiceOver e NVDA | P1 | L |
| OTTO-0623 | Escala de fonte do navegador respeitada (usar rem) | P2 | M |
| OTTO-0624 | Skip link para o campo de mensagem | P2 | S |
| OTTO-0625 | Erros anunciados e associados ao campo | P2 | S |
| OTTO-0626 | Mensagens que não desaparecem sozinhas antes de ler | P2 | S |
| OTTO-0627 | Toasts com role status | P2 | S |
| OTTO-0628 | Tabelas com cabeçalho e scope | P2 | S |
| OTTO-0629 | Hierarquia de títulos sem pular níveis | P2 | S |
| OTTO-0630 | Landmarks de main, nav e header | P2 | S |
| OTTO-0631 | Carregamento anunciado ao leitor de tela | P2 | S |
| OTTO-0632 | Estado "pensando" anunciado uma única vez | P2 | S |
| OTTO-0633 | Atalhos de teclado documentados e descobríveis | P2 | M |
| OTTO-0634 | Não capturar atalhos reservados do sistema | P2 | S |
| OTTO-0635 | Foco vai para a mensagem nova depois do envio | P2 | S |
| OTTO-0636 | Lista de mensagens como lista semântica | P2 | S |
| OTTO-0637 | Contraste de elementos desabilitados | P2 | S |
| OTTO-0638 | Anel de foco que não desaparece sobre blur | P2 | S |
| OTTO-0639 | Linguagem simples e frases curtas | P2 | M |
| OTTO-0640 | Não exigir hover para descobrir nada | P2 | S |
| OTTO-0641 | Não exigir gesto complexo | P2 | S |
| OTTO-0642 | Funcionar em retrato e paisagem | P2 | S |
| OTTO-0643 | Testes automatizados de acessibilidade no CI | P2 | M |
| OTTO-0644 | Checklist de acessibilidade no template de PR | P2 | S |
| OTTO-0645 | Documentar os padrões de acessibilidade adotados | P2 | S |
| OTTO-0646 | Suporte a switch control e controle por voz | P3 | L |
| OTTO-0647 | Legendas no áudio sintetizado | P3 | M |
| OTTO-0648 | Teste com usuário real que usa leitor de tela | P3 | L |
| OTTO-0649 | Revisar a11y do Data Hub e dos hologramas | P2 | M |
| OTTO-0650 | Não perder o foco do teclado quando chega mensagem durante o stream | P2 | M |

## Área 14 · Responsivo, mobile e PWA
*Objetivo: no celular, o OTTO precisa ser instalável, rápido e sem teclado cobrindo o campo.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0651 | Manifest e ícones para instalar como app | P1 | M |
| OTTO-0652 | Service worker com cache dos assets | P2 | L |
| OTTO-0653 | Tela de offline com botão de tentar de novo | P1 | S |
| OTTO-0654 | Respeitar as áreas seguras (notch, home indicator) | P1 | S |
| OTTO-0655 | Usar 100dvh em vez de 100vh | P1 | S |
| OTTO-0656 | Teclado virtual não pode cobrir o campo de texto | P1 | M |
| OTTO-0657 | Scroll lock correto quando modal abre | P1 | S |
| OTTO-0658 | Breakpoints definidos: 375, 390, 768, 1024, 1440 | P1 | M |
| OTTO-0659 | Layout de chat mobile com campo fixo no rodapé | P1 | M |
| OTTO-0660 | Cabeçalho compacto no mobile sem perder ações | P1 | S |
| OTTO-0661 | Reduzir partículas e blur no mobile | P1 | S |
| OTTO-0662 | Enter envia e Shift+Enter quebra linha no desktop | P1 | S |
| OTTO-0663 | No mobile, Enter quebra linha (não envia) | P1 | S |
| OTTO-0664 | Links externos em nova aba | P1 | S |
| OTTO-0665 | Pausar animações para economizar bateria | P2 | S |
| OTTO-0666 | Detectar aparelho modesto e baixar a qualidade visual | P2 | M |
| OTTO-0667 | Desktop com largura máxima de leitura confortável | P2 | S |
| OTTO-0668 | Atalhos de teclado no desktop, com dica visual | P2 | M |
| OTTO-0669 | Não perder estado ao girar a tela | P2 | S |
| OTTO-0670 | Bottom sheet nativo no mobile | P2 | M |
| OTTO-0671 | Campo de texto que cresce com o conteúdo | P2 | S |
| OTTO-0672 | Colar imagem do clipboard | P2 | M |
| OTTO-0673 | Upload de arquivo pelo celular | P2 | M |
| OTTO-0674 | Comportamento correto do botão voltar | P2 | M |
| OTTO-0675 | Zoom desabilitado apenas onde realmente atrapalha | P2 | S |
| OTTO-0676 | Autofocus que não abre teclado indesejado | P2 | S |
| OTTO-0677 | Testar em Android antigo e em iPhone pequeno | P2 | L |
| OTTO-0678 | Suporte a tablet em paisagem | P2 | M |
| OTTO-0679 | Desempenho aceitável em 3G | P2 | M |
| OTTO-0680 | Primeiro carregamento abaixo de 3 s em 4G | P2 | M |
| OTTO-0681 | Orçamento de JS para mobile explícito | P2 | M |
| OTTO-0682 | Fontes sem download bloqueante | P2 | S |
| OTTO-0683 | Indicador de conexão instável | P2 | S |
| OTTO-0684 | Teste Lighthouse mobile no CI | P2 | M |
| OTTO-0685 | Compartilhar pelo menu nativo (Web Share) | P3 | S |
| OTTO-0686 | Prompt discreto de "adicionar à tela inicial" | P3 | S |
| OTTO-0687 | Cor da barra de status conforme o tema | P3 | S |
| OTTO-0688 | Ícone adaptativo no Android | P3 | S |
| OTTO-0689 | Splash screen própria | P3 | S |
| OTTO-0690 | Deep links para abrir direto no Data Hub | P3 | M |
| OTTO-0691 | Sincronizar ao voltar a ficar online | P2 | L |
| OTTO-0692 | Cache offline do histórico recente | P3 | L |
| OTTO-0693 | Vibração nos eventos principais | P3 | S |
| OTTO-0694 | Captura de foto pela câmera | P3 | M |
| OTTO-0695 | Modo economia de dados | P3 | M |
| OTTO-0696 | Notificações push para plano concluído | P3 | L |
| OTTO-0697 | Matriz de dispositivos testados, documentada | P2 | L |
| OTTO-0698 | Instruções de instalação por plataforma | P3 | S |
| OTTO-0699 | Tema escuro como padrão no celular à noite | P3 | S |
| OTTO-0700 | Desligar autocomplete e autocorrect onde atrapalham | P3 | S |

## Área 15 · Performance e bundle
*Objetivo: abrir rápido, digitar sem travar e aguentar uma sessão de duas horas sem vazar memória.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0701 | Re-render global evitado: separar contextos de tema, settings e chat | P1 | M |
| OTTO-0702 | React.memo nas bolhas e nos itens de lista | P1 | S |
| OTTO-0703 | Throttle do autoscroll por frame | P1 | S |
| OTTO-0704 | AbortController em todas as chamadas de rede | P1 | S |
| OTTO-0705 | Limitar o payload de histórico por requisição | P1 | S |
| OTTO-0706 | Code splitting por modal e por view | P1 | M |
| OTTO-0707 | Verificar tree shaking do pacote de ícones | P2 | M |
| OTTO-0708 | Code splitting aplicado também às rotas de API pesadas | P2 | M |
| OTTO-0709 | Análise de composição do bundle, gerada no CI | P2 | S |
| OTTO-0710 | Orçamento de bundle explícito, com quebra do build ao estourar | P2 | M |
| OTTO-0711 | Remover dependências não utilizadas | P2 | S |
| OTTO-0712 | Cache imutável de assets com hash | P2 | S |
| OTTO-0713 | Preload das fontes críticas | P2 | S |
| OTTO-0714 | Prefetch de chunks guiado pela intenção detectada | P2 | M |
| OTTO-0715 | Preconnect para as APIs externas | P2 | S |
| OTTO-0716 | Compressão brotli nas respostas estáticas | P2 | S |
| OTTO-0717 | Revisar o custo do CSS gerado pelo Tailwind | P2 | S |
| OTTO-0718 | useMemo e useCallback apenas nos pontos medidos | P2 | M |
| OTTO-0719 | Evitar objetos e funções inline em props de listas | P2 | S |
| OTTO-0720 | Debounce em resize e scroll | P2 | S |
| OTTO-0721 | Virtualizar a lista de mensagens e a tabela do Data Hub | P2 | L |
| OTTO-0722 | Web Worker para parse de CSV | P2 | M |
| OTTO-0723 | Web Worker para análise de áudio | P3 | M |
| OTTO-0724 | Lazy load dos hologramas | P2 | S |
| OTTO-0725 | Substituir animações que forçam layout | P2 | M |
| OTTO-0726 | Remover imagens embutidas em base64 | P2 | M |
| OTTO-0727 | Converter imagens para WebP e AVIF | P2 | M |
| OTTO-0728 | srcset responsivo nas imagens | P2 | S |
| OTTO-0729 | Carregamento tardio de imagens | P2 | S |
| OTTO-0730 | Dimensões explícitas para evitar deslocamento | P2 | S |
| OTTO-0731 | Cache no proxy de imagens | P2 | M |
| OTTO-0732 | Paginar mensagens antigas em vez de carregar tudo | P2 | M |
| OTTO-0733 | Limpar estado que não é mais usado | P2 | M |
| OTTO-0734 | Fechar AudioContext ao trocar de motor | P2 | S |
| OTTO-0735 | Remover listeners no unmount, sempre | P2 | S |
| OTTO-0736 | Revogar object URLs depois de usar | P2 | S |
| OTTO-0737 | Guardar dados grandes em IndexedDB, não em localStorage | P2 | M |
| OTTO-0738 | Debounce na persistência do histórico | P2 | S |
| OTTO-0739 | Medir INP, não só FCP | P2 | M |
| OTTO-0740 | Metas de Web Vitals definidas e acompanhadas | P2 | M |
| OTTO-0741 | Lighthouse CI com limite mínimo | P2 | L |
| OTTO-0742 | Perfil de memória em sessão longa, buscando vazamento | P2 | L |
| OTTO-0743 | Evitar JSON.parse grande na thread principal | P3 | M |
| OTTO-0744 | CSS crítico inline no HTML inicial | P3 | M |
| OTTO-0745 | HTTP/2 ou HTTP/3 no servidor de produção | P3 | S |
| OTTO-0746 | Preload da imagem principal | P3 | S |
| OTTO-0747 | Compressão de imagens no upload | P2 | M |
| OTTO-0748 | Reduzir o custo do primeiro paint | P2 | M |
| OTTO-0749 | Dashboard de performance por release | P3 | M |
| OTTO-0750 | Perfilar o primeiro render com React Profiler e registrar no CI | P2 | M |

## Área 16 · Segurança e privacidade
*Objetivo: o OTTO tem poder real na máquina — o padrão tem que ser negar, não permitir.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0751 | Token de acesso obrigatório em produção, validado em toda rota | P0 | M |
| OTTO-0752 | Sanitizar HTML de markdown para eliminar XSS | P0 | M |
| OTTO-0753 | Path traversal coberto em todos os endpoints de arquivo | P0 | M |
| OTTO-0754 | Bloquear IPs privados e metadados de nuvem no proxy | P0 | M |
| OTTO-0755 | CORS restritivo, sem curinga em produção | P0 | S |
| OTTO-0756 | Cabeçalhos de segurança: CSP, HSTS, X-Frame-Options, nosniff | P0 | M |
| OTTO-0757 | Rate limit por IP nas rotas caras | P0 | M |
| OTTO-0758 | Nenhum segredo no bundle do frontend | P0 | M |
| OTTO-0759 | Execução de comando apenas com aprovação explícita | P0 | M |
| OTTO-0760 | Arquivos servidos somente dentro do diretório permitido | P0 | M |
| OTTO-0761 | SSRF no proxy de imagem e na leitura de páginas | P0 | L |
| OTTO-0762 | Rate limit por usuário e por chave | P1 | M |
| OTTO-0763 | CSP sem unsafe-inline, com nonce | P1 | L |
| OTTO-0764 | Limite de tamanho de corpo em todas as rotas | P1 | S |
| OTTO-0765 | Validação de content-type e de magic bytes nos uploads | P1 | M |
| OTTO-0766 | Limite de redirecionamentos nos proxies | P1 | S |
| OTTO-0767 | Timeout em toda requisição de saída | P1 | S |
| OTTO-0768 | Mover a chave de API do localStorage para o servidor | P1 | L |
| OTTO-0769 | Mascarar a chave na interface depois de salva | P1 | S |
| OTTO-0770 | Sanitizar nomes de arquivo recebidos | P1 | S |
| OTTO-0771 | Logs sem dados pessoais | P1 | M |
| OTTO-0772 | Não registrar o conteúdo das mensagens por padrão | P1 | S |
| OTTO-0773 | Redigir chaves e tokens nas mensagens de erro | P1 | S |
| OTTO-0774 | Aviso claro de que a conversa vai para provedores terceiros | P1 | S |
| OTTO-0775 | Consentimento para gravação de áudio | P1 | S |
| OTTO-0776 | LGPD: direito de excluir histórico e memória | P1 | M |
| OTTO-0777 | LGPD: política de privacidade publicada | P1 | M |
| OTTO-0778 | Detecção de prompt injection em conteúdo externo | P1 | L |
| OTTO-0779 | Sandbox sem rede por padrão | P1 | M |
| OTTO-0780 | Sandbox sem privilégios de root | P1 | M |
| OTTO-0781 | npm audit no CI, com bloqueio em severidade alta | P1 | M |
| OTTO-0782 | Testes de segurança automatizados para as rotas | P1 | L |
| OTTO-0783 | Criptografia da chave em repouso | P2 | L |
| OTTO-0784 | Rotação do token de sessão | P2 | M |
| OTTO-0785 | Expiração de sessão inativa | P2 | M |
| OTTO-0786 | Auditoria de acesso a dados sensíveis | P2 | M |
| OTTO-0787 | Allowlist de comandos permitidos no sandbox | P2 | M |
| OTTO-0788 | `noindex` e proteção contra indexação do app privado | P2 | S |
| OTTO-0789 | Nunca passar chave ou token pela URL, sempre por cabeçalho | P1 | S |
| OTTO-0790 | Revisar permissões de integrações de terceiros | P2 | M |
| OTTO-0791 | Lockfile commitado e instalação determinística | P2 | S |
| OTTO-0792 | Logout em todos os dispositivos | P3 | M |
| OTTO-0793 | Backup criptografado | P3 | M |
| OTTO-0794 | Subresource Integrity nos scripts externos | P3 | S |
| OTTO-0795 | Sessão única versus múltipla, com escolha | P3 | S |
| OTTO-0796 | Autenticação em dois fatores, se houver contas | P3 | L |
| OTTO-0797 | Provedor de IA local como opção de privacidade | P3 | L |
| OTTO-0798 | Checklist OWASP revisado antes do lançamento | P2 | L |
| OTTO-0799 | Teste de penetração leve com terceiro | P3 | L |
| OTTO-0800 | Definir prazo de retenção de logs e áudios na política | P2 | S |

## Área 17 · Backend, API e infra
*Objetivo: um processo só, previsível, que falha rápido e explica o erro.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0801 | Healthcheck em /healthz com estado das dependências | P1 | S |
| OTTO-0802 | Encerramento gracioso (drenar conexões antes de sair) | P1 | S |
| OTTO-0803 | Logs estruturados em JSON | P1 | M |
| OTTO-0804 | Request ID propagado do cliente ao provedor | P1 | S |
| OTTO-0805 | Tratador de erro central, sem vazar stack para o cliente | P1 | M |
| OTTO-0806 | Validação de entrada com schema em todas as rotas | P1 | M |
| OTTO-0807 | Timeouts centralizados e configuráveis | P1 | S |
| OTTO-0808 | Limite de concorrência por provedor | P1 | M |
| OTTO-0809 | Pool de conexões HTTP reutilizado | P1 | M |
| OTTO-0810 | Configuração tipada, validada no boot | P1 | M |
| OTTO-0811 | Falhar rápido quando falta variável obrigatória | P1 | S |
| OTTO-0812 | Limite de payload no corpo das requisições | P1 | S |
| OTTO-0813 | Streaming de arquivos sem carregar tudo em memória | P1 | M |
| OTTO-0814 | Limpeza de arquivos temporários por rotina | P1 | M |
| OTTO-0815 | Persistir planos e memória em disco, não só em memória | P1 | L |
| OTTO-0816 | Padrão de erro com código, mensagem e próximo passo | P1 | M |
| OTTO-0817 | HTTPS com redirecionamento | P1 | M |
| OTTO-0818 | Testes de integração contra o servidor real | P1 | L |
| OTTO-0819 | CI com install, typecheck, teste e build | P1 | M |
| OTTO-0820 | Versionar a API (/api/v1) | P2 | M |
| OTTO-0821 | Documentar as rotas em OpenAPI | P2 | M |
| OTTO-0822 | Fila para tarefas longas, com progresso | P2 | L |
| OTTO-0823 | Idempotency key nos retries | P2 | M |
| OTTO-0824 | Cache de respostas GET estáveis (vozes, config) | P2 | S |
| OTTO-0825 | Compressão das respostas | P2 | S |
| OTTO-0826 | Separar configuração de dev e produção | P2 | S |
| OTTO-0827 | Dockerfile reproduzível | P2 | M |
| OTTO-0828 | Cache de dependências no CI | P2 | S |
| OTTO-0829 | Migrações de dados versionadas | P2 | M |
| OTTO-0830 | Backup periódico do diretório de dados | P2 | M |
| OTTO-0831 | Retenção e rotação de logs | P2 | S |
| OTTO-0832 | Alertas de taxa de erro | P2 | M |
| OTTO-0833 | Trust proxy configurado corretamente | P2 | S |
| OTTO-0834 | Cron de manutenção (limpeza, backup) | P2 | M |
| OTTO-0835 | Testes de contrato das rotas | P2 | M |
| OTTO-0836 | Teste de carga básico no stream | P2 | M |
| OTTO-0837 | Documentar estrutura de pastas | P2 | S |
| OTTO-0838 | Documentar deploy (env, portas, volumes) | P2 | M |
| OTTO-0839 | Migrar de arquivos JSON para SQLite | P2 | L |
| OTTO-0840 | Migrar de um processo para dois (API e estático) quando crescer | P3 | L |
| OTTO-0841 | Server-Sent Events como alternativa ao stream | P3 | L |
| OTTO-0842 | WebSocket para status de plano em tempo real | P3 | M |
| OTTO-0843 | ETag nas respostas estáveis | P3 | S |
| OTTO-0844 | Métricas no formato Prometheus | P3 | M |
| OTTO-0845 | Tracing distribuído das requisições | P3 | L |
| OTTO-0846 | docker-compose para desenvolvimento | P3 | M |
| OTTO-0847 | Deploy automatizado | P2 | L |
| OTTO-0848 | Monitor de uptime externo | P3 | S |
| OTTO-0849 | Revisar uso de memória do processo em sessão longa | P2 | L |
| OTTO-0850 | Documentar limites e cotas de cada provedor | P2 | S |

## Área 18 · Observabilidade, testes e CI
*Objetivo: saber que quebrou antes do usuário — e conseguir reproduzir.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0851 | Teste de path traversal como regressão obrigatória | P0 | S |
| OTTO-0852 | Mocks determinísticos para os provedores de IA | P1 | M |
| OTTO-0853 | Testes do roteador de tarefas | P1 | M |
| OTTO-0854 | Testes do armazenamento de memória | P1 | M |
| OTTO-0855 | Testes do executor de ferramentas | P1 | M |
| OTTO-0856 | Testes do fallback do motor de voz | P1 | M |
| OTTO-0857 | Testes do orquestrador do agente | P1 | L |
| OTTO-0858 | Testes de componente com Testing Library | P1 | L |
| OTTO-0859 | Teste E2E do fluxo principal (falar, responder, agir) | P1 | L |
| OTTO-0860 | Cobertura mínima definida e verificada | P1 | M |
| OTTO-0861 | Teste de rate limit | P1 | M |
| OTTO-0862 | Teste de CORS | P1 | S |
| OTTO-0863 | Testes de segurança automatizados | P1 | L |
| OTTO-0864 | Rastreamento de erros (Sentry ou equivalente) | P1 | M |
| OTTO-0865 | Cobertura reportada por área, não só total | P2 | S |
| OTTO-0866 | Testes de streaming e cancelamento | P2 | M |
| OTTO-0867 | Testes de falha de rede e timeout | P2 | S |
| OTTO-0868 | Testes de acessibilidade no CI | P2 | M |
| OTTO-0869 | Testes de upload e validação de arquivo | P2 | M |
| OTTO-0870 | Fixtures de áudio para STT | P2 | M |
| OTTO-0871 | Testes do armazenamento do Data Hub | P2 | M |
| OTTO-0872 | Testes do motor de voz (parcial) | P2 | L |
| OTTO-0873 | Testes do avaliador matemático ampliados | P2 | S |
| OTTO-0874 | Nenhum teste instável: quarentena explícita | P2 | M |
| OTTO-0875 | Suíte completa em menos de 30 s | P2 | S |
| OTTO-0876 | Factories de dados de teste | P2 | S |
| OTTO-0877 | Logs do cliente enviados ao servidor | P2 | M |
| OTTO-0878 | Build ID visível nas issues e nos relatórios | P2 | S |
| OTTO-0879 | Painel de saúde do sistema na UI | P2 | M |
| OTTO-0880 | Métricas de uso por recurso | P2 | M |
| OTTO-0881 | Alertas de latência p95 | P2 | M |
| OTTO-0882 | Painel de custo por provedor | P2 | M |
| OTTO-0883 | Feature flags | P2 | L |
| OTTO-0884 | CHANGELOG gerado automaticamente | P2 | M |
| OTTO-0885 | Versionamento semântico aplicado | P2 | S |
| OTTO-0886 | Pre-commit com lint e typecheck | P2 | S |
| OTTO-0887 | Dependabot ou Renovate ativo | P2 | S |
| OTTO-0888 | Runbook de incidentes | P2 | S |
| OTTO-0889 | Template de issue para bug e feature | P2 | S |
| OTTO-0890 | Template de PR com checklist de pronto | P2 | S |
| OTTO-0891 | Documentação de arquitetura (C4) | P2 | M |
| OTTO-0892 | Funil: abriu, falou, recebeu resposta, agiu | P3 | M |
| OTTO-0893 | Framework de experimentos A/B | P3 | L |
| OTTO-0894 | Degradação graciosa controlada por flag | P3 | M |
| OTTO-0895 | Postmortem sem culpa, documentado | P3 | S |
| OTTO-0896 | Watch mode com feedback rápido | P3 | S |
| OTTO-0897 | Convenção de commits | P3 | S |
| OTTO-0898 | Snapshot visual por tema | P3 | L |
| OTTO-0899 | Regressão visual automatizada | P3 | L |
| OTTO-0900 | Publicar relatório de cobertura a cada release | P3 | S |

## Área 19 · Integrações externas
*Objetivo: o OTTO alcançar as ferramentas onde o trabalho realmente acontece — sem virar um canivete.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0901 | Leitura de PDF com extração de texto e tabelas | P1 | M |
| OTTO-0902 | Melhorar a leitura de artigo já existente (limpeza e citação) | P1 | M |
| OTTO-0903 | Escopos mínimos em todas as conexões | P1 | M |
| OTTO-0904 | Ações de escrita sempre com confirmação | P1 | M |
| OTTO-0905 | Mensagem de erro de integração com dica de reconexão | P1 | S |
| OTTO-0906 | Privacidade explícita: o que sai do dispositivo e para onde | P1 | M |
| OTTO-0907 | Google Calendar: ler a agenda do dia | P2 | L |
| OTTO-0908 | Google Calendar: criar evento por comando de voz | P2 | L |
| OTTO-0909 | Gmail: resumir não lidos | P3 | L |
| OTTO-0910 | Google Drive: buscar e abrir arquivo | P2 | L |
| OTTO-0911 | Notion: ler e criar página | P2 | L |
| OTTO-0912 | GitHub: listar issues e PRs | P2 | L |
| OTTO-0913 | YouTube: melhorar busca e resumo de vídeo | P2 | M |
| OTTO-0914 | OCR de imagem para texto pesquisável | P2 | M |
| OTTO-0915 | Captura de tela com análise | P2 | M |
| OTTO-0916 | Clipboard do sistema como fonte | P2 | M |
| OTTO-0917 | Tradução de trechos sob demanda | P2 | M |
| OTTO-0918 | Slack: enviar mensagem | P3 | L |
| OTTO-0919 | WhatsApp: abrir conversa com texto pronto | P3 | L |
| OTTO-0920 | Spotify: controlar reprodução | P3 | M |
| OTTO-0921 | Clima do dia | P3 | S |
| OTTO-0922 | Notícias por tema | P3 | M |
| OTTO-0923 | Mapas e rotas | P3 | L |
| OTTO-0924 | Calendário local em .ics | P3 | M |
| OTTO-0925 | Contatos | P3 | M |
| OTTO-0926 | E-mail via SMTP | P3 | L |
| OTTO-0927 | Webhooks de entrada | P3 | L |
| OTTO-0928 | OAuth para todas as integrações | P2 | L |
| OTTO-0929 | Tela de conexões com estado e última sincronização | P2 | M |
| OTTO-0930 | Revogar acesso de uma conexão | P2 | S |
| OTTO-0931 | Rate limit por integração | P2 | S |
| OTTO-0932 | Health check de integração | P2 | M |
| OTTO-0933 | Cache de respostas por integração | P2 | M |
| OTTO-0934 | Templates de prompt por integração | P2 | M |
| OTTO-0935 | Log de ações externas executadas | P2 | M |
| OTTO-0936 | Testes com mock de cada API | P2 | M |
| OTTO-0937 | Documentação por integração | P2 | S |
| OTTO-0938 | Limite de dados puxados por chamada | P2 | S |
| OTTO-0939 | Fallback quando a integração cai | P2 | M |
| OTTO-0940 | Comandos de voz por integração | P2 | M |
| OTTO-0941 | Descoberta de integrações na interface | P2 | M |
| OTTO-0942 | Escolher provedor por integração | P3 | M |
| OTTO-0943 | Sugestão contextual ("vi que você tem reunião às 15h") | P3 | L |
| OTTO-0944 | Ambiente de teste de integração | P3 | L |
| OTTO-0945 | Métricas de uso por integração | P3 | S |
| OTTO-0946 | Roadmap público de integrações | P3 | S |
| OTTO-0947 | API pública com chaves | P3 | L |
| OTTO-0948 | Suporte a MCP ou plugins | P3 | L |
| OTTO-0949 | Extensão de VS Code | P3 | L |
| OTTO-0950 | Refinar o controle do terminal do sistema | P1 | M |

## Área 20 · Onboarding, docs e produto
*Objetivo: em 60 segundos a pessoa entende o que o OTTO faz e faz a primeira coisa útil.*

| ID | Item | P | E |
|---|---|---|---|
| OTTO-0951 | Consentimento e link de privacidade no primeiro uso | P1 | S |
| OTTO-0952 | Mensagens de erro escritas para humanos, com próximo passo | P1 | M |
| OTTO-0953 | Onboarding de três passos, com opção de pular | P1 | M |
| OTTO-0954 | Explicar a diferença entre falar e digitar | P1 | S |
| OTTO-0955 | Configuração guiada da chave de API | P1 | M |
| OTTO-0956 | Exercício "fale algo" durante o onboarding | P1 | M |
| OTTO-0957 | README com capturas e caso de uso real | P1 | S |
| OTTO-0958 | Templates de primeira tarefa | P2 | M |
| OTTO-0959 | Tour dos quatro recursos principais | P2 | M |
| OTTO-0960 | Ajuda contextual com "?" em cada área | P2 | M |
| OTTO-0961 | Central de ajuda com busca | P2 | M |
| OTTO-0962 | Documentação de arquitetura | P2 | M |
| OTTO-0963 | Guia de contribuição | P2 | S |
| OTTO-0964 | ADRs publicados no repositório | P2 | M |
| OTTO-0965 | Changelog público | P2 | M |
| OTTO-0966 | Feedback dentro do app | P2 | S |
| OTTO-0967 | Definição explícita do que é ativação | P2 | S |
| OTTO-0968 | Custo médio por usuário medido | P2 | M |
| OTTO-0969 | Termos de uso | P2 | S |
| OTTO-0970 | Canal de suporte visível | P2 | S |
| OTTO-0971 | FAQ com as 20 dúvidas reais | P2 | M |
| OTTO-0972 | Voz e tom do produto documentados | P2 | S |
| OTTO-0973 | Nome e identidade consistentes em todo lugar | P2 | S |
| OTTO-0974 | Tela "sobre" com versão e build | P2 | S |
| OTTO-0975 | Modo demonstração público, sem chave | P2 | M |
| OTTO-0976 | Telemetria opt-in, explicada em uma frase | P2 | M |
| OTTO-0977 | Exportar todos os meus dados | P2 | M |
| OTTO-0978 | Excluir minha conta e meus dados | P2 | M |
| OTTO-0979 | Acessibilidade declarada na ajuda | P2 | S |
| OTTO-0980 | Analytics de funil implementado | P2 | M |
| OTTO-0981 | Página de status | P3 | S |
| OTTO-0982 | Roadmap público | P3 | S |
| OTTO-0983 | NPS com uma pergunta | P3 | S |
| OTTO-0984 | Métricas de retenção semanal | P3 | M |
| OTTO-0985 | Vídeos curtos de 30 s por recurso | P3 | L |
| OTTO-0986 | Planos de preço | P3 | L |
| OTTO-0987 | Limites por plano aplicados no servidor | P3 | M |
| OTTO-0988 | Período de teste | P3 | M |
| OTTO-0989 | Paywall que não bloqueia o núcleo | P3 | M |
| OTTO-0990 | Landing page com demonstração real | P3 | L |
| OTTO-0991 | SEO da landing page | P3 | M |
| OTTO-0992 | Blog ou changelog de recursos | P3 | M |
| OTTO-0993 | E-mails transacionais | P3 | M |
| OTTO-0994 | Convite e compartilhamento | P3 | M |
| OTTO-0995 | Programa beta com feedback estruturado | P3 | M |
| OTTO-0996 | Localização PT, EN e ES | P3 | L |
| OTTO-0997 | Roadmap de 12 meses revisado trimestralmente | P3 | S |
| OTTO-0998 | Easter egg discreto, sem atrapalhar | P3 | S |
| OTTO-0999 | Revisar toda a microcopy em busca de jargão | P2 | M |
| OTTO-1000 | Medir o tempo até a primeira tarefa concluída | P2 | M |

---

## Anexo A · Resumo por área

| Área | Itens | P0 | P1 | P2 | P3 | S | M | L | Faixa de IDs |
|---|---|---|---|---|---|---|---|---|---|
| 01 · Bugs e estabilidade | 50 | 10 | 24 | 15 | 1 | 26 | 24 | 0 | OTTO-0001–OTTO-0050 |
| 02 · Voz: entrada (STT) | 50 | 3 | 20 | 20 | 7 | 14 | 23 | 13 | OTTO-0051–OTTO-0100 |
| 03 · Voz: saída (TTS) | 50 | 4 | 16 | 18 | 12 | 15 | 28 | 7 | OTTO-0101–OTTO-0150 |
| 04 · Conversa, intenção e prompt | 50 | 5 | 15 | 22 | 8 | 12 | 30 | 8 | OTTO-0151–OTTO-0200 |
| 05 · Streaming e latência | 50 | 4 | 18 | 25 | 3 | 19 | 26 | 5 | OTTO-0201–OTTO-0250 |
| 06 · Memória de longo prazo | 50 | 0 | 14 | 24 | 12 | 9 | 30 | 11 | OTTO-0251–OTTO-0300 |
| 07 · Modo Agente e planos | 50 | 7 | 15 | 21 | 7 | 12 | 29 | 9 | OTTO-0301–OTTO-0350 |
| 08 · Ferramentas, arquivos e sandbox | 50 | 6 | 17 | 18 | 9 | 12 | 29 | 9 | OTTO-0351–OTTO-0400 |
| 09 · Data Hub | 50 | 0 | 12 | 29 | 9 | 20 | 23 | 7 | OTTO-0401–OTTO-0450 |
| 10 · Hologramas e visualização | 50 | 0 | 17 | 23 | 10 | 32 | 17 | 1 | OTTO-0451–OTTO-0500 |
| 11 · Design system e temas | 50 | 0 | 11 | 31 | 8 | 25 | 18 | 7 | OTTO-0501–OTTO-0550 |
| 12 · Microinterações e animação | 50 | 0 | 9 | 28 | 13 | 35 | 13 | 2 | OTTO-0551–OTTO-0600 |
| 13 · Acessibilidade | 50 | 0 | 22 | 25 | 3 | 32 | 15 | 3 | OTTO-0601–OTTO-0650 |
| 14 · Responsivo, mobile e PWA | 50 | 0 | 13 | 23 | 14 | 26 | 18 | 6 | OTTO-0651–OTTO-0700 |
| 15 · Performance e bundle | 50 | 0 | 6 | 38 | 6 | 23 | 24 | 3 | OTTO-0701–OTTO-0750 |
| 16 · Segurança e privacidade | 50 | 11 | 22 | 10 | 7 | 16 | 24 | 10 | OTTO-0751–OTTO-0800 |
| 17 · Backend, API e infra | 50 | 0 | 19 | 23 | 8 | 16 | 25 | 9 | OTTO-0801–OTTO-0850 |
| 18 · Observabilidade, testes e CI | 50 | 1 | 13 | 27 | 9 | 18 | 23 | 9 | OTTO-0851–OTTO-0900 |
| 19 · Integrações externas | 50 | 0 | 7 | 24 | 19 | 8 | 25 | 17 | OTTO-0901–OTTO-0950 |
| 20 · Onboarding, docs e produto | 50 | 0 | 7 | 25 | 18 | 17 | 29 | 4 | OTTO-0951–OTTO-1000 |
| **Total** | **1000** | **51** | **297** | **469** | **183** | **387** | **473** | **140** | |

**Leitura:** 51 P0 (5.1%), 297 P1 (29.7%), 469 P2 (46.9%), 183 P3 (18.3%). Esforço: 387 curtos, 473 médios, 140 longos.

## Anexo B · Todos os P0 — comece por aqui

| ID | Área | Item | E |
|---|---|---|---|
| OTTO-0001 | 01 | Recarga do bridge de build interrompe o ditado e apaga o rascunho: adiar reload com gravação ativa | M |
| OTTO-0002 | 01 | Estado "pensando" fica preso quando o stream aborta no meio da resposta | S |
| OTTO-0005 | 01 | Microfone negado não gera feedback visual nem instrução de desbloqueio | S |
| OTTO-0008 | 01 | Conversa não sobrevive a F5: nenhuma persistência local do histórico | M |
| OTTO-0012 | 01 | Botão "parar" não cancela a síntese em andamento: o áudio continua | S |
| OTTO-0020 | 01 | Erro de cota (429) aparece como "algo deu errado" genérico | S |
| OTTO-0021 | 01 | Falta de timeout no fetch de streaming deixa spinner infinito | S |
| OTTO-0026 | 01 | Plano continua "rodando" depois de uma etapa falhar | M |
| OTTO-0027 | 01 | Etapa do agente falha em silêncio: sem motivo e sem opção de repetir | M |
| OTTO-0034 | 01 | Silêncio total do usuário não encerra a escuta: grava indefinidamente | M |
| OTTO-0052 | 02 | VAD para cortar silêncio no início e no fim da fala antes do upload | L |
| OTTO-0069 | 02 | Half-duplex: microfone atenuado enquanto o TTS fala, evitando eco | M |
| OTTO-0070 | 02 | Barge-in: falar interrompe o OTTO imediatamente | L |
| OTTO-0101 | 03 | Tocar a primeira frase enquanto o resto ainda é sintetizado | L |
| OTTO-0102 | 03 | Dividir a resposta por sentença para reduzir a latência percebida | M |
| OTTO-0103 | 03 | Fallback em cadeia: Gemini para ElevenLabs para Web Speech | M |
| OTTO-0104 | 03 | Fila com prioridade: barge-in limpa tudo que estava pendente | M |
| OTTO-0151 | 04 | Mensagem clara quando falta chave de API, com link para configurar | S |
| OTTO-0152 | 04 | Classificador de intenção com fallback determinístico | M |
| OTTO-0153 | 04 | Confirmação obrigatória antes de ação destrutiva (apagar, sobrescrever) | M |
| OTTO-0154 | 04 | Nunca inventar resultado de ferramenta: dizer o que falhou | M |
| OTTO-0155 | 04 | Sanitizar injeção de prompt vinda de páginas web lidas | M |
| OTTO-0201 | 05 | Não re-renderizar a lista inteira a cada token recebido | M |
| OTTO-0202 | 05 | Cancelar a requisição de verdade ao fechar, trocar de tela ou sair | S |
| OTTO-0203 | 05 | Timeout escalonado: 10 s para o primeiro byte, 30 s no total | S |
| OTTO-0204 | 05 | Garantir que a rota de stream não bufferize (flush por chunk) | M |
| OTTO-0301 | 07 | Persistir planos e retomar depois de recarregar a página | M |
| OTTO-0302 | 07 | Estado explícito por etapa: pendente, rodando, concluída, falhou, pulada | M |
| OTTO-0303 | 07 | Falha parcial continua o que é possível e reporta o que não deu | M |
| OTTO-0304 | 07 | Timeout individual por etapa | S |
| OTTO-0305 | 07 | Cancelar o plano inteiro liberando processos e recursos | M |
| OTTO-0306 | 07 | Aprovação humana obrigatória antes de etapa destrutiva | M |
| OTTO-0307 | 07 | Nunca executar comando de shell não revisado em modo seguro | M |
| OTTO-0351 | 08 | Restringir leitura e escrita à raiz do workspace | M |
| OTTO-0352 | 08 | Testes de path traversal, symlink e sequências codificadas | M |
| OTTO-0353 | 08 | Sandbox com limite de CPU e memória | M |
| OTTO-0354 | 08 | Timeout obrigatório em toda execução de código | S |
| OTTO-0355 | 08 | Acesso ao sistema de arquivos do host bloqueado no sandbox | L |
| OTTO-0356 | 08 | Execução de comando com aprovação e explicação do efeito | M |
| OTTO-0751 | 16 | Token de acesso obrigatório em produção, validado em toda rota | M |
| OTTO-0752 | 16 | Sanitizar HTML de markdown para eliminar XSS | M |
| OTTO-0753 | 16 | Path traversal coberto em todos os endpoints de arquivo | M |
| OTTO-0754 | 16 | Bloquear IPs privados e metadados de nuvem no proxy | M |
| OTTO-0755 | 16 | CORS restritivo, sem curinga em produção | S |
| OTTO-0756 | 16 | Cabeçalhos de segurança: CSP, HSTS, X-Frame-Options, nosniff | M |
| OTTO-0757 | 16 | Rate limit por IP nas rotas caras | M |
| OTTO-0758 | 16 | Nenhum segredo no bundle do frontend | M |
| OTTO-0759 | 16 | Execução de comando apenas com aprovação explícita | M |
| OTTO-0760 | 16 | Arquivos servidos somente dentro do diretório permitido | M |
| OTTO-0761 | 16 | SSRF no proxy de imagem e na leitura de páginas | L |
| OTTO-0851 | 18 | Teste de path traversal como regressão obrigatória | S |

## Anexo C · Fila de descarte (tentador, mas fora de foco)

| Ideia | Por que fica de fora |
|---|---|
| Feed social ou timeline de usuários | Não encurta o ciclo fala→ação; vira outro produto |
| Gamificação com pontos e badges | Recompensa fora da tarefa; polui a tela |
| Marketplace de plugins | Antes de uma API pública estável, multiplica manutenção |
| Mais de quatro temas visuais | Cada tema é dívida de contraste e de QA |
| Rede de amigos e compartilhamento social | Exige contas, moderação e privacidade sem retorno claro |
| Avatar 3D customizável | Custo alto de arte e GPU, ganho baixo de utilidade |
| Jogos ou quizzes embutidos | Dispersa o foco do assistente |
| Loja de vozes de celebridades | Custo jurídico e de licenciamento desproporcional |
| Editor de vídeo | Fora do escopo de assistente de computador |
| Cripto, tokens ou carteira | Risco regulatório e de segurança altíssimo |
| Player de música próprio | Uma integração resolve com um décimo do esforço |
| Rede social de prompts | Vira produto separado |
| Dashboard público de métricas | Interessante, mas não para o usuário final |
| Roleplay longo ou assistente de companhia | Muda a identidade e o tom do produto |
| Multi-tenant corporativo completo | Só depois de SSO e auditoria amadurecerem |
| Apps nativos iOS e Android | PWA resolve até haver demanda comprovada |
| Blockchain ou NFT em qualquer forma | Sem relação com o problema |
| Modo VR ou AR de holograma | Hardware e público ainda não justificam |
| Clonagem de voz aberta sem consentimento | Risco ético e legal inaceitável |
| Preço dinâmico por região | Complexidade fiscal antes de tração |
| Chatbot de suporte dentro do app | Suporte humano por canal resolve agora |
| Importar histórico de outros assistentes | Baixo uso, alto custo de parsing |
| Animações 3D pesadas em WebGL | Custa bateria e FPS, contra a regra R4 |
| Tema sazonal (Natal, Halloween) | Ruído visual sem ganho funcional |
| Newsletter dentro do app | É marketing, não produto |

## Anexo D · Como manter este plano vivo

1. Cada item vira issue com o ID no título: `OTTO-0123 · ...`.
2. Ao concluir, marque o status no CSV e cite o commit no PR.
3. A cada onda, revise a área correspondente: prioridades envelhecem.
4. Item que sobrevive a duas ondas parado: ou vira P0, ou sai do plano.
5. Ideia nova entra **no fim da área**, nunca no meio — o histórico fica auditável.
6. Revisão completa a cada 90 dias, com os números do Anexo A na mão.

> Arquivo irmão: `docs/PLANO-1000.csv` — a mesma base em planilha (separador `;`, BOM para Excel), pronta para filtrar e ordenar.

---

## Anexo E · Registro de execução

### Onda 0 · lote 1 — 07/11/2026 (13 itens)

| ID | O que foi feito | Onde |
|---|---|---|
| OTTO-0002 | Watchdog de 90 s: stream morto não deixa o OTTO preso em "pensando"; `finally` libera a trava sempre | `src/App.tsx` |
| OTTO-0003 | Trava de concorrência (`busyRef`): envio duplo não duplica mensagem e não apaga o texto digitado | `src/App.tsx` |
| OTTO-0008 | Histórico persistido em `localStorage`, formato versionado, teto de 80 mensagens / 200 KB | `src/services/chatHistoryStore.ts` |
| OTTO-0009 | Recarga do ErrorBoundary (e F5) restaura a conversa em vez de apagar | `src/App.tsx` |
| OTTO-0020 | Erro 429 explicado, com `Retry-After` na mensagem | `src/services/http.ts` |
| OTTO-0021 | Timeout por tentativa em toda chamada de API — fim do spinner infinito | `src/services/http.ts` |
| OTTO-0022 | Retry com backoff exponencial em 502/503/504 e falha de rede | `src/services/http.ts` |
| OTTO-0041 | `prefers-reduced-motion` desliga animações infinitas de verdade | `src/index.css` |
| OTTO-0042 | `focus-visible` global, com anel de 2 px e cor por tema | `src/index.css` |
| OTTO-0050 | Faixa de offline com reconexão automática e anúncio em `aria-live` | `src/components/OfflineBanner.tsx` |
| OTTO-0473 | Timeout de 8 s no proxy de imagem | `server.ts` |
| OTTO-0754 | Guarda anti-SSRF: bloqueia loopback, RFC 1918, CGNAT, link-local e metadados de nuvem | `server/urlGuard.ts` |
| OTTO-0761 | Proxy de imagem valida sintaxe, resolve DNS, segue redirects um a um e limita corpo a 8 MB | `server/urlGuard.ts` |

**Testes novos:** 28 (URL guard, histórico, timeout/retry) — suíte total em 52.
**Validação:** `tsc` limpo · build OK · `curl` confirmando 400 para `127.0.0.1`, `169.254.169.254`, `192.168.x`, `localhost` e `file://` no proxy.

### Onda 1 · lote 2 — memória reconstruída (11 concluídos, 4 parciais)

| ID | O que foi feito | Onde |
|---|---|---|
| OTTO-0251 | Persistência normalizada, escrita atômica (tmp + rename) e cache por `mtime` | `server/memoryStore.ts` |
| OTTO-0253 | Tela nova com busca, filtro por categoria, ordenação e exclusão em dois toques | `src/components/PlanetaryMemoryModal.tsx` |
| OTTO-0254 | Quatro categorias claras + memória temporária em aba própria | idem |
| OTTO-0258 | Busca sem acento, multi-termo, com contagem por categoria | idem |
| OTTO-0259 | Ordenação (recentes, A–Z, categoria) e ranking com decaimento de recência | idem + `memoryStore` |
| OTTO-0263 | 20 testes de memória (arquivo, cache, normalização, poda, ranking, aprendizado) | `tests/memoryStore.test.ts` |
| OTTO-0265 | Dedupe e upsert por chave — atualizar nunca duplica | `server/routes/memory.ts` |
| OTTO-0277 | Filtro combinado de categoria, termo e tags | UI |
| OTTO-0280 | Memória conflitante é atualizada mantendo o `id` original | `memoryStore.ts` |
| OTTO-0284 | Constelação em SVG com filtros e legenda (parcial: sem zoom) | UI |
| OTTO-0285 | Estados vazios explicando o que é memória e como alimentá-la | UI |
| OTTO-0286 | Cabeçalho com total, distribuição por categoria e última atualização | UI |
| OTTO-0287 | Itens de formatos antigos continuam válidos via normalização | `memoryStore.ts` |
| OTTO-0288 | Modelo, limites e fórmula de ranking documentados | `docs/MEMORIA.md` |

**Ganho medido no código:** a view anterior rodava física de bolhas em `requestAnimationFrame`
a 60 fps, com colisão entre **todos** os pares (O(n²)), 45 partículas e redimensionamento de
canvas a cada `resize`. A nova não roda nada quando está parada e desenha no máximo 60 nós
em SVG, uma única vez.

**Duplicação eliminada:** `server.ts` mantinha uma segunda cópia de `loadMemories`,
`saveMemories` e `autoLearnUserMemory` escrevendo o mesmo arquivo. As duas foram
substituídas pela implementação única de `server/memoryStore.ts` (−8,6 mil caracteres).

**Validação:** 20 testes novos (72 no total) · `tsc` limpo · build OK · `curl` em
`/api/memory` devolvendo `stats` e upsert funcionando (7 → 8 itens, sem duplicar na segunda escrita).

**Próximo lote sugerido:** OTTO-0005 (microfone negado), OTTO-0026/0027 (plano preso em "rodando"), OTTO-0033 (silêncio não encerra a escuta), OTTO-0031/0032 (links e cópia), OTTO-0601/0604 (a11y do chat), OTTO-0651 (manifest PWA).

---

## Anexo F · Ferramenta de mídia (ffmpeg) — entregue

O ffmpeg entrou na lista de **ferramentas que o modelo escolhe usar**, não como tela isolada de
conversor. O usuário pede no chat; o OTTO decide chamar a ferramenta, escolhe a operação e
devolve o arquivo pronto — que já abre no visualizador.

| Entrega | Onde |
| --- | --- |
| Motor com 9 operações em allowlist (extrair áudio, converter, comprimir, capa, corte, GIF, folha de contato, normalizar, analisar) | `server/mediaTools.ts` |
| Execução por `spawn(bin, args[])`, sem shell; entrada/saída presas a `otto_workspace/media` | idem |
| Limites: 120 MB entrada · 400 MB saída · timeout 120 s (máx 300) · nada é sobrescrito sem autorização | idem |
| Rotas `/api/media/status`, `/list`, `/upload`, `/ffmpeg`, `/file/*` | `server/routes/media.ts` |
| Ferramenta `ffmpeg_media` no function calling do agente | `server/groqService.ts` + `server/toolExecutor.ts` |
| Ação `media_ffmpeg` no chat, com espelho automático do anexo e importação do resultado para o Data Hub | `src/services/toolRouter.ts` + `src/services/dataHubStorage.ts` |
| Badge de estado no compositor ("ffmpeg pronto" / "ffmpeg ausente", com dica por sistema) | `src/components/OttoLiquidBetaView.tsx` |
| Instalação opcional (`ffmpeg-static`) sem quebrar o `npm install` | `package.json` |
| Documentação de operações, segurança e API | `docs/MIDIA.md` |

**Validação:** 18 testes novos (`tests/mediaTools.test.ts`, 90 no total) cobrindo allowlist,
injeção de argumentos, clamps, sanitização de nome, travessia de caminho e `ENGINE_MISSING`;
`tsc` limpo; build OK; e as **9 operações executadas de verdade** contra um ffmpeg estático
(vídeo de 5 s gerado por `testsrc`/`sine`), incluindo `probe` devolvendo duração e codecs.

**Correções encontradas no teste real:** `probe` não gera arquivo (validação de saída pulada),
`extract_frames` virou folha de contato `tile` (sequência `%03d` não é um único arquivo) e
operações encadeadas passaram a aceitar entrada em `media/out` (extrair áudio → normalizar).

---

## Anexo G · Modelos GPT-OSS na Groq — entregue

A Groq desligou `llama-3.3-70b-versatile` e `llama-3.1-8b-instant` em 16/08/2026, e o código
ainda os usava como padrão *e* rebaixava qualquer `gpt-oss` para eles. Resultado: sem IA.

| Correção | Onde |
| --- | --- |
| `openai/gpt-oss-120b` como padrão (raciocínio, ferramentas) e `openai/gpt-oss-20b` como tier rápido | `server/groqService.ts` |
| Apelidos aceitos: `"120b"`, `"20b"`, `"GPT-OSS 120B"`, `oss_20b` → id completo | idem |
| `max_completion_tokens` no lugar de `max_tokens` (o GPT-OSS rejeita o antigo) | Groq + Rota B |
| `parallel_tool_calls: false` (GPT-OSS não faz chamadas paralelas) e `reasoning_effort` por caso de uso | idem |
| Modo JSON nativo na intenção e nos slides | `server.ts` |
| Erro de rede deixou de mentir "nenhum modelo acessível" e de armar cooldown de 5 min | `server/groqService.ts` |
| `/api/groq/status` expõe modelo principal, modelo rápido e recorte da chave | `server/routes/config.ts` |
| `AI_MODEL`, `AI_MODEL_FAST` e `GROQ_BASE_URL` documentados | `.env.example` + `README.md` |

**Validação:** 9 testes novos (102 no total) para resolução de apelidos, escolha por tier e
formato do payload — incluindo a garantia de que `max_tokens` nunca aparece. `tsc` limpo,
build OK, `/api/groq/status` respondendo `ready` com os dois modelos. A chamada real não pôde
ser feita deste ambiente: a rede daqui bloqueia `api.groq.com` (ECONNRESET no handshake TLS),
o que agora aparece como `GROQ_NETWORK_ERROR` em vez de erro de modelo.
