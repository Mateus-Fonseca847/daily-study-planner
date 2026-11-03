import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useFocusScope } from '../../lib/use-focus-scope';
import type { NavCounts } from '../../lib/data/selectors';
import { Sidebar } from './Sidebar';

interface SidebarOverlayProps {
  counts: NavCounts;
  onClose: () => void;
}

/**
 * Tablet: a barra lateral expandida abre sobre o conteúdo (o trilho de ícones continua no lugar),
 * com o fundo escurecido; fecha ao tocar fora, com Esc e ao navegar.
 */
export function SidebarOverlay({ counts, onClose }: SidebarOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const opened = useRef(pathname);
  useFocusScope(ref, { onEscape: onClose });

  useEffect(() => {
    if (pathname !== opened.current) onClose();
  }, [pathname, onClose]);

  return (
    <>
      <div aria-hidden className="absolute inset-0 z-40 bg-scrim" onClick={onClose} />
      <div ref={ref} className="absolute inset-y-0 left-0 z-40 shadow-popover">
        <Sidebar collapsed={false} onToggle={onClose} counts={counts} />
      </div>
    </>
  );
}
