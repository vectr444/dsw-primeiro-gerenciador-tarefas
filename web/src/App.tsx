import { useState } from 'react';
import type { SubmitEvent } from 'react';
import Tarefa from './Tarefa.tsx';
import type { TarefaItem } from './types.ts';

function App() {
  const [tarefas, setTarefas] = useState<TarefaItem[]>([]);
  const [novoTitulo, setNovoTitulo] = useState('');


  function adicionarTarefa(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();

    const tituloLimpo = novoTitulo.trim();

    if (tituloLimpo === '') {
      return;
    }

    const novaTarefa: TarefaItem = {
      id: Date.now(),
      titulo: tituloLimpo,
      concluida: false
    };

    setTarefas(listaAtual => [...listaAtual, novaTarefa]);
    setNovoTitulo('');

  }

  function alternarConclusao(id: number) {
    setTarefas(listaAtual => listaAtual.map(tarefa =>
      tarefa.id === id ? { ...tarefa, concluida: !tarefa.concluida } : tarefa
    ));
  }

  function removerTarefa(id: number) {
    setTarefas(listaAtual => listaAtual.filter(tarefa => tarefa.id !== id));
  }

  const totalPendentes = tarefas.filter(tarefa => !tarefa.concluida).length;
  const totalConcluidas = tarefas.filter(tarefa => tarefa.concluida).length;

  return (
    <>
    <main>
      <h1>Minha Lista de Tarefas</h1>
      <p>Organiza suas atividades do dia</p>

      <form onSubmit={adicionarTarefa}>
        <label htmlFor="titulo">Nova Tarefa:</label>
        <input
          type="text"
          id="titulo"
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          placeholder='Ex.: Estudar React'
        />
        <button type="submit">Adicionar</button>
      </form>
 
      <ul>
        {tarefas.map((tarefa) => (
          <Tarefa
            key={tarefa.id}
            tarefa={tarefa}
            onAlternar={alternarConclusao}
            onRemover={removerTarefa}
          />
        ))}
      </ul>

      <p>Total de Tarefas: {tarefas.length}</p>
      <p>Total de Tarefas Pendentes: {totalPendentes}</p>
      <p>Total de Tarefas Concluídas: {totalConcluidas}</p>
    </main>
    </>
  );
}

export default App;