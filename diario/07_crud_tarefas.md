# Aula 07 — CRUD de Tarefas no React (21/10/2026)

## ✅ O que eu aprendi

Nesta aula criei a tela de lista de tarefas, que consome o CRUD protegido por JWT que já existia no back-end. Não foi preciso escrever nenhuma rota nova: o "api.ts" da aula anterior já tinha as quatro funções. As principais mudanças foram:

- Tarefas.tsx: componente novo com cabeçalho (e-mail e botão Sair), formulário de criação, campo de busca, lista com contador e modal de exclusão.
- Tipos vindos do contrato: "Prioridade = Tarefa['prioridade']" e "Status = Tarefa['status']" são derivados do "api.ts". Se o back mudar os valores aceitos, o TypeScript avisa.
- Tradução sem quebrar o contrato: o banco guarda "low/medium/high", e a tela mostra "Baixa/Média/Alta" por um dicionário "Record<Prioridade, string>". O "value" do select e o que vai para a API continuam em inglês.
- Busca com dois estados e debounce: "busca" muda a cada tecla e "buscaAplicada" é o que vai para a API. Um efeito espera 400 ms sem digitar antes de aplicar a busca, e um "useRef" ("ultimaBusca") evita buscar e marcar "carregando" quando nada mudou de verdade.
- Respostas fora de ordem: o contador "requisicaoAtual" (um "useRef") dá um número a cada requisição, e só a mais recente pode atualizar a lista. O efeito de dados ainda tem a flag "montado" na função de limpeza.
- Criar, concluir e excluir: depois de cada ação a tela chama "carregar()" para reler a lista do banco. Concluir e reabrir usam PATCH, que manda só "{ status }".
- Modal de exclusão: guarda a tarefa pendente em "paraExcluir" e só exclui no botão de confirmar. Ele tem "role='dialog'", "aria-modal", foco no botão de confirmar, fecha com Esc e ao clicar no fundo ("stopPropagation" no cartão evita fechar ao clicar dentro dele).
- App.tsx: agora renderiza "<Tarefas />" quando há usuário. O "aoSair", que apaga o token, continua no App, o dono da sessão.
- Limpeza do repositório: apaguei os arquivos antigos e sem uso, que ficaram de aulas anteriores e não eram mais importados por nada: "Tarefa.tsx", "types.ts" e "App_v04.tsx" (em "web/src"), e "index.html", "bkp_index.txt", "tailwindCSS.html", "Desafio_aulas_3e4.html" e "tailwind.config.js" (na raiz). Antes de apagar conferi que nenhum código dependia deles, e o "npm run lint" e o "tsc" continuaram sem erros. Eles continuam no histórico do Git.
- resquests.http: atualizei com a versão do PDF, que tem 38 requisições organizadas em 5 blocos (serviço no ar, autenticação, CRUD, segurança e isolamento entre usuários).

## 🧩 Principal dificuldade
O ponto mais delicado foi a busca. A versão ingênua (um "useState" mais um "useEffect" com "[]") parece certa, mas o campo não faz nada: o efeito roda só na montagem e lê o "search" vazio do closure. Além disso, existe uma armadilha no debounce: o efeito também roda na montagem, e se o timer marcasse "carregando" sem haver uma requisição nova para desligar a flag, a lista apareceria por um instante e sumiria, presa em "Carregando...".

## 🔧 Como eu resolvi
Separei o texto digitado do termo aplicado em dois estados, coloquei o debounce no primeiro efeito e a busca de dados no segundo, com "buscaAplicada" no array de dependências. A guarda "if (termo === ultimaBusca.current) return" impede o "carregando" eterno. O estado só é alterado dentro do ".then" do efeito, e não no corpo dele, que é o padrão recomendado pelo React para buscar dados e evita um render em cascata.

## 💡 Observações (opcional)
"npm run lint" e "npm run build" em "web" passam sem erros, assim como o "npm run build" da raiz. Para ver a tela funcionando são necessários os dois terminais (back-end na porta 3000 e front na 5173), e o back-end exige o "better-sqlite3" instalado. O usuário "admin@senai.com" só consegue entrar em um banco criado depois da correção do seed com bcrypt; um "tarefas.db" antigo precisa ser apagado. A busca diferencia acentos: "cafe" não encontra "café".
