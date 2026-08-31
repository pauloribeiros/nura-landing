import type { Locale } from '@/i18n/routing';

/**
 * Politica de privacidade e termos de uso e venda.
 *
 * Vive aqui, e nao em `messages/*.json`, pelo mesmo motivo que `landing.ts`
 * existe: sao documentos estruturados e longos, com secoes e listas, e nao
 * cadeias soltas de interface. O JSON de mensagens continua sendo o lugar das
 * palavras que aparecem em botoes e titulos.
 *
 * ISTO NAO E PARECER JURIDICO. O texto cobre os elementos que a LGPD (Lei
 * 13.709/2018), o Codigo de Defesa do Consumidor e o Decreto 7.962/2013 exigem
 * de quem trata dado pessoal e vende pela internet no Brasil, mas quem assina
 * a responsabilidade e o operador — e a combinacao "dado de saude + venda ao
 * consumidor" merece leitura de advogado antes de ir ao ar.
 */

/**
 * A identidade de quem responde pelo tratamento e pela venda.
 *
 * O Decreto 7.962/2013, art. 2o, obriga o site de comercio eletronico a exibir
 * nome empresarial, CNPJ e endereco fisico e eletronico em local de destaque.
 * A LGPD, art. 9o, exige que o titular saiba quem e o controlador e como falar
 * com o encarregado.
 *
 * NADA AQUI PODE SER INVENTADO. Enquanto qualquer campo estiver vazio as
 * paginas legais respondem 404 e o rodape nao as oferece: uma politica de
 * privacidade sem controlador identificado nao vale como politica, e publicar
 * uma com dados falsos e pior do que nao publicar nenhuma. Preencha e as
 * paginas passam a existir sozinhas.
 */
export const OPERADOR = {
  /** Razao social completa, como no cartao CNPJ. */
  razaoSocial: '',
  /** Apenas digitos ou formatado — sai na tela como estiver escrito aqui. */
  cnpj: '',
  /** Endereco fisico completo, com municipio e UF. */
  endereco: '',
  /** Onde o consumidor fala sobre a compra. */
  emailContato: '',
  /** Onde o titular exerce os direitos do art. 18 da LGPD. */
  emailEncarregado: '',
} as const;

/** Verdadeiro so quando todos os campos acima estao preenchidos. */
export const operadorIdentificado = Object.values(OPERADOR).every(
  (valor) => valor.trim().length > 0,
);

/** Data de vigencia dos dois documentos, em ISO. */
export const VIGENTE_DESDE = '2026-08-31';

export const LEGAL_SEGMENTS = {
  privacy: { 'pt-br': 'privacidade', en: 'privacy', es: 'privacidad' },
  terms: { 'pt-br': 'termos', en: 'terms', es: 'terminos' },
} as const satisfies Record<string, Record<Locale, string>>;

export type LegalDoc = keyof typeof LEGAL_SEGMENTS;

export const legalPath = (locale: Locale, doc: LegalDoc, ancora?: string) =>
  `/${locale}/legal/${LEGAL_SEGMENTS[doc][locale]}${ancora ? `#${ancora}` : ''}`;

/** As ancoras que o rodape usa — nomeadas para o link nao apontar para o vazio. */
export const ANCORA = { cookies: 'cookies', reembolso: 'reembolso' } as const;

/** Resolve o segmento da URL de volta para o documento, no idioma certo. */
export function legalDocBySegment(locale: Locale, segment: string): LegalDoc | undefined {
  return (Object.keys(LEGAL_SEGMENTS) as LegalDoc[]).find(
    (doc) => LEGAL_SEGMENTS[doc][locale] === segment,
  );
}

export interface SecaoLegal {
  /** Ancora estavel, para o rodape apontar direto para esta secao. */
  id?: string;
  titulo: string;
  paragrafos?: string[];
  itens?: string[];
}

export interface DocumentoLegal {
  metaTitle: string;
  metaDescription: string;
  titulo: string;
  resumo: string;
  atualizado: string;
  secoes: SecaoLegal[];
}

/**
 * Os subprocessadores. Todos ficam fora do Brasil, o que faz do uso deles uma
 * transferencia internacional na acepcao do art. 33 da LGPD — e por isso eles
 * sao nomeados um a um, e nao escondidos atras de "parceiros".
 */
const SUBPROCESSADORES_PT = [
  'Vercel Inc. (Estados Unidos) — hospedagem do site e execução do servidor.',
  'Supabase Inc. (Estados Unidos) — banco de dados onde ficam as sessões, as respostas e os e-mails.',
  'Stripe, Inc. (Estados Unidos) — processamento do pagamento. Os dados do cartão são digitados em campos do próprio Stripe e nunca passam pelos nossos servidores.',
  'Resend (Estados Unidos) — envio do e-mail com o link do relatório.',
  'PostHog (Estados Unidos) — medição anônima de uso, ativada somente se você aceitar no aviso de privacidade.',
];

const SUBPROCESSADORES_EN = [
  'Vercel Inc. (United States) — website hosting and server execution.',
  'Supabase Inc. (United States) — the database holding sessions, answers and email addresses.',
  'Stripe, Inc. (United States) — payment processing. Card details are typed into Stripe’s own fields and never reach our servers.',
  'Resend (United States) — delivery of the email carrying your report link.',
  'PostHog (United States) — anonymous usage measurement, enabled only if you accept it in the privacy notice.',
];

