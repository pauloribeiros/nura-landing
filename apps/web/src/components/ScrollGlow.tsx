'use client';

import { useEffect, useRef } from 'react';

/**
 * Uma camada de luz que anda com a rolagem da pagina.
 *
 * Publica `--p` (de 0 a 1) no proprio elemento: 0 quando o topo do bloco
 * encosta na base da janela, 1 quando a base dele sai pelo topo. O CSS decide
 * o que fazer com esse numero — aqui, mover os dois focos de luz do fundo.
 *
 * NAO USA `animation-timeline: view()`. Seria menos codigo e roda fora da
 * thread principal, mas o Safari ainda nao implementa, e o Safari do iPhone e
 * justamente onde a maior parte destas telas e vista: o efeito simplesmente
 * nao existiria para quem mais importa.
 *
 * O CUSTO E MEDIDO. O listener de rolagem so e ligado enquanto o bloco esta em
 * cena, e cada rajada de eventos vira uma unica leitura dentro de um
 * requestAnimationFrame — ler `getBoundingClientRect` a cada evento de scroll e
 * a receita classica de travar a rolagem no celular.
 *
 * Com `prefers-reduced-motion` o efeito nao liga e `--p` fica no meio do
 * caminho, que e uma composicao estatica valida — e tambem o que aparece se o
 * JavaScript nunca rodar.
 */
export function ScrollGlow({ className }: { className: string }) {
  const alvo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = alvo.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let quadro = 0;

    const medir = () => {
      quadro = 0;
      const janela = window.innerHeight;
      const caixa = el.getBoundingClientRect();
      const bruto = (janela - caixa.top) / (janela + caixa.height);
      el.style.setProperty('--p', Math.min(1, Math.max(0, bruto)).toFixed(4));
    };

    const agendar = () => {
      if (quadro) return;
      quadro = requestAnimationFrame(medir);
    };

    /* Aba escondida nao pinta, entao o quadro agendado fica na fila e `medir`
       nao roda. Ao voltar, o pedido antigo e descartado e a posicao e refeita
       do zero — sem isto o efeito podia voltar congelado no ultimo valor. */
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return;
      if (quadro) cancelAnimationFrame(quadro);
      quadro = 0;
      agendar();
    };

    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) {
        window.addEventListener('scroll', agendar, { passive: true });
        agendar();
      } else {
        window.removeEventListener('scroll', agendar);
      }
    });

    observador.observe(el);
    window.addEventListener('resize', agendar, { passive: true });
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      observador.disconnect();
      if (quadro) cancelAnimationFrame(quadro);
      window.removeEventListener('scroll', agendar);
      window.removeEventListener('resize', agendar);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, []);

  return <div ref={alvo} className={className} aria-hidden="true" />;
}
