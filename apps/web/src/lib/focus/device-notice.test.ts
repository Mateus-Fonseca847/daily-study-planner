import { describe, expect, it } from 'vitest';

/** `deviceNotice` é pura, mas mora em `browser.ts` (que importa React): testamos só o texto. */
import { deviceNotice } from './browser';

describe('deviceNotice', () => {
  it('sem aviso quando há tela cheia e wake lock', () => {
    expect(deviceNotice({ wakeLock: true, fullscreen: true })).toBeNull();
  });

  it('avisa o que falta, em uma linha, e que o cronômetro segue exato', () => {
    expect(deviceNotice({ wakeLock: true, fullscreen: false })).toContain('não oferece tela cheia');
    expect(deviceNotice({ wakeLock: false, fullscreen: true })).toContain(
      'não mantém a tela ligada',
    );
    const both = deviceNotice({ wakeLock: false, fullscreen: false });
    expect(both).toContain('nem');
    for (const text of [both, deviceNotice({ wakeLock: false, fullscreen: true })]) {
      expect(text).toContain('cronômetro continua exato');
      expect(text).not.toContain('\n');
    }
  });
});