const SUBPROCESSADORES_ES = [
  'Vercel Inc. (Estados Unidos) — alojamiento del sitio y ejecución del servidor.',
  'Supabase Inc. (Estados Unidos) — base de datos donde quedan las sesiones, las respuestas y los correos.',
  'Stripe, Inc. (Estados Unidos) — procesamiento del pago. Los datos de la tarjeta se escriben en campos del propio Stripe y nunca pasan por nuestros servidores.',
  'Resend (Estados Unidos) — envío del correo con el enlace del informe.',
  'PostHog (Estados Unidos) — medición anónima de uso, activada solo si la aceptas en el aviso de privacidad.',
];

const privacidadePt: DocumentoLegal = {
  metaTitle: 'Política de Privacidade — NURA',
  metaDescription:
    'Como a NURA trata seus dados pessoais: o que é coletado, para quê, com quem é compartilhado e como exercer seus direitos sob a LGPD.',
  titulo: 'Política de Privacidade',
  resumo:
    'Esta política explica, sem rodeios, quais dados a NURA coleta, por que coleta, com quem compartilha e o que você pode exigir a respeito. Ela vale para todo o site e para todas as avaliações.',
  atualizado: 'Vigente desde 31 de agosto de 2026.',
  secoes: [
    {
      titulo: '1. Quem trata seus dados',
      paragrafos: [
        `O controlador dos dados pessoais tratados na NURA é ${OPERADOR.razaoSocial}, inscrita no CNPJ ${OPERADOR.cnpj}, com endereço em ${OPERADOR.endereco}.`,
        `Para qualquer assunto relativo a dados pessoais, inclusive o exercício dos direitos descritos na seção 8, fale com o nosso encarregado pelo e-mail ${OPERADOR.emailEncarregado}.`,
      ],
    },
    {
      titulo: '2. O que coletamos',
      paragrafos: [
        'Coletamos apenas o que é necessário para a avaliação funcionar e para o relatório chegar até você:',
      ],
      itens: [
        'Suas respostas às avaliações, junto com o tempo que você levou em cada questão.',
        'Um identificador anônimo do seu navegador, criado automaticamente para que a avaliação continue de onde parou e para que o resultado seja seu e de mais ninguém. Ele não carrega nome, e-mail nem qualquer dado que identifique você por fora do site.',
        'Seu endereço de e-mail, quando você o informa para receber o relatório.',
        'Dados da compra, quando há compra: valor, data e a confirmação do pagamento. Os dados do cartão são digitados diretamente em campos do Stripe e nunca chegam aos nossos servidores.',
        'Medição anônima de uso das páginas — somente se você aceitar no aviso que aparece na primeira visita. Suas respostas às avaliações nunca entram nessa medição.',
      ],
    },
    {
      titulo: '3. Suas respostas são dado sensível',
      paragrafos: [
        'A autoavaliação de TDAH é um instrumento de rastreio, e as respostas que você dá dizem respeito à sua saúde. A LGPD trata dado sobre saúde como dado pessoal sensível (art. 5º, II) e exige cuidado maior com ele. É por isso que:',
      ],
      itens: [
        'Suas respostas ficam vinculadas ao identificador anônimo do seu navegador, não ao seu nome.',
        'A base de dados aplica regras que impedem qualquer visitante de ler as respostas de outro, mesmo que descubra o endereço.',
        'Suas respostas nunca são usadas para publicidade, nunca são vendidas e nunca entram na medição de uso.',
        'O tratamento desses dados acontece com o seu consentimento específico e destacado (art. 11, I), que é o ato de responder à avaliação depois de ler para que ela serve — e você pode revogá-lo a qualquer momento pedindo a eliminação.',
      ],
    },
    {
      titulo: '4. Para que usamos',
      itens: [
        'Executar a avaliação, calcular o resultado e mostrá-lo a você.',
        'Entregar o relatório completo quando ele é comprado, e enviá-lo por e-mail.',
        'Cumprir a relação de consumo: emitir a cobrança, comprovar o pagamento e atender pedidos de reembolso.',
        'Entender como o site é usado e melhorá-lo, de forma agregada e anônima, apenas com o seu consentimento.',
        'Cumprir obrigações legais e regulatórias que recaiam sobre nós.',
      ],
    },
    {
      titulo: '5. Com que base legal',
      paragrafos: [
        'Cada uso acima se apoia em uma base legal da LGPD: o seu consentimento (art. 7º, I, e art. 11, I) para a avaliação, para as respostas de saúde e para a medição de uso; a execução do contrato (art. 7º, V) para entregar e cobrar pelo relatório; e o cumprimento de obrigação legal (art. 7º, II) para guardar registros fiscais e de consumo.',
      ],
    },
    {
      titulo: '6. Com quem compartilhamos',
      paragrafos: [
        'Não vendemos dados pessoais e não os cedemos para publicidade. Compartilhamos apenas com os prestadores necessários para o serviço existir, cada um limitado ao que precisa:',
      ],
      itens: SUBPROCESSADORES_PT,
    },
    {
      titulo: '7. Transferência internacional',
      paragrafos: [
        'Todos os prestadores listados acima operam fora do Brasil, principalmente nos Estados Unidos. Isso caracteriza transferência internacional de dados, prevista no art. 33 da LGPD, e ela acontece com o seu consentimento e sob os compromissos contratuais de proteção que esses prestadores oferecem.',
      ],
    },
    {
      titulo: '8. Seus direitos',
      paragrafos: [
        'O art. 18 da LGPD garante a você, sobre os seus dados, o direito de:',
      ],
      itens: [
        'Confirmar que existe tratamento e acessar os dados que temos.',
        'Corrigir dados incompletos, inexatos ou desatualizados.',
        'Pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados fora da lei.',
        'Pedir a portabilidade para outro fornecedor.',
        'Pedir a eliminação dos dados tratados com o seu consentimento.',
        'Saber com quem compartilhamos seus dados.',
        'Ser informado sobre a possibilidade de não consentir e sobre o que isso acarreta.',
        'Revogar o consentimento a qualquer momento.',
      ],
    },
    {
      titulo: '9. Como exercer',
      paragrafos: [
        `Escreva para ${OPERADOR.emailEncarregado} dizendo o que você quer. Respondemos em até 15 dias. Para pedidos de acesso ou eliminação podemos precisar confirmar que a solicitação parte de quem tem direito a ela, e pediremos apenas o mínimo necessário para isso.`,
        'Pedir a eliminação das respostas apaga também o resultado e o relatório gerado a partir delas — não há como restaurá-los depois, e você precisaria refazer a avaliação.',
      ],
    },
    {
      titulo: '10. Por quanto tempo guardamos',
      itens: [
        'Respostas, resultados e sessões: enquanto o serviço existir, para que você possa voltar ao seu resultado. Podem ser eliminados antes, a seu pedido.',
        'E-mail: enquanto você quiser receber o relatório e nossas comunicações; a saída é imediata a pedido.',
        'Registros de compra: pelo prazo que a legislação fiscal e consumerista exige, ainda que você peça a eliminação dos demais dados — a lei se sobrepõe ao pedido nesse ponto específico.',
      ],
    },
    {
      titulo: '11. Segurança',
      paragrafos: [
        'O tráfego é cifrado de ponta a ponta. O banco de dados aplica regras de acesso por linha, de modo que cada visitante só alcança o que é dele. Os dados de cartão nunca tocam a nossa infraestrutura. Nenhuma medida elimina todo risco, e se ocorrer um incidente que possa causar risco relevante a você, comunicaremos você e a ANPD, como manda o art. 48.',
      ],
    },
    {
      id: 'cookies',
      titulo: '12. Cookies e armazenamento local',
      paragrafos: [
        'A NURA usa o mínimo possível, e nenhum deles serve para publicidade ou para seguir você por outros sites:',
      ],
      itens: [
        'Um cookie de sessão, criado automaticamente, que mantém o identificador anônimo do seu navegador. É ele que faz a avaliação continuar de onde parou e que impede outra pessoa de abrir o seu resultado. Sem ele o serviço não funciona.',
        'A sua escolha no aviso de privacidade, guardada no próprio navegador para não perguntarmos de novo a cada visita.',
        'Se — e somente se — você aceitar a medição de uso, os cookies da PostHog para contar visitas de forma agregada. Recusar, ou revogar depois, interrompe a coleta na hora.',
      ],
    },
    {
      titulo: '13. Menores de idade',
      paragrafos: [
        'As avaliações da NURA foram desenhadas para adultos e o serviço não se destina a menores de 18 anos. Se soubermos que coletamos dados de uma criança ou adolescente sem o devido amparo legal, eliminaremos esses dados.',
      ],
    },
    {
      titulo: '14. Mudanças nesta política',
      paragrafos: [
        'Quando esta política mudar, a data de vigência no topo muda junto. Alterações relevantes serão comunicadas no site, e continuar usando a NURA depois delas significa que você as conhece.',
      ],
    },
  ],
};

