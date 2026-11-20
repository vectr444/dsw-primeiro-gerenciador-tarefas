import express, { type Request, type Response, type NextFunction } from "express";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
app.use(cors()); // Libera o CORS (necessario em desenvolvimento: Vite :5173 -> API :3000)

// O projeto usa "type": "module" (ESM). Nesse modo nao existe a variavel
// __dirname do Node antigo: o caminho e reconstruido a partir de import.meta.url.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Aula 09 -- Variaveis de ambiente (.env)
// Precisa vir ANTES de qualquer leitura de process.env (PORT, JWT_SECRET, TURSO_*).
// ============================================================================
const ARQUIVO_ENV = path.join(__dirname, ".env");

/**
 * Carrega o arquivo .env com verificacao defensiva contra BOM no Windows.
 * Se o arquivo tiver a marca BOM (invisivel), a primeira variavel e ignorada
 * em silencio; por isso avisamos no terminal.
 */
function carregarEnv(): void {
    if (!fs.existsSync(ARQUIVO_ENV)) return;

    const bruto = fs.readFileSync(ARQUIVO_ENV);
    if (bruto.length >= 3 && bruto[0] === 0xef && bruto[1] === 0xbb && bruto[2] === 0xbf) {
        console.warn(
            "\n[ATENÇÃO] O seu .env foi salvo COM BOM (marca de bytes 0xEF 0xBB 0xBF).\n" +
            "          Consequência: a PRIMEIRA variável do arquivo é ignorada sem erro.\n" +
            "          Salve de novo em UTF-8 SEM BOM e confira se a primeira\n" +
            "          variável é mesmo a TURSO_URL.\n",
        );
    }
    // Quem ja estiver no ambiente do sistema (ex.: Render) tem prioridade sobre o .env
    process.loadEnvFile(ARQUIVO_ENV);
}

carregarEnv();

const PORT = Number(process.env.PORT) || 3000;

// Segredo usado para assinar os tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || "super_secreto_desenvolvimento";
if (!process.env.JWT_SECRET) {
    console.warn(
        "[ATENÇÃO] JWT_SECRET não definido: usando o segredo de desenvolvimento.\n" +
        "          Em produção (Render) defina um segredo próprio.",
    );
}

// ============================================================================
// Aula 08 -- Onde esta o build do front (web/dist) e avisos de inicializacao
// ============================================================================

/** Pasta que o `npm run build` do Vite cria dentro de web/. */
const FRONT_DIST = path.join(__dirname, "web", "dist");

/** O arquivo de entrada que o SPA fallback entrega. */
const FRONT_INDEX = path.join(FRONT_DIST, "index.html");

/**
 * Resposta para quando a pasta web/dist ainda nao existe. "Cannot GET /" nao
 * ajuda ninguem a descobrir que faltou um build; esta mensagem diz o que fazer.
 */
const SEM_BUILD = [
    "Ainda não existe o build do front-end.",
    "",
    "Procurei este arquivo:",
    `  ${FRONT_INDEX}`,
    "",
    "Gere-o com:",
    "  cd web",
    "  npm install",
    "  npm run build",
    "",
    "Enquanto isso, a API continua funcionando em /api/health.",
].join("\n");

/** Data de modificacao mais recente de uma pasta (olha as subpastas tambem). */
function maisRecente(dir: string): number {
    let maior = 0;

    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
        const caminho = path.join(dir, entrada.name);

        if (entrada.isDirectory()) {
            maior = Math.max(maior, maisRecente(caminho));
        } else {
            maior = Math.max(maior, fs.statSync(caminho).mtimeMs);
        }
    }

    return maior;
}

/** Os dois avisos de inicializacao: build inexistente e build velho. */
function verificarFront(): void {
    if (!fs.existsSync(FRONT_INDEX)) {
        console.warn("\n[ATENÇÃO] " + SEM_BUILD + "\n");
        return;
    }

    const fontes = path.join(__dirname, "web", "src");
    const temFontes = fs.existsSync(fontes);

    if (temFontes && maisRecente(fontes) > fs.statSync(FRONT_INDEX).mtimeMs) {
        console.warn(
            "\n[ATENÇÃO] O build do front está VELHO: algum arquivo de web/src " +
            "mudou depois do último `npm run build`.\n" +
            "          Rode `npm run build:web` para ver a mudança.\n",
        );
    }
}

// ============================================================================
// Tipos e regras de validacao
// ============================================================================

