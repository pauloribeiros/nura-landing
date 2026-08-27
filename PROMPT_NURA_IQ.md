# Prompt de desenvolvimento — Módulo de Teste de QI (NURA)

> Cole este arquivo no Claude Code (ou seu agente) junto com `nura_iq_bank.json` e
> `nura_iq_types.ts`. Ele descreve exatamente o que construir. Trabalhe de forma
> iterativa: implemente por etapas e pare para revisão nos checkpoints marcados.

## Contexto

Estou construindo o **NURA**, um produto de avaliação psicológica (landing em React).
Já existe uma triagem de TDAH. Agora vou adicionar um **teste de QI** próprio, com itens
100% originais (não copiados de terceiros), no mesmo formato de mercado (estilo myIQ) mas
mais robusto.

**Stack existente (respeitar):** React 19 + Vite 7 + TypeScript + Three.js + GSAP +
Tailwind v4 + shadcn/ui. Gerenciador: pnpm.

## O que construir

Um módulo de teste de QI completo, client-side, com **45 questões** em **6 dimensões
cognitivas**, cronômetro global, telas de transição gamificadas, mecânica de memória de
trabalho, e uma tela de resultado com perfil por dimensão.

### Arquivos de dados (já fornecidos)
- `nura_iq_bank.json` — os 45 itens já prontos e validados. **Não invente itens novos**;
  consuma este banco. Cada item segue o schema de `nura_iq_types.ts`.
- `nura_iq_types.ts` — tipos TypeScript. Use-os como fonte da verdade dos contratos.

> Campo `regra` de cada item é documentação interna de calibração — **nunca renderizar**.

### Dimensões e distribuição (já refletidas no banco)
| Dimensão (`dimensao`) | Qtd | Renderização |
|---|---|---|
| `reconhecimento_padroes` (séries) | 8 | texto |
| `pensamento_analitico` (analogias/silogismos) | 8 | texto |
| `raciocinio_abstrato` (matrizes) | 8 | SVG |
| `orientacao_espacial` (rotação mental) | 7 | SVG |
| `percepcao_visual` (odd-one-out / grade) | 7 | SVG |
| `memoria_trabalho` (span + tempo) | 7 | especial |

As questões já vêm com `ordem` (1..45) em **dificuldade crescente**. Apresente na ordem
do campo `ordem`.

## Requisitos funcionais

### 1. Motor do teste (`useIqEngine` hook + contexto)
- Carrega o banco, controla índice atual, registra `Resposta[]` (ver tipos).
- **Cronômetro global em contagem crescente** (igual myIQ): começa no início do teste,
  exibido no header (mm:ss). O tempo total alimenta o `fatorVelocidade` do score.
- Grava `tempo_ms` por item (do momento em que a questão aparece até a resposta).
- Permite **pular e voltar** em questões de raciocínio (não nas de memória — ver abaixo).

### 2. Renderização de itens
- `formato_estimulo`/`formato_alternativas` decidem como renderizar:
  - `"texto"` → texto simples.
  - `"svg"` → injetar a string SVG (é conteúdo confiável, gerado por nós). Renderizar em
    container quadrado responsivo; alternativas SVG numa grade de 2 colunas × 3 linhas (6 opções).
  - `"none"` → sem estímulo (ex.: odd-one-out, a resposta está nas próprias alternativas).
- Estilo visual dos SVGs: line-art preto sobre branco, minimalista. Fundo branco já vem no SVG.
- Seleção de alternativa: destaque claro (borda/realce shadcn), 1 escolha por questão.

### 3. Mecânica de Memória de Trabalho (dimensão `memoria_trabalho`)
Estes itens têm o objeto `memoria` (ver `MemoriaSpec`). Fluxo em 2 fases:
- **Fase de exibição:** mostrar `memoria.estimulo` (números ou palavra) em destaque, com
  um contador visível "Desaparece em N segundos" por `memoria.exibir_ms`. Botão "Continuar"
  opcional; ao fim do tempo, o estímulo some.
- **Interferência:** inserir `memoria.gap_itens` questões normais ENTRE a exibição e a
  cobrança. Ou seja, o estímulo é mostrado, o teste segue com outras questões, e só depois
  a pergunta de cobrança aparece. (Implementar como fila: ao encontrar um item de memória,
  agende a "cobrança" para N posições à frente.)
- **Fase de cobrança:** conforme `memoria.cobrar`:
  - `"posicional"` → "Qual era o Nº dígito?" com 6 alternativas (já no banco).
  - `"reconhecimento"` → escolher a palavra correta entre distratores (já no banco).
  - `"sequencia_completa"` / `"inverso"` → **entrada livre** (teclado numérico); comparar
    com `memoria.estimulo` (para `inverso`, comparar com a sequência invertida).