const termosPt: DocumentoLegal = {
  metaTitle: 'Termos de Uso e de Venda — NURA',
  metaDescription:
    'Condições de uso da NURA e de compra do relatório: o que está sendo vendido, preço, formas de pagamento, direito de arrependimento e limites do serviço.',
  titulo: 'Termos de Uso e de Venda',
  resumo:
    'Estas condições valem para quem usa a NURA e para quem compra um relatório. Elas dizem o que você recebe, quanto custa, como desistir e o que este serviço não é.',
  atualizado: 'Vigente desde 31 de agosto de 2026.',
  secoes: [
    {
      titulo: '1. Quem oferece o serviço',
      paragrafos: [
        `A NURA é operada por ${OPERADOR.razaoSocial}, CNPJ ${OPERADOR.cnpj}, com endereço em ${OPERADOR.endereco}. O canal de atendimento ao consumidor é o e-mail ${OPERADOR.emailContato}.`,
      ],
    },
    {
      titulo: '2. O que a NURA é — e o que não é',
      paragrafos: [
        'A NURA oferece autoavaliações com finalidade informativa e de autoconhecimento. Alguns instrumentos, como a ASRS-v1.1 da Organização Mundial da Saúde, funcionam como rastreio.',
        'Nenhum resultado da NURA é diagnóstico. Nada aqui substitui a avaliação de um profissional de saúde habilitado, e a NURA não presta serviço médico, psicológico ou de qualquer outra profissão regulamentada. Se um resultado preocupar você, procure um profissional.',
      ],
    },
    {
      titulo: '3. Uso gratuito',
      paragrafos: [
        'Fazer uma avaliação e ver o resultado inicial não custa nada e não exige cartão. Você é responsável por responder com sinceridade — um resultado só descreve as respostas que recebeu.',
      ],
    },
    {
      titulo: '4. O que você compra',
      paragrafos: [
        'O produto pago é o relatório completo de uma avaliação: um conteúdo digital que organiza as suas respostas item a item e explica o que os padrões encontrados costumam significar no dia a dia.',
        'O acesso é imediato após a confirmação do pagamento, por uma página no próprio site, e enviamos também um link por e-mail para que você volte ao relatório de qualquer aparelho.',
      ],
    },
    {
      titulo: '5. Preço e pagamento',
      paragrafos: [
        'O relatório custa R$ 19,90 em pagamento único. Não há assinatura, renovação automática nem cobrança recorrente.',
        'O pagamento é processado pela Stripe. Os dados do cartão são digitados em campos da própria Stripe e não trafegam pelos nossos servidores.',
      ],
    },
    {
      id: 'reembolso',
      titulo: '6. Direito de arrependimento',
      paragrafos: [
        'O art. 49 do Código de Defesa do Consumidor garante a você 7 dias corridos, contados da compra, para desistir sem precisar justificar. O prazo vale integralmente para o relatório, mesmo que você já o tenha acessado.',
        `Para exercer, basta escrever para ${OPERADOR.emailContato} a partir do e-mail usado na compra, dizendo que deseja desistir. Devolvemos o valor integral pelo mesmo meio de pagamento, e o acesso ao relatório é encerrado.`,
        'A devolução pode levar alguns dias úteis para aparecer no seu extrato, no prazo praticado pela operadora do seu cartão ou pelo seu banco.',
      ],
    },
    {
      titulo: '7. Problemas com a entrega',
      paragrafos: [
        `Se você pagou e o relatório não abriu, escreva para ${OPERADOR.emailContato} com a data da compra. Resolvemos o acesso ou devolvemos o valor — a falha é nossa, e ela não consome o seu prazo de arrependimento.`,
      ],
    },
    {
      titulo: '8. Uso permitido',
      paragrafos: [
        'O relatório é seu e você pode lê-lo, imprimi-lo, guardá-lo e levá-lo a um profissional. O que não pode é revendê-lo, republicá-lo ou distribuí-lo como se fosse conteúdo próprio.',
        'O texto das avaliações, os relatórios, as marcas e o desenho do site pertencem à NURA ou a quem nos licenciou. A ASRS-v1.1 é instrumento da Organização Mundial da Saúde e é usada como tal.',
      ],
    },
    {
      titulo: '9. Disponibilidade',
      paragrafos: [
        'Fazemos o possível para manter o serviço no ar, mas não prometemos funcionamento ininterrupto: manutenção, falha de um prestador ou causa fora do nosso alcance podem interromper o acesso temporariamente. Interrupções longas que impeçam o acesso a um relatório comprado dão direito a reembolso.',
      ],
    },
    {
      titulo: '10. Limites de responsabilidade',
      paragrafos: [
        'A NURA responde pelos danos que causar, nos termos da lei brasileira. Não respondemos por decisões que você tome com base num resultado sem consultar um profissional, porque o serviço não se propõe a orientar conduta clínica — e diz isso em cada tela.',
        'Nada nestes termos afasta os direitos que o Código de Defesa do Consumidor garante a você.',
      ],
    },
    {
      titulo: '11. Mudanças nestes termos',
      paragrafos: [
        'Podemos alterar estes termos; a data de vigência no topo indica a versão atual. Compras já feitas seguem as condições vigentes no momento da compra.',
      ],
    },
    {
      titulo: '12. Lei aplicável e foro',
      paragrafos: [
        'Aplica-se a lei brasileira. Fica eleito o foro do domicílio do consumidor para resolver qualquer controvérsia, como assegura o Código de Defesa do Consumidor.',
      ],
    },
  ],
};

