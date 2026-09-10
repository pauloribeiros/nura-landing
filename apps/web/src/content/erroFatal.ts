/**
 * As únicas frases da NURA que não moram em `messages/<locale>.json`.
 *
 * `global-error.tsx` é a rede que segura um erro no PRÓPRIO layout — inclusive
 * um erro dentro do provider de i18n. Ali `useTranslations` não existe, porque
 * o que falhou pode ser exatamente quem o alimenta. E importar os três pacotes
 * de mensagem para esse chunk custaria 245 KB para mostrar duas linhas.
 *
 * Então são seis frases, copiadas à mão, escolhidas pelo primeiro segmento da
 * URL. Se um dia divergirem do tom do resto, é aqui que se conserta.
 */

export type LocaleDeErro = 'pt-br' | 'en' | 'es';

export const ERRO_FATAL: Record<LocaleDeErro, { titulo: string; texto: string; acao: string }> = {
  'pt-br': {
    titulo: 'Algo quebrou do nosso lado',
    texto:
      'Não foi você. A falha já foi registrada e estamos olhando. Suas respostas ficaram salvas.',
    acao: 'Tentar de novo',
  },
  en: {
    titulo: 'Something broke on our side',
    texto: 'This was not you. The failure was logged and we are looking. Your answers were saved.',
    acao: 'Try again',
  },
  es: {
    titulo: 'Algo falló de nuestro lado',
    texto:
      'No fuiste tú. La falla quedó registrada y la estamos revisando. Tus respuestas se guardaron.',
    acao: 'Intentar de nuevo',
  },
};

/** O idioma pelo primeiro segmento do caminho, com pt-br como queda. */
export function localeDoCaminho(caminho: string): LocaleDeErro {
  const primeiro = caminho.split('/')[1];
  if (primeiro === 'en' || primeiro === 'es') return primeiro;
  return 'pt-br';
}
