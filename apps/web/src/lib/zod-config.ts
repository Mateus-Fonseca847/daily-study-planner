import { z } from 'zod';

/**
 * A CSP de produção não permite `eval`: sem o JIT o zod valida pelo caminho comum (um pouco mais
 * lento, sem `new Function`). Precisa rodar antes de qualquer schema ser criado.
 */
z.config({ jitless: true });
