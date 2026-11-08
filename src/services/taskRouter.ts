/**
 * TaskRouter (Client): Detecta a intenção do usuário e decide a rota ideal:
 * ROTA A: Conversação normal e comandos gerais
 * ROTA B: API especializada de TEXTO e CÓDIGO
 */

export type AiRoute = 'ROTA_A' | 'ROTA_B';

export interface RouteDecision {
  route: AiRoute;
  routeName: string;
  providerType: string;
  reason: string;
  confidence: number;
  category:
    | 'casual_chat'
    | 'general_knowledge'
    | 'conceptual_explanation'
    | 'system_command'
    | 'code_generation'
    | 'code_fix'
    | 'code_presentation'
    | 'code_analysis'
    | 'project_scaffold'
    | 'script_creation';
}

export class TaskRouter {
  public static evaluate(userPrompt: string): RouteDecision {
    const p = userPrompt.toLowerCase().trim();

    // 1. Slides / Apresentações com código
    const isCodePresentation =
      (p.includes('slide') || p.includes('apresentação') || p.includes('apresentacao') || p.includes('powerpoint')) &&
      (p.includes('crie') ||
        p.includes('criar') ||
        p.includes('gerar') ||
        p.includes('gere') ||
        p.includes('faça') ||
        p.includes('fazer') ||
        p.includes('html') ||
        p.includes('código') ||
        p.includes('codigo') ||
        p.includes('com 5') ||
        p.includes('com 10') ||
        p.includes('slides'));

    if (isCodePresentation) {
      return {
        route: 'ROTA_B',
        routeName: 'ROTA B — API Especializada de Texto & Código',
        providerType: 'text-code',
        reason: 'Solicitação de apresentação/slides estruturada via código e HTML interativo.',
        confidence: 0.98,
        category: 'code_presentation',
      };
    }

    // 2. Correção de código, debug, conserto de erros
    const isCodeFix =
      (p.includes('corrija') ||
        p.includes('corrigir') ||
        p.includes('conserta') ||
        p.includes('consertar') ||
        p.includes('debug') ||
        p.includes('depurar') ||
        p.includes('resolva o erro') ||
        p.includes('acha o bug') ||
        p.includes('encontre o erro')) &&
      (p.includes('código') ||
        p.includes('codigo') ||
        p.includes('função') ||
        p.includes('funcao') ||
        p.includes('script') ||
        p.includes('bug') ||
        p.includes('exception') ||
        p.includes('erro') ||
        p.includes('linha') ||
        p.includes('stack'));

    if (isCodeFix) {
      return {
        route: 'ROTA_B',
        routeName: 'ROTA B — API Especializada de Texto & Código',
        providerType: 'text-code',
        reason: 'Solicitação de debug, correção e análise de erro em código de programação.',
        confidence: 0.99,
        category: 'code_fix',
      };
    }

    // 3. Geração explícita de código / programação / sites / apps
    const codeKeywords = [
      'react',
      'vue',
      'angular',
      'typescript',
      'javascript',
      'node.js',
      'nodejs',
      'python',
      'html',
      'css',
      'tailwind',
      'sql',
      'dockerfile',
      'algoritmo',
      'função em',
      'funcao em',
      'classe em',
      'componente',
      'endpoint',
      'api rest',
      'express',
      'fastapi',
      'django',
    ];

    const isDirectCodeTech = codeKeywords.some((kw) => p.includes(kw));

    // Exceção importante: "Explique o que é JavaScript" / "O que é React?" -> ROTA A (Explicação conceitual!)
    const isConceptualExplanation =
      (p.startsWith('explique o que é') ||
        p.startsWith('explique o que e') ||
        p.startsWith('o que é') ||
        p.startsWith('o que e') ||
        p.startsWith('como funciona') ||
        p.startsWith('qual a diferença') ||
        p.startsWith('qual a diferenca') ||
        p.startsWith('para que serve')) &&
      !p.includes('crie') &&
      !p.includes('gere') &&
      !p.includes('faça um') &&
      !p.includes('escreva um código');

    if (isConceptualExplanation) {
      return {
        route: 'ROTA_A',
        routeName: 'ROTA A — Conversação Normal',
        providerType: 'conversational',
        reason: 'Pergunta explicativa conceitual (atendida com clareza pela API conversacional padrão).',
        confidence: 0.95,
        category: 'conceptual_explanation',
      };
    }

    // Criação de site, aplicativo, script, dashboard, componente ou código/função
    const isCreateProjectOrCode =
      (p.includes('crie um site') ||
        p.includes('criar um site') ||
        p.includes('crie uma aplicação') ||
        p.includes('criar uma aplicacao') ||
        p.includes('crie um app') ||
        p.includes('crie um dashboard') ||
        p.includes('crie um script') ||
        p.includes('gere um script') ||
        p.includes('faça um script') ||
        p.includes('crie uma função') ||
        p.includes('crie uma funcao') ||
        p.includes('crie um componente') ||
        p.includes('crie uma tela') ||
        p.includes('crie uma página') ||
        p.includes('crie uma pagina') ||
        p.includes('escreva um código') ||
        p.includes('escreva um codigo') ||
        p.includes('gere o código') ||
        p.includes('gere o codigo') ||
        p.includes('gere um código') ||
        p.includes('gere um codigo') ||
        p.includes('crie um código') ||
        p.includes('crie um codigo') ||
        p.includes('programe') ||
        p.includes('programar')) ||
      ((p.includes('função') || p.includes('funcao') || p.includes('código') || p.includes('codigo') || p.includes('algoritmo') || p.includes('script') || isDirectCodeTech) &&
        (p.includes('crie') || p.includes('gere') || p.includes('faça') || p.includes('construa') || p.includes('implemente') || p.includes('escreva')));

    if (isCreateProjectOrCode) {
      return {
        route: 'ROTA_B',
        routeName: 'ROTA B — API Especializada de Texto & Código',
        providerType: 'text-code',
        reason: 'Desenvolvimento de software, criação de aplicação, arquivos de código ou scripts executáveis.',
        confidence: 0.99,
        category: 'code_generation',
      };
    }

    // Refatoração
    if (p.includes('refatore') || p.includes('refatorar') || p.includes('otimize este código') || p.includes('melhore esse código')) {
      return {
        route: 'ROTA_B',
        routeName: 'ROTA B — API Especializada de Texto & Código',
        providerType: 'text-code',
        reason: 'Refatoração e aprimoramento de código existente.',
        confidence: 0.96,
        category: 'code_fix',
      };
    }

    // Saudações
    if (
      p === 'oi' ||
      p === 'olá' ||
      p === 'ola' ||
      p === 'oi tudo bem' ||
      p === 'olá tudo bem' ||
      p === 'bom dia' ||
      p === 'boa tarde' ||
      p === 'boa noite' ||
      p === 'tudo bem'
    ) {
      return {
        route: 'ROTA_A',
        routeName: 'ROTA A — Conversação Normal',
        providerType: 'conversational',
        reason: 'Interação de saudação e conversação casual.',
        confidence: 0.99,
        category: 'casual_chat',
      };
    }

    // Perguntas gerais
    if (
      p.startsWith('qual é a') ||
      p.startsWith('qual e a') ||
      p.startsWith('quem foi') ||
      p.startsWith('onde fica') ||
      p.startsWith('quantos') ||
      p.startsWith('quando')
    ) {
      return {
        route: 'ROTA_A',
        routeName: 'ROTA A — Conversação Normal',
        providerType: 'conversational',
        reason: 'Pergunta de conhecimento geral ou fatos do mundo.',
        confidence: 0.97,
        category: 'general_knowledge',
      };
    }

    // Comandos de sistema cotidianos do assistente
    if (
      p.includes('volume') ||
      p.includes('youtube') ||
      p.includes('toque') ||
      p.includes('ouvir') ||
      p.includes('música') ||
      p.includes('musica') ||
      p.includes('pesquise no google') ||
      p.includes('pesquise imagens') ||
      p.includes('abrir configurações') ||
      p.includes('abrir terminal') ||
      p.includes('abrir memória') ||
      p.includes('ver arquivos') ||
      p.includes('organizar pastas')
    ) {
      return {
        route: 'ROTA_A',
        routeName: 'ROTA A — Conversação Normal',
        providerType: 'conversational',
        reason: 'Comando de controle de sistema, multimídia ou navegação do assistente.',
        confidence: 0.98,
        category: 'system_command',
      };
    }

    // Padrão: ROTA A
    return {
      route: 'ROTA_A',
      routeName: 'ROTA A — Conversação Normal',
      providerType: 'conversational',
      reason: 'Comando padrão de conversação e assistência geral.',
      confidence: 0.85,
      category: 'casual_chat',
    };
  }
}
