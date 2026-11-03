import { Plus } from 'lucide-react';
import { Menu } from '../ui/Menu';
import { CREATE_ITEMS } from './CreateMenu';

/** Botão "+" flutuante do celular: abre o menu Criar (substitui o "Criar" da sidebar). */
export function Fab() {
  return (
    <div className="fab-slot absolute z-30">
      <Menu
        label="Criar"
        items={CREATE_ITEMS}
        align="end"
        placement="above"
        trigger={(props) => (
          <button
            type="button"
            aria-label="Criar"
            className="inline-flex size-fab-size items-center justify-center rounded-full bg-accent text-accent-fg shadow-popover active:brightness-95"
            {...props}
          >
            <Plus aria-hidden strokeWidth={1.5} className="size-icon" />
          </button>
        )}
      />
    </div>
  );
}
