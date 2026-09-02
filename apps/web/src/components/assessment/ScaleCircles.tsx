'use client';

import type { Choice } from '@/domain/assessment/types';

/**
 * A regua de circulos graduados.
 *
 * O DESENHO CARREGA A ESCALA. Os circulos crescem para as pontas e encolhem no
 * meio, e a cor vira de um lado para o outro — entao a intensidade da resposta
 * e legivel antes de qualquer texto. Numa lista de cinco rotulos parecidos,
 * repetida quarenta vezes, a pessoa para de ler e passa a contar posicoes; aqui
 * a posicao ja e a informacao.
 *
 * O ROTULO NAO SOME, MUDA DE LUGAR. Cada botao carrega o texto da opcao no seu
 * nome acessivel, entao um leitor de tela anuncia "Concordo totalmente" e nao
 * "botao 5". Sem isso a regua seria bonita e inutilizavel — e uma escala sobre
 * traços do espectro e exatamente onde nao se pode empurrar quem depende de
 * leitor de tela para fora.
 *
 * SAO RADIOS DE VERDADE, com `name` por questao: a navegacao por setas, o
 * estado de foco e o envio sem JavaScript vem de graca do navegador. O circulo
 * e a decoracao do input, nao um substituto dele.
 *
 * A ANIMACAO E CURTA E TEM FREIO. O circulo escolhido cresce um pouco e o anel
 * preenche; tudo dentro de `prefers-reduced-motion: no-preference`, porque
 * sensibilidade a movimento e comum entre as pessoas que respondem justamente
 * este teste.
 */
export function ScaleCircles({
  choices,
  chosen,
  name,
  labels,
  poles,
  onChoose,
}: {
  choices: Choice[];
  chosen?: string;
  name: string;
  /** Rotulo de cada opcao, por id. Vai para o nome acessivel do botao. */
  labels: Record<string, string>;
  poles: { low: string; high: string };
  onChoose: (choiceId: string) => void;
}) {
  const meio = (choices.length - 1) / 2;

  return (
    <div className="scale-circles">
      <span className="scale-pole scale-pole-low">{poles.low}</span>

      <div className="scale-circles-track">
        {choices.map((choice, i) => {
          /**
           * Distancia do centro, de 0 a 1. Governa tamanho e cor: o meio e o
           * menor e o mais neutro, as pontas sao as maiores e as mais
           * saturadas — a forma diz o que o texto diria.
           */
          const distancia = Math.abs(i - meio) / meio;
          const lado = i < meio ? 'low' : i > meio ? 'high' : 'mid';

          return (
            <label
              key={choice.id}
              className={`scale-circle is-${lado} ${chosen === choice.id ? 'is-chosen' : ''}`}
              style={{ '--d': distancia } as React.CSSProperties}
            >
              <input
                type="radio"
                name={name}
                value={choice.id}
                checked={chosen === choice.id}
                onChange={() => onChoose(choice.id)}
              />
              <span className="sr-only">{labels[choice.id]}</span>
              <span className="scale-circle-ring" aria-hidden="true">
                {/* O check e desenhado, nao aceso: o traco corre de uma ponta a
                    outra em 240ms. A diferenca importa porque o circulo escolhido
                    precisa ser visivelmente marcado ANTES de a tela avancar — o
                    runner espera 260ms de proposito, e um simbolo que aparece
                    pronto no mesmo quadro le-se como toque errado. */}
                <svg className="scale-circle-check" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 12.4 10.3 16.6 18 7.6" />
                </svg>
              </span>
            </label>
          );
        })}
      </div>

      <span className="scale-pole scale-pole-high">{poles.high}</span>
    </div>
  );
}
