# Gerenciador de Tarefas

Projeto da disciplina **Desenvolvimento de Sistemas Web** (Prof. Alexandre Bendlin).

* **Estudante:** Juan Carlos

Um gerenciador de tarefas completo e **multi-usuário**: cada pessoa cria a sua conta, entra com e-mail e senha e enxerga e altera **somente as próprias tarefas**. Os dados ficam em um banco SQLite: um arquivo local (`tarefas.db`) em desenvolvimento ou o **Turso** (SQLite na nuvem) quando as credenciais estão no `.env`. O back-end também entrega o front já compilado, então em produção tudo roda em um único endereço (pronto para o deploy no Render).

## Funcionalidades

* Registro e login de usuários, com senha protegida por hash (bcrypt) e sessão por token JWT (validade de 8 horas).
* CRUD de tarefas: criar, listar, concluir/reabrir e excluir (com confirmação em modal).
* Prioridade por tarefa (Baixa, Média, Alta), busca por título com *debounce* e filtro por prioridade na tela.
* Isolamento entre usuários: toda consulta ao banco filtra pelo `usuario_id` do token.
* Back-end blindado contra SQL Injection (consultas parametrizadas) e com validação centralizada da entrada.
* Banco local ou em nuvem sem mudar o código, e criação/atualização automática das tabelas na subida do servidor.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Back-end | Node.js (20.12+), Express 5, TypeScript, @libsql/client (SQLite local ou Turso), bcryptjs, jsonwebtoken, cors |
| Front-end | React 19, TypeScript, Vite, Tailwind CSS v4, ESLint |
| Deploy | Render (`render.yaml`) + Turso |

## Estrutura do repositório

```
.
├── server.ts            # API (Express + libSQL + JWT) e entrega do front compilado
├── resquests.http       # Testes da API (extensão REST Client do VS Code)
├── package.json         # Dependências e scripts do back-end
├── render.yaml          # Configuração do serviço no Render
├── .env.example         # Modelo das variáveis de ambiente (o .env real não vai para o Git)
├── diario/              # Diários de aprendizagem de cada aula (.md)
└── web/                 # Front-end React (Vite + TypeScript)
    └── src/
        ├── api.ts       # Única ponte com a API: token, erros, login e CRUD
        ├── Login.tsx    # Tela de login e registro
        ├── Tarefas.tsx  # Tela da lista de tarefas
        └── App.tsx      # Decide qual tela mostrar (login ou tarefas)
```

## Como executar

Pré-requisito: [Node.js](https://nodejs.org/) 20.12 ou superior. Primeiro instale as dependências das duas pastas:

```bash
npm install
cd web && npm install && cd ..
```

Na primeira execução o servidor cria as tabelas sozinho, já com o usuário `admin@senai.com` (senha `senha_super_secreta_123`). Um `tarefas.db` criado pelas aulas anteriores é atualizado automaticamente, sem perder os dados.

### Modo 1 — desenvolvimento (2 terminais, recarrega ao salvar)

| Terminal | Comando (na raiz) | O que sobe |
| --- | --- | --- |
| 1 | `npm run dev` | Back-end em `http://localhost:3000` |
| 2 | `npm run dev:web` | Front (Vite) em `http://localhost:5173` — abra este endereço |

### Modo 2 — servido pelo back (1 endereço, como em produção)

```bash
npm run build:web   # gera web/dist/
npm run dev         # ou: npm start
```

Abra `http://localhost:3000`: o próprio Express entrega a tela e a API. Se o build estiver ausente ou velho, o servidor avisa no terminal. Depois de mudar algo em `web/src`, rode `npm run build:web` de novo.

### Banco de dados: local ou Turso (nuvem)

Sem `.env`, o servidor usa o arquivo local `tarefas.db`. Para usar o Turso, copie `.env.example` para `.env` e preencha `TURSO_URL` e `TURSO_TOKEN` (salve em UTF-8 **sem BOM**). O terminal mostra o modo em uso ao subir, e `GET /api/health` informa o campo `banco`.

### Outros comandos

| Onde | Comando | O que faz |
| --- | --- | --- |
| raiz | `npm run build` | Build completo: instala `web/`, gera `web/dist/` e confere os tipos do back-end (é o que o Render roda) |
| raiz | `npm start` | Sobe o servidor (API + front compilado) |
| `web/` | `npm run lint` | Roda o ESLint |
| `web/` | `npm run build` | Confere os tipos e gera só o build do front em `web/dist/` |

### Deploy no Render

O `render.yaml` descreve o serviço. No Render: **New + > Web Service**, conecte o repositório e defina as variáveis `TURSO_URL` e `TURSO_TOKEN` (o `JWT_SECRET` é gerado automaticamente). Depois confira `/api/health` e `/api/db-check` na URL pública.

## API

As rotas de tarefas exigem o header `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/health` | Verifica se o servidor e o banco estão no ar (informa o modo do banco) |
| GET | `/api/version` | Nome e versão da aplicação |
| GET | `/api/db-check` | Diagnóstico: tabelas existentes e quantidade de linhas de cada uma |
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
| 08 | 28/10/2026 | Servindo o front pelo back (static e SPA fallback) | [08_servindo_front.md](diario/08_servindo_front.md) |
| 09 | 04/11/2026 | Banco de dados em nuvem (Turso e libSQL) | [09_banco_nuvem.md](diario/09_banco_nuvem.md) |
| 10 | 11/11/2026 | Deploy no Render | [10_deploy_render.md](diario/10_deploy_render.md) |
| — | 18/11/2026 | Atividade: leitura, análise e evolução (filtro por prioridade) | [18-11-2026.md](diario/18-11-2026.md) |