const privacidadeEn: DocumentoLegal = {
  metaTitle: 'Privacy Policy — NURA',
  metaDescription:
    'How NURA handles your personal data: what is collected, why, who it is shared with, and how to exercise your rights.',
  titulo: 'Privacy Policy',
  resumo:
    'This policy explains plainly what data NURA collects, why it collects it, who it is shared with, and what you can demand about it. It covers the whole site and every assessment.',
  atualizado: 'In force since 31 August 2026.',
  secoes: [
    {
      titulo: '1. Who handles your data',
      paragrafos: [
        `The controller of personal data at NURA is ${OPERADOR.razaoSocial}, registered under Brazilian company number (CNPJ) ${OPERADOR.cnpj}, at ${OPERADOR.endereco}.`,
        `For anything concerning personal data, including the rights described in section 8, write to our data protection officer at ${OPERADOR.emailEncarregado}.`,
      ],
    },
    {
      titulo: '2. What we collect',
      paragrafos: ['We collect only what the assessment needs to work and the report needs to reach you:'],
      itens: [
        'Your answers to the assessments, along with how long you took on each question.',
        'An anonymous identifier for your browser, created automatically so the assessment resumes where you left it and so the result belongs to you alone. It carries no name, no email and nothing that identifies you outside the site.',
        'Your email address, when you give it to receive the report.',
        'Purchase data, when there is a purchase: amount, date and payment confirmation. Card details are typed directly into Stripe’s fields and never reach our servers.',
        'Anonymous page-usage measurement — only if you accept it in the notice shown on your first visit. Your assessment answers never enter that measurement.',
      ],
    },
    {
      titulo: '3. Your answers are sensitive data',
      paragrafos: [
        'The ADHD self-assessment is a screening instrument, and the answers you give concern your health. Brazil’s data protection law treats health data as sensitive personal data and demands greater care with it. That is why:',
      ],
      itens: [
        'Your answers are tied to your browser’s anonymous identifier, not to your name.',
        'The database enforces row-level rules that stop any visitor from reading another’s answers, even knowing the address.',
        'Your answers are never used for advertising, never sold, and never included in usage measurement.',
        'This data is processed with your specific, highlighted consent — the act of answering after reading what the assessment is for — and you can withdraw it at any time by requesting erasure.',
      ],
    },
    {
      titulo: '4. What we use it for',
      itens: [
        'Running the assessment, computing the result and showing it to you.',
        'Delivering the full report when it is bought, and emailing it to you.',
        'Meeting our obligations as a seller: issuing the charge, evidencing payment and handling refunds.',
        'Understanding how the site is used and improving it, in aggregate and anonymously, only with your consent.',
        'Complying with legal and regulatory obligations that fall on us.',
      ],
    },
    {
      titulo: '5. On what legal basis',
      paragrafos: [
        'Each use above rests on a legal basis: your consent for the assessment, the health answers and the usage measurement; performance of the contract to deliver and charge for the report; and compliance with legal obligations to keep tax and consumer records.',
      ],
    },
    {
      titulo: '6. Who we share it with',
      paragrafos: [
        'We do not sell personal data and do not release it for advertising. We share only with the providers the service needs to exist, each limited to what it requires:',
      ],
      itens: SUBPROCESSADORES_EN,
    },
    {
      titulo: '7. International transfer',
      paragrafos: [
        'Every provider listed above operates outside Brazil, mainly in the United States. That is an international data transfer under Brazilian law, and it happens with your consent and under the contractual protection commitments those providers offer.',
      ],
    },
    {
      titulo: '8. Your rights',
      paragrafos: ['Brazilian data protection law gives you, over your data, the right to:'],
      itens: [
        'Confirm that processing exists and access the data we hold.',
        'Correct incomplete, inaccurate or outdated data.',
        'Request anonymisation, blocking or erasure of unnecessary or unlawfully processed data.',
        'Request portability to another provider.',
        'Request erasure of data processed on the basis of your consent.',
        'Know who we share your data with.',
        'Be informed that you may withhold consent, and what follows if you do.',
        'Withdraw consent at any time.',
      ],
    },
    {
      titulo: '9. How to exercise them',
      paragrafos: [
        `Write to ${OPERADOR.emailEncarregado} saying what you want. We answer within 15 days. For access or erasure requests we may need to confirm the request comes from the person entitled to make it, and we will ask for the minimum needed to do so.`,
        'Requesting erasure of your answers also erases the result and the report built from them — there is no restoring them afterwards, and you would need to take the assessment again.',
      ],
    },
    {
      titulo: '10. How long we keep it',
      itens: [
        'Answers, results and sessions: for as long as the service exists, so you can return to your result. They can be erased sooner at your request.',
        'Email: for as long as you want the report and our messages; leaving is immediate on request.',
        'Purchase records: for the period tax and consumer legislation requires, even if you request erasure of everything else — on that specific point the law overrides the request.',
      ],
    },
    {
      titulo: '11. Security',
      paragrafos: [
        'Traffic is encrypted end to end. The database enforces row-level access rules, so each visitor only reaches what is theirs. Card data never touches our infrastructure. No measure removes all risk, and if an incident occurs that could pose relevant risk to you, we will notify you and the Brazilian data protection authority.',
      ],
    },
    {
      id: 'cookies',
      titulo: '12. Cookies and local storage',
      paragrafos: [
        'NURA uses as little as possible, and none of it serves advertising or follows you across other sites:',
      ],
      itens: [
        'A session cookie, created automatically, holding your browser’s anonymous identifier. It is what lets the assessment resume where you left it and what stops anyone else opening your result. Without it the service does not work.',
        'Your choice in the privacy notice, kept in the browser itself so we do not ask again on every visit.',
        'If — and only if — you accept usage measurement, PostHog’s cookies for counting visits in aggregate. Declining, or withdrawing later, stops collection immediately.',
      ],
    },
    {
      titulo: '13. Minors',
      paragrafos: [
        'NURA’s assessments are designed for adults and the service is not directed at people under 18. If we learn we have collected a minor’s data without proper legal grounds, we will erase it.',
      ],
    },
    {
      titulo: '14. Changes to this policy',
      paragrafos: [
        'When this policy changes, the date at the top changes with it. Relevant changes will be announced on the site, and continuing to use NURA after them means you are aware of them.',
      ],
    },
  ],
};