// 1. "Moldes" (Interfaces) das linhas do banco
interface Tarefa {
    id: number;
    usuario_id: number;
    titulo: string;
    descricao: string | null;
    status: "pending" | "completed";
    prioridade: "low" | "medium" | "high";
    criado_em: string;
    atualizado_em: string;
}

interface Usuario {
    id: number;
    email: string;
    senha_hash: string;
    criado_em: string;
}

// Requisição autenticada: o middleware injeta o ID do usuário após validar o token
interface AuthRequest extends Request {
    usuarioId?: number;
}

// 2. Centralizamos as regras. Se a regra mudar, mudamos em um so lugar!
const PRIORIDADES = ["low", "medium", "high"] as const;
const STATUS_VALIDOS = ["pending", "completed"] as const;

// 3. Funcoes ajudantes (Helpers). Escrevemos a validacao uma vez e usamos em todo lugar.
const tituloValido = (t: unknown): t is string =>
    typeof t === "string" && t.trim().length >= 3;

const normalizarPrioridade = (p: unknown) => {
    const listaPrioridades = PRIORIDADES as readonly string[];
    return typeof p === "string" && listaPrioridades.includes(p)
        ? p
        : "medium";
};

const normalizarStatus = (s: unknown) => {
    const listaStatus = STATUS_VALIDOS as readonly string[];
    return typeof s === "string" && listaStatus.includes(s)
        ? s
        : "pending";
};

// 4. Um ajudante so para transformar e validar IDs
const parsearId = (idParam: string | string[]): number | null => {
    if (typeof idParam !== "string") return null;
    const id = Number(idParam);
    // Number("12abc") vira NaN imediatamente, o que e mais seguro!
    return isNaN(id) ? null : id;
};

// Middleware para ler o corpo das requisições em formato JSON
app.use(express.json());

// ============================================================================
// Aula 09 -- Banco de dados: Turso (nuvem) ou arquivo local (fallback)
// ============================================================================
const TURSO_URL = process.env.TURSO_URL;
const TURSO_TOKEN = process.env.TURSO_TOKEN;

const usandoNuvem = Boolean(TURSO_URL && TURSO_TOKEN);
const MODO_BANCO = usandoNuvem ? "Turso / libSQL (nuvem)" : "arquivo local (SQLite)";

// Com URL e token conecta no Turso; senão usa um arquivo local (sem internet/conta).
const db = createClient({
    url: usandoNuvem ? TURSO_URL! : "file:./tarefas.db",
    authToken: usandoNuvem ? TURSO_TOKEN : undefined,
});

/** Mostra no terminal em que modo o banco esta operando, sem adivinhacoes. */
function exibirBannerBanco(): void {
    console.log("============================================================");
    console.log("  Banco de dados");
    console.log("------------------------------------------------------------");
    console.log(`  Modo  : ${MODO_BANCO}`);
    console.log(`  Onde  : ${usandoNuvem ? TURSO_URL : path.resolve("tarefas.db")}`);
    console.log(`  Token : ${usandoNuvem ? "presente (nunca será mostrado)" : "não informado"}`);
    if (!usandoNuvem) {
        console.log("  Para usar o Turso, crie um arquivo .env na raiz com:");
        console.log("    TURSO_URL=libsql://seu-banco.turso.io");
        console.log("    TURSO_TOKEN=seu-token");
    }
    console.log("============================================================");
}

const SQL_USUARIOS = `
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`;

const SQL_TAREFAS = `
    CREATE TABLE IF NOT EXISTS tarefas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        titulo TEXT NOT NULL,
        descricao TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        prioridade TEXT NOT NULL DEFAULT 'medium',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
    );
`;

/** Verifica (PRAGMA table_info) se a tabela ja tem a coluna. Os nomes sao constantes do codigo. */
async function temColuna(tabela: string, coluna: string): Promise<boolean> {
    const { rows } = await db.execute(`PRAGMA table_info(${tabela})`);
    return rows.some((linha) => linha.name === coluna);
}

/**
 * Atualiza um banco criado pelas aulas anteriores (tabelas da Aula 08, com a
 * coluna "senha" e sem descricao/datas). O CREATE TABLE IF NOT EXISTS nao mexe
 * em tabelas que ja existem, entao as diferencas sao corrigidas aqui, sem
 * perder nenhum usuario ou tarefa.
 *
 * Detalhe do SQLite: ALTER TABLE ... ADD COLUMN nao aceita DEFAULT
 * CURRENT_TIMESTAMP (valor nao constante). Por isso a coluna nasce sem DEFAULT
 * e depois as linhas antigas sao preenchidas com um UPDATE.
 */
