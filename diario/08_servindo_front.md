# Aula 08 — Servindo o Front pelo Back (28/10/2026)

## ✅ O que eu aprendi

Nesta aula o "server.ts" passou a entregar também o React. Antes eram duas origens (o Vite em :5173 e a API em :3000); agora, depois do "npm run build", é um processo só e um endereço só (:3000). Nenhuma rota da API mudou. As principais mudanças foram:

- Pasta do build em ESM: o projeto usa "type": "module", então não existe "__dirname". O caminho é reconstruído com "path.dirname(fileURLToPath(import.meta.url))" e guardado em "FRONT_DIST" e "FRONT_INDEX".
- As três peças, e a ordem delas é o mecanismo: (a) "app.use('/api', ...)" devolve 404 em JSON para rota de API que não existe; (b) "express.static(FRONT_DIST)" entrega o "index.html", os ".js" e o ".css" do build; (c) o SPA fallback devolve o "index.html" para qualquer outro caminho, para recarregar "/tarefas" não dar "não encontrado". Sem a (a), "GET /api/typo" cairia na (c) e voltaria HTML com status 200.
- Express 5: o curinga "*" não existe mais, então o fallback usa a regex "/(.*)/". O "app.use('/api')" casa por segmento, e "/apixyz" não é capturado por ele.
- Dois avisos de inicialização ("verificarFront"): build inexistente (a rota devolve 503 com o passo a passo) e build velho (a data do arquivo mais recente de "web/src" é comparada com a do "index.html"). O build velho é o pior, porque não dá erro nenhum: a tela abre e a minha alteração simplesmente não aparece.
- api.ts: "API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : ''". Em desenvolvimento o endereço é completo; no build ele vira vazio e o "fetch" usa o endereço da barra. O Vite troca o "DEV" por "true" ou "false" na hora do build, e conferi que o "localhost:3000" não aparece mais no JavaScript gerado.
- package.json: os atalhos "build:web" ("npm --prefix web run build") e "dev:web", para não precisar de "cd web".
- resquests.http: bloco 6 novo, com 6 requisições que conferem status e Content-Type (a diferença entre API e tela é sutil: todas parecem "200 OK").
- .gitignore: o da raiz que eu já tinha cobre "web/dist/", "node_modules", "*.db" e ".env", então não precisei criar outro.

Resposta à pergunta da aula, "preciso de CORS?": em desenvolvimento sim (origens diferentes, :5173 e :3000), em produção não (mesma origem). O "cors()" continua no código por causa do modo de desenvolvimento.

## 🧩 Principal dificuldade
Entender por que a ordem importa. Se o "express.static" ou o fallback viessem antes das rotas "/api", a API inteira devolveria HTML, e o front receberia "<!doctype" onde esperava JSON.

## 🔧 Como eu resolvi
Pensando na ordem como uma fila: cada peça só age se as anteriores não responderam. Por isso as rotas "/api" ficam primeiro, depois o 404 de API, depois os arquivos estáticos e, por último, o fallback. Os testes 6.1 a 6.6 do "resquests.http" provam isso.

## 💡 Observações (opcional)
Sempre que eu mudar algo em "web/src" e quiser ver pelo :3000, preciso rodar "npm run build:web" de novo. Para editar, o melhor é o modo de dois terminais ("npm run dev" e "npm run dev:web"), que recarrega ao salvar.
