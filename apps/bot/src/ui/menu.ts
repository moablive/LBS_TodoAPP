import { Markup } from 'telegraf';

export const menuKeyboard = Markup.keyboard([
  ['✅ Concluir Tarefa', '📋 Listar Tarefas'],
  ['📁 Nova Lista', '📂 Minhas Listas'],
  ['📝 Adicionar Tarefa', '❌ Remover Tarefa']
]).resize();