async function migrarBancoAntigo(): Promise<void> {
    if ((await temColuna("usuarios", "senha")) && !(await temColuna("usuarios", "senha_hash"))) {
        await db.execute("ALTER TABLE usuarios RENAME COLUMN senha TO senha_hash");
        console.log("  Coluna usuarios.senha renomeada para senha_hash.");
    }

    const colunasNovas: Array<[tabela: string, coluna: string, tipo: string]> = [
        ["usuarios", "criado_em", "DATETIME"],
        ["tarefas", "descricao", "TEXT"],
        ["tarefas", "criado_em", "DATETIME"],
        ["tarefas", "atualizado_em", "DATETIME"],
    ];

    for (const [tabela, coluna, tipo] of colunasNovas) {
        if (await temColuna(tabela, coluna)) continue;

        await db.execute(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipo}`);
        if (tipo === "DATETIME") {
            await db.execute(`UPDATE ${tabela} SET ${coluna} = CURRENT_TIMESTAMP WHERE ${coluna} IS NULL`);
        }
        console.log(`  Coluna ${tabela}.${coluna} adicionada.`);
    }
}

async function inicializarBanco(): Promise<void> {
    try {
        // O execute() so roda UM comando: o segundo seria ignorado em silencio.
        // Para varios comandos usamos batch(), que alem disso e atomico.
        await db.batch([SQL_USUARIOS, SQL_TAREFAS], "write");

        await migrarBancoAntigo();

        // Usuário inicial padrão para facilitar o login em laboratório
        const adminEmail = "admin@senai.com";
        const { rows } = await db.execute({
            sql: "SELECT id FROM usuarios WHERE email = ?",
            args: [adminEmail],
        });

        if (rows.length === 0) {
            // A senha precisa passar pelo bcrypt: o /login compara com hash.
            const hash = await bcrypt.hash("senha_super_secreta_123", 10);
            await inserirUsuario(adminEmail, hash);
        }
    } catch (erro) {
        const e = erro as { code?: string; message?: string };
        console.error("\n[ERRO] Não consegui preparar o banco de dados.");
        console.error(`  Modo   : ${MODO_BANCO}`);
        console.error(`  Onde   : ${usandoNuvem ? TURSO_URL : path.resolve("tarefas.db")}`);
        console.error(`  Código : ${e?.code || "DESCONHECIDO"}`);
        console.error(`  Detalhe: ${e?.message}`);
        if (usandoNuvem) {
            console.error("  O Turso devolve HTTP 404 tanto para URL errada quanto para token errado.");
            console.error("  Confira se a TURSO_URL não tem barra no final e se o TURSO_TOKEN está completo.\n");
        }
        process.exit(1);
    }
}

// ============================================================================
// Helpers de consulta (assincronos). Sempre com "?" + args: NUNCA concatenamos
// variaveis no SQL (protecao contra SQL Injection).
// Sem db.prepare(): com banco remoto o custo esta na rede, nao em compilar o SQL.
// ============================================================================
function primeiraLinha<T>(rows: unknown[]): T | undefined {
    return rows[0] as T | undefined;
}

const buscarUsuarioPorEmail = (email: string) =>
    db.execute({ sql: "SELECT * FROM usuarios WHERE email = ?", args: [email] });

// As datas sao gravadas explicitamente: em bancos migrados da Aula 08 as colunas
// novas nao tem DEFAULT (o SQLite nao aceita CURRENT_TIMESTAMP em ALTER TABLE).
const inserirUsuario = (email: string, senhaHash: string) =>
    db.execute({
        sql: "INSERT INTO usuarios (email, senha_hash, criado_em) VALUES (?, ?, CURRENT_TIMESTAMP)",
        args: [email, senhaHash],
    });

const listarTarefasDoUsuario = (usuarioId: number, search?: string) => {
    if (search) {
        // O '%' entra DEPOIS, apenas dentro do parametro
        return db.execute({
            sql: `SELECT * FROM tarefas
                  WHERE usuario_id = ? AND (titulo LIKE ? OR descricao LIKE ?)
                  ORDER BY id DESC`,
            args: [usuarioId, `%${search}%`, `%${search}%`],
        });
    }
    return db.execute({
        sql: "SELECT * FROM tarefas WHERE usuario_id = ? ORDER BY id DESC",
        args: [usuarioId],
    });
};

const buscarTarefaPorIdEUsuario = (id: number, usuarioId: number) =>
    db.execute({
        sql: "SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?",
        args: [id, usuarioId],
    });

const inserirTarefa = (titulo: string, prioridade: string, usuarioId: number) =>
    db.execute({
        sql: `INSERT INTO tarefas (titulo, status, prioridade, usuario_id, criado_em, atualizado_em)
              VALUES (?, 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [titulo, prioridade, usuarioId],
    });

const deletarTarefaPorIdEUsuario = (id: number, usuarioId: number) =>
    db.execute({
        sql: "DELETE FROM tarefas WHERE id = ? AND usuario_id = ?",
        args: [id, usuarioId],
    });

// Middleware de Autenticação: barra quem não tem um token JWT válido
const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token ausente ou mal formatado." });
    }

    const token = header.split(" ")[1]; // Pega só o token após a palavra 'Bearer'

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { id: number };
        req.usuarioId = payload.id; // Injeta o id no req para a rota usar
        next(); // Tudo certo! Segue para a rota.
    } catch {
        return res.status(401).json({ error: "Token inválido ou expirado." });
    }
};

