import {
  STAGES,
  Stage,
  canTransition,
  nextStage,
  isTerminal,
  assertValidTransition,
} from './state-machine';
import { BusinessError } from '../../../common/errors';

describe('Stage state machine', () => {
  describe('STAGES', () => {
    it('is the ordered tuple agreement → earnest_money → title_deed → completed', () => {
      expect(STAGES).toEqual(['agreement', 'earnest_money', 'title_deed', 'completed']);
    });
  });

  describe('canTransition', () => {
    it.each([
      ['agreement', 'earnest_money'],
      ['earnest_money', 'title_deed'],
      ['title_deed', 'completed'],
    ])('allows %s → %s', (from, to) => {
      expect(canTransition(from as Stage, to as Stage)).toBe(true);
    });

    it.each([
      ['agreement', 'title_deed', 'skip forward'],
      ['agreement', 'completed', 'skip forward two'],
      ['earnest_money', 'completed', 'skip forward'],
      ['earnest_money', 'agreement', 'backward'],
      ['title_deed', 'agreement', 'backward'],
      ['title_deed', 'earnest_money', 'backward'],
      ['completed', 'agreement', 'backward from terminal'],
      ['completed', 'earnest_money', 'backward from terminal'],
      ['completed', 'title_deed', 'backward from terminal'],
      ['agreement', 'agreement', 'self-loop'],
      ['earnest_money', 'earnest_money', 'self-loop'],
      ['title_deed', 'title_deed', 'self-loop'],
      ['completed', 'completed', 'self-loop'],
    ])('rejects %s → %s (%s)', (from, to) => {
      expect(canTransition(from as Stage, to as Stage)).toBe(false);
    });
  });

  describe('defensive guards against unknown stage values', () => {
    // Runtime-only safety: if a corrupt Mongo doc surfaces an unknown stage
    // string, the state machine must not silently accept any transition.
    it('canTransition returns false when `from` is not a known stage', () => {
      expect(canTransition('unknown_from' as Stage, 'earnest_money')).toBe(false);
    });

    it('canTransition returns false when `to` is not a known stage', () => {
      expect(canTransition('agreement', 'unknown_to' as Stage)).toBe(false);
    });

    it('canTransition returns false when both are unknown', () => {
      expect(canTransition('x' as Stage, 'y' as Stage)).toBe(false);
    });

    it('nextStage returns null when the input stage is unknown', () => {
      expect(nextStage('unknown_stage' as Stage)).toBeNull();
    });

    it('assertValidTransition throws BusinessError when `from` is unknown', () => {
      expect(() => assertValidTransition('unknown' as Stage, 'earnest_money')).toThrow(
        'Illegal stage transition',
      );
    });
  });

  describe('nextStage', () => {
    it('returns the single legal next stage for non-terminal stages', () => {
      expect(nextStage('agreement')).toBe('earnest_money');
      expect(nextStage('earnest_money')).toBe('title_deed');
      expect(nextStage('title_deed')).toBe('completed');
    });

    it('returns null for the terminal stage', () => {
      expect(nextStage('completed')).toBeNull();
    });
  });

  describe('isTerminal', () => {
    it('returns true only for completed', () => {
      expect(isTerminal('completed')).toBe(true);
      expect(isTerminal('agreement')).toBe(false);
      expect(isTerminal('earnest_money')).toBe(false);
      expect(isTerminal('title_deed')).toBe(false);
    });
  });

  describe('assertValidTransition', () => {
    it('does not throw for a legal transition', () => {
      expect(() => assertValidTransition('agreement', 'earnest_money')).not.toThrow();
    });

    it('throws BusinessError with code invalid_transition for an illegal transition', () => {
      expect(() => assertValidTransition('agreement', 'completed')).toThrow(BusinessError);
      try {
        assertValidTransition('agreement', 'completed');
      } catch (e) {
        expect((e as BusinessError).code).toBe('invalid_transition');
        expect((e as BusinessError).details).toMatchObject({ from: 'agreement', to: 'completed' });
      }
    });
  });
});
