import { useState } from 'react';
import { Link } from 'react-router-dom';
import { birthDateProblem, displayNameProblem, isTeen, normalizeUsername } from '@daily/shared';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { dayKey } from '../../lib/dates';
import { appNow } from '../../lib/fixture';
import { SocialError } from '../../lib/social/errors';
import { useSocial } from '../../lib/social/social-store';
import {
  CONSENT_CHECKBOX,
  CONSENT_PARAGRAPHS,
  ONLY_YOU,
  TEEN_NOTICE,
  UNDER_14_MESSAGE,
} from '../../lib/social/texts';
import { useToasts } from '../../lib/toast-store';
import { AvatarPicker } from './AvatarPicker';
import { SocialAvatar } from './SocialAvatar';
import { PrivacyToggles, UsernameField, type PrivacyValues } from './SocialFields';
import { useUsernameCheck } from './useUsernameCheck';

type Step = 'nascimento' | 'bloqueado' | 'termo' | 'arroba' | 'nome' | 'foto' | 'revisao';
const ORDER: readonly Step[] = ['nascimento', 'termo', 'arroba', 'nome', 'foto', 'revisao'];

const BIRTH_MESSAGES = {
  invalida: 'Informe uma data válida.',
  futura: 'A data não pode ser no futuro.',
  antiga: 'Confira o ano.',
} as const;

const DEFAULT_PRIVACY: PrivacyValues = {
  discoverable: false,
  showAchievements: true,
  showStreaks: false,
  showStats: false,
};

/**
 * Assistente “Ativar perfil social”: nascimento → termo → @ → nome → foto (opcional) → revisão.
 * Menor de 14: mensagem gentil e fim, sem enviar nada. É um diálogo no desktop e tela cheia no
 * celular (o `Modal`). Nada vai ao servidor antes da revisão, exceto a checagem do @.
 */
