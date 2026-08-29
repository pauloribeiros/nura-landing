'use client';

import { useFocusMode, type TestStage } from '@/lib/focusMode';

/**
 * Liga o modo foco numa página que é server component.
 *
 * O hook precisa de um efeito, e o efeito precisa de um componente cliente.
 * Este não desenha nada: existe para que a página de pagamento tenha o mesmo
 * enquadramento das telas do teste — sem "Começar" no topo e sem rodapé.
 */
export function FocusMode({ stage = 'answering' }: { stage?: TestStage }) {
  useFocusMode(stage);
  return null;
}
