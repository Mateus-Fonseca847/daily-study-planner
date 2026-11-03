import { detectPlatform, INSTALL_STEPS } from '../../lib/pwa/platform';
import { isStandalone } from '../../lib/pwa/pwa-store';
import { useCanInstall } from './InstallButton';

/** Como instalar o app neste navegador (só quando o botão de instalar não está disponível). */
export function InstallHelp() {
  const canInstall = useCanInstall();
  if (canInstall || isStandalone()) return null;
  const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
  return <p className="px-3 text-sm text-muted">{INSTALL_STEPS[platform]}</p>;
}
