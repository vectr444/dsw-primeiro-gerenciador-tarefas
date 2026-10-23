# Front-end — Gerenciador de Tarefas

Aplicação React (Vite + TypeScript + Tailwind CSS v4) que consome a API do back-end que fica na raiz do repositório. A documentação geral do projeto está no [README da raiz](../README.md).

## Executar

Com o back-end rodando em `http://localhost:3000`:

```bash
npm install
npm run dev
```

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento do Vite (porta 5173) |
| `npm run lint` | Roda o ESLint |
| `npm run build` | Confere os tipos (`tsc`) e gera o build em `dist/` |
| `npm run preview` | Serve o build de produção localmente |

## Arquivos principais (`src/`)

| Arquivo | Papel |
| --- | --- |
| `api.ts` | Único lugar que conhece o endereço da API: guarda o token, trata erros e expõe login, registro e CRUD |
| `Login.tsx` | Tela de login e registro (um componente, dois modos) |
| `Tarefas.tsx` | Lista de tarefas: criar, concluir, excluir com confirmação e buscar com debounce |
| `App.tsx` | Decide entre `Login` e `Tarefas` conforme o usuário logado e é o dono da sessão |
| `index.css` | Liga o Tailwind e define o tema escuro |
