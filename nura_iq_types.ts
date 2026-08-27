// NURA — Teste de QI · Tipos do banco de itens e do motor de teste
// Stack: React 19 + Vite 7 + TypeScript + Tailwind v4 + shadcn/ui

export type Dimensao =
  | "reconhecimento_padroes"
  | "pensamento_analitico"
  | "raciocinio_abstrato"
  | "orientacao_espacial"
  | "percepcao_visual"
  | "memoria_trabalho";

export type Formato = "texto" | "svg" | "memoria" | "none" | "entrada_livre";

/** Como a questão de memória é exibida e cobrada. */
export interface MemoriaSpec {
  /** Estímulo mostrado e depois escondido (ex.: "4 9 2 6 1" ou "Cognitivo"). */
  estimulo: string;
  /** Tempo que o estímulo fica visível antes de sumir. */
  exibir_ms: number;
  /** Como a resposta é cobrada. */
  cobrar: "sequencia_completa" | "posicional" | "reconhecimento" | "inverso";
  /** Para cobrar="posicional": qual posição (1-based) é perguntada. */
  posicao?: number;
  /** Quantas questões entram ENTRE o estímulo e a cobrança (interferência). */
  gap_itens: number;
}

export interface Item {
  id: string;                 // ex.: "ABS-03"
  ordem: number;              // posição no teste (1..45), por dificuldade crescente
  dimensao: Dimensao;
  tipo: string;               // ex.: "matriz_rotacao", "span_digitos"
  dificuldade: 1 | 2 | 3 | 4 | 5;
  enunciado: string;
  /** Estímulo principal. String SVG quando formato_estimulo="svg", texto quando "texto", null quando não há. */
  estimulo: string | null;
  formato_estimulo: Formato;
  /** Alternativas: strings de texto OU strings SVG. Vazio quando entrada_livre. */
  alternativas: string[];
  formato_alternativas: Formato;
  /** Índice (0-based) da alternativa correta. null quando entrada_livre (compara com memoria.estimulo). */
  correta: number | null;
  /** Mecânica de memória — presente só em dimensao="memoria_trabalho". */
  memoria?: MemoriaSpec;
  /** Documentação interna da regra do item. NUNCA exibir ao usuário. */
  regra: string;
}

/** Resposta registrada do usuário para um item. */
export interface Resposta {
  itemId: string;
  escolhaIndex: number | null; // índice marcado, ou null se entrada livre
  entradaLivre?: string;       // para span_digitos / inverso
  correta: boolean;
  tempo_ms: number;            // tempo gasto neste item
}

/** Resultado por dimensão (perfil cognitivo). */
export interface ScoreDimensao {
  dimensao: Dimensao;
  acertos: number;
  total: number;
  percentual: number;          // 0..100
  percentil?: number;          // vs. norma, se disponível
}

/** Resultado final do teste. */
export interface ResultadoQI {
  qi: number;                  // pontuação final normalizada
  percentil: number;           // vs. população da faixa
  tempoTotal_ms: number;
  fatorVelocidade: number;     // multiplicador aplicado por rapidez
  perfil: ScoreDimensao[];     // 6 eixos
  pontosFortes: Dimensao[];
  pontosFracos: Dimensao[];
}

/** Config de gamificação: telas de transição entre blocos. */
export interface TelaTransicao {
  aposOrdem: number;           // dispara depois da questão de ordem N
  tipo: "velocidade" | "progresso" | "encorajamento";
  // Texto é montado em runtime com base no desempenho parcial (ex.: percentil de velocidade).
}
