import express from "express";
import Database from "better-sqlite3";

const app = express();
const port = 3000

//Middleware para ler o corpo das reuqisições em formato JSON
app.use(express.json());

const db = new Database("tarefas.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS tarefas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    prioridade TEXT DEFAULT 'medium'
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    senha TEXT NOT NULL
  );
`)

// inserindo dados falsos para serem vazados
const usuariosExistentes = db.prepare("SELECT COUNT(*) AS COUNT FROM usuarios").get() as any;
if(usuariosExistentes.count === 0){
  db.exec(`
    INSERT INTO usuarios (email, senha) VALUES ('admin@senai.com','senha_super_segura_123');
  `);
}

console.log("Banco de dados SQLite inicializado com sucesso!");

//banco de dados provisório em RAM
let bancoDeDadosProvisorio = [
    { id: 1, title: "Estudar arquitetura REST", status: "pendente" }
];

// rota de integridade do sistema (health check)
app.get("/api/health",(req, res) => {
    res.json({ status: "OK", message: "Servidor do Gestor de Tarefas ativo"});
})

app.get("/api/version",(req, res)=>{
    res.json({
        appName: "Gerenciador de Tarefas Multi-Usuário",
        version: "1.0.0"
    })
})

app.get("/api/tasks", (req, res) => {
    const { search } = req.query;
    try {
        if (search) {
            // Prepared Statement: O '?' protege contra Injeção de SQL.
            const sql = "SELECT * FROM tarefas WHERE titulo LIKE ?";
            const tarefas = db.prepare(sql).all(`%${search}%`);
            res.json(tarefas);
        } else {
            const tarefas = db.prepare("SELECT * FROM tarefas").all();
            res.json(tarefas);
        }
    } catch (erro) {
        // Exibir o erro real ajuda a compreender a quebra de sintaxe gerada pelo ataque
        res.status(500).json({ error: erro instanceof Error ? erro.message : "Erro desconhecido" });
    }
});

app.post("/api/tasks", (req, res) => {
    const { title, prioridade } = req.body;
    const prioridadeValida = ['low', 'medium', 'high'].includes(prioridade) ? prioridade : 'medium';
    
    // Validação rígida: Título obrigatório, não vazio e com tamanho mínimo
    // Sanitizamos com .trim() ANTES de checar o length, aplicando a regra de negócio
    if (!title || title.trim().length < 3) {
        return res.status(400).json({ 
            error: "O título da tarefa é obrigatório e deve conter pelo menos 3 caracteres válidos." 
        });
    }

    try {
        const sql = "INSERT INTO tarefas (titulo, status, prioridade) VALUES (?, 'pending', ?)";
        const resultado = db.prepare(sql).run(title.trim(), prioridadeValida);
        
        // Retorna o objeto recém-criado usando o ID gerado (lastInsertRowid).
        const novaTarefa = db.prepare("SELECT * FROM tarefas WHERE id = ?").get(resultado.lastInsertRowid);
        return res.status(201).json(novaTarefa);
    } catch (erro) {
        return res.status(500).json({ error: "Erro ao processar persistência" });
    }
});

app.delete("/api/tasks/:id", (req, res) => {
    const idParaDeletar = parseInt(req.params.id);
    const tarefaExiste = bancoDeDadosProvisorio.some(t => t.id === idParaDeletar);

    if (!tarefaExiste) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
    }

    bancoDeDadosProvisorio = bancoDeDadosProvisorio.filter(t => t.id !== idParaDeletar);
    res.json({ message: "Tarefa removida com sucesso!" });
});

app.listen(port,() => {
    console.log(`Servidor rodando em: http://localhost:${port}`);
})


// criar um dos dois tipos de arquivo
// 1) .http ou
// 2) .rest