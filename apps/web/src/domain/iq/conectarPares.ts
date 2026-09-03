/**
 * A regra do item "conectar pares": ligar pontos da mesma cor sem cruzar linhas.
 *
 * O QUE ESTE ARQUIVO GUARDA e a geometria e a pontuacao — as duas coisas que
 * precisam estar certas independentemente de como a tela desenha. Um traco que
 * cruza e aceito, ou um que nao cruza e recusado, transforma o item num teste
 * de sorte; e ambos sao invisiveis olhando a tela, porque o traco fica bonito
 * do mesmo jeito.
 *
 * O SCORE BRUTO NAO E UM QI E NAO VIRA UM AQUI. Ele sai numa escala propria de
 * 0 a 100, com os pesos declarados abaixo, e fica guardado junto da resposta.
 * A conversao para a escala do teste continua sendo a mesma dos outros itens —
 * acertou ou nao acertou — porque calibrar peso de item exige amostra, e nao
 * opiniao de quem escreve o codigo.
 */

export interface Ponto {
  id: string;
  /** Percentual da largura, 0 a 100. */
  x: number;
  /** Percentual da altura, 0 a 100. */
  y: number;
  cor: string;
}

export type ParCorreto = [string, string];

/** Um traco desenhado, do primeiro ponto ate o segundo. */
export interface Ligacao {
  de: string;
  para: string;
  /** O caminho como o dedo desenhou, em coordenadas de 0 a 100. */
  tracado: { x: number; y: number }[];
  correta: boolean;
}

export type MotivoConclusao = 'completou' | 'tempo' | 'desistiu';

export interface ResultadoConectarPares {
  motivo: MotivoConclusao;
  /** Milissegundos do inicio ate a conclusao. */
  tempoGasto: number;
  acertos: number;
  erros: number;
  faltantes: number;
  /** Tentativas recusadas por cruzamento. */
  bloqueios: number;
  ligacoes: Ligacao[];
}

/* ------------------------------------------------------------ geometria --- */

