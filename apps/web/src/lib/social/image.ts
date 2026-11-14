import { SocialError } from './errors';

/**
 * Foto de perfil, tudo no aparelho: valida pelo CONTEÚDO (bytes iniciais, não a extensão), lê as
 * dimensões no cabeçalho ANTES de decodificar (protege contra imagens gigantes), recorta em
 * quadrado, reduz para 512×512 e recodifica em WebP abaixo do limite do servidor. Recodificar
 * pelo canvas descarta EXIF e localização. O arquivo original nunca é enviado.
 */

export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_SIDE = 8000;
export const MAX_PIXELS = 40_000_000;
export const AVATAR_SIZE = 512;
/** Igual ao `file_size_limit` do bucket (300 KB). */
export const MAX_AVATAR_BYTES = 307_200;

export type ImageKind = 'jpeg' | 'png' | 'webp';

const IMAGE_MESSAGES = {
  tipo: 'Use uma foto JPEG, PNG ou WebP.',
  grande: 'A foto passa de 10 MB. Escolha uma menor.',
  dimensoes: 'A foto é grande demais (no máximo 8000 pixels de lado).',
  corrompida: 'Não foi possível ler esta foto.',
  navegador: 'Este navegador não consegue preparar a foto. Tente no Chrome, Edge ou Firefox.',
  limite: 'Não foi possível deixar a foto leve o bastante. Tente outra.',
} as const;

export const imageError = (key: keyof typeof IMAGE_MESSAGES) =>
  new SocialError('foto_invalida', IMAGE_MESSAGES[key]);

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

/** Tipo pelos bytes iniciais; GIF (animado ou não), SVG e o resto → `null`. */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)
  ) {
    return 'png';
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return 'webp';
  }
  return null;
}

/** Largura e altura lidas do cabeçalho, sem decodificar a imagem (`null` se não der). */
export function readDimensions(
  bytes: Uint8Array,
  kind: ImageKind,
): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (kind === 'png') {
      if (ascii(bytes, 12, 4) !== 'IHDR') return null;
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    if (kind === 'webp') {
      const chunk = ascii(bytes, 12, 4);
      if (chunk === 'VP8X') {
        const w = 1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16));
        const h = 1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16));
        return { width: w, height: h };
      }
      if (chunk === 'VP8 ') {
        return {
          width: view.getUint16(26, true) & 0x3fff,
          height: view.getUint16(28, true) & 0x3fff,
        };
      }
      if (chunk === 'VP8L') {
        const b = bytes.subarray(21, 25);
        const width = 1 + (((b[1]! & 0x3f) << 8) | b[0]!);
        const height = 1 + (((b[3]! & 0x0f) << 10) | (b[2]! << 2) | ((b[1]! & 0xc0) >> 6));
        return { width, height };
      }
      return null;
    }
    // JPEG: procura o marcador SOF (C0–CF, menos C4, C8 e CC).
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1]!;
      const length = view.getUint16(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      offset += 2 + length;
    }
    return null;
  } catch {
    return null;
  }
}

/** Valida o arquivo escolhido (tamanho, tipo pelos bytes, dimensões) antes de decodificar. */
export async function inspectImage(
  file: Blob,
): Promise<{ kind: ImageKind; width: number; height: number }> {
  if (file.size > MAX_INPUT_BYTES) throw imageError('grande');
  // 64 KB bastam para achar o cabeçalho (o SOF do JPEG pode vir depois do EXIF).
  const head = new Uint8Array(await file.slice(0, 65_536).arrayBuffer());
  const kind = sniffImage(head);
  if (!kind) throw imageError('tipo');
  const size = readDimensions(head, kind);
  if (!size || size.width < 1 || size.height < 1) throw imageError('corrompida');
  if (size.width > MAX_SIDE || size.height > MAX_SIDE || size.width * size.height > MAX_PIXELS) {
    throw imageError('dimensoes');
  }
  return { kind, ...size };
}

export interface Crop {
  /** ≥ 1: 1 = o maior quadrado que cabe; 3 = um terço dele. */
  zoom: number;
  /** Centro do recorte, de 0 a 1 em cada eixo. */
  x: number;
  y: number;
}

export const DEFAULT_CROP: Crop = { zoom: 1, x: 0.5, y: 0.5 };
export const MAX_ZOOM = 3;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** O quadrado da imagem original que vira a foto (sempre dentro da imagem). */
export function cropRect(width: number, height: number, crop: Crop) {
  const zoom = clamp(crop.zoom, 1, MAX_ZOOM);
  const size = Math.min(width, height) / zoom;
  const sx = clamp(crop.x * width - size / 2, 0, width - size);
  const sy = clamp(crop.y * height - size / 2, 0, height - size);
  return { sx, sy, size };
}

/** Recodifica com qualidade decrescente até caber no limite (o codificador é injetável). */
export async function encodeUnderLimit(
  encode: (quality: number) => Promise<Blob | null>,
  limit = MAX_AVATAR_BYTES,
): Promise<Blob> {
  for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42]) {
    const blob = await encode(quality);
    if (!blob || blob.type !== 'image/webp') throw imageError('navegador');
    if (blob.size <= limit) return blob;
  }
  throw imageError('limite');
}

/** Recorta e gera a foto final (WebP 512×512, sem metadados). Só no navegador. */
export async function renderAvatar(file: Blob, crop: Crop): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw imageError('corrompida');
  }
  try {
    const { sx, sy, size } = cropRect(bitmap.width, bitmap.height, crop);
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw imageError('navegador');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    return await encodeUnderLimit(
      (quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality)),
    );
  } finally {
    bitmap.close();
  }
}