const termosEn: DocumentoLegal = {
  metaTitle: 'Terms of Use and Sale — NURA',
  metaDescription:
    'Conditions for using NURA and for buying a report: what is sold, price, payment, right of withdrawal and the limits of the service.',
  titulo: 'Terms of Use and Sale',
  resumo:
    'These conditions apply to anyone using NURA and anyone buying a report. They state what you get, what it costs, how to withdraw, and what this service is not.',
  atualizado: 'In force since 31 August 2026.',
  secoes: [
    {
      titulo: '1. Who provides the service',
      paragrafos: [
        `NURA is operated by ${OPERADOR.razaoSocial}, CNPJ ${OPERADOR.cnpj}, at ${OPERADOR.endereco}. The customer service channel is ${OPERADOR.emailContato}.`,
      ],
    },
    {
      titulo: '2. What NURA is — and is not',
      paragrafos: [
        'NURA offers self-assessments for information and self-knowledge. Some instruments, such as the World Health Organization’s ASRS-v1.1, work as screening tools.',
        'No NURA result is a diagnosis. Nothing here replaces assessment by a qualified health professional, and NURA does not provide medical, psychological or any other regulated professional service. If a result worries you, see a professional.',
      ],
    },
    {
      titulo: '3. Free use',
      paragrafos: [
        'Taking an assessment and seeing the initial result costs nothing and requires no card. You are responsible for answering honestly — a result only ever describes the answers it received.',
      ],
    },
    {
      titulo: '4. What you buy',
      paragrafos: [
        'The paid product is an assessment’s full report: digital content that organises your answers item by item and explains what the patterns found tend to mean day to day.',
        'Access is immediate once payment is confirmed, through a page on this site, and we also email you a link so you can return to the report from any device.',
      ],
    },
    {
      titulo: '5. Price and payment',
      paragrafos: [
        'The report costs R$ 19.90 as a one-off payment. There is no subscription, no automatic renewal and no recurring charge.',
        'Payment is processed by Stripe. Card details are typed into Stripe’s own fields and do not travel through our servers.',
      ],
    },
    {
      id: 'reembolso',
      titulo: '6. Right of withdrawal',
      paragrafos: [
        'Brazil’s Consumer Protection Code gives you 7 calendar days from purchase to withdraw without giving a reason. The period applies in full to the report, even if you have already opened it.',
        `To exercise it, write to ${OPERADOR.emailContato} from the email used in the purchase, saying you wish to withdraw. We refund the full amount to the same payment method, and access to the report ends.`,
        'The refund may take a few business days to appear on your statement, within the period your card issuer or bank applies.',
      ],
    },
    {
      titulo: '7. Problems with delivery',
      paragrafos: [
        `If you paid and the report did not open, write to ${OPERADOR.emailContato} with the purchase date. We will fix the access or refund you — the failure is ours, and it does not consume your withdrawal period.`,
      ],
    },
    {
      titulo: '8. Permitted use',
      paragrafos: [
        'The report is yours to read, print, keep and take to a professional. What you may not do is resell it, republish it or distribute it as your own content.',
        'The assessment texts, the reports, the trade marks and the site design belong to NURA or to those who licensed them to us. ASRS-v1.1 is an instrument of the World Health Organization and is used as such.',
      ],
    },
    {
      titulo: '9. Availability',
      paragrafos: [
        'We do our best to keep the service running, but we do not promise uninterrupted operation: maintenance, a provider failure or causes beyond our reach may interrupt access temporarily. Long interruptions preventing access to a purchased report entitle you to a refund.',
      ],
    },
    {
      titulo: '10. Limits of liability',
      paragrafos: [
        'NURA answers for the damage it causes, under Brazilian law. We do not answer for decisions you make from a result without consulting a professional, because the service does not set out to guide clinical conduct — and says so on every screen.',
        'Nothing in these terms removes the rights the Consumer Protection Code guarantees you.',
      ],
    },
    {
      titulo: '11. Changes to these terms',
      paragrafos: [
        'We may change these terms; the date at the top marks the current version. Purchases already made follow the conditions in force at the time of purchase.',
      ],
    },
    {
      titulo: '12. Governing law and jurisdiction',
      paragrafos: [
        'Brazilian law applies. The consumer’s home jurisdiction is elected for any dispute, as the Consumer Protection Code assures.',
      ],
    },
  ],
};

