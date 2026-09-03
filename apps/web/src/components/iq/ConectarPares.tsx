'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  parEhCorreto,
  tracadoCruza,
  type Ligacao,
  type ParCorreto,
  type Ponto,
  type ResultadoConectarPares,
} from '@/domain/iq/conectarPares';

export type { ResultadoConectarPares } from '@/domain/iq/conectarPares';

/**
 * Ligar os pontos da mesma cor sem cruzar nenhuma linha, contra o relogio.
 *
 * PONTEIRO, NAO MOUSE NEM TOQUE. Um unico conjunto de eventos de ponteiro
 * cobre dedo, caneta e mouse, e `setPointerCapture` mantem o traco vivo quando
 * o dedo sai da area — que e o que acontece o tempo todo num celular, porque a
 * area util tem a largura da tela e os pontos ficam perto da borda.
 *
 * `touch-action: none` NA SUPERFICIE, e nao no documento. Sem isso o primeiro
 * movimento do dedo rola a pagina em vez de desenhar, e a pessoa conclui que o
 * item esta quebrado. Limitado a superficie porque o resto da tela precisa
 * continuar rolando.
 *
 * O RELOGIO SO COMECA AO PRIMEIRO TOQUE (`iniciarAoTocar`). Comecar na
 * montagem cobraria da pessoa o tempo de ler o enunciado, e num item de 60
 * segundos isso e a diferenca entre medir raciocinio e medir velocidade de
 * leitura.
 *
 * O QUE ESTA TELA NAO DECIDE e se a resposta esta certa: ela devolve os fatos
 * — o que foi ligado, quanto tempo levou, quantas tentativas foram recusadas —
 * e quem pontua e o dominio. Uma tela que decide acerto e uma tela que da para
 * enganar pelo console.
 */
