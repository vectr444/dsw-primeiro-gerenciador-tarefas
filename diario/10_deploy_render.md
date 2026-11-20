# Aula 10 — Deploy no Render (11/11/2026)

## ✅ O que eu aprendi

Preparei o projeto para ser publicado no Render, com o front servido pelo back e o banco no Turso. A parte de código é pequena, mas é onde acontecem 90% dos erros de deploy em projeto com duas pastas ("node_modules" na raiz e em "web/"). As mudanças foram:

- package.json: o script "build" virou "npm --prefix web install && npm run build:web && tsc". O Render clona o repositório do zero e, como "node_modules" está no ".gitignore", o Vite não existe lá; sem esse "npm --prefix web install" o build do front falharia.
- "/api/db-check" no "server.ts": faz "SELECT 1", lista as tabelas pelo "sqlite_master" e conta as linhas de cada uma. Quando o login falha, ela diz se o problema é o banco ou a senha.
- render.yaml (infraestrutura como código): "buildCommand: npm install && npm run build", "startCommand: npm start" e o "healthCheckPath: /api/health". O "JWT_SECRET" usa "generateValue: true" (o Render inventa o segredo), e "TURSO_URL" e "TURSO_TOKEN" usam "sync: false", que são digitados no painel e nunca vão para o repositório.
- ".env.example": modelo com as variáveis (sem valores). O ".env" de verdade continua fora do Git.
- engines no package.json: "node": ">=20.12", por causa do "process.loadEnvFile".

Respostas ao "Diário de Bordo" (itens que dependem só de teoria):

1. Por que "npm --prefix web install" no build? Porque a nuvem começa sem "web/node_modules", e o "build:web" precisa do Vite e do React instalados.
2. Função do render.yaml e cuidado com "buildCommand" e "startCommand"? Descreve o serviço como código. O padrão do Render é só "npm install", que não gera o "web/dist" e leva à tela "Ainda não existe o build do front-end".
3. Por que "JWT_SECRET" pode ficar em branco e as do Turso não? O "generateValue" gera um segredo aleatório no primeiro deploy, e o valor não precisa ser conhecido por mim. A URL e o token são credenciais de um serviço externo, só existem no painel do Turso.
4. Para que serve "/api/db-check"? Confirma que o banco responde, que as tabelas "usuarios" e "tarefas" existem e quantas linhas têm.
5. Por que "npm run build" local antes do "git push"? Se quebrar na minha máquina, quebra no Render. É o teste mais barato.

6. O que aconteceu ao apertar F5 em "/tarefas" na URL pública? Carregou direto, sem 404, e continuei logado. Era o esperado: o Express devolve o "index.html" (SPA fallback) e o React desenha a tela certa pela URL.
7. Encontrei algum erro? Sim, e foi o primeiro: logo depois de criar o Web Service, só o "/api/health" respondia, e "/", "/tarefas" e "/api/db-check" davam "Cannot GET". Veja abaixo.

## 🧩 Principal dificuldade
O primeiro deploy rodava o código antigo: eu tinha criado as contas e o serviço no Render, mas as mudanças das aulas 08 a 10 ainda não estavam commitadas nem enviadas ao GitHub. O Render clona o repositório, então ele só conhece o que está lá. Por isso só existiam as rotas da versão antiga (health e version), sem a rota "/api/db-check" e sem entregar a tela.

## 🔧 Como eu resolvi
Fiz o commit e o "git push" para a "main", e o "autoDeploy" do Render publicou a versão nova. Depois conferi a URL pública: "/api/health" respondeu com "banco": "Turso / libSQL (nuvem)", o "/api/db-check" listou as tabelas "usuarios" e "tarefas", "/" e "/tarefas" abriram a tela do React, e "/api/typo" respondeu 404 em JSON. No navegador fiz login, criei uma tarefa e recarreguei a página, e a tarefa continuou lá, gravada no Turso.

## 💡 Observações (opcional)

