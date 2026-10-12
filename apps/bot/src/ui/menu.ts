import { Markup } from 'telegraf';
import { noMoabinhoIA, BOTAO_CASA } from '../lib/moabinhoia.js';

export const menuKeyboard = Markup.keyboard([
  ['✅ Concluir Tarefa', '📋 Listar Tarefas'],
  ['📁 Nova Lista', '📂 Minhas Listas'],
  ['📝 Adicionar Tarefa', '❌ Remover Tarefa'],
  ['🎤 Reunião por Áudio'],
  ...(noMoabinhoIA ? [[BOTAO_CASA]] : []),
  // persistent: o teclado fica sempre aberto, não recolhe quando se digita.
]).resize().persistent();
