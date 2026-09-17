import type { BotContext } from '../context.js';
import { getDbUserId } from '../utils/user-cache.js';
import { botApi } from '@todo/api-client';
import { parseTaskWithOllama } from '../vendor/ai/ollama.js';
import { handleListTasks } from './tasks.js';
import { baixarAudio, transcreverAudio } from '../lib/transcrever.js';

export async function handleVoiceMessage(ctx: BotContext) {
  try {
    if (!ctx.message || !('voice' in ctx.message)) return;

    const voice = ctx.message.voice;
    const userId = await getDbUserId(ctx.from?.id);
    if (!userId) {
      return ctx.reply('Não foi possível identificar o usuário.');
    }

    const waitMsg = await ctx.reply('🎙️ Processando seu áudio...');

    // 1. Download do áudio do Telegram
    const audioBuffer = await baixarAudio(ctx, voice.file_id);

    // 2. Transcrição (Whisper via Groq) — mesma rotina da cena de reunião
    const transcription = await transcreverAudio(audioBuffer);
    
    if (!transcription || transcription.trim() === '') {
      await ctx.telegram.editMessageText(ctx.chat?.id, waitMsg.message_id, undefined, 'Não consegui escutar nada no áudio.');
      return;
    }

    await ctx.telegram.editMessageText(
      ctx.chat?.id, 
      waitMsg.message_id, 
      undefined, 
      `🗣️ <i>"${transcription}"</i>\n\n🧠 Entendendo a tarefa...`,
      { parse_mode: 'HTML' }
    );

    // 3. Extração da tarefa com Ollama
    const groups = await botApi.listGroups(userId);
    const parsedTask = await parseTaskWithOllama(transcription, groups);

    // Encontrar o ID do grupo correspondente
    let groupId: string | undefined = undefined;
    if (parsedTask.groupName) {
      const groupMatch = groups.find(g => g.name.toLowerCase() === parsedTask.groupName?.toLowerCase());
      if (groupMatch) {
        groupId = groupMatch.id;
      }
    }

    // 4. Salvar Tarefa
    const task = await botApi.addTask(userId, parsedTask.description, parsedTask.scheduledAt || undefined, groupId);

    let finalMsg = `✅ <b>Tarefa adicionada por voz!</b>\n\n`;
    finalMsg += `📝 <b>Descrição:</b> ${task.description}\n`;
    finalMsg += `📁 <b>Lista:</b> ${parsedTask.groupName || 'Geral'}\n`;
    if (task.scheduledAt) {
      finalMsg += `⏰ <b>Agendada para:</b> ${new Date(task.scheduledAt).toLocaleString('pt-BR')}`;
    }

    await ctx.telegram.editMessageText(ctx.chat?.id, waitMsg.message_id, undefined, finalMsg, { parse_mode: 'HTML' });
    
    await handleListTasks(ctx);


  } catch (error: any) {
    console.error('Erro no processamento de voz:', error);
    const errorMessage = error.message || 'Erro desconhecido';
    await ctx.reply(`Ocorreu um erro ao processar o áudio: ${errorMessage}`);
  }
}