export function ConectarPares({
  pontos,
  paresCorretos,
  tempoLimite,
  iniciarAoTocar = true,
  rotulos,
  onConcluir,
}: {
  pontos: Ponto[];
  paresCorretos: ParCorreto[];
  /** Em segundos. */
  tempoLimite: number;
  iniciarAoTocar?: boolean;
  rotulos: {
    restante: string;
    ligadas: string;
    bloqueado: string;
    instrucao: string;
    concluir: string;
    desfazer: string;
  };
  onConcluir: (r: ResultadoConectarPares) => void;
}) {
  const superficie = useRef<SVGSVGElement>(null);
  const [ligacoes, setLigacoes] = useState<Ligacao[]>([]);
  const [tracando, setTracando] = useState<{ de: string; pontos: { x: number; y: number }[] } | null>(null);
  const [bloqueios, setBloqueios] = useState(0);
  const [piscando, setPiscando] = useState(false);
  const [iniciadoEm, setIniciadoEm] = useState<number | null>(iniciarAoTocar ? null : Date.now());
  const [restante, setRestante] = useState(tempoLimite);

  /** Uma vez so: o item nao pode concluir duas vezes se o tempo e o ultimo par coincidirem. */
  const concluido = useRef(false);

  const concluir = useCallback(
    (motivo: ResultadoConectarPares['motivo'], atuais: Ligacao[]) => {
      if (concluido.current) return;
      concluido.current = true;

      const acertos = atuais.filter((l) => l.correta).length;
      const erros = atuais.length - acertos;
      onConcluir({
        motivo,
        tempoGasto: iniciadoEm ? Date.now() - iniciadoEm : 0,
        acertos,
        erros,
        faltantes: Math.max(0, paresCorretos.length - acertos),
        bloqueios,
        ligacoes: atuais,
      });
    },
    [bloqueios, iniciadoEm, onConcluir, paresCorretos.length],
  );

  // O relogio. Um intervalo de 1s basta: o numero na tela e em segundos, e
  // acordar o dispositivo mais vezes so gasta bateria.
  useEffect(() => {
    if (iniciadoEm === null) return;
    const id = window.setInterval(() => {
      const passou = Math.floor((Date.now() - iniciadoEm) / 1000);
      const falta = Math.max(0, tempoLimite - passou);
      setRestante(falta);
      if (falta === 0) {
        window.clearInterval(id);
        setLigacoes((atuais) => {
          concluir('tempo', atuais);
          return atuais;
        });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [iniciadoEm, tempoLimite, concluir]);

  /** Coordenada do ponteiro em 0-100, na caixa da superficie. */
  const posicaoDe = (evento: React.PointerEvent): { x: number; y: number } | null => {
    const caixa = superficie.current?.getBoundingClientRect();
    if (!caixa || caixa.width === 0) return null;
    return {
      x: ((evento.clientX - caixa.left) / caixa.width) * 100,
      y: ((evento.clientY - caixa.top) / caixa.height) * 100,
    };
  };

  /** O ponto sob o dedo, se houver um perto o bastante. */
  const pontoEm = (p: { x: number; y: number }, raio = 9): Ponto | undefined =>
    pontos.find((ponto) => Math.hypot(ponto.x - p.x, ponto.y - p.y) <= raio);

  const jaLigado = (id: string) => ligacoes.some((l) => l.de === id || l.para === id);

  const comecar = (evento: React.PointerEvent, ponto: Ponto) => {
    if (concluido.current || jaLigado(ponto.id)) return;
    evento.preventDefault();
    (evento.target as Element).setPointerCapture?.(evento.pointerId);
    if (iniciadoEm === null) setIniciadoEm(Date.now());
    setTracando({ de: ponto.id, pontos: [{ x: ponto.x, y: ponto.y }] });
  };

  const mover = (evento: React.PointerEvent) => {
    if (!tracando) return;
    const p = posicaoDe(evento);
    if (!p) return;
    setTracando((atual) => {
      if (!atual) return atual;
      const ultimo = atual.pontos[atual.pontos.length - 1];
      // Amostra a cada ~1% da caixa: o suficiente para a curva ficar suave e
      // pouco o bastante para a checagem de cruzamento nao virar quadratica
      // num array de centenas de pontos.
      if (Math.hypot(p.x - ultimo.x, p.y - ultimo.y) < 1) return atual;
      return { ...atual, pontos: [...atual.pontos, p] };
    });
  };

  const soltar = (evento: React.PointerEvent) => {
    if (!tracando) return;
    const p = posicaoDe(evento);
    const destino = p ? pontoEm(p) : undefined;
    const origem = pontos.find((x) => x.id === tracando.de)!;

    const recusar = () => {
      setBloqueios((n) => n + 1);
      setPiscando(true);
      window.setTimeout(() => setPiscando(false), 420);
      setTracando(null);
    };

    // Soltar no vazio, no proprio ponto, ou num ja ligado: nada acontece e nao
    // conta como bloqueio — bloqueio e recusa por cruzamento, e inflar esse
    // numero com desistencia estragaria a penalidade do score.
    if (!destino || destino.id === origem.id || jaLigado(destino.id)) {
      setTracando(null);
      return;
    }

    const tracado = [...tracando.pontos, { x: destino.x, y: destino.y }];
    if (tracadoCruza(tracado, ligacoes)) {
      recusar();
      return;
    }

    const nova: Ligacao = {
      de: origem.id,
      para: destino.id,
      tracado,
      correta: parEhCorreto(origem.id, destino.id, paresCorretos),
    };
    const atuais = [...ligacoes, nova];
    setLigacoes(atuais);
    setTracando(null);

    // Sem pontos livres nao ha o que fazer: encerra sozinho em vez de deixar a
    // pessoa olhando o relogio correr.
    const usados = new Set(atuais.flatMap((l) => [l.de, l.para]));
    if (pontos.every((x) => usados.has(x.id))) concluir('completou', atuais);
  };

  const desfazer = () => {
    if (concluido.current || ligacoes.length === 0) return;
    setLigacoes((atuais) => atuais.slice(0, -1));
  };

  const caminho = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className={`conectar ${piscando ? 'is-bloqueado' : ''}`}>
      <div className="conectar-barra">
        <span className="conectar-relogio" role="timer" aria-live="off">
          {rotulos.restante.replace('{s}', String(restante))}
        </span>
        <span className="conectar-contador">
          {rotulos.ligadas
            .replace('{n}', String(ligacoes.length))
            .replace('{total}', String(paresCorretos.length))}
        </span>
      </div>

      <p className="conectar-instrucao">{rotulos.instrucao}</p>

      <svg
        ref={superficie}
        className="conectar-superficie"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={() => setTracando(null)}
        role="application"
        aria-label={rotulos.instrucao}
      >
        {ligacoes.map((l, i) => (
          <path
            key={`${l.de}-${l.para}-${i}`}
            className="conectar-linha"
            d={caminho(l.tracado)}
            stroke={pontos.find((p) => p.id === l.de)?.cor}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {tracando ? (
          <path
            className="conectar-linha is-rascunho"
            d={caminho(tracando.pontos)}
            stroke={pontos.find((p) => p.id === tracando.de)?.cor}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {pontos.map((ponto) => (
          <circle
            key={ponto.id}
            className={`conectar-ponto ${jaLigado(ponto.id) ? 'is-ligado' : ''}`}
            cx={ponto.x}
            cy={ponto.y}
            /* Raio generoso: o alvo real do dedo, nao o disco pintado. */
            r={6}
            fill={ponto.cor}
            onPointerDown={(e) => comecar(e, ponto)}
          />
        ))}
      </svg>

      <div className="conectar-acoes">
        <button
          type="button"
          className="button button-ghost"
          onClick={desfazer}
          disabled={ligacoes.length === 0}
        >
          {rotulos.desfazer}
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={() => concluir('desistiu', ligacoes)}
        >
          {rotulos.concluir}
        </button>
      </div>

      <p className="conectar-aviso" role="status">
        {piscando ? rotulos.bloqueado : ''}
      </p>
    </div>
  );
}
