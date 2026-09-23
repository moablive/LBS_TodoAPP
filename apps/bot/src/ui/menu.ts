import { Markup } from 'telegraf';
import { noMeuBruxo, BOTAO_CASA } from '../lib/meubruxo.js';

export const menuKeyboard = Markup.keyboard([
  ['✅ Concluir Tarefa', '📋 Listar Tarefas'],
  ['📁 Nova Lista', '📂 Minhas Listas'],
  ['📝 Adicionar Tarefa', '❌ Remover Tarefa'],
  ['🎤 Reunião por Áudio'],
  ...(noMeuBruxo ? [[BOTAO_CASA]] : []),
  // persistent: o teclado fica sempre aberto, não recolhe quando se digita.
]).resize().persistent();