// ============================================================================
// ROTAS DE SERVICO
// ============================================================================

// Health check de verdade: executa SELECT 1 no banco. Se ele nao responder, 503.
app.get("/api/health", async (_req: Request, res: Response) => {
    try {
        await db.execute("SELECT 1");
        return res.json({
            status: "ok",
            message: "Servidor do Gestor de Tarefas ativo!",
            banco: MODO_BANCO,
        });
    } catch {
        return res.status(503).json({
            status: "erro",
            message: "O servidor está no ar, mas o banco de dados não respondeu.",
            banco: MODO_BANCO,
        });
    }
});

app.get("/api/version", (_req: Request, res: Response) => {
    res.json({ appName: "Gerenciador de Tarefas Multi-Usuário", version: "2.0.0" });
});

// Aula 10 -- Diagnostico do deploy: o banco esta conectado? As tabelas existem? Quantas linhas?
app.get("/api/db-check", async (_req: Request, res: Response) => {
    try {
        await db.execute("SELECT 1");
        const { rows: tabelas } = await db.execute({
            sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        });
        const nomes = tabelas.map((t) => String(t.name));
        const contagem: Record<string, number> = {};
        for (const nome of nomes) {
            // O nome vem do proprio banco (sqlite_master), nao do usuario.
            const { rows } = await db.execute(`SELECT COUNT(*) AS total FROM "${nome}"`);
            contagem[nome] = Number(rows[0].total);
        }
        return res.json({ ok: true, tabelas: nomes, contagem });
    } catch (erro) {
        const e = erro as { message?: string };
        return res.status(503).json({ ok: false, erro: e?.message || "Falha ao consultar banco" });
    }
});

// ============================================================================
// ROTAS DE AUTENTICAÇÃO
// ============================================================================

// Cadastro: 409 APENAS para conflito real de UNIQUE
app.post("/api/auth/register", async (req: Request, res: Response) => {
    // Sem o header Content-Type: application/json, req.body chega undefined
    const { email, senha } = req.body ?? {};

    if (typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "E-mail inválido." });
    }
    if (typeof senha !== "string" || senha.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
    }

    // Criando a "impressão digital" da senha
    const hash = await bcrypt.hash(senha, 10);

    try {
        const resultado = await inserirUsuario(email.trim(), hash);
        // lastInsertRowid chega como bigint: convertemos para number
        const idInserido = Number(resultado.lastInsertRowid);

        return res.status(201).json({
            message: "Usuário cadastrado com sucesso!",
            user: { id: idInserido, email: email.trim() },
        });
    } catch (erro) {
        const e = erro as { code?: string };
        // Só é 409 se for violação de chave única (SQLITE_CONSTRAINT...)
        if (String(e?.code).startsWith("SQLITE_CONSTRAINT")) {
            return res.status(409).json({ error: "E-mail já cadastrado." });
        }
        return res.status(500).json({ error: "Não foi possível cadastrar agora. Tente de novo." });
    }
});

// Login: banco fora do ar é 500, e não "credenciais inválidas" (401)
app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, senha } = req.body ?? {};

    if (typeof email !== "string" || typeof senha !== "string") {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    let usuario: Usuario | undefined;
    try {
        const { rows } = await buscarUsuarioPorEmail(email.trim());
        usuario = primeiraLinha<Usuario>(rows);
    } catch {
        return res.status(500).json({ error: "Não foi possível entrar agora. Tente de novo." });
    }

    // Compara SEMPRE com hash (mesmo se usuário não existir) para evitar vazamento
    const hashEsperado = usuario?.senha_hash ?? "$2a$10$fakehashparanaquebrarcomparacao";
    const senhaOk = await bcrypt.compare(senha, hashEsperado);
    if (!usuario || !senhaOk) {
        return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Gerando o "Crachá" de acesso
    const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, {
        expiresIn: "8h",
    });
    return res.json({ token });
});

// ============================================================================
// ROTAS DE TAREFAS
// ============================================================================

app.get("/api/tasks", authenticate, async (req: AuthRequest, res: Response) => {
    const usuarioId = req.usuarioId!; // Garantido pelo middleware authenticate

    // Coercao Segura: se tentarem enviar um Array, usamos a string vazia
    const search = typeof req.query.search === "string" ? req.query.search : "";

    try {
        const { rows } = await listarTarefasDoUsuario(usuarioId, search || undefined);
        return res.json(rows);
    } catch {
        // Erro Controlado: mensagem generica para nao vazar a estrutura do banco
        return res.status(500).json({ error: "Erro interno ao processar a listagem." });
    }
});

app.post("/api/tasks", authenticate, async (req: AuthRequest, res: Response) => {
    const usuarioId = req.usuarioId!;
    const { titulo, prioridade } = req.body ?? {};
    const prioridadeValida = normalizarPrioridade(prioridade);

    // Validação via helper (type guard)
    if (!tituloValido(titulo)) {
        return res.status(400).json({
            error: "O título da tarefa é obrigatório e deve conter pelo menos 3 caracteres válidos."
        });
    }

    try {
        const resultado = await inserirTarefa(titulo.trim(), prioridadeValida, usuarioId);
        const { rows } = await buscarTarefaPorIdEUsuario(Number(resultado.lastInsertRowid), usuarioId);
        return res.status(201).json(primeiraLinha<Tarefa>(rows));
    } catch {
        return res.status(500).json({ error: "Erro ao processar persistência" });
    }
});

// Rota para deletar fisicamente uma tarefa do banco
app.delete("/api/tasks/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const usuarioId = req.usuarioId!;
    // Validação de ID padronizada (igual PUT/PATCH)
    const idParaDeletar = parsearId(req.params.id);
    if (idParaDeletar === null) {
        return res.status(400).json({ error: "ID inválido." });
    }

    try {
        const resultado = await deletarTarefaPorIdEUsuario(idParaDeletar, usuarioId);
        // rowsAffected (libSQL) substitui o "changes" do better-sqlite3
        if (resultado.rowsAffected === 0) {
            return res.status(404).json({ error: "Tarefa não localizada para exclusão." });
        }
        return res.json({ message: "Tarefa excluída com sucesso!" });
    } catch {
        return res.status(500).json({ error: "Erro interno ao processar a exclusão." });
    }
});

// A Rota PUT atualiza uma tarefa existente com validações estritas
app.put("/api/tasks/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const usuarioId = req.usuarioId!;
    const idParaAtualizar = parsearId(req.params.id);
    if (idParaAtualizar === null) {
        return res.status(400).json({ error: "ID inválido." });
    }

    const { titulo, prioridade, status } = req.body ?? {};

    // Validação via helpers
    if (!tituloValido(titulo)) {
        return res.status(400).json({
            error: "O título da tarefa é obrigatório e deve conter pelo menos 3 caracteres válidos."
        });
    }

    const prioridadeValida = normalizarPrioridade(prioridade);
    const statusValido = normalizarStatus(status);

    try {
        const resultado = await db.execute({
            sql: `UPDATE tarefas
                  SET titulo = ?, status = ?, prioridade = ?, atualizado_em = CURRENT_TIMESTAMP
                  WHERE id = ? AND usuario_id = ?`,
            args: [titulo.trim(), statusValido, prioridadeValida, idParaAtualizar, usuarioId],
        });

        if (resultado.rowsAffected === 0) {
            return res.status(404).json({ message: "Tarefa não encontrada para atualização!" });
        }

        const { rows } = await buscarTarefaPorIdEUsuario(idParaAtualizar, usuarioId);
        return res.status(200).json(primeiraLinha<Tarefa>(rows));
    } catch {
        return res.status(500).json({ error: "Erro ao processar a atualização no banco de dados." });
    }
});

// A Rota PATCH executa atualizações parciais com validações sob demanda
app.patch("/api/tasks/:id", authenticate, async (req: AuthRequest, res: Response) => {
    const usuarioId = req.usuarioId!;
    const idParaAtualizar = parsearId(req.params.id);
    if (idParaAtualizar === null) {
        return res.status(400).json({ error: "ID inválido." });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: "Nenhum campo fornecido para atualização." });
    }

    const { titulo, prioridade, status } = req.body;

    try {
        const { rows: existentes } = await buscarTarefaPorIdEUsuario(idParaAtualizar, usuarioId);
        const tarefaExistente = primeiraLinha<Tarefa>(existentes);
        if (!tarefaExistente) {
            return res.status(404).json({ message: "Tarefa não encontrada para atualização parcial!" });
        }

        const camposParaAtualizar: string[] = [];
        const valoresParaAtualizar: Array<string | number> = [];

        // Título (se enviado)
        if (titulo !== undefined) {
            if (!tituloValido(titulo)) {
                return res.status(400).json({ error: "O título da tarefa deve conter pelo menos 3 caracteres válidos." });
            }
            camposParaAtualizar.push("titulo = ?");
            valoresParaAtualizar.push(titulo.trim());
        }

        // Prioridade (se enviada)
        if (prioridade !== undefined) {
            if (!PRIORIDADES.includes(prioridade as typeof PRIORIDADES[number])) {
                return res.status(400).json({ error: "Prioridade inválida. Use 'low', 'medium' ou 'high'." });
            }
            camposParaAtualizar.push("prioridade = ?");
            valoresParaAtualizar.push(prioridade);
        }

        // Status (se enviado)
        if (status !== undefined) {
            if (!STATUS_VALIDOS.includes(status as typeof STATUS_VALIDOS[number])) {
                return res.status(400).json({ error: "Status inválido. Use 'pending' ou 'completed'." });
            }
            camposParaAtualizar.push("status = ?");
            valoresParaAtualizar.push(status);
        }

        if (camposParaAtualizar.length === 0) {
            return res.status(200).json(tarefaExistente);
        }

        // Query dinâmica SEGURA: só os NOMES das colunas vêm do código; os valores vão em args
        camposParaAtualizar.push("atualizado_em = CURRENT_TIMESTAMP");
        const sql = `UPDATE tarefas SET ${camposParaAtualizar.join(", ")} WHERE id = ? AND usuario_id = ?`;
        valoresParaAtualizar.push(idParaAtualizar, usuarioId);

        await db.execute({ sql, args: valoresParaAtualizar });

        const { rows } = await buscarTarefaPorIdEUsuario(idParaAtualizar, usuarioId);
        return res.status(200).json(primeiraLinha<Tarefa>(rows));
    } catch {
        return res.status(500).json({ error: "Erro ao processar a atualização parcial no banco." });
    }
});

// ============================================================================
// Aula 08 -- Servindo o front (React) pelo back. A ORDEM a -> b -> c e o mecanismo:
// cada peca so age quando as anteriores nao responderam. Nunca antes das rotas /api.
// ============================================================================

// (a) Rota de API que nao existe responde 404 em JSON (e nao HTML com status 200).
//     O "/api" casa por segmento: "/apixyz" NAO cai aqui.
app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "Rota de API não encontrada." });
});

// (b) Arquivos gerados pelo `npm run build` do Vite em web/dist (html, js, css, imagens)
app.use(express.static(FRONT_DIST));

// (c) SPA fallback: qualquer outro caminho e rota do React; devolvemos o index.html.
//     No Express 5 o curinga "*" nao existe mais: usamos a regex /(.*)/.
app.get(/(.*)/, (_req: Request, res: Response) => {
    if (!fs.existsSync(FRONT_INDEX)) {
        return res.status(503).type("text/plain").send(SEM_BUILD);
    }

    return res.sendFile(FRONT_INDEX);
});

// ============================================================================
// Inicialização controlada: só abre a porta depois que o banco está pronto
// ============================================================================
async function iniciarServidor(): Promise<void> {
    await inicializarBanco();

    app.listen(PORT, () => {
        exibirBannerBanco();
        console.log(`Servidor rodando em: http://localhost:${PORT}`);
        console.log(`API:   http://localhost:${PORT}/api/health`);
        console.log(`Front: http://localhost:${PORT}`);
        verificarFront();
    });
}

iniciarServidor();
