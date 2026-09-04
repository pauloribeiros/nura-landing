import type { AssessmentDefinition } from '../types';
import { asrs18 } from './asrs18';
import { nuraEspectro40 } from './nuraEspectro40';

/**
 * Os instrumentos que a rota de pontuacao sabe pontuar, por `assessmentId`.
 *
 * MORA NO DOMINIO, E NAO DENTRO DA ROTA, porque um registro que vive num
 * `route.ts` nao tem como ser verificado por teste — e foi exatamente assim
 * que o espectro autista ficou de fora. O teste existia para a pontuacao, para
 * os itens e para as tres traducoes; nenhum deles alcancava a linha que diz
 * quais instrumentos a rota reconhece. O resultado: o teste ficou no ar,
 * respondivel do inicio ao fim, e ao terminar a rota devolvia
 * `unknown-assessment`. Nenhum resultado era gravado, e a pagina de pagamento
 * — que exige um resultado — respondia 404.
 *
 * O TESTE DE QI NAO ESTA AQUI de proposito: ele tem banco, pontuacao e rota
 * proprios (`/api/iq/score`), porque o que ele mede nao e uma escala de
 * respostas e sim acerto contra gabarito.
 */
export const INSTRUMENTS: Record<string, AssessmentDefinition> = {
  [asrs18.assessmentId]: asrs18,
  [nuraEspectro40.assessmentId]: nuraEspectro40,
};

export const instrumentoDe = (assessmentId: string): AssessmentDefinition | undefined =>
  INSTRUMENTS[assessmentId];