export function ActivationWizard({
  defaultName,
  onClose,
}: {
  defaultName: string;
  onClose: () => void;
}) {
  const activate = useSocial((s) => s.activate);
  const update = useSocial((s) => s.update);
  const [step, setStep] = useState<Step>('nascimento');
  const [birth, setBirth] = useState('');
  const [birthError, setBirthError] = useState<string | undefined>();
  const [accepted, setAccepted] = useState(false);
  const [rawUsername, setRawUsername] = useState('');
  const [name, setName] = useState(defaultName.slice(0, 40));
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<PrivacyValues>(DEFAULT_PRIVACY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = dayKey(appNow());
  const teen = birth !== '' && birthDateProblem(birth, today) === null && isTeen(birth, today);
  const username = normalizeUsername(rawUsername);
  const check = useUsernameCheck(step === 'arroba' || step === 'revisao' ? rawUsername : '');
  const nameError = displayNameProblem(name);
  const index = ORDER.indexOf(step);
  const back = () => setStep(ORDER[index - 1] ?? 'nascimento');
  const next = () => setStep(ORDER[index + 1] ?? 'revisao');

  const confirmBirth = () => {
    const problem = birthDateProblem(birth, today);
    if (problem === 'menor_de_14') return setStep('bloqueado');
    if (problem) return setBirthError(BIRTH_MESSAGES[problem]);
    setBirthError(undefined);
    next();
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await activate({ birthDate: birth, username, displayName: name.trim() }, photo);
      const changed = (Object.keys(privacy) as (keyof PrivacyValues)[]).some(
        (k) => privacy[k] !== DEFAULT_PRIVACY[k],
      );
      if (changed && !teen) await update(privacy);
      useToasts.getState().push({ message: 'Perfil social ativado', durationMs: 4000 });
      onClose();
    } catch (e) {
      setError(e instanceof SocialError ? e.message : 'Algo deu errado. Tente de novo.');
      setBusy(false);
    }
  };

  if (step === 'bloqueado') {
    return (
      <Modal
        title="Perfil social"
        onClose={onClose}
        footer={<Button onClick={onClose}>Entendi</Button>}
      >
        <p className="pb-2 text-md text-soft">{UNDER_14_MESSAGE}</p>
      </Modal>
    );
  }

  const canContinue: Record<Exclude<Step, 'bloqueado'>, boolean> = {
    nascimento: birth !== '',
    termo: accepted,
    arroba: check.state === 'livre',
    nome: nameError === null,
    foto: true,
    revisao: check.state === 'livre' && !busy,
  };

  return (
    <Modal
      title="Ativar perfil social"
      onClose={onClose}
      footer={
        <>
          {index > 0 && (
            <Button variant="secondary" onClick={back} disabled={busy}>
              Voltar
            </Button>
          )}
          {step === 'revisao' ? (
            <Button onClick={() => void finish()} disabled={!canContinue.revisao}>
              {busy ? 'Ativando…' : 'Ativar perfil'}
            </Button>
          ) : step === 'nascimento' ? (
            <Button onClick={confirmBirth} disabled={!canContinue.nascimento}>
              Continuar
            </Button>
          ) : (
            <Button onClick={next} disabled={!canContinue[step]}>
              {step === 'foto' && !photo ? 'Pular' : 'Continuar'}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <p className="text-sm text-muted" aria-live="polite">
          Passo {index + 1} de {ORDER.length}
        </p>

        {step === 'nascimento' && (
          <>
            <TextField
              label="Data de nascimento"
              type="date"
              value={birth}
              max={today}
              onChange={(e) => {
                setBirth(e.target.value);
                setBirthError(undefined);
              }}
              error={birthError}
              hint="Para confirmar que você tem 14 anos ou mais. Guardamos só o mês e o ano."
            />
          </>
        )}

        {step === 'termo' && (
          <>
            <div className="flex flex-col gap-3 rounded-md border-hair p-4">
              {CONSENT_PARAGRAPHS.map((p) => (
                <p key={p.title} className="text-md">
                  <strong className="font-semibold">{p.title}:</strong>{' '}
                  <span className="text-soft">{p.body}</span>
                </p>
              ))}
              <p className="text-md">
                <Link to="/privacidade" target="_blank" className="underline">
                  Ler a Política de privacidade
                </Link>
              </p>
            </div>
            {teen && <p className="rounded-md bg-accent-soft p-3 text-md text-fg">{TEEN_NOTICE}</p>}
            <Checkbox
              plain
              label={CONSENT_CHECKBOX}
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
          </>
        )}

        {step === 'arroba' && (
          <UsernameField value={rawUsername} onChange={setRawUsername} check={check} />
        )}

        {step === 'nome' && (
          <TextField
            label="Nome de exibição"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            error={nameError ?? undefined}
            hint="Como você quer aparecer. Pode mudar depois."
          />
        )}

        {step === 'foto' && (
          <div className="flex flex-col gap-3">
            <p className="text-md text-soft">
              Opcional. A foto é recortada em quadrado, reduzida e salva sem metadados.
            </p>
            <div className="flex items-center gap-4">
              <SocialAvatar url={photoUrl} name={name} size="lg" />
              <AvatarPicker
                label={photo ? 'Trocar foto' : 'Escolher foto'}
                onPicked={(webp) => {
                  if (photoUrl) URL.revokeObjectURL(photoUrl);
                  setPhoto(webp);
                  setPhotoUrl(URL.createObjectURL(webp));
                }}
              />
            </div>
          </div>
        )}

        {step === 'revisao' && (
          <>
            <div className="flex items-center gap-4">
              <SocialAvatar url={photoUrl} name={name} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{name.trim()}</p>
                <p className="truncate text-md text-soft">@{username}</p>
              </div>
            </div>
            <p className="rounded-md bg-hover p-3 text-md font-medium">{ONLY_YOU}</p>
            <PrivacyToggles
              values={teen ? DEFAULT_PRIVACY : privacy}
              teen={teen}
              onChange={(key, value) => setPrivacy((p) => ({ ...p, [key]: value }))}
            />
            {check.state === 'problema' && (
              <p role="alert" className="text-sm text-danger">
                {check.message}
              </p>
            )}
          </>
        )}

        {error && (
          <div role="alert" className="flex flex-col gap-2">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
