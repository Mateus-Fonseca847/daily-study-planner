export type InstallPlatform =
  'ios' | 'android' | 'desktop-chromium' | 'firefox' | 'safari-mac' | 'other';

/** Plataforma do navegador, para mostrar o jeito certo de instalar o app (função pura). */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  const ua = userAgent.toLowerCase();
  // iPadOS 13+ se apresenta como Macintosh; a tela de toque o denuncia.
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && maxTouchPoints > 1)) return 'ios';
  if (ua.includes('android')) return 'android';
  if (ua.includes('firefox')) return 'firefox';
  if (/edg\/|chrome\/|chromium\//.test(ua)) return 'desktop-chromium';
  if (ua.includes('safari')) return 'safari-mac';
  return 'other';
}

/** Instruções de instalação manual (quando o navegador não oferece o botão). */
export const INSTALL_STEPS: Record<InstallPlatform, string> = {
  ios: 'No iPhone ou iPad, abra o Daily no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.',
  android:
    'No Chrome do Android, abra o menu ⋮ e escolha “Instalar app” (ou “Adicionar à tela inicial”).',
  'desktop-chromium':
    'No Chrome ou no Edge, use o ícone de instalar na barra de endereço ou o menu → “Instalar Daily”.',
  firefox: 'O Firefox não instala aplicativos web; o Daily funciona normalmente na aba.',
  'safari-mac': 'No Safari do Mac, use Arquivo → “Adicionar ao Dock”.',
  other: 'No menu do navegador, procure por “Instalar app” ou “Adicionar à tela inicial”.',
};
