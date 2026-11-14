import { useState } from 'react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { displayNameProblem, normalizeUsername, USERNAME_CHANGE_DAYS } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { dayKey } from '../../lib/dates';
import { appNow } from '../../lib/fixture';
import { SocialError } from '../../lib/social/errors';
import type { SocialProfile } from '../../lib/social/repository';
import { useSocial } from '../../lib/social/social-store';
import { CONSENT_CHECKBOX, ONLY_YOU } from '../../lib/social/texts';
import { useToasts } from '../../lib/toast-store';
import { AvatarPicker } from './AvatarPicker';
import { SocialAvatar } from './SocialAvatar';
import { PrivacyToggles, UsernameField } from './SocialFields';
import { useUsernameCheck } from './useUsernameCheck';

const message = (e: unknown) =>
  e instanceof SocialError ? e.message : 'Algo deu errado. Tente de novo.';
const toast = (text: string) => useToasts.getState().push({ message: text, durationMs: 4000 });

/** 14 a 17 anos pelo mês de nascimento (conservador: maior só no mês seguinte ao dos 18). */
function isTeenByMonth(birthMonth: string | null, today: string): boolean {
  if (!birthMonth) return true;
  const [y, m] = birthMonth.split('-').map(Number) as [number, number];
  const adultMonth = new Date(y + 18, m, 1); // mês seguinte ao do 18º aniversário
  return today < dayKey(adultMonth);
}

/** Gerenciar o perfil: nome, @ (troca limitada), foto, privacidade, desativar e excluir. */
export function ManageSocialProfile({ profile }: { profile: SocialProfile }) {
  const s = useSocial();
  const [name, setName] = useState(profile.displayName);
  const [rawUsername, setRawUsername] = useState(profile.username);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reactivate, setReactivate] = useState(false);
  const check = useUsernameCheck(rawUsername, profile.username);
  const nameError = displayNameProblem(name);
  const today = dayKey(appNow());
  const teen = isTeenByMonth(profile.birthMonth, today);
  const disabled = profile.disabledAt !== null;
  const nextChange = profile.usernameChangedAt
    ? addDays(new Date(profile.usernameChangedAt), USERNAME_CHANGE_DAYS)
    : null;
  const canChange = !nextChange || nextChange <= appNow();

  const run = async (key: string, action: () => Promise<void>, done?: string) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      if (done) toast(done);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <SocialAvatar url={s.avatarUrl} name={profile.displayName} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{profile.displayName}</p>
          <p className="truncate text-md text-soft">@{profile.username}</p>
          <p className="text-sm text-muted">
            {disabled ? 'Desativado: oculto, com os dados guardados.' : ONLY_YOU}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-md font-semibold">Foto</h3>
        <div className="flex flex-wrap items-center gap-2">
          <AvatarPicker
            label={profile.avatarPath ? 'Trocar foto' : 'Escolher foto'}
            disabled={busy !== null}
            onPicked={(webp) => run('foto', () => s.uploadAvatar(webp), 'Foto salva')}
          />
          {profile.avatarPath && (
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => void run('foto', () => s.removeAvatar(), 'Foto removida')}
            >
              Remover foto
            </Button>
          )}
        </div>
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (nameError || name.trim() === profile.displayName) return;
          void run('nome', () => s.update({ displayName: name.trim() }), 'Nome salvo');
        }}
      >
        <TextField
          label="Nome de exibição"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          error={nameError ?? undefined}
        />
        <div>
          <Button
            type="submit"
            variant="outline"
            disabled={busy !== null || !!nameError || name.trim() === profile.displayName}
          >
            Salvar nome
          </Button>
        </div>
      </form>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (check.state !== 'livre') return;
          const next = normalizeUsername(rawUsername);
          if (next === profile.username) return;
          void run('arroba', () => s.changeUsername(next), '@ trocado');
        }}
      >
        <UsernameField label="@" value={rawUsername} onChange={setRawUsername} check={check} />
        <p className="text-sm text-soft">
          Você pode trocar o @ uma vez a cada {USERNAME_CHANGE_DAYS} dias. O @ antigo fica reservado
          por 90 dias para ninguém se passar por você.
          {!canChange && nextChange && (
            <> Próxima troca a partir de {format(nextChange, "d 'de' MMMM", { locale: ptBR })}.</>
          )}
        </p>
        <div>
          <Button
            type="submit"
            variant="outline"
            disabled={
              busy !== null ||
              !canChange ||
              check.state !== 'livre' ||
              normalizeUsername(rawUsername) === profile.username
            }
          >
            Trocar @
          </Button>
        </div>
      </form>

      <PrivacyToggles
        teen={teen}
        disabled={busy !== null}
        values={profile}
        onChange={(key, value) => void run('privacidade', () => s.update({ [key]: value }))}
      />

      <div className="flex flex-col gap-2 border-t-hair pt-4">
        <h3 className="text-md font-semibold">Desativar ou excluir</h3>
        <p className="text-sm text-soft">
          Desativar oculta o perfil e revoga o consentimento, mas guarda os dados para você voltar.
          Excluir apaga tudo do perfil social, inclusive a foto, e não tem volta.
        </p>
        <div className="flex flex-wrap gap-2">
          {disabled ? (
            <Button variant="outline" disabled={busy !== null} onClick={() => setReactivate(true)}>
              Reativar perfil social
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                void run('ativo', () => s.setActive(false), 'Perfil social desativado')
              }
            >
              Desativar perfil social
            </Button>
          )}
          <Button variant="outline" disabled={busy !== null} onClick={() => setConfirmDelete(true)}>
            Excluir perfil social
          </Button>
        </div>
      </div>

      {reactivate && (
        <ReactivateDialog
          onClose={() => setReactivate(false)}
          onConfirm={() =>
            run('ativo', () => s.setActive(true), 'Perfil social reativado').then(() =>
              setReactivate(false),
            )
          }
        />
      )}
      {confirmDelete && (
        <DeleteDialog
          username={profile.username}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await s.deleteProfile();
            toast('Perfil social excluído');
          }}
        />
      )}
    </div>
  );
}

function ReactivateDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [accepted, setAccepted] = useState(false);
  return (
    <Modal
      title="Reativar perfil social"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!accepted} onClick={() => void onConfirm()}>
            Reativar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-2">
        <p className="text-md text-soft">
          Para reativar, aceite de novo o termo do perfil social. {ONLY_YOU}
        </p>
        <Checkbox
          plain
          label={CONSENT_CHECKBOX}
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
      </div>
    </Modal>
  );
}

/** Exclusão definitiva: confirma digitando o @. */
function DeleteDialog({
  username,
  onClose,
  onConfirm,
}: {
  username: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = normalizeUsername(typed) === username;
  return (
    <Modal
      title="Excluir perfil social?"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            disabled={!matches || busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              onConfirm()
                .then(onClose)
                .catch((e: unknown) => {
                  setError(message(e));
                  setBusy(false);
                });
            }}
          >
            {busy ? 'Excluindo…' : 'Excluir para sempre'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-2">
        <p className="text-md text-soft">
          Isto apaga o perfil, a foto, o mês de nascimento e os registros de consentimento. Seu @
          fica reservado por 90 dias, sem ligação com você. Seus estudos não são afetados.
        </p>
        <TextField
          label={`Digite @${username} para confirmar`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
