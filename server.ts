import express from "express";

const app = express();
const port = 3000

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

app.listen(port,() => {
    console.log(`Servidor rodando em: http://localhost:${port}`);
})


// criar um dos dois tipos de arquivo
// 1) .http ou
// 2) .rest