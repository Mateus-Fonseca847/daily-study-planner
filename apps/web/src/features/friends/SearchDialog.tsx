import { Modal } from '../../components/ui/Modal';
import { FriendsGate } from './FriendsGate';
import { PeopleSearch } from './PeopleSearch';

/**
 * A lupa da topbar: buscar pessoas pelo @ (diálogo no desktop, tela cheia no celular). Antes do
 * Prompt 16 a lupa não tinha nenhuma busca nem atalho; “Pessoas” é o único modo por enquanto.
 */
export function SearchDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Buscar pessoas" onClose={onClose}>
      <FriendsGate>
        <PeopleSearch autoFocus />
      </FriendsGate>
    </Modal>
  );
}
