import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PRIVACY_POLICY_VERSION } from '@daily/shared';
import { CONTROLLER_CONTACT } from '../lib/social/texts';

const REPO_ISSUES = 'https://github.com/Mateus-Fonseca847/daily-study-planner/issues';

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="flex flex-col gap-2 text-md text-soft">{children}</div>
    </section>
  );
}

/** Política de privacidade pública (exigida também pelo Google para publicar o login). */
export function PrivacyPage() {
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
          <h1 className="mt-3 text-xl font-semibold tracking-tighter">Política de privacidade</h1>
          <p className="mt-1 text-md text-muted">
            O Daily é um projeto de portfólio feito por estudantes. Esta página explica, sem
            rodeios, o que acontece com os seus dados.
          </p>
        </header>

        <Block title="O que guardamos">
          <p>
            <strong>Sem conta:</strong> seus estudos (matérias, provas, tarefas, hábitos, sessões de
            foco, preferências) ficam apenas no armazenamento do seu navegador. Nada é enviado para
            nós.
          </p>
          <p>
            <strong>Com conta Google:</strong> guardamos seu e-mail e nome (fornecidos pelo Google
            no login) e uma cópia dos dados acima na nuvem, para sincronizar entre dispositivos. O
            login pede ao Google somente o perfil básico e o e-mail; não acessamos seu Gmail, Drive
            nem contatos, e não recebemos sua senha.
          </p>
        </Block>

        <Block title="Onde ficam e quem acessa">
          <p>
            Os dados da conta ficam num banco Postgres da Supabase (região leste dos EUA), com
            criptografia em trânsito e regras de acesso por linha: cada pessoa só lê e grava a
            própria linha. O app é hospedado na Vercel. Esses provedores processam os dados apenas
            para operar o serviço.
          </p>
          <p>
            Não vendemos, não compartilhamos para publicidade e não usamos ferramentas de análise ou
            rastreamento. O conteúdo que você escreve não é lido por nós no uso normal; os
            mantenedores com acesso administrativo ao banco podem tecnicamente vê-lo e se
            comprometem a acessá-lo só para manutenção e correção de problemas.
          </p>
        </Block>

        <Block title="Por quanto tempo">
          <p>
            Enquanto a conta existir. Você pode excluir a conta em{' '}
            <Link to="/preferencias" data-touch="inline" className="underline">
              Preferências → Conta e sincronização
            </Link>
            : a conta e todos os dados da nuvem são apagados imediatamente. Ao sair da conta, os
            dados guardados neste dispositivo também são removidos.
          </p>
        </Block>

        <Block title="Seus direitos (LGPD)">
          <p>
            Você pode acessar, exportar (Preferências → Backup), corrigir e excluir seus dados a
            qualquer momento, e pedir esclarecimentos sobre o tratamento. Para dúvidas ou pedidos,
            abra uma{' '}
            <a
              href={REPO_ISSUES}
              data-touch="inline"
              className="underline"
              rel="noreferrer"
              target="_blank"
            >
              issue no repositório do projeto
            </a>{' '}
            (sem colocar dados pessoais) e retornaremos o contato.
          </p>
        </Block>

        <Block title="Perfil social">
          <p>
            É opcional e precisa de conta. <strong>O que coletamos:</strong> @, nome de exibição,
            foto (opcional, guardada num espaço privado), mês e ano de nascimento, a data e a versão
            do seu aceite e as suas escolhas de privacidade. A data completa de nascimento é usada
            só no momento da ativação, para confirmar a idade mínima de 14 anos, e não é guardada.
          </p>
          <p>
            <strong>Para quê:</strong> criar e mostrar o seu perfil, confirmar a idade mínima e
            registrar o seu consentimento. <strong>Base legal:</strong> consentimento (LGPD, art.
            7º, I; para adolescentes de 14 a 17 anos, observando o melhor interesse, art. 14). Para
            menores de 18, o perfil começa e fica no mais privado.
          </p>
          <p>
            <strong>Quem vê:</strong> o seu @ e o seu nome aparecem na busca só se você ligar
            “Aparecer na busca” (nunca para menores de 18); a foto, só os amigos que você aceitar. A
            foto não é analisada por sistemas automáticos: só é revisada se houver denúncia.
            <strong> Retenção:</strong> enquanto o perfil social existir. Ao excluir, apagamos tudo
            do perfil social na hora, inclusive a foto; o @ fica bloqueado para outras pessoas por
            90 dias, sem ligação com você.
          </p>
          <p>
            <strong>Seus direitos:</strong> acessar e exportar (Preferências → Backup inclui o
            perfil social), corrigir (Preferências → Perfil social), desativar (o que revoga o
            consentimento) e excluir tudo. Contato do controlador: {CONTROLLER_CONTACT}.
          </p>
        </Block>

        <Block title="Amigos, bloqueios e denúncias">
          <p>
            <strong>O que guardamos:</strong> os pedidos de amizade (quem pediu, para quem, quando e
            se foi recusado), as amizades (o par e a data), quem você bloqueou (com o @ e o nome
            daquele momento, só para a sua lista) e as denúncias (quem denunciou, quem foi
            denunciado, o @ e o nome naquele momento, o motivo, o detalhe opcional e a data). Os
            dados de outras pessoas ficam só na memória do aplicativo enquanto ele está aberto: não
            são gravados no seu aparelho e somem ao sair da conta.
          </p>
          <p>
            <strong>Quem vê:</strong> pedidos e amizades, só as duas pessoas envolvidas. Quem recebe
            um pedido recusado ou um bloqueio não é avisado. As denúncias não aparecem para ninguém
            no aplicativo (nem para quem denunciou): só a equipe do Daily as lê, para moderar.
            Amizade só entre pessoas da mesma faixa de idade (14 a 17 anos ou 18 anos ou mais).{' '}
            <strong>Base legal:</strong> o seu consentimento para as amizades; para as denúncias, o
            legítimo interesse de manter a comunidade segura (LGPD, art. 7º, IX).
          </p>
          <p>
            <strong>Retenção e exclusão:</strong> recusar um pedido o mantém por 30 dias (para
            ninguém insistir); bloqueios e amizades duram até você desfazer. Excluir o perfil social
            apaga as suas amizades, os pedidos e os bloqueios que você fez. Excluir a conta apaga
            tudo isso e desliga as denúncias de você: o conteúdo de uma denúncia é guardado por até
            12 meses depois de resolvida, sem o vínculo com a conta, para a moderação não ser
            burlada apagando a conta.
          </p>
        </Block>

        <Block title="Limites do serviço">
          <p>
            É um projeto sem garantia de disponibilidade. Mantenha um backup (Preferências →
            Exportar dados) dos estudos que importam. Esta política pode mudar; a data da última
            revisão é <time dateTime="2026-11-16">16/11/2026</time> (versão {PRIVACY_POLICY_VERSION}
            ).
          </p>
        </Block>
      </div>
    </main>
  );
}
