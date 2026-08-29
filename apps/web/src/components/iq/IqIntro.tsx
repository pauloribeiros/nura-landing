'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { PublicItem } from '@/domain/iq/bank';
import type { IqResult as IqResultData } from '@/domain/iq/scoring';
import type { IqSession } from '@/domain/iq/session';
import { IqRunner } from './IqRunner';
import { IqCalculating, type PerguntaCarregamento } from './IqCalculating';
import { IqEmailGate } from './IqEmailGate';
import { useFocusMode } from '@/lib/focusMode';
import { ensureSession } from '@/lib/supabase/client';
import { randomId } from '@/lib/randomId';

/**
 * The screen before the test, and the one that owns the run.
 *
 * The intro exists to set expectations that change the measurement: how long
 * it takes, that some questions hide their stimulus, and that looking things
 * up makes the result meaningless. A timed reasoning test where the person did
 * not know they were being timed measures something else.
 *
 * The disclaimer is not decoration either. This produces a points total on
 * NURA's own scale, not an IQ — an IQ is a normalised position in a
 * standardisation sample, and none exists here. The screen says so before
 * anyone spends twenty minutes.
 */
export function IqIntro({ items }: { items: PublicItem[] }) {
  const t = useTranslations('iq');
  const locale = useLocale();
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<'idle' | 'scoring' | 'error'>('idle');
  const [result, setResult] = useState<IqResultData | null>(null);
  // Held back until the calculating screen finishes its list, so the result
  // does not appear behind it mid-animation.
  const [pronto, setPronto] = useState<IqResultData | null>(null);
  // Devolvido pelo score: e o que o checkout usa para saber o que esta sendo
  // vendido. Sem ele nao ha o que comprar.
  const [sessionId, setSessionId] = useState<string | undefined>();
  // Para onde o atalho de teste deve ir depois de criar a corrida.
  const [atalho, setAtalho] = useState<string | null>(null);

  /**
   * As perguntas que interrompem a tela de calculo.
   *
   * Duas delas cobram de novo o que foi memorizado, agora minutos depois — uma
   * recordacao tardia, que e a unica coisa que esta tela esta bem posicionada
   * para medir. As opcoes sao o valor verdadeiro e um chamariz derivado dele:
   * os digitos ao contrario, e a outra palavra do proprio teste. Nao ha versao
   * disso em que a resposta "certa" nao seja a que foi mostrada.
   */
  const perguntas = useMemo<PerguntaCarregamento[]>(() => {
    const memoria = items.filter((i) => i.memoria?.estimulo);
    const digitos = memoria.find((i) => i.tipo === 'span_digitos')?.memoria?.estimulo;
    const palavras = memoria.filter((i) => i.tipo === 'span_palavra');

    const lista: PerguntaCarregamento[] = [
      { id: 'primeira-vez', texto: t('calcAsk'), opcoes: [t('calcNo'), t('calcYes')], apos: 1 },
    ];

    if (digitos) {
      const invertido = digitos.split(' ').reverse().join(' ');
      lista.push({ id: 'digitos', texto: t('calcAskNumber'), opcoes: [invertido, digitos], apos: 3 });
    }

    if (palavras.length >= 2) {
      const segunda = palavras[1].memoria!.estimulo;
      const primeira = palavras[0].memoria!.estimulo;
      lista.push({ id: 'palavra', texto: t('calcAskWord'), opcoes: [primeira, segunda], apos: 5 });
    }

    return lista;
  }, [items, t]);

  // Focus mode from the moment the page opens until the result exists — the
  // intro included. Owned here rather than in the runner because this
  // component is the one that lives through every stage; two owners adding and
  // removing the same class would fight when one of them unmounted.
  // Continua em modo foco depois do resultado: a tela de e-mail e a de
  // pagamento sao onde uma saida custa mais, e o "Comecar" do cabecalho e
  // exatamente uma saida.
  useFocusMode(started || pronto ? 'answering' : 'reading');

  /**
   * Sends the run to be scored.
   *
   * The browser cannot do this itself — it never had the answer key. A failure
   * here is shown rather than swallowed: unlike a sync that can be retried
   * later, there is nothing to fall back to, and someone who spent twenty
   * minutes deserves to know the result did not arrive.
   */
  const submit = async (session: IqSession) => {
    setState('scoring');
    try {
      const response = await fetch('/api/iq/score', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ respostas: session.respostas, locale }),
      });
      if (!response.ok) {
        setState('error');
        return;
      }
      const body = (await response.json()) as { sessionId?: string; result: IqResultData };
      setSessionId(body.sessionId);
      setResult(body.result);
    } catch {
      setState('error');
    }
  };

  /**
   * Signs in anonymously before the run, not after it.
   *
   * The score route needs a session to own the result. Creating it at submit
   * would be tidier — only finished runs would make a user — but it moves the
   * one step that can fail to the end, where failing costs someone twenty
   * minutes of work with nothing to show. Failing here costs a click.
   *
   * An abandoned run still leaves no assessment rows: the session and the
   * result are written by the server, at submit.
   */
  const begin = () => {
    void ensureSession();
    setStarted(true);
  };

  // `?fim=pagamento` pula tambem o calculo e o e-mail: a pagina de pagamento
  // precisa de uma sessao deste aparelho, e essa e a unica forma de chegar
  // nela sem responder o teste.
  useEffect(() => {
    if (atalho !== 'pagamento' || !sessionId) return;
    window.location.href = `/${locale}/p/${sessionId}`;
  }, [atalho, sessionId, locale]);

  /**
   * Atalho para o fim do teste, para conferir as telas finais.
   *
   * Existe porque a alternativa e responder 45 questoes a cada ajuste na tela
   * de calculo, no e-mail ou no pagamento. Ele nao finge nada: cria uma
   * corrida de verdade, com uma resposta, e manda para o mesmo `submit` que o
   * teste inteiro usa. A sessao sai gravada no banco e pertence a este
   * aparelho, que e o unico jeito de a pagina de pagamento abrir — um link
   * pronto nao funcionaria no celular de outra pessoa.
   *
   * Atras de `NEXT_PUBLIC_IQ_PREVIEW=1` e de um parametro na URL, porque um
   * visitante que caisse nele por acaso pularia o teste e chegaria ao
   * pagamento com um resultado que nao e dele.
   */
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_IQ_PREVIEW !== '1') return;
    const destino = new URLSearchParams(window.location.search).get('fim');
    if (!destino) return;
    if (started || state !== 'idle' || result) return;
    setAtalho(destino);

    let cancelado = false;
    void (async () => {
      await ensureSession();
      if (cancelado) return;
      const agora = Date.now();
      await submit({
        id: randomId(),
        startedAt: new Date(agora - 18 * 60 * 1000).toISOString(),
        stepIndex: 0,
        stepShownAt: agora,
        // Uma resposta so, com o tempo total do teste inteiro: o suficiente
        // para as telas finais terem numeros com que trabalhar.
        respostas: items.slice(0, 1).map((item) => ({
          itemId: item.id,
          escolhaIndex: 0,
          correta: false,
          tempo_ms: 18 * 60 * 1000,
        })),
      });
    })();

    return () => {
      cancelado = true;
    };
    // Roda uma vez: e um atalho de teste, nao um estado do app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // O resultado nao e entregue nesta fase: quem termina vai para o e-mail e
  // para o pagamento. `IqResult` continua no repositorio, pronto para voltar
  // quando o relatorio existir.
  if (pronto) return <IqEmailGate sessionId={sessionId} result={pronto} />;

  // The calculating screen goes up the instant the run ends and holds until
  // the server answers — `pronto` is what lets it finish, so the bar can never
  // complete before the result exists.
  if (state === 'scoring') {
    return (
      <IqCalculating
        pronto={result !== null}
        perguntas={perguntas}
        onDone={() => {
          if (result) setPronto(result);
          setState('idle');
        }}
      />
    );
  }

  if (state === 'error') {
    return (
      <section className="runner">
        <div className="wrap runner-inner">
          <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
          <h1>{state === 'error' ? t('scoreFailedTitle') : t('computing')}</h1>
          {state === 'error' ? <p className="runner-lead">{t('scoreFailedBody')}</p> : null}
        </div>
      </section>
    );
  }

  if (started) {
    return <IqRunner items={items} onFinish={submit} />;
  }

  return (
    <section className="runner runner-intro">
      <div className="wrap runner-inner">
        <p className="eyebrow eyebrow-light">{t('eyebrow')}</p>
        <h1>{t('title')}</h1>
        <p className="runner-lead">{t('lead')}</p>

        <ul className="runner-notes">
          <li>{t('note1')}</li>
          <li>{t('note2')}</li>
          <li>{t('note3')}</li>
        </ul>

        <p className="runner-disclaimer">{t('disclaimer')}</p>

        <div className="runner-actions">
          <button type="button" className="button button-primary" onClick={begin}>
            {t('start')} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