interface Seg {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** Orientacao do trio: >0 anti-horario, <0 horario, 0 colinear. */
function cruz(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function noSegmento(ax: number, ay: number, bx: number, by: number, px: number, py: number) {
  return (
    Math.min(ax, bx) - 1e-9 <= px &&
    px <= Math.max(ax, bx) + 1e-9 &&
    Math.min(ay, by) - 1e-9 <= py &&
    py <= Math.max(ay, by) + 1e-9
  );
}

/**
 * Dois segmentos se cruzam?
 *
 * Inclui o caso colinear de proposito: dois tracos sobrepostos sao um
 * cruzamento para efeito da regra, mesmo que nao se "cortem" num ponto. Quem
 * desenha por cima de uma linha existente esta fazendo exatamente o que a
 * regra proibe.
 */
export function segmentosCruzam(s: Seg, t: Seg): boolean {
  const d1 = cruz(t.ax, t.ay, t.bx, t.by, s.ax, s.ay);
  const d2 = cruz(t.ax, t.ay, t.bx, t.by, s.bx, s.by);
  const d3 = cruz(s.ax, s.ay, s.bx, s.by, t.ax, t.ay);
  const d4 = cruz(s.ax, s.ay, s.bx, s.by, t.bx, t.by);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  if (d1 === 0 && noSegmento(t.ax, t.ay, t.bx, t.by, s.ax, s.ay)) return true;
  if (d2 === 0 && noSegmento(t.ax, t.ay, t.bx, t.by, s.bx, s.by)) return true;
  if (d3 === 0 && noSegmento(s.ax, s.ay, s.bx, s.by, t.ax, t.ay)) return true;
  if (d4 === 0 && noSegmento(s.ax, s.ay, s.bx, s.by, t.bx, t.by)) return true;
  return false;
}

function segmentosDe(tracado: { x: number; y: number }[]): Seg[] {
  const saida: Seg[] = [];
  for (let i = 1; i < tracado.length; i++) {
    saida.push({
      ax: tracado[i - 1].x,
      ay: tracado[i - 1].y,
      bx: tracado[i].x,
      by: tracado[i].y,
    });
  }
  return saida;
}

/**
 * Corta as pontas de um tracado, medindo ao longo dele.
 *
 * A TOLERANCIA EXISTE PORQUE DOIS TRACOS QUE PARTEM DO MESMO PONTO SE TOCAM
 * ALI POR DEFINICAO, e isso nao e cruzamento. Sem ela a pessoa veria o item
 * recusar uma ligacao obviamente valida so porque ela comeca ao lado de onde
 * outra comeca — o pior tipo de bug num item cronometrado, porque ela perde
 * segundos achando que errou.
 *
 * O CORTE E POR COMPRIMENTO, NAO POR VERTICE. Duas tentativas anteriores
 * falharam por atalho: descartar segmentos com uma ponta na vizinhanca
 * descartava os proprios segmentos das extremidades do tracado novo, e filtrar
 * vertices apagava inteiro um traco reto de dois pontos — que e exatamente o
 * que alguem desenha ligando dois pontos em linha reta. Andar pelo caminho e
 * interpolar o ponto de corte funciona para qualquer densidade.
 */
function apararPontas(
  tracado: { x: number; y: number }[],
  tolerancia: number,
): { x: number; y: number }[] {
  if (tracado.length < 2) return [];

  const dist: number[] = [0];
  for (let i = 1; i < tracado.length; i++) {
    dist.push(dist[i - 1] + Math.hypot(tracado[i].x - tracado[i - 1].x, tracado[i].y - tracado[i - 1].y));
  }
  const total = dist[dist.length - 1];
  // Um traco mais curto que as duas margens e todo vizinhanca de ponta.
  if (total <= tolerancia * 2) return [];

  const em = (alvo: number) => {
    let i = 1;
    while (i < dist.length && dist[i] < alvo) i++;
    const anterior = tracado[i - 1];
    const atual = tracado[Math.min(i, tracado.length - 1)];
    const trecho = dist[Math.min(i, dist.length - 1)] - dist[i - 1];
    const razao = trecho === 0 ? 0 : (alvo - dist[i - 1]) / trecho;
    return {
      indice: i,
      ponto: {
        x: anterior.x + (atual.x - anterior.x) * razao,
        y: anterior.y + (atual.y - anterior.y) * razao,
      },
    };
  };

  const corteInicio = em(tolerancia);
  const corteFim = em(total - tolerancia);

  const meio = tracado.slice(corteInicio.indice, corteFim.indice);
  return [corteInicio.ponto, ...meio, corteFim.ponto];
}

/**
 * O tracado novo cruza algum dos ja aceitos?
 *
 * Os dois lados sao aparados: o novo e cada existente.
 */
export function tracadoCruza(
  novo: { x: number; y: number }[],
  existentes: Ligacao[],
  toleranciaPonta = 3,
): boolean {
  const segsNovo = segmentosDe(apararPontas(novo, toleranciaPonta));
  if (segsNovo.length === 0) return false;

  for (const ligacao of existentes) {
    for (const outro of segmentosDe(apararPontas(ligacao.tracado, toleranciaPonta))) {
      for (const s of segsNovo) {
        if (segmentosCruzam(s, outro)) return true;
      }
    }
  }
  return false;
}

/* ------------------------------------------------------------ pontuacao --- */

/** Um par ligado esta certo quando os dois pontos sao o mesmo par previsto. */
export function parEhCorreto(de: string, para: string, pares: ParCorreto[]): boolean {
  return pares.some(([a, b]) => (a === de && b === para) || (a === para && b === de));
}

/**
 * Os pesos do score bruto.
 *
 * SAO ARBITRARIOS E ESTAO AQUI PARA SEREM SUBSTITUIDOS. Nao ha amostra que
 * justifique 70/20/10; foi escolhido para que acertar domine, terminar rapido
 * ajude, e insistir em tracos que cruzam custe pouco. Quando existir o modelo
 * psicometrico, e este objeto que muda — e nada mais, porque a conversao para
 * a escala do teste nao passa por aqui.
 */
export const PESOS = { acertos: 70, tempo: 20, bloqueios: 10 } as const;

/** Quantos bloqueios zeram a parcela deles. */
const BLOQUEIOS_ATE_ZERAR = 6;

/**
 * Score bruto de 0 a 100 — proprio deste item, nao a escala do teste.
 *
 * Fica gravado junto da resposta para que o modelo psicometrico futuro tenha
 * o dado bruto, em vez de ter que reconstrui-lo a partir de um acerto binario
 * que joga fora tempo e tentativas.
 */
export function scoreBruto(r: ResultadoConectarPares, tempoLimite_ms: number): number {
  const totalPares = r.acertos + r.erros + r.faltantes;
  if (totalPares === 0) return 0;

  const parteAcertos = (r.acertos / totalPares) * PESOS.acertos;

  // Tempo so pontua para quem acertou alguma coisa: terminar rapido sem ligar
  // nada nao e desempenho, e sem esta guarda seria o caminho mais barato para
  // uma pontuacao alta.
  const proporcaoTempo = tempoLimite_ms > 0 ? Math.min(1, r.tempoGasto / tempoLimite_ms) : 1;
  const parteTempo = r.acertos > 0 ? (1 - proporcaoTempo) * PESOS.tempo : 0;

  const parteBloqueios =
    (1 - Math.min(1, r.bloqueios / BLOQUEIOS_ATE_ZERAR)) * PESOS.bloqueios;

  return Math.round(parteAcertos + parteTempo + parteBloqueios);
}

/** O item conta como acertado quando todos os pares previstos foram ligados. */
export function itemAcertou(r: ResultadoConectarPares): boolean {
  return r.faltantes === 0 && r.erros === 0 && r.acertos > 0;
}

/**
 * Refaz o julgamento a partir do que foi desenhado, ignorando o que o cliente
 * afirma ter acertado.
 *
 * O NAVEGADOR NAO E TESTEMUNHA CONFIAVEL. O resultado chega com `acertos` e
 * `bloqueios` ja contados, e um payload forjado poderia dizer "tres acertos"
 * com tres linhas cruzadas — ou com nenhuma linha. Entao o servidor conta de
 * novo a partir das ligacoes: confere se cada uma une um par previsto e se
 * nenhuma cruza outra. E a mesma razao pela qual `correta` nunca sai do banco
 * para o navegador nos outros itens.
 *
 * Os tracos sao verificados em ordem, cada um contra os anteriores — que e
 * como eles foram aceitos na tela.
 */
export function verificarNoServidor(
  ligacoes: Ligacao[],
  paresCorretos: ParCorreto[],
): { acertos: number; erros: number; faltantes: number; valido: boolean } {
  const aceitas: Ligacao[] = [];
  let acertos = 0;
  let erros = 0;
  let valido = true;
  const usados = new Set<string>();

  for (const l of ligacoes) {
    // Um ponto so participa de uma ligacao, como na tela.
    if (usados.has(l.de) || usados.has(l.para) || l.de === l.para) {
      valido = false;
      continue;
    }
    if (tracadoCruza(l.tracado, aceitas)) {
      // Uma ligacao que cruza jamais poderia ter sido criada: o payload foi
      // adulterado, ou a geometria da tela e do servidor divergiu.
      valido = false;
      continue;
    }
    usados.add(l.de);
    usados.add(l.para);
    aceitas.push(l);
    if (parEhCorreto(l.de, l.para, paresCorretos)) acertos++;
    else erros++;
  }

  return { acertos, erros, faltantes: Math.max(0, paresCorretos.length - acertos), valido };
}

/* ------------------------------------------- o que chega pela rede --- */

/**
 * Quantos tracos e quantos pontos por traco o servidor aceita.
 *
 * NAO SAO NUMEROS DE ESTILO: a checagem de cruzamento compara cada segmento do
 * traco novo com cada segmento dos aceitos, entao o custo cresce com o quadrado
 * do tamanho do desenho. Sem teto, um payload com cem mil pontos por ligacao
 * prende o processo do servidor por minutos — uma requisicao, um servidor fora
 * do ar. O teto e generoso de proposito: a tela so registra um ponto a cada ~1
 * unidade de uma area 100x100, entao 800 pontos ja e atravessar o quadro oito
 * vezes num item de 60 segundos.
 */
export const LIMITE_LIGACOES = 12;
export const LIMITE_PONTOS_POR_LIGACAO = 800;

/**
 * Le o desenho que veio do navegador, e so o desenho.
 *
 * OS NUMEROS DO CLIENTE NAO ENTRAM. `acertos`, `erros` e `faltantes` chegam
 * zerados daqui e sao recalculados de `ligacoes` — a razao esta em
 * `verificarNoServidor`. O que nao da para recalcular, porque so o navegador
 * viu, e o tempo e os bloqueios; esses vem limitados, nunca em bruto.
 *
 * Devolve `null` quando a forma nao bate. Quem chama descarta o desenho e o
 * item conta como errado, em vez de recusar a rodada inteira: uma pessoa perder
 * 45 respostas por causa de um item mal formado seria pior que perder o item.
 */
export function lerDesenhoDoCliente(raw: unknown): ResultadoConectarPares | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  if (!Array.isArray(r.ligacoes) || r.ligacoes.length > LIMITE_LIGACOES) return null;

  const ligacoes: Ligacao[] = [];
  for (const bruta of r.ligacoes) {
    if (!bruta || typeof bruta !== 'object') return null;
    const l = bruta as Record<string, unknown>;

    if (typeof l.de !== 'string' || typeof l.para !== 'string') return null;
    if (l.de.length > 40 || l.para.length > 40) return null;
    if (!Array.isArray(l.tracado)) return null;
    if (l.tracado.length < 2 || l.tracado.length > LIMITE_PONTOS_POR_LIGACAO) return null;

    const tracado: { x: number; y: number }[] = [];
    for (const ponto of l.tracado) {
      if (!ponto || typeof ponto !== 'object') return null;
      const p = ponto as Record<string, unknown>;
      if (typeof p.x !== 'number' || typeof p.y !== 'number') return null;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
      // A area e 0-100. A folga cobre o dedo que sai um pouco pela borda; fora
      // dela o ponto nao veio da tela.
      if (p.x < -20 || p.x > 120 || p.y < -20 || p.y > 120) return null;
      tracado.push({ x: p.x, y: p.y });
    }

    // `correta` e recalculada; o valor que veio nao e lido.
    ligacoes.push({ de: l.de, para: l.para, tracado, correta: false });
  }

  const motivo: MotivoConclusao =
    r.motivo === 'completou' || r.motivo === 'tempo' ? r.motivo : 'desistiu';

  const tempoGasto =
    typeof r.tempoGasto === 'number' && Number.isFinite(r.tempoGasto)
      ? Math.max(0, r.tempoGasto)
      : 0;

  const bloqueios =
    typeof r.bloqueios === 'number' && Number.isFinite(r.bloqueios)
      ? Math.min(50, Math.max(0, Math.floor(r.bloqueios)))
      : 0;

  return { motivo, tempoGasto, bloqueios, ligacoes, acertos: 0, erros: 0, faltantes: 0 };
}

/** O que o servidor concluiu sobre um item interativo, sem consultar o cliente. */
export interface BrutoConferido {
  score: number;
  acertos: number;
  erros: number;
  faltantes: number;
  bloqueios: number;
  tempoGasto_ms: number;
  motivo: MotivoConclusao;
  /** Falso quando o desenho nao poderia ter sido feito na tela. */
  valido: boolean;
}

/**
 * Recalcula acertos e score bruto a partir do desenho.
 *
 * O TEMPO E O UNICO NUMERO QUE SOBREVIVE DO CLIENTE, porque so o navegador viu
 * o cronometro — e por isso ele vem preso ao limite do item: sem isso, mandar
 * `tempoGasto: 0` compraria o bonus de velocidade inteiro de graca.
 */
export function conferirBruto(
  dados: ResultadoConectarPares,
  paresCorretos: ParCorreto[],
  tempoLimite_ms: number,
): BrutoConferido {
  const conferido = verificarNoServidor(dados.ligacoes, paresCorretos);
  const tempoGasto_ms = Math.min(tempoLimite_ms, Math.max(0, dados.tempoGasto));

  const score = scoreBruto(
    { ...dados, ...conferido, tempoGasto: tempoGasto_ms },
    tempoLimite_ms,
  );

  return {
    score,
    acertos: conferido.acertos,
    erros: conferido.erros,
    faltantes: conferido.faltantes,
    bloqueios: dados.bloqueios,
    tempoGasto_ms,
    motivo: dados.motivo,
    valido: conferido.valido,
  };
}
