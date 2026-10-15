

import type { TarefaItem } from './types.ts';

type TarefaProps = {
  tarefa: TarefaItem;
  onAlternar: (id: number) => void;
  onRemover: (id: number) => void;
};

function Tarefa({ tarefa, onAlternar, onRemover }: TarefaProps) {
  return (
    <li key={tarefa.id}>
            <span 
              style={{ textDecoration: tarefa.concluida ? 'line-through' : 'none' }}  
              >
              {tarefa.titulo} - {tarefa.concluida ? 'Concluída' : 'Pendente'}
            </span>
            {' '}
            <button onClick={() => onAlternar(tarefa.id)}>
              {tarefa.concluida ? 'Marcar como Pendente' : 'Marcar como Concluída'}
            </button>
            {' '}
            <button onClick={() => onRemover(tarefa.id)}>
              Remover
            </button>
          </li>
  );
}

export default Tarefa;