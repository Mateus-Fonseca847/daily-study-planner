import { describe, expect, it } from 'vitest';
import { detectPlatform, INSTALL_STEPS } from './platform';

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  ipadOs:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  chrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
};

describe('detectPlatform', () => {
  it('reconhece iPhone e iPad (inclusive o iPadOS que se diz Mac)', () => {
    expect(detectPlatform(UA.iphone)).toBe('ios');
    expect(detectPlatform(UA.ipadOs, 5)).toBe('ios');
  });

  it('Mac de verdade (sem tela de toque) é o Safari do Mac', () => {
    expect(detectPlatform(UA.safariMac, 0)).toBe('safari-mac');
  });

  it('reconhece Android, Chrome, Edge e Firefox', () => {
    expect(detectPlatform(UA.android, 5)).toBe('android');
    expect(detectPlatform(UA.chrome)).toBe('desktop-chromium');
    expect(detectPlatform(UA.edge)).toBe('desktop-chromium');
    expect(detectPlatform(UA.firefox)).toBe('firefox');
  });

  it('todo caso tem instrução', () => {
    for (const platform of Object.keys(INSTALL_STEPS)) {
      expect(INSTALL_STEPS[platform as keyof typeof INSTALL_STEPS].length).toBeGreaterThan(10);
    }
    expect(INSTALL_STEPS.ios).toContain('Adicionar à Tela de Início');
  });
});
