# Aula 06 — Tela de Login e Registro no React (14/10/2026)

## ✅ O que eu aprendi

Nesta aula fechei o ciclo de autenticação: o usuário digita e-mail e senha na tela do React e entra de verdade no sistema, usando o JWT que o back-end já devolvia desde a aula 04. As principais mudanças foram:

- Tailwind CSS v4: instalei "tailwindcss" e "@tailwindcss/vite" com "-D" (são ferramentas de desenvolvimento) dentro de "web". O plugin entra no "vite.config.ts", o "index.css" passou a ter só o '@import "tailwindcss"' e o tema escuro no "body", e o "index.html" ganhou "lang='pt-BR'" e "class='dark'". No v4 não existe mais "tailwind.config.js".
- api.ts: é o único arquivo do front que conhece o endereço da API. Ele guarda o token no localStorage (chave "gestor:token"), monta o header "Authorization: Bearer ..." em "authHeaders()" e tem "login", "registrar" e as quatro funções do CRUD já prontas para a próxima aula.
- tratarResposta: lê a resposta e, se der erro, lança um "Error" com a mensagem que o servidor mandou ("{ error: ... }"). Assim o "catch" do componente funciona sem checar dois casos. Em arquivo ".ts" o genérico precisa ser escrito "<T,>" para o TypeScript não confundir com uma tag JSX.
- getUsuario: decodifica o payload do JWT (Base64Url, trocando "-" por "+" e "_" por "/") só para mostrar o e-mail na tela, e limpa o token se ele estiver corrompido ou vencido.
- Login.tsx: um único componente para as duas telas. O estado "modo" ("login" ou "registro") decide qual rota chamar. No registro ele chama "registrar" e depois "login", então quem cria a conta já entra.
- App.tsx: "useState(() => getUsuario())" lê o token só uma vez, e "logado" é derivado ("usuario !== null"), em vez de ser um segundo estado que poderia ficar fora de sincronia.
- Limpeza: apaguei "App.css" e a pasta "assets/", que eram exemplo do Vite e não eram mais usados. Também descomentei o "import './index.css'" do "main.tsx", que estava comentado: sem ele o Tailwind não é carregado.
- Back-end (server.ts): o seed do usuário admin passou pelo "bcrypt.hashSync" antes de ser gravado (antes ele ia em texto puro e nunca conseguia logar, pois o login usa "compareSync"), e as rotas de registro e login passaram a usar "req.body ?? {}", para que uma requisição sem corpo devolva 400 em vez de estourar com 500.

Respostas às perguntas do diário:

1. O que um try / catch / finally resolve que um try / catch sozinho não resolve? O "finally" roda tanto no sucesso quanto no erro. No login ele garante o "setCarregando(false)": sem ele, um erro deixaria o botão travado em "Aguarde..." para sempre, e eu teria que repetir a linha no "try" e no "catch".
2. Por que o botão de trocar de modo precisa de type="button"? Dentro de um "form", um "button" sem "type" é "submit". Clicar em "Não tem conta? Registre-se" enviaria o formulário e recarregaria a página, apagando o que foi digitado.
3. O que aconteceria se eu confiasse no getUsuario() para decidir se o usuário pode acessar /api/tasks? Seria uma falha grave, porque decodificar não é validar: o payload do JWT é só Base64 e qualquer pessoa pode ler ou até montar um token falso com o id de outro usuário. Quem confere a assinatura e decide o acesso é o "authenticate" do server.ts. O front usa o token apenas para exibir o e-mail.
4. Qual foi o erro mais difícil de resolver no meu ambiente? Veja a seção abaixo.

## 🧩 Principal dificuldade
Ao clonar o repositório em uma pasta nova e rodar "npm install" na raiz, a instalação do "better-sqlite3" falhou: ele não achou um binário pronto para a minha versão do Node e tentou compilar com o "node-gyp", que exige Python e as ferramentas de build do Visual Studio. Sem ele o back-end não sobe.

## 🔧 Como eu resolvi
Para conferir os tipos do back-end sem compilar o módulo nativo, usei "npm install --ignore-scripts", que instala os pacotes (e os tipos que o "tsc" precisa) sem rodar o script de compilação. Com isso o "npm run build" da raiz e o "npm run lint" e "npm run build" de "web" passam sem erro. Para rodar o back-end de fato continua sendo necessário ter um ambiente onde o "better-sqlite3" instale (Python e build tools, ou outra versão do Node com binário pronto).

## 💡 Observações (opcional)
Existem dois diários para o dia 14/10: este, sobre o conteúdo do PDF "06_tela_login", e o "14-10-2026.md", que registra o exercício em sala de tipar o front com TypeScript. O token expira em 2 horas, então depois disso o "getUsuario" limpa o storage e o app volta sozinho para a tela de login.
