# Gerenciador de Tarefas

Projeto da disciplina **Desenvolvimento de Sistemas Web** (Prof. Alexandre Bendlin).

* **Estudante:** Juan Carlos

Um gerenciador de tarefas completo e **multi-usuário**: cada pessoa cria a sua conta, entra com e-mail e senha e enxerga e altera **somente as próprias tarefas**. Os dados ficam em um banco SQLite.

## Funcionalidades

* Registro e login de usuários, com senha protegida por hash (bcrypt) e sessão por token JWT (validade de 2 horas).
* CRUD de tarefas: criar, listar, concluir/reabrir e excluir (com confirmação em modal).
* Prioridade por tarefa (Baixa, Média, Alta) e busca por título com *debounce*.
* Isolamento entre usuários: toda consulta ao banco filtra pelo `usuario_id` do token.
* Back-end blindado contra SQL Injection (prepared statements) e com validação centralizada da entrada.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Back-end | Node.js, Express 5, TypeScript, better-sqlite3 (SQLite), bcryptjs, jsonwebtoken, cors |
| Front-end | React 19, TypeScript, Vite, Tailwind CSS v4, ESLint |

## Estrutura do repositório

```
.
├── server.ts            # API (Express + SQLite + JWT)
├── resquests.http       # Testes da API (extensão REST Client do VS Code)
├── package.json         # Dependências e scripts do back-end
├── diario/              # Diários de aprendizagem de cada aula (.md)
└── web/                 # Front-end React (Vite + TypeScript)
    └── src/
        ├── api.ts       # Única ponte com a API: token, erros, login e CRUD
        ├── Login.tsx    # Tela de login e registro
        ├── Tarefas.tsx  # Tela da lista de tarefas
        └── App.tsx      # Decide qual tela mostrar (login ou tarefas)
```

## Como executar

Pré-requisito: [Node.js](https://nodejs.org/) instalado. São necessários **dois terminais**.

**Terminal 1 — back-end** (na raiz do projeto):

```bash
npm install
npm run dev
```

A API sobe em `http://localhost:3000`. Na primeira execução o arquivo `tarefas.db` é criado automaticamente, já com o usuário `admin@senai.com` (senha `senha_super_secreta_123`).

**Terminal 2 — front-end** (dentro de `web/`):

```bash
cd web
npm install
npm run dev
```

Abra o endereço que o Vite mostrar (em geral `http://localhost:5173`).

> Se o `tarefas.db` foi criado por uma versão antiga do `server.ts`, apague-o e reinicie o back-end para ele ser recriado.

### Outros comandos

| Onde | Comando | O que faz |
| --- | --- | --- |
| raiz | `npm run build` | Confere os tipos do back-end com o TypeScript |
| `web/` | `npm run lint` | Roda o ESLint |
| `web/` | `npm run build` | Confere os tipos e gera o build de produção em `web/dist/` |

## API

As rotas de tarefas exigem o header `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/health` | Verifica se o servidor está no ar |
| GET | `/api/version` | Nome e versão da aplicação |
| POST | `/api/auth/register` | Cria uma conta (`email`, `senha` com 6+ caracteres) |
| POST | `/api/auth/login` | Devolve o token JWT |
| GET | `/api/tasks?search=` | Lista as tarefas do usuário, com busca opcional por título |
| POST | `/api/tasks` | Cria uma tarefa (`titulo`, `prioridade`) |
| PUT | `/api/tasks/:id` | Atualização completa |
| PATCH | `/api/tasks/:id` | Atualização parcial (só os campos enviados) |
| DELETE | `/api/tasks/:id` | Exclui a tarefa |

Para testar sem o front, abra o `resquests.http` no VS Code com a extensão [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client).

## Diário de aprendizagem

Cada aula tem seu registro na pasta [`diario/`](diario/):

| Aula | Data | Tema | Diário |
| --- | --- | --- | --- |
| 00 | 02/09/2026 | Ambiente e primeiros passos | [02-09-2026.md](diario/02-09-2026.md) |
| 01 | 09/09/2026 | Segurança do servidor (prepared statements e validação) | [09-09-2026.md](diario/09-09-2026.md) |
| 02 | 16/09/2026 | Segurança das rotas de escrita | [16-09-2026.md](diario/16-09-2026.md) |
| 03 | 23/09/2026 | Autenticação (bcrypt e JWT) | [23-09-2026.md](diario/23-09-2026.md) |
| 04 | 06/10/2026 | Rotas protegidas e isolamento de usuários | [06-10-2026.md](diario/06-10-2026.md) |
| 05 | 07/10/2026 | Introdução ao React | [05_intro_react.md](diario/05_intro_react.md) |
| 06 | 14/10/2026 | Tela de login e registro no React | [06_tela_login.md](diario/06_tela_login.md) |
| 06 (em sala) | 14/10/2026 | Tipando o front React com TypeScript | [14-10-2026.md](diario/14-10-2026.md) |
| 07 | 21/10/2026 | CRUD de tarefas no React | [07_crud_tarefas.md](diario/07_crud_tarefas.md) |
