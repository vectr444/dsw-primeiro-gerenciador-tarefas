# Aula 09 — Banco de Dados em Nuvem, Turso e libSQL (04/11/2026)

## ✅ O que eu aprendi

Em hospedagem na nuvem o disco é efêmero: o contêiner é destruído e recriado a cada deploy, e o "tarefas.db" sumiria junto, com todos os usuários e tarefas. Nesta aula troquei o "better-sqlite3" pelo "@libsql/client", que fala com o Turso (um SQLite na nuvem) por HTTP e também abre um arquivo local com "file:./tarefas.db". As principais mudanças foram:

- Dependências: "npm uninstall better-sqlite3 @types/better-sqlite3" e "npm install @libsql/client". De quebra, a instalação deixou de depender de compilar módulo nativo (o problema do "node-gyp" que eu tive na aula 06).
- .env e "carregarEnv()": lê "TURSO_URL" e "TURSO_TOKEN" com "process.loadEnvFile" (Node 20.12 ou superior) e avisa no terminal se o arquivo foi salvo com BOM, que faz a primeira variável sumir sem erro. Chamei "carregarEnv()" antes de ler "PORT" e "JWT_SECRET", para o ".env" valer para eles também.
- Banco com fallback: com URL e token conecta no Turso; sem eles usa o arquivo local. O "exibirBannerBanco()" mostra o modo na subida (o token nunca é impresso).
- Schema com "db.batch([SQL_USUARIOS, SQL_TAREFAS], 'write')": o "execute()" roda um comando só e ignora o segundo em silêncio, e o "batch" é atômico. As tabelas ganharam "senha_hash", "descricao", "criado_em" e "atualizado_em".
- De síncrono para assíncrono: tudo virou "await db.execute({ sql, args })". "changes" virou "rowsAffected", e "lastInsertRowid" vem como bigint, então uso "Number(...)". Sem "db.prepare()", porque com banco remoto o custo está na rede. Os parâmetros "?" com "args" continuam, então SQL Injection continua barrado.
- Erros mais honestos: o login responde 500 (e não 401) se o banco falhar, o registro só responde 409 para conflito de chave única, e o "/api/health" agora faz "SELECT 1" e responde 503 se o banco não responder.
- "iniciarServidor()": só abre a porta depois de "await inicializarBanco()".
- Mantive o login comparando com um hash falso quando o e-mail não existe, para o tempo de resposta não revelar quais e-mails têm conta.
- O token do login agora vale 8 horas (era 2).

## 🧩 Principal dificuldade
Meu "tarefas.db" era da aula 08: a coluna se chamava "senha" (e não "senha_hash") e a tabela de tarefas não tinha "descricao" nem as datas. O "CREATE TABLE IF NOT EXISTS" não mexe em tabela que já existe, então o servidor novo quebraria. Além disso, o SQLite não aceita "ALTER TABLE ... ADD COLUMN ... DEFAULT CURRENT_TIMESTAMP", porque o valor não é constante.

## 🔧 Como eu resolvi
Escrevi a "migrarBancoAntigo()", que olha o "PRAGMA table_info", renomeia "senha" para "senha_hash" e adiciona as colunas que faltam sem DEFAULT, preenchendo as linhas antigas com um "UPDATE". Como as colunas novas ficam sem DEFAULT, os "INSERT" passaram a gravar "CURRENT_TIMESTAMP" explicitamente (sem isso as tarefas novas ficavam com data nula). Assim ninguém perde dados, e testei com uma cópia do meu banco antigo e com um banco vazio.

## 💡 Observações (opcional)
Ainda não conectei no Turso de verdade: para isso falta criar a conta e o banco e preencher o ".env" (o modelo está em ".env.example"). O caminho de erro foi testado com uma URL inválida e a mensagem explica o provável motivo (o Turso responde 404 tanto para URL quanto para token errado).