const privacidadeEs: DocumentoLegal = {
  metaTitle: 'Política de Privacidad — NURA',
  metaDescription:
    'Cómo NURA trata tus datos personales: qué se recoge, para qué, con quién se comparte y cómo ejercer tus derechos.',
  titulo: 'Política de Privacidad',
  resumo:
    'Esta política explica sin rodeos qué datos recoge NURA, por qué los recoge, con quién los comparte y qué puedes exigir al respecto. Vale para todo el sitio y para todas las evaluaciones.',
  atualizado: 'Vigente desde el 31 de agosto de 2026.',
  secoes: [
    {
      titulo: '1. Quién trata tus datos',
      paragrafos: [
        `El responsable de los datos personales tratados en NURA es ${OPERADOR.razaoSocial}, inscrita con el CNPJ ${OPERADOR.cnpj}, con domicilio en ${OPERADOR.endereco}.`,
        `Para cualquier asunto relativo a datos personales, incluido el ejercicio de los derechos descritos en la sección 8, escribe a nuestro encargado a ${OPERADOR.emailEncarregado}.`,
      ],
    },
    {
      titulo: '2. Qué recogemos',
      paragrafos: ['Recogemos solo lo necesario para que la evaluación funcione y el informe llegue a ti:'],
      itens: [
        'Tus respuestas a las evaluaciones, junto con el tiempo que tardaste en cada pregunta.',
        'Un identificador anónimo de tu navegador, creado automáticamente para que la evaluación siga donde la dejaste y para que el resultado sea solo tuyo. No lleva nombre, correo ni nada que te identifique fuera del sitio.',
        'Tu dirección de correo, cuando la indicas para recibir el informe.',
        'Datos de la compra, cuando hay compra: importe, fecha y confirmación del pago. Los datos de la tarjeta se escriben directamente en campos de Stripe y nunca llegan a nuestros servidores.',
        'Medición anónima de uso de las páginas — solo si la aceptas en el aviso que aparece en la primera visita. Tus respuestas nunca entran en esa medición.',
      ],
    },
    {
      titulo: '3. Tus respuestas son dato sensible',
      paragrafos: [
        'La autoevaluación de TDAH es un instrumento de cribado, y las respuestas que das se refieren a tu salud. La ley brasileña de protección de datos trata el dato de salud como dato personal sensible y exige mayor cuidado con él. Por eso:',
      ],
      itens: [
        'Tus respuestas quedan vinculadas al identificador anónimo de tu navegador, no a tu nombre.',
        'La base de datos aplica reglas por fila que impiden que un visitante lea las respuestas de otro, aunque conozca la dirección.',
        'Tus respuestas nunca se usan para publicidad, nunca se venden y nunca entran en la medición de uso.',
        'Este tratamiento ocurre con tu consentimiento específico y destacado — el acto de responder tras leer para qué sirve la evaluación — y puedes revocarlo en cualquier momento pidiendo la eliminación.',
      ],
    },
    {
      titulo: '4. Para qué los usamos',
      itens: [
        'Ejecutar la evaluación, calcular el resultado y mostrártelo.',
        'Entregar el informe completo cuando se compra, y enviarlo por correo.',
        'Cumplir la relación de consumo: emitir el cobro, acreditar el pago y atender devoluciones.',
        'Entender cómo se usa el sitio y mejorarlo, de forma agregada y anónima, solo con tu consentimiento.',
        'Cumplir obligaciones legales y regulatorias que recaigan sobre nosotros.',
      ],
    },
    {
      titulo: '5. Con qué base legal',
      paragrafos: [
        'Cada uso anterior se apoya en una base legal: tu consentimiento para la evaluación, para las respuestas de salud y para la medición de uso; la ejecución del contrato para entregar y cobrar el informe; y el cumplimiento de obligaciones legales para conservar registros fiscales y de consumo.',
      ],
    },
    {
      titulo: '6. Con quién los compartimos',
      paragrafos: [
        'No vendemos datos personales ni los cedemos para publicidad. Los compartimos solo con los proveedores necesarios para que el servicio exista, cada uno limitado a lo que necesita:',
      ],
      itens: SUBPROCESSADORES_ES,
    },
    {
      titulo: '7. Transferencia internacional',
      paragrafos: [
        'Todos los proveedores listados operan fuera de Brasil, principalmente en Estados Unidos. Eso constituye transferencia internacional de datos según la ley brasileña, y ocurre con tu consentimiento y bajo los compromisos contractuales de protección que esos proveedores ofrecen.',
      ],
    },
    {
      titulo: '8. Tus derechos',
      paragrafos: ['La ley brasileña de protección de datos te garantiza, sobre tus datos, el derecho a:'],
      itens: [
        'Confirmar que existe tratamiento y acceder a los datos que tenemos.',
        'Corregir datos incompletos, inexactos o desactualizados.',
        'Pedir la anonimización, el bloqueo o la eliminación de datos innecesarios o tratados fuera de la ley.',
        'Pedir la portabilidad a otro proveedor.',
        'Pedir la eliminación de los datos tratados con tu consentimiento.',
        'Saber con quién compartimos tus datos.',
        'Ser informado de que puedes no consentir y de lo que ello implica.',
        'Revocar el consentimiento en cualquier momento.',
      ],
    },
    {
      titulo: '9. Cómo ejercerlos',
      paragrafos: [
        `Escribe a ${OPERADOR.emailEncarregado} diciendo qué deseas. Respondemos en un plazo de 15 días. Para solicitudes de acceso o eliminación puede que necesitemos confirmar que la solicitud procede de quien tiene derecho a hacerla, y pediremos lo mínimo necesario para ello.`,
        'Pedir la eliminación de tus respuestas borra también el resultado y el informe generado a partir de ellas — no hay forma de restaurarlos después, y tendrías que repetir la evaluación.',
      ],
    },
    {
      titulo: '10. Cuánto tiempo los guardamos',
      itens: [
        'Respuestas, resultados y sesiones: mientras el servicio exista, para que puedas volver a tu resultado. Pueden eliminarse antes, a petición tuya.',
        'Correo: mientras quieras recibir el informe y nuestras comunicaciones; la baja es inmediata a petición.',
        'Registros de compra: durante el plazo que exige la legislación fiscal y de consumo, aunque pidas la eliminación del resto — en ese punto concreto la ley se impone a la solicitud.',
      ],
    },
    {
      titulo: '11. Seguridad',
      paragrafos: [
        'El tráfico va cifrado de extremo a extremo. La base de datos aplica reglas de acceso por fila, de modo que cada visitante solo alcanza lo suyo. Los datos de tarjeta nunca tocan nuestra infraestructura. Ninguna medida elimina todo riesgo, y si ocurre un incidente que pueda suponer riesgo relevante para ti, te lo comunicaremos a ti y a la autoridad brasileña de protección de datos.',
      ],
    },
    {
      id: 'cookies',
      titulo: '12. Cookies y almacenamiento local',
      paragrafos: [
        'NURA usa lo mínimo posible, y nada de ello sirve para publicidad ni para seguirte por otros sitios:',
      ],
      itens: [
        'Una cookie de sesión, creada automáticamente, que guarda el identificador anónimo de tu navegador. Es la que permite que la evaluación siga donde la dejaste y la que impide que otra persona abra tu resultado. Sin ella el servicio no funciona.',
        'Tu elección en el aviso de privacidad, guardada en el propio navegador para no preguntarte de nuevo en cada visita.',
        'Si — y solo si — aceptas la medición de uso, las cookies de PostHog para contar visitas de forma agregada. Rechazarla, o revocarla después, detiene la recogida al instante.',
      ],
    },
    {
      titulo: '13. Menores de edad',
      paragrafos: [
        'Las evaluaciones de NURA están diseñadas para adultos y el servicio no se dirige a menores de 18 años. Si sabemos que hemos recogido datos de un menor sin el debido amparo legal, los eliminaremos.',
      ],
    },
    {
      titulo: '14. Cambios en esta política',
      paragrafos: [
        'Cuando esta política cambie, la fecha de vigencia de arriba cambia con ella. Los cambios relevantes se anunciarán en el sitio, y seguir usando NURA después de ellos significa que los conoces.',
      ],
    },
  ],
};

const termosEs: DocumentoLegal = {
  metaTitle: 'Términos de Uso y de Venta — NURA',
  metaDescription:
    'Condiciones de uso de NURA y de compra del informe: qué se vende, precio, formas de pago, derecho de desistimiento y límites del servicio.',
  titulo: 'Términos de Uso y de Venta',
  resumo:
    'Estas condiciones valen para quien usa NURA y para quien compra un informe. Dicen qué recibes, cuánto cuesta, cómo desistir y qué no es este servicio.',
  atualizado: 'Vigente desde el 31 de agosto de 2026.',
  secoes: [
    {
      titulo: '1. Quién ofrece el servicio',
      paragrafos: [
        `NURA es operada por ${OPERADOR.razaoSocial}, CNPJ ${OPERADOR.cnpj}, con domicilio en ${OPERADOR.endereco}. El canal de atención al consumidor es ${OPERADOR.emailContato}.`,
      ],
    },
    {
      titulo: '2. Qué es NURA — y qué no es',
      paragrafos: [
        'NURA ofrece autoevaluaciones con finalidad informativa y de autoconocimiento. Algunos instrumentos, como la ASRS-v1.1 de la Organización Mundial de la Salud, funcionan como cribado.',
        'Ningún resultado de NURA es un diagnóstico. Nada aquí sustituye la evaluación de un profesional de salud habilitado, y NURA no presta servicio médico, psicológico ni de ninguna otra profesión regulada. Si un resultado te preocupa, acude a un profesional.',
      ],
    },
    {
      titulo: '3. Uso gratuito',
      paragrafos: [
        'Hacer una evaluación y ver el resultado inicial no cuesta nada y no exige tarjeta. Eres responsable de responder con sinceridad — un resultado solo describe las respuestas que recibió.',
      ],
    },
    {
      titulo: '4. Qué compras',
      paragrafos: [
        'El producto de pago es el informe completo de una evaluación: un contenido digital que organiza tus respuestas una a una y explica qué suelen significar los patrones encontrados en el día a día.',
        'El acceso es inmediato tras la confirmación del pago, mediante una página del propio sitio, y también te enviamos un enlace por correo para que vuelvas al informe desde cualquier dispositivo.',
      ],
    },
    {
      titulo: '5. Precio y pago',
      paragrafos: [
        'El informe cuesta R$ 19,90 en pago único. No hay suscripción, renovación automática ni cobro recurrente.',
        'El pago lo procesa Stripe. Los datos de la tarjeta se escriben en campos de la propia Stripe y no pasan por nuestros servidores.',
      ],
    },
    {
      id: 'reembolso',
      titulo: '6. Derecho de desistimiento',
      paragrafos: [
        'El Código de Defensa del Consumidor brasileño te garantiza 7 días corridos desde la compra para desistir sin necesidad de justificarte. El plazo vale íntegramente para el informe, aunque ya lo hayas abierto.',
        `Para ejercerlo, escribe a ${OPERADOR.emailContato} desde el correo usado en la compra, diciendo que deseas desistir. Devolvemos el importe íntegro por el mismo medio de pago, y el acceso al informe se cierra.`,
        'La devolución puede tardar algunos días hábiles en aparecer en tu extracto, según el plazo que aplique tu emisor o tu banco.',
      ],
    },
    {
      titulo: '7. Problemas con la entrega',
      paragrafos: [
        `Si pagaste y el informe no se abrió, escribe a ${OPERADOR.emailContato} con la fecha de la compra. Resolvemos el acceso o te devolvemos el importe — el fallo es nuestro, y no consume tu plazo de desistimiento.`,
      ],
    },
    {
      titulo: '8. Uso permitido',
      paragrafos: [
        'El informe es tuyo para leerlo, imprimirlo, guardarlo y llevarlo a un profesional. Lo que no puedes hacer es revenderlo, republicarlo ni distribuirlo como contenido propio.',
        'Los textos de las evaluaciones, los informes, las marcas y el diseño del sitio pertenecen a NURA o a quienes nos los licenciaron. La ASRS-v1.1 es un instrumento de la Organización Mundial de la Salud y se usa como tal.',
      ],
    },
    {
      titulo: '9. Disponibilidad',
      paragrafos: [
        'Hacemos lo posible por mantener el servicio en línea, pero no prometemos funcionamiento ininterrumpido: mantenimiento, fallo de un proveedor o causas fuera de nuestro alcance pueden interrumpir el acceso temporalmente. Las interrupciones largas que impidan acceder a un informe comprado dan derecho a reembolso.',
      ],
    },
    {
      titulo: '10. Límites de responsabilidad',
      paragrafos: [
        'NURA responde por los daños que cause, conforme a la ley brasileña. No respondemos por decisiones que tomes a partir de un resultado sin consultar a un profesional, porque el servicio no se propone orientar conducta clínica — y lo dice en cada pantalla.',
        'Nada en estos términos suprime los derechos que el Código de Defensa del Consumidor te garantiza.',
      ],
    },
    {
      titulo: '11. Cambios en estos términos',
      paragrafos: [
        'Podemos modificar estos términos; la fecha de vigencia de arriba indica la versión actual. Las compras ya realizadas siguen las condiciones vigentes en el momento de la compra.',
      ],
    },
    {
      titulo: '12. Ley aplicable y fuero',
      paragrafos: [
        'Se aplica la ley brasileña. Se elige el fuero del domicilio del consumidor para resolver cualquier controversia, tal como asegura el Código de Defensa del Consumidor.',
      ],
    },
  ],
};

export const LEGAL_DOCS: Record<Locale, Record<LegalDoc, DocumentoLegal>> = {
  'pt-br': { privacy: privacidadePt, terms: termosPt },
  en: { privacy: privacidadeEn, terms: termosEn },
  es: { privacy: privacidadeEs, terms: termosEs },
};
