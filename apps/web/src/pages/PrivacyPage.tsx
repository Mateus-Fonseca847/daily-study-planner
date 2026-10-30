import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

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
    <main className="h-full overflow-y-auto bg-bg">
      <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-page py-10">
        <header>
          <Link to="/" className="text-sm text-muted underline">
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
            <Link to="/preferencias" className="underline">
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
            <a href={REPO_ISSUES} className="underline" rel="noreferrer" target="_blank">
              issue no repositório do projeto
            </a>{' '}
            (sem colocar dados pessoais) e retornaremos o contato.
          </p>
        </Block>

        <Block title="Limites do serviço">
          <p>
            É um projeto sem garantia de disponibilidade. Mantenha um backup (Preferências →
            Exportar dados) dos estudos que importam. Esta política pode mudar; a data da última
            revisão é <time dateTime="2026-10-30">30/10/2026</time>.
          </p>
        </Block>
      </div>
    </main>
  );
}
