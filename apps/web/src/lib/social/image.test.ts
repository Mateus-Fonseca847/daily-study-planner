import { describe, expect, it } from 'vitest';
import {
  cropRect,
  encodeUnderLimit,
  inspectImage,
  MAX_AVATAR_BYTES,
  readDimensions,
  sniffImage,
} from './image';

const bytes = (...values: (number | string)[]) => {
  const out: number[] = [];
  for (const v of values) {
    if (typeof v === 'string') for (const c of v) out.push(c.charCodeAt(0));
    else out.push(v);
  }
  return new Uint8Array(out);
};
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le16 = (n: number) => [n & 255, (n >>> 8) & 255];
const le24 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];

/** PNG mínimo: assinatura + IHDR com largura e altura. */
const png = (w: number, h: number) =>
  bytes(
    0x89,
    'PNG',
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...u32(13),
    'IHDR',
    ...u32(w),
    ...u32(h),
    8,
    6,
    0,
    0,
    0,
  );
/** JPEG mínimo: SOI, um APP1 (como o EXIF) e o SOF0 com altura e largura. */
const jpeg = (w: number, h: number) =>
  bytes(
    0xff,
    0xd8,
    0xff,
    0xe1,
    0,
    4,
    1,
    2,
    0xff,
    0xc0,
    0,
    17,
    8,
    (h >> 8) & 255,
    h & 255,
    (w >> 8) & 255,
    w & 255,
    3,
  );
/** WebP estendido (VP8X): largura − 1 e altura − 1 em 24 bits. */
const webpX = (w: number, h: number) =>
  bytes(
    'RIFF',
    0,
    0,
    0,
    0,
    'WEBP',
    'VP8X',
    10,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    ...le24(w - 1),
    ...le24(h - 1),
  );
/** WebP simples (VP8 com perdas). */
const webpLossy = (w: number, h: number) =>
  bytes(
    'RIFF',
    0,
    0,
    0,
    0,
    'WEBP',
    'VP8 ',
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0x9d,
    0x01,
    0x2a,
    ...le16(w),
    ...le16(h),
  );

describe('tipo pelos bytes (não pela extensão)', () => {
  it('JPEG, PNG e WebP passam', () => {
    expect(sniffImage(jpeg(10, 10))).toBe('jpeg');
    expect(sniffImage(png(10, 10))).toBe('png');
    expect(sniffImage(webpX(10, 10))).toBe('webp');
  });

  it('GIF (animado ou não), SVG, SVG “disfarçado” e lixo são recusados', () => {
    expect(sniffImage(bytes('GIF89a', 1, 0, 1, 0))).toBeNull();
    expect(sniffImage(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniffImage(bytes('<?xml version="1.0"?><svg>'))).toBeNull();
    expect(sniffImage(bytes('não é imagem'))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
});

describe('dimensões no cabeçalho, antes de decodificar', () => {
  it('PNG, JPEG (depois do EXIF) e WebP (VP8X e VP8)', () => {
    expect(readDimensions(png(640, 480), 'png')).toEqual({ width: 640, height: 480 });
    expect(readDimensions(jpeg(4032, 3024), 'jpeg')).toEqual({ width: 4032, height: 3024 });
    expect(readDimensions(webpX(1200, 800), 'webp')).toEqual({ width: 1200, height: 800 });
    expect(readDimensions(webpLossy(300, 200), 'webp')).toEqual({ width: 300, height: 200 });
  });

  const part = (data: Uint8Array) => data as Uint8Array<ArrayBuffer>;
  const blob = (data: Uint8Array, size?: number) =>
    size ? new Blob([part(data), new Uint8Array(size - data.length)]) : new Blob([part(data)]);

  it('arquivo grande demais, dimensões absurdas e pixels demais são recusados', async () => {
    await expect(inspectImage(blob(png(10, 10), 10 * 1024 * 1024 + 1))).rejects.toThrow(/10 MB/);
    await expect(inspectImage(blob(png(8001, 10)))).rejects.toThrow(/8000 pixels/);
    await expect(inspectImage(blob(png(7000, 7000)))).rejects.toThrow(/8000 pixels/);
    await expect(inspectImage(blob(png(100000, 100000)))).rejects.toThrow(/8000 pixels/);
    await expect(inspectImage(blob(bytes('GIF89a')))).rejects.toThrow(/JPEG, PNG ou WebP/);
  });

  it('cabeçalho quebrado: não dá para ler', async () => {
    await expect(
      inspectImage(blob(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, 0, 0))),
    ).rejects.toThrow(/Não foi possível ler/);
    await expect(inspectImage(blob(png(4000, 3000)))).resolves.toEqual({
      kind: 'png',
      width: 4000,
      height: 3000,
    });
  });
});

describe('recorte quadrado', () => {
  it('sem zoom: o maior quadrado, centralizado', () => {
    expect(cropRect(1200, 800, { zoom: 1, x: 0.5, y: 0.5 })).toEqual({ sx: 200, sy: 0, size: 800 });
  });

  it('com zoom e posição, nunca sai da imagem', () => {
    expect(cropRect(1000, 1000, { zoom: 2, x: 0, y: 1 })).toEqual({ sx: 0, sy: 500, size: 500 });
    expect(cropRect(1000, 1000, { zoom: 10, x: 0.5, y: 0.5 }).size).toBeCloseTo(1000 / 3);
    expect(cropRect(1000, 500, { zoom: 0.5, x: 2, y: -1 })).toEqual({ sx: 500, sy: 0, size: 500 });
  });
});

describe('WebP abaixo do limite do servidor', () => {
  const fake = (sizes: number[], type = 'image/webp') => {
    const used: number[] = [];
    const encode = async (quality: number) => {
      used.push(quality);
      return new Blob([new Uint8Array(sizes[used.length - 1] ?? 1)], { type });
    };
    return { encode, used };
  };

  it('baixa a qualidade até caber em 300 KB', async () => {
    const { encode, used } = fake([500_000, 400_000, 290_000]);
    const blob = await encodeUnderLimit(encode);
    expect(blob.size).toBeLessThanOrEqual(MAX_AVATAR_BYTES);
    expect(used).toEqual([0.9, 0.82, 0.74]);
  });

  it('navegador que não gera WebP (devolve PNG) é avisado', async () => {
    await expect(encodeUnderLimit(fake([1000], 'image/png').encode)).rejects.toThrow(/navegador/);
  });

  it('não cabe nem na menor qualidade: avisa', async () => {
    await expect(encodeUnderLimit(fake(Array(7).fill(400_000)).encode)).rejects.toThrow(/leve/);
  });
});
