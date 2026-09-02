/**
 * Assessment domain model.
 *
 * Deliberately data-first: an instrument is a description, not code. Adding an
 * assessment means adding a definition object, never a new scoring branch —
 * which is what keeps section 17 of the master doc (a reusable engine, many
 * question types) from turning into one page per test.
 *
 * Nothing here imports React or touches the DOM. Scoring has to be able to run
 * on the server, because section 59 is explicit that the frontend is not
 * trusted for anything that gates money or results.
 */

export type QuestionType = 'likert' | 'single-choice' | 'multi-choice' | 'slider';

/** A stored answer references choices by id, never by index or label. */
export interface Choice {
  id: string;
  /** Ordinal weight. For a Likert scale this is the position, 0-based. */
  value: number;
}

export interface Scale {
  id: string;
  choices: Choice[];
  /**
   * Como a escala e desenhada.
   *
   * `list` e o padrao: cada opcao com o seu rotulo, uma embaixo da outra. E o
   * certo para uma escala de frequencia, onde "quase sempre" e "sempre"
   * precisam ser lidos para serem distinguidos.
   *
   * `circles` desenha uma regua de circulos graduados com os extremos
   * nomeados nas pontas. Serve a uma escala de concordancia, onde a posicao ja
   * comunica a intensidade e ler cinco rotulos parecidos a cada uma das 40
   * questoes so cansa. O rotulo continua existindo para quem usa leitor de
   * tela — ele nao some, muda de lugar.
   */
  presentation?: 'list' | 'circles';
  /** Chaves dos extremos, quando `circles`. */
  poles?: { low: string; high: string };
}

export interface Question {
  /** Stable across versions. Answers are stored against this. */
  id: string;
  type: QuestionType;
  /** Section of the instrument, e.g. the ASRS Part A / Part B split. */
  block: string;
  scaleId: string;
  /**
   * Item redigido na direcao contraria: concordar indica AUSENCIA do traco.
   *
   * Existe contra o vies de aquiescencia — a tendencia real de marcar
   * "concordo" em tudo, que num questionario inteiro escrito na mesma direcao
   * produz uma pontuacao alta que nao mede nada. A inversao acontece em
   * `valueOf`, entao toda regra a herda igual: soma, contagem por limiar e
   * marcacao de itens veem sempre o valor ja na direcao do traco.
   */
  reversed?: boolean;
}

/**
 * Counts how many questions cleared their own threshold, then compares the
 * count to a cutoff.
 *
 * The per-question threshold is the point people get wrong about the ASRS: the
 * shaded box does not start at the same answer for every item. A single global
 * cutoff produces a different result from the published instrument.
 */
export interface ThresholdCountRule {
  kind: 'threshold-count';
  id: string;
  questionIds: string[];
  /** Minimum choice value that counts as positive, per question id. */
  positiveAt: Record<string, number>;
  /** How many positives are needed for the flag to be raised. */
  cutoff: number;
  /** Inclusive ranges over the positive count, mapped to an interpretation
   *  key. Bands describe; the copy behind the key is what the person reads. */
  bands?: { from: number; to: number; key: string }[];
}

/**
 * Names which items cleared their own threshold, without producing a score or
 * a verdict. ASRS Part B works this way: it has no minimum score and must not
 * move the Part A result, but it does say which symptoms were answered in a
 * clinically relevant range — which is what the in-depth report is built on.
 */
export interface FlaggedItemsRule {
  kind: 'flagged-items';
  id: string;
  questionIds: string[];
  positiveAt: Record<string, number>;
}

/** Plain sum of choice values — used for descriptive subscales. */
export interface SumRule {
  kind: 'sum';
  id: string;
  questionIds: string[];
}

export type ScoringRule = ThresholdCountRule | SumRule | FlaggedItemsRule;

export interface AssessmentDefinition {
  assessmentId: string;
  /** Version of the instrument itself. */
  version: string;
  /** Version of the scoring rules. Bumped independently: a threshold can be
   *  corrected without the questionnaire having changed. */
  scoringVersion: string;
  /** Source and licence, surfaced in the UI and required by attribution. */
  provenance: {
    instrument: string;
    authors: string;
    licence: string;
    /** Population the instrument was validated for. */
    validatedFor: string;
  };
  scales: Scale[];
  questions: Question[];
  rules: ScoringRule[];
  /**
   * Set while an instrument is described but not yet scorable — for example
   * when the per-question thresholds have not been transcribed from the
   * published source. `scoreAssessment` refuses to run, so a half-known
   * instrument can never silently produce a wrong result.
   */
  pending?: string;
}

export interface Answer {
  questionId: string;
  choiceId: string;
}

export interface ScoreResult {
  assessmentId: string;
  version: string;
  scoringVersion: string;
  /** Numeric outcome per rule id. */
  scores: Record<string, number>;
  /** Raised flags per threshold-count rule id. */
  flags: Record<string, boolean>;
  /** Item ids that cleared their threshold, per flagged-items rule id.
   *  Descriptive only — never feeds a flag. */
  flagged: Record<string, string[]>;
  /** Interpretation band matched per threshold-count rule id. */
  bands: Record<string, string>;
  /** 0..1 — how much of the instrument was answered. */
  completeness: number;
}
