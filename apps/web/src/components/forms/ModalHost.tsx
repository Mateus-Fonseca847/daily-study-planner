import { useUi } from '../../lib/ui-store';
import { EventFormModal } from './EventFormModal';
import { SubjectDeleteModal, SubjectFormModal } from './SubjectModals';

/** Renderiza o modal ativo (formulários abrem de qualquer lugar via `useUi`). */
export function ModalHost() {
  const modal = useUi((s) => s.modal);
  const close = useUi((s) => s.close);
  if (!modal) return null;
  switch (modal.kind) {
    case 'event':
      return (
        <EventFormModal event={modal.event} type={modal.type} date={modal.date} onClose={close} />
      );
    case 'subject':
      return <SubjectFormModal subject={modal.subject} onClose={close} />;
    case 'subject-delete':
      return <SubjectDeleteModal subject={modal.subject} onClose={close} />;
  }
}
