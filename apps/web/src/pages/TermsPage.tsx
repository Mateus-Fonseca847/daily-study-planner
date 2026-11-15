import { Link } from 'react-router-dom';
import { CONTROLLER_CONTACT } from '../lib/social/texts';
import { LegalBlock as Block } from './LegalBlock';

/** Versão dos Termos de Serviço (mude junto com o texto e a data abaixo). */
export const TERMS_VERSION = 'termos-2026-11';

const REPO_ISSUES = 'https://github.com/Mateus-Fonseca847/daily-study-planner/issues';

/** Termos de Serviço públicos (rascunho para revisão do dono do projeto e, se possível, jurídica). */
export function TermsPage() {
  return (
    <main className="readable h-full overflow-y-auto bg-bg safe-frame">
      <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-page py-10">
        <header>
          <Link
            to="/"
            className="inline-flex text-sm text-muted underline coarse:min-h-touch coarse:items-center"
          >
            ← Voltar ao Daily
          </Link>
          <h1 className="mt-3 text-xl font-semibold tracking-tighter">Termos de Serviço</h1>
          <p className="mt-1 text-md text-muted">
            Regras de uso do Daily, em linguagem direta. Ao usar o app, você concorda com elas.
          </p>
        </header>

        <Block title="1. Quem somos e o que é o Daily">
          <p>
            O Daily é um organizador de estudos (calendário, provas, tarefas, hábitos, Modo Foco e
            estatísticas), gratuito, feito por estudantes como projeto de portfólio. Quem o mantém é
            o controlador indicado no item 12. Estes termos valem para o aplicativo, para o site e
            para a conta opcional na nuvem.
          </p>
        </Block>

        <Block title="2. O serviço, como ele é">
          <p>
            O Daily é oferecido <strong>no estado em que se encontra</strong>, sem garantia de
            disponibilidade contínua, de ausência de erros ou de que atenda a um uso específico.
            Podemos alterar, suspender ou encerrar funções ou o serviço inteiro, com aviso quando
            possível. Por isso, <strong>faça backup</strong> do que é importante (Preferências →
            Exportar dados).
          </p>
        </Block>

        <Block title="3. Uso sem conta e com conta">
          <p>
            Sem conta, tudo funciona e os dados ficam só no seu navegador (veja a{' '}
            <Link to="/privacidade" data-touch="inline" className="underline">
              Política de privacidade
            </Link>
            ). Com conta, o login é feito pelo Google e uma cópia dos seus dados é sincronizada na
            nuvem. Você é responsável por manter o acesso à sua conta Google e por tudo o que
            acontece com a sua conta no Daily.
          </p>
          <p>
            O Daily é destinado a pessoas com <strong>14 anos ou mais</strong>. Se você tem menos de
            18 anos, use com o conhecimento de um responsável.
          </p>
        </Block>

        <Block title="4. Os seus dados e o seu conteúdo">
          <p>
            O que você cria no Daily (matérias, tarefas, hábitos, notas, foto e demais conteúdos)
            continua sendo seu. Você nos autoriza apenas a armazenar, sincronizar e exibir esse
            conteúdo para você, na medida necessária para o serviço funcionar. Você garante que tem
            o direito de usar o que envia (por exemplo, uma foto de perfil) e que isso não viola
            direitos de terceiros.
          </p>
        </Block>

        <Block title="5. Uso aceitável">
          <p>Não é permitido:</p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>
              acessar, tentar acessar ou alterar dados de outras pessoas, ou contornar as regras de
              acesso e os limites do serviço;
            </li>
            <li>
              sobrecarregar o serviço, usar automações abusivas, explorar falhas ou tentar derrubar
              ou comprometer a segurança do app e da sua infraestrutura (se encontrar uma falha,
              avise-nos pelo contato do item 12);
            </li>
            <li>
              usar o Daily para conteúdo ilegal, ofensivo, discriminatório, de assédio, de exposição
              de outras pessoas, ou para se passar por alguém.
            </li>
          </ul>
        </Block>

        <Block title="6. Perfil social e amigos (opcional)">
          <p>
            O perfil social, a busca, os pedidos de amizade, bloqueios e denúncias são opcionais e
            seguem, além destes termos, o termo de consentimento mostrado na ativação e a Política
            de privacidade. Você pode bloquear e denunciar outras pessoas; as denúncias são
            analisadas pela equipe do Daily, que pode remover conteúdo e suspender perfis que violem
            estes termos.
          </p>
        </Block>

        <Block title="7. Suspensão e encerramento">
          <p>
            Podemos suspender ou encerrar uma conta que viole estes termos, coloque outras pessoas
            ou o serviço em risco, ou quando exigido por lei. Você pode encerrar a sua a qualquer
            momento em{' '}
            <Link to="/preferencias" data-touch="inline" className="underline">
              Preferências → Conta e sincronização
            </Link>
            : a conta e os dados da nuvem são apagados na hora e isso não pode ser desfeito.
          </p>
        </Block>

        <Block title="8. Limitação de responsabilidade">
          <p>
            Na medida permitida pela lei, não nos responsabilizamos por perda de dados, falhas de
            conexão, indisponibilidade, decisões tomadas com base nas informações do app (por
            exemplo, perder uma prova ou um prazo) ou por danos indiretos. Nada nestes termos limita
            direitos que a lei não permite limitar, incluindo os do Código de Defesa do Consumidor,
            quando aplicável.
          </p>
        </Block>

        <Block title="9. Código aberto e marca">
          <p>
            O código do Daily é público sob a licença MIT, que vale para o código-fonte. Estes
            termos tratam do uso do serviço publicado. O nome e o logo “Daily” identificam este
            projeto; não os use de forma que sugira que um serviço seu é o oficial.
          </p>
        </Block>

        <Block title="10. Privacidade">
          <p>
            O tratamento dos seus dados pessoais é descrito na{' '}
            <Link to="/privacidade" data-touch="inline" className="underline">
              Política de privacidade
            </Link>
            , que faz parte destes termos.
          </p>
        </Block>

        <Block title="11. Mudanças e lei aplicável">
          <p>
            Podemos atualizar estes termos. Mudanças relevantes serão avisadas no app, e continuar
            usando o Daily depois delas significa que você as aceita; se não concordar, pode excluir
            a conta e parar de usar. Valem as leis do Brasil. Se você for consumidor, o foro é o do
            seu domicílio.
          </p>
        </Block>

        <Block title="12. Contato">
          <p>
            Controlador: {CONTROLLER_CONTACT}. Dúvidas, pedidos sobre seus dados ou avisos de falha
            de segurança: abra uma{' '}
            <a
              href={REPO_ISSUES}
              data-touch="inline"
              className="underline"
              rel="noreferrer"
              target="_blank"
            >
              issue no repositório do projeto
            </a>{' '}
            (sem colocar dados pessoais ou detalhes de segurança; para falhas sensíveis, use o
            contato do controlador).
          </p>
          <p className="text-sm text-muted">
            Última revisão: <time dateTime="2026-11-15">15/11/2026</time> (versão {TERMS_VERSION}).
          </p>
        </Block>
      </div>
    </main>
  );
}
