import { describe, expect, it } from 'vitest';
import { createIdleSession, iniciar, pausar } from '../focus/session';
import { canOfferUpdate } from './update-policy';

const idle = createIdleSession({ id: 's1', seconds: 1500, tabId: 'tab' });

describe('canOfferUpdate', () => {
  it('oferece sem sessão ou com a sessão ociosa', () => {
    expect(canOfferUpdate(null)).toBe(true);
    expect(canOfferUpdate(idle)).toBe(true);
  });

  it('não oferece com a sessão rodando', () => {
    expect(canOfferUpdate(iniciar(idle, 1_000))).toBe(false);
  });

  it('não oferece com a sessão pausada', () => {
    expect(canOfferUpdate(pausar(iniciar(idle, 1_000), 2_000))).toBe(false);
  });

  it('não oferece com a sessão travada', () => {
    const locked = createIdleSession({ id: 's2', seconds: 1500, tabId: 'tab', locked: true });
    expect(canOfferUpdate(iniciar(locked, 1_000))).toBe(false);
  });
});
