/**
 * Textos do perfil social (RASCUNHO para revisão do dono do projeto e, se possível, de um
 * profissional jurídico). Mudou o texto do termo ou da política? Suba as versões em
 * `packages/shared/src/social.ts` (vão para `consents.text_version`).
 */

/** Contato do controlador: PENDENTE, o dono do projeto precisa preencher. */
export const CONTROLLER_CONTACT = '[nome e e-mail do controlador — a definir]';

export const CONSENT_PARAGRAPHS: readonly { title: string; body: string }[] = [
  {
    title: 'O que coletamos',
    body: 'Seu @, nome de exibição e, se quiser, uma foto. Para confirmar que você tem 14 anos ou mais, pedimos sua data de nascimento: conferimos a idade e guardamos só o mês e o ano.',
  },
  {
    title: 'Para quê',
    body: 'Mostrar o seu perfil e, nas próximas versões, permitir conexões com amigos que você aceitar.',
  },
  {
    title: 'Quem vê',
    body: 'Por enquanto, só você. Nada fica visível para outras pessoas até você decidir, quando a função de amigos chegar.',
  },
  {
    title: 'Por quanto tempo',
    body: 'Enquanto o perfil social existir. Você pode desativar (ocultar) ou excluir tudo a qualquer momento em Preferências → Perfil social; excluir apaga o perfil, a foto e o registro deste aceite.',
  },
  {
    title: 'Base legal e contato',
    body: `O seu consentimento, que você pode revogar quando quiser. Contato: ${CONTROLLER_CONTACT}.`,
  },
];

export const CONSENT_CHECKBOX =
  'Li e concordo com o tratamento descrito acima e com a Política de privacidade.';

export const TEEN_NOTICE =
  'Como você tem menos de 18 anos, seu perfil começa com tudo no mais privado: ninguém encontra você por busca e só aparecem o nome, o @, a foto e as medalhas que você escolher. Se tiver dúvida, converse com seu responsável. Você pode excluir tudo quando quiser.';

export const UNDER_14_MESSAGE =
  'O perfil social está disponível a partir dos 14 anos. Você pode continuar usando todo o resto do Daily normalmente. Nenhuma informação foi guardada.';

export const ONLY_YOU = 'Ninguém além de você vê seu perfil por enquanto.';
