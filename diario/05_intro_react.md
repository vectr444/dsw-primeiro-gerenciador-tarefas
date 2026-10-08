# Aula 05 — Introdução ao React (07/10/2026)

## ✅ O que eu aprendi

Nesta aula comecei o front-end do gerenciador de tarefas em React, consumindo a API que já estava pronta. As principais mudanças foram:

- Projeto "web": criado com "npm create vite@latest web -- --template react-ts" e ESLint como linter. Substitui o "meu-primeiro-app", um teste em JavaScript que eu tinha feito antes e removi.
- Componente Saudacao: primeiro componente, uma função que retorna JSX e é usada no App como se fosse uma tag HTML.
- Estado com useState: o contador guarda o número de cliques e re-renderiza a tela a cada "setN". O argumento de useState é só o valor inicial.
- useEffect com fetch: ao carregar a página, o App chama "/api/health" do back-end e atualiza a mensagem de status. O array de dependências vazio ("[]") faz isso rodar uma única vez.
- Lista com map(): um array de tarefas simuladas vira uma lista de "<li>" com "tarefas.map". Cada item recebe um "key" único (o id).
- CORS no back-end: instalei "cors" e "@types/cors" e adicionei "app.use(cors())" no server.ts logo depois de criar o app.

Também fiz os três desafios de curiosidade:

- Variável sem uso: com "const coisa = 123;", o "npm run lint" acusou "'coisa' is assigned a value but never used" (regra no-unused-vars).
- useState(10): o contador passa a começar em 10. A tela "lembra" o valor porque o React guarda o estado fora da função do componente e o devolve a cada nova renderização.
- Sem app.use(cors()): o servidor continua respondendo 200, mas a resposta perde o cabeçalho "Access-Control-Allow-Origin". Quem bloqueia é o navegador, que esconde os dados da página. Com a linha de volta, o cabeçalho reaparece com "*".

## 🧩 Principal dificuldade
O PDF pede um projeto TypeScript em uma pasta "web", mas o que eu tinha era um projeto JavaScript com outro nome. Além disso, ao criar o projeto sem responder as perguntas do terminal, o Vite escolheu o Oxlint em vez do ESLint, e não gerou o eslint.config.js.

## 🔧 Como eu resolvi
Removi o "meu-primeiro-app" e criei o "web" do zero. Para forçar o ESLint, usei a flag "--eslint" do create-vite. No App.tsx troquei ".catch(err => ...)" por ".catch(() => ...)", porque o "err" não era usado e o lint reclamaria.

## 💡 Observações (opcional)
Para ver tudo funcionando são necessários dois terminais: o back-end com "npm run dev" na raiz (porta 3000) e o front com "npm run dev" dentro de "web" (porta 5173). O CORS existe porque as duas portas são origens diferentes. A lista de tarefas ainda é um array fixo; no próximo passo ela vai vir da API, por um arquivo api.ts.
