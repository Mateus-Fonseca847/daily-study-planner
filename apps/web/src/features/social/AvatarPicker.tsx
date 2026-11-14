import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Camera, ImageUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useBreakpoint } from '../../lib/responsive/use-media';
import { SocialError } from '../../lib/social/errors';
import {
  cropRect,
  DEFAULT_CROP,
  inspectImage,
  MAX_ZOOM,
  renderAvatar,
  type Crop,
} from '../../lib/social/image';

interface AvatarPickerProps {
  /** Recebe a foto pronta (WebP 512×512, sem metadados). */
  onPicked: (webp: Blob) => void | Promise<void>;
  label?: string;
  disabled?: boolean;
}

const STEP = 0.02;
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Escolher foto (arquivo ou câmera no celular) e ajustar o recorte quadrado: zoom pelo controle
 * deslizante; posição arrastando (mouse ou toque) ou pelas setas do teclado. Valida o arquivo
 * pelo conteúdo antes de decodificar e entrega só a foto processada.
 */
export function AvatarPicker({ onPicked, label = 'Escolher foto', disabled }: AvatarPickerProps) {
  const fileId = useId();
  const cameraId = useId();
  const phone = useBreakpoint() === 'phone';
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (picked: File | undefined) => {
    setError(null);
    if (!picked) return;
    try {
      await inspectImage(picked);
      setFile(picked);
    } catch (e) {
      setError(e instanceof SocialError ? e.message : 'Não foi possível ler esta foto.');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <label htmlFor={fileId} className={disabled ? 'pointer-events-none opacity-dimmed' : ''}>
          <span className="inline-flex h-control cursor-pointer items-center gap-2 rounded-full border-hair px-4 text-md font-medium hover:bg-hover coarse:min-h-touch">
            <ImageUp aria-hidden strokeWidth={1.5} className="size-icon" />
            {label}
          </span>
        </label>
        <input
          id={fileId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled}
          aria-label={label}
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {phone && (
          <>
            <label htmlFor={cameraId}>
              <span className="inline-flex h-control cursor-pointer items-center gap-2 rounded-full border-hair px-4 text-md font-medium coarse:min-h-touch">
                <Camera aria-hidden strokeWidth={1.5} className="size-icon" />
                Tirar foto
              </span>
            </label>
            <input
              id={cameraId}
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              aria-label="Tirar foto"
              onChange={(e) => {
                void choose(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {file && (
        <CropDialog
          file={file}
          onCancel={() => setFile(null)}
          onDone={async (blob) => {
            setFile(null);
            await onPicked(blob);
          }}
        />
      )}
    </div>
  );
}

function CropDialog({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (webp: Blob) => Promise<void>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [crop, setCrop] = useState<Crop>(DEFAULT_CROP);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; crop: Crop } | null>(null);

  useEffect(() => {
    let alive = true;
    let made: ImageBitmap | null = null;
    createImageBitmap(file)
      .then((b) => {
        made = b;
        if (alive) setBitmap(b);
        else b.close();
      })
      .catch(() => alive && setError('Não foi possível ler esta foto.'));
    return () => {
      alive = false;
      made?.close();
    };
  }, [file]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx || !bitmap) return;
    const { sx, sy, size } = cropRect(bitmap.width, bitmap.height, crop);
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, el.width, el.height);
  }, [bitmap, crop]);

  const move = (dx: number, dy: number) =>
    setCrop((c) => ({ ...c, x: clamp(c.x + dx), y: clamp(c.y + dy) }));

  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? STEP * 5 : STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = moves[e.key];
    if (!delta) return;
    e.preventDefault();
    move(...delta);
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, crop };
  };
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const start = drag.current;
    if (!start || !bitmap) return;
    const box = e.currentTarget.getBoundingClientRect();
    const { size } = cropRect(bitmap.width, bitmap.height, start.crop);
    // Arrastar a foto para a direita mostra o que está à esquerda.
    const dx = (-(e.clientX - start.x) / box.width) * (size / bitmap.width);
    const dy = (-(e.clientY - start.y) / box.height) * (size / bitmap.height);
    setCrop({ ...start.crop, x: clamp(start.crop.x + dx), y: clamp(start.crop.y + dy) });
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDone(await renderAvatar(file, crop));
    } catch (e) {
      setError(e instanceof SocialError ? e.message : 'Não foi possível preparar a foto.');
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Ajustar foto"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => void confirm()} disabled={busy || !bitmap}>
            {busy ? 'Preparando…' : 'Usar esta foto'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 pb-2">
        <canvas
          ref={canvas}
          width={320}
          height={320}
          tabIndex={0}
          role="img"
          aria-label="Prévia da foto. Use as setas para mover; Shift + setas move mais rápido."
          onKeyDown={onKey}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          className="size-crop touch-none rounded-full border-hair bg-surface"
        />
        <label className="flex w-full max-w-crop flex-col gap-1 text-md">
          <span className="font-medium">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.zoom}
            onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
            className="accent-accent-ink coarse:min-h-touch"
          />
        </label>
        <p className="text-sm text-muted">
          A foto é reduzida para 512 × 512 e salva sem metadados (como local e data).
        </p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
