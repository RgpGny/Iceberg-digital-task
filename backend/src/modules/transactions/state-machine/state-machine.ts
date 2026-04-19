import { BusinessError } from '../../../common/errors';

export const STAGES = ['agreement', 'earnest_money', 'title_deed', 'completed'] as const;
export type Stage = (typeof STAGES)[number];

export function canTransition(from: Stage, to: Stage): boolean {
  const fromIndex = STAGES.indexOf(from);
  const toIndex = STAGES.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex === fromIndex + 1;
}

export function nextStage(from: Stage): Stage | null {
  const idx = STAGES.indexOf(from);
  if (idx < 0 || idx === STAGES.length - 1) return null;
  return STAGES[idx + 1];
}

export function isTerminal(stage: Stage): boolean {
  return stage === 'completed';
}

export function assertValidTransition(from: Stage, to: Stage): void {
  if (!canTransition(from, to)) {
    throw new BusinessError(
      'invalid_transition',
      `Illegal stage transition: ${from} → ${to}`,
      { from, to, allowed: nextStage(from) },
    );
  }
}