- Nas questões de memória, **bloquear "voltar"** (senão o usuário revê o estímulo).

### 4. Telas de transição (gamificação)
Entre blocos, inserir telas de encorajamento no estilo myIQ (ver `TelaTransicao`):
- **Velocidade:** "Sua velocidade está acima de X% dos participantes" — X derivado do tempo
  parcial do usuário (pode usar uma curva mock inicial; deixar plugável para norma real).
- **Progresso:** barra "N de 45" com micro-copy motivacional.
- **Encorajamento:** mensagem curta ao virar de dimensão.
- Disparar ~3 a 4 telas ao longo do teste (ex.: após ordem 12, 24, 36). Animar entrada com GSAP.
- Cada tela tem botão **"Continuar"**. Não contam como questão nem param o cronômetro.

### 5. Pontuação (`computeResultado`)
Produzir `ResultadoQI` (ver tipos):
- **Base 105.** Cada acerto pondera por `dificuldade` (item difícil vale mais).
- **Fator velocidade:** multiplicador leve (ex.: 0.95–1.05) em função do tempo total —
  mais rápido, pequeno bônus. Manter parametrizável e documentado.
- **Perfil por dimensão:** acertos/total e percentual por eixo → `pontosFortes` (top 2) e
  `pontosFracos` (bottom 2).
- **Percentil vs. população:** por enquanto usar uma curva normal (μ=100, σ=15) como
  placeholder; deixar a normatização por idade/sexo como ponto de extensão (coletar idade
  e sexo apenas para normatização, com o sexo opcional — NÃO são itens que medem QI).
- ⚠️ Deixe os coeficientes (peso por dificuldade, faixa do fator velocidade, base) num único
  módulo `scoring-config.ts` bem comentado, porque serão recalibrados após o piloto.

### 6. Tela de resultado
- Pontuação final + percentil + tempo total.
- **Perfil das 6 dimensões** (barra ou radar minimalista — pode ser SVG/Recharts).
- Badge de faixa (ver a triagem existente do NURA para consistência visual).
- Gate: seguir o padrão comercial do NURA (o resultado inicial é uma prévia; o relatório
  aprofundado é o produto pago). Integrar com o fluxo de desbloqueio já existente.

## Requisitos não-funcionais
- **Sem backend obrigatório** para rodar o teste (tudo client-side). Persistência de
  progresso pode usar estado em memória; se quiser resiliência, use um store leve — mas
  **não** usar localStorage dentro de artifacts; no app real do NURA, à vontade.
- Mobile-first (o teste é usado majoritariamente no celular — ver prints do myIQ).
- Acessibilidade: alternativas navegáveis por teclado, foco visível, contraste adequado.
- Tipar tudo com os contratos de `nura_iq_types.ts`; zero `any`.

## Estrutura de arquivos sugerida
```
src/features/iq-test/
  data/nura_iq_bank.json
  types.ts                 // reexporta nura_iq_types.ts
  engine/useIqEngine.ts
  engine/scoring.ts
  engine/scoring-config.ts // coeficientes calibráveis
  engine/memoryQueue.ts    // agenda cobrança de memória com interferência
  components/QuestionText.tsx
  components/QuestionSvg.tsx
  components/QuestionMemory.tsx
  components/OptionGrid.tsx
  components/Timer.tsx
  components/TransitionScreen.tsx
  components/ResultProfile.tsx
  IqTestPage.tsx
```

## Checkpoints (pare para eu revisar)
1. **Engine + renderização de texto e SVG** funcionando com o banco (sem memória, sem
   gamificação). Quero rodar as 45 e ver todas renderizando.
2. **Mecânica de memória** (exibição → interferência → cobrança, incluindo entrada livre e inverso).
3. **Transições gamificadas + cronômetro** integrados.
4. **Scoring + tela de resultado** com perfil das 6 dimensões.

Comece pelo checkpoint 1. Ao terminar cada um, me mostre o que fez e aguarde antes de seguir.

## Observações importantes
- Os itens do banco são **originais**, criados para o NURA. Não buscar/copiar itens de
  myIQ ou de qualquer teste de terceiros.
- Os SVGs são gerados por regra e já validados; se precisar de mais itens no futuro, o
  gerador (`gen_visual.py`) pode ser portado — não hardcode itens no componente.
- O teste tem fins educativos/recreativos; incluir disclaimer de que não substitui
  avaliação profissional (mesma linha da triagem atual do NURA).
