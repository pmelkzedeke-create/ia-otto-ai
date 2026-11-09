# Memória do OTTO — modelo, limites e ranking

> Documentação do subsistema de memória (OTTO-0288). Fonte única da verdade:
> `server/memoryStore.ts`. Interface: `src/components/PlanetaryMemoryModal.tsx`.

## 1. O que a memória guarda

| Categoria | Para que serve | Exemplo |
|---|---|---|
| `LEARNED` | Estilo, tom e preferências assimiladas da conversa | "prefere TypeScript a JavaScript puro" |
| `KNOWLEDGE` | Capacidades do sistema e ferramentas | "controla volume, Chrome e terminal" |
| `RESEARCH` | Tópicos pesquisados na web | "interesse: carros elétricos" |
| `SYSTEM` | Rotina, horários e preferências fixas | "pico de uso à noite • uptime 8h" |

Memória **temporária** (scratchpad) é separada: vive em `/api/scratchpad`, vale para a
conversa atual e não entra no ranking de longo prazo.

## 2. Formato de um item

```ts
interface ServerMemoryItem {
  id: string;          // 'mem_...' — identidade interna
  key: string;         // identidade lógica (upsert por chave, máx. 120)
  value: string;       // conteúdo (máx. 4.000)
  title?: string;      // rótulo curto (máx. 160)
  category?: 'KNOWLEDGE' | 'LEARNED' | 'RESEARCH' | 'SYSTEM';
  summary?: string;    // resumo de uma linha (máx. 240)
  tags?: string[];     // até 12, minúsculas, sem duplicata
  color?: string;      // acento visual
  createdAt: string;   // ISO 8601
}
```

Tudo que entra é normalizado (`normalizeMemory`): categoria inválida vira `LEARNED`,
tags são limpas e deduplicadas, datas quebradas viram "agora", textos são truncados.
Itens antigos de formatos anteriores continuam válidos — por isso não houve migração.

## 3. Onde fica e como é gravado

- Arquivo: `otto_workspace/.otto_memory.json` (JSON legível, editável à mão).
- Escrita **atômica**: grava em `.tmp` e faz `rename` — nunca deixa JSON pela metade.
- Leitura com **cache** invalidado por `mtime` + tamanho: o arquivo só é reinterpretado
  quando muda. Antes, cada mensagem enviada relia e reprocessava o arquivo inteiro.
- Duas implementações que existiam (uma em `server.ts`) foram unificadas aqui.

## 4. Limites e poda

- Teto de **400 itens** (`MAX_MEMORY_ITEMS`).
- Ao estourar, saem primeiro as **pesquisas mais antigas** (`RESEARCH`).
  `LEARNED`, `KNOWLEDGE` e `SYSTEM` nunca são descartadas automaticamente.
- Dedupe por `key`: a versão mais recente substitui a anterior (upsert, não duplicata).

## 5. Ranking de relevância

`selectRelevantMemories(memórias, pergunta, limite = 15)` usa `scoreMemories`:

| Sinal | Peso |
|---|---|
| Tag idêntica ao termo | +18 |
| Tag que contém o termo | +10 |
| Termo no título | +12 |
| Termo na chave | +10 |
| Termo no corpo/resumo | +6 |
| Cobertura (vários termos casando) | até +8 |
| Categoria (`SYSTEM` 12 · `LEARNED` 8 · `KNOWLEDGE` 6 · `RESEARCH` 4) | base |
| Recência (meia-vida de 45 dias) | até +14 |

O peso por termo é limitado a 30 para que uma palavra repetida não domine.
Consultas passam por `tokenizeQuery`: minúsculas, sem acento, sem pontuação,
sem stopwords e sem palavras de menos de 3 letras.

Antes, apenas a categoria valia 60 pontos e a data somava no máximo 10 — o resultado
era quase sempre "as mesmas memórias de sistema", independente da pergunta.

## 6. API

| Método | Rota | Retorno |
|---|---|---|
| `GET` | `/api/memory` | `{ memories, stats }` |
| `POST` | `/api/memory` | upsert por `key` → `{ success, memory, memories, stats }` |
| `DELETE` | `/api/memory/:id` | `{ success, memories, stats }` |
| `DELETE` | `/api/memory` | apaga tudo → `{ success, memories, stats }` |

`stats` traz total, contagem por categoria, data mais antiga/mais recente e caracteres totais.

## 7. Interface

- Abas: **Memórias** (grade com busca, filtro por categoria e ordenação), **Constelação**
  (SVG, sem animação contínua), **Temporária** (scratchpad) e **Projetos**.
- Painel de detalhe com "usar no chat", "pesquisar", "copiar" e apagar em dois toques.
- Sem canvas e sem `requestAnimationFrame`: a tela fica inerte quando parada.
- Tema claro e escuro; `prefers-reduced-motion` desliga as animações de entrada.
- Acessível: `role="dialog"`, Esc fecha a camada do topo, foco preso no painel.

## 8. Como estender

1. Novo campo? Adicione em `ServerMemoryItem`, normalize em `normalizeMemory` e inclua
   na UI só se ele muda uma decisão do usuário.
2. Novo sinal de ranking? Vá em `scoreMemories` e cubra com um teste em
   `tests/memoryStore.test.ts` (o desempate precisa continuar determinístico).
3. Nunca escreva direto no arquivo: use `loadMemories` + `saveMemories`.
