/** Telas e tamanhos cobertos pelo projeto “responsive” (e pela sonda da Fase 0). */

export const VIEWS_NOW = new Date('2026-10-29T10:30:00');
export const STATS_NOW = new Date('2026-11-10T10:30:00');

const cal = (view: string) => `/calendario?fixture=views&visao=${view}&data=2026-10-29`;

export interface RouteCase {
  name: string;
  url: string;
  now: Date;
}

export const ROUTES: readonly RouteCase[] = [
  { name: 'calendario-mes', url: cal('mes'), now: VIEWS_NOW },
  { name: 'calendario-semana', url: cal('semana'), now: VIEWS_NOW },
  { name: 'calendario-dia', url: cal('dia'), now: VIEWS_NOW },
  { name: 'calendario-ano', url: cal('ano'), now: VIEWS_NOW },
  { name: 'provas', url: '/provas?fixture=views', now: VIEWS_NOW },
  { name: 'tarefas', url: '/tarefas?fixture=views', now: VIEWS_NOW },
  { name: 'materias', url: '/materias?fixture=views', now: VIEWS_NOW },
  { name: 'blocos', url: '/blocos?fixture=views', now: VIEWS_NOW },
  { name: 'habitos', url: '/habitos?fixture=habits', now: STATS_NOW },
  { name: 'foco', url: '/foco?fixture=stats', now: STATS_NOW },
  { name: 'foco-travado', url: '/foco?fixture=focus', now: STATS_NOW },
  { name: 'estatisticas', url: '/estatisticas?fixture=stats', now: STATS_NOW },
  { name: 'preferencias', url: '/preferencias?fixture=stats', now: STATS_NOW },
  { name: 'entrar', url: '/entrar', now: STATS_NOW },
  { name: 'privacidade', url: '/privacidade', now: STATS_NOW },
];

export interface ViewportCase {
  name: string;
  width: number;
  height: number;
  /** Celular (< 768 px de largura ou paisagem com altura baixa). */
  phone: boolean;
}

export const VIEWPORTS: readonly ViewportCase[] = [
  { name: 'celular-375x667', width: 375, height: 667, phone: true },
  { name: 'celular-390x844', width: 390, height: 844, phone: true },
  { name: 'celular-412x915', width: 412, height: 915, phone: true },
  { name: 'celular-paisagem-844x390', width: 844, height: 390, phone: true },
  { name: 'tablet-768x1024', width: 768, height: 1024, phone: false },
  { name: 'notebook-1024x768', width: 1024, height: 768, phone: false },
  { name: 'tablet-paisagem-1194x834', width: 1194, height: 834, phone: false },
];

export const DESKTOP_VIEWPORTS: readonly ViewportCase[] = [
  { name: 'desktop-1280x720', width: 1280, height: 720, phone: false },
  { name: 'desktop-1440x900', width: 1440, height: 900, phone: false },
  { name: 'desktop-1920x1080', width: 1920, height: 1080, phone: false },
];
