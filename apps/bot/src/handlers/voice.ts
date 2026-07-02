import type { BotContext } from '../context.js';
import { getDbUserId } from '../utils/user-cache.js';
import { botApi } from '@todo/api-client';
import { parseTaskWithOllama } from '../vendor/ai/ollama.js';
import { handleListTasks } from './tasks.js';

async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const blob = new Blob([audioBuffer as any], { type: 'audio/ogg' });
  const formData = new FormData();
  formData.append('file', blob, 'audio.ogg');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'pt');
  
  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API Error:', errorText);
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data: any = await response.json();
  return data.text;
}

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
    const fileLink = await ctx.telegram.getFileLink(voice.file_id);
    const audioResponse = await fetch(fileLink.href);
    const arrayBuffer = await audioResponse.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // 2. Transcrição (Whisper via Groq)
    const transcription = await transcribeAudio(audioBuffer);
    
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
