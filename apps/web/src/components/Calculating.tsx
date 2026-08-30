'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * The screen between the last answer and the result.
 *
 * WHY IT EXISTS AT ALL. Scoring takes a fraction of a second, so this could be
 * a blink. It is not, and the reason is not theatre: someone who just spent
 * twenty minutes answering needs to see that the twenty minutes turned into
 * something. A result that appears instantly reads as a lookup; one that is
 * assembled in front of you reads as work — and here the work is real, listed
 * by name, one line per dimension the scorer actually computes.
 *
 * WHAT IT DOES NOT SAY is "our AI is analysing your answers". Nothing here is
 * AI: the scorer is arithmetic over an answer key, and saying otherwise would
 * be inventing a capability to impress. The lines come from whoever renders
 * this screen, and each one has to name something the scorer genuinely
 * computes — the six cognitive dimensions in the IQ test, the two ASRS blocks
 * in the attention one.
 *
 * THE FLOOR AND THE CEILING. The list advances on a timer so it can be read,
 * but the screen never finishes before the server answers, and never lingers
 * once it has: `pronto` gates the last step. A progress bar that completes
 * while the request is still in flight is a lie that gets caught the moment
 * the next screen fails to appear.
 *
 * THE QUESTIONS THAT INTERRUPT IT are real questions, not decoration. Two of
 * them ask again for what was memorised — a delayed recall, minutes after the
 * item itself, which is the one thing this screen is genuinely well placed to
 * measure. The options are the true value and a decoy built from it, so there
 * is no version of this where the "right" answer is not the one that was
 * actually shown.
 */

/** How long each line takes to tick. Six lines make a floor of ~3.6s. */
const PASSO_MS = 600;

/** Uma pergunta mostrada por cima da tela, com duas saidas. */
export interface PerguntaCarregamento {
  id: string;
  texto: string;
  opcoes: string[];
  /** Depois de quantas linhas marcadas ela aparece. */
  apos: number;
}

export function Calculating({
  pronto,
  linhas,
  perguntas = [],
  titulo,
  lead,
  eyebrow,
  onResponder,
  onDone,
}: {
  pronto: boolean;
  /** Uma linha por etapa real do calculo, na ordem em que sao marcadas. */
  linhas: string[];
  perguntas?: PerguntaCarregamento[];
  titulo: string;
  lead: string;
  eyebrow: string;
  /** Chamado quando uma pergunta e respondida, com o indice da opcao. */
  onResponder?: (perguntaId: string, indice: number) => void;
  onDone: () => void;
}) {
  const [passo, setPasso] = useState(0);
  const [respondidas, setRespondidas] = useState<string[]>([]);

  // A primeira que couber no passo atual e ainda nao tiver sido respondida.
  const aberta = perguntas.find((p) => passo >= p.apos && !respondidas.includes(p.id));

  useEffect(() => {
    // The last step waits for the real result; everything before it is just
    // slow enough to read.
    if (passo >= linhas.length) return;
    if (passo === linhas.length - 1 && !pronto) return;
    // Uma pergunta aberta segura a barra: ela nao corre por baixo do dialogo.
    if (aberta) return;

    const id = window.setTimeout(() => setPasso((p) => p + 1), PASSO_MS);
    return () => window.clearTimeout(id);
  }, [passo, pronto, aberta]);

  useEffect(() => {
    if (passo < linhas.length || !pronto || aberta) return;
    const id = window.setTimeout(onDone, 450);
    return () => window.clearTimeout(id);
  }, [passo, pronto, aberta, onDone]);

  const pct = Math.round((passo / linhas.length) * 100);

  return (
    <section className="runner iq-calc">
      <div className="wrap runner-inner">
        <p className="eyebrow eyebrow-light">{eyebrow}</p>
        <h1>{titulo}</h1>
        <p className="runner-lead">{lead}</p>

        <div className="iq-calc-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="iq-calc-pct">{pct}%</p>

        <ul className="iq-calc-list">
          {linhas.map((linha, i) => (
            <li key={linha} className={i < passo ? 'is-done' : ''}>
              <span className="iq-calc-box" aria-hidden="true">
                {i < passo ? <Check size={13} strokeWidth={3} /> : null}
              </span>
              {linha}
            </li>
          ))}
        </ul>
      </div>

      {/* Asked here rather than before the test: at the start each one is one
          more thing between the person and the first question. */}
      {aberta ? (
        <div className="iq-ask" role="dialog" aria-modal="true" aria-label={aberta.texto}>
          <div className="iq-ask-card">
            <p>{aberta.texto}</p>
            <div className={`iq-ask-actions ${aberta.opcoes.length > 2 ? 'is-list' : ''}`}>
              {aberta.opcoes.map((opcao, indice) => (
                <button
                  key={opcao}
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    onResponder?.(aberta.id, indice);
                    setRespondidas((r) => [...r, aberta.id]);
                  }}
                >
                  {opcao}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
