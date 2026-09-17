import { Scenes, Markup } from 'telegraf';
import type { BotContext } from '../context.js';
import { getDbUserId } from '../utils/user-cache.js';
import { botApi } from '@todo/api-client';
import { menuKeyboard } from '../ui/menu.js';
import { baixarAudio, transcreverAudio } from '../lib/transcrever.js';
import { extrairReuniao } from '../vendor/ai/ollama.js';
import { carimboUtc, paraHoraDeParede, paredeParaInstante } from '../lib/tempo.js';

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function formatarQuando(carimbo: string, duracao: number): string {
  const d = paraHoraDeParede(carimbo);
  if (!d) return carimbo;
  const p = (n: number) => String(n).padStart(2, '0');
  const fim = new Date(d.getTime() + duracao * 60_000);
  return (
    `${DIAS[d.getDay()]}, ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ` +
    `${p(d.getHours())}:${p(d.getMinutes())} às ${p(fim.getHours())}:${p(fim.getMinutes())}`
  );
}

const botoesConfirmar = Markup.inlineKeyboard([
  [Markup.button.callback('✅ Agendar', 'confirmar')],
  [Markup.button.callback('🎤 Gravar de novo', 'regravar')],
  [Markup.button.callback('❌ Cancelar', 'cancel')],
]);

/**
 * Reunião por áudio: fala → Whisper → Ollama → compromisso com início e fim.
 *
 * É uma cena, e não o `bot.on('voice')` solto, por dois motivos: reunião tem
 * duração (tarefa não tem) e um compromisso errado no calendário custa caro —
 * por isso nada é gravado antes de o usuário conferir o que foi entendido.
 */
export const meetingVoiceWizard = new Scenes.WizardScene<BotContext>(
  'MEETING_VOICE_WIZARD',
  async (ctx: BotContext) => {
    await ctx.reply(
      '🎤 <b>Agendar reunião por áudio</b>\n\n' +
        'Mande um áudio dizendo <b>o quê</b>, <b>quando</b> e <b>por quanto tempo</b>.\n\n' +
        '<i>Ex.: "reunião com o contador amanhã às 15 horas, uma hora e meia"</i>\n\n' +
        'Sem a duração, eu considero 1 hora.',
      { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', 'cancel')]]) }
    );
    return ctx.wizard.next();
  },

  async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'cancel') {
      await ctx.answerCbQuery().catch(() => {});
      await ctx.reply('❌ Operação cancelada.', { ...menuKeyboard });
      return ctx.scene.leave();
    }

    if (!ctx.message || !('voice' in ctx.message)) {
      await ctx.reply('Preciso de uma *mensagem de voz* para entender a reunião. Grave e mande aqui.', {
        parse_mode: 'Markdown',
      });
      return; // continua esperando o áudio
    }

    const userId = await getDbUserId(ctx.from?.id);
    if (!userId) {
      await ctx.reply('Não foi possível identificar o usuário.', { ...menuKeyboard });
      return ctx.scene.leave();
    }

    const espera = await ctx.reply('🎙️ Ouvindo o áudio...');

    try {
      const audio = await baixarAudio(ctx, ctx.message.voice.file_id);
      const transcricao = await transcreverAudio(audio);

      if (!transcricao || !transcricao.trim()) {
        await ctx.telegram.editMessageText(
          ctx.chat?.id, espera.message_id, undefined,
          'Não consegui escutar nada. Tente gravar de novo, mais perto do microfone.'
        );
        return; // segue na mesma etapa, esperando outro áudio
      }

      await ctx.telegram.editMessageText(
        ctx.chat?.id, espera.message_id, undefined,
        `🗣️ <i>"${transcricao}"</i>\n\n🧠 Entendendo a reunião...`,
        { parse_mode: 'HTML' }
      );

      const grupos = await botApi.listGroups(userId);
      const reuniao = await extrairReuniao(transcricao, grupos);

      if (!reuniao.inicio) {
        await ctx.telegram.editMessageText(
          ctx.chat?.id, espera.message_id, undefined,
          `🗣️ <i>"${transcricao}"</i>\n\n` +
            '❓ Entendi o assunto, mas <b>não achei a data e a hora</b>.\n' +
            'Grave de novo dizendo quando é — por exemplo, "quinta às 15 horas".',
          { parse_mode: 'HTML' }
        );
        return; // continua esperando áudio
      }

      const grupo = reuniao.groupName
        ? grupos.find((g) => g.name.toLowerCase() === reuniao.groupName!.toLowerCase())
        : undefined;

      // Guardado na sessão da cena: quem grava é a etapa seguinte, depois do OK.
      (ctx.scene.session as any).reuniao = { ...reuniao, groupId: grupo?.id ?? null };

      await ctx.telegram.editMessageText(
        ctx.chat?.id, espera.message_id, undefined,
        `🗣️ <i>"${transcricao}"</i>\n\n` +
          '📅 <b>Confere para eu agendar?</b>\n\n' +
          `📝 <b>${reuniao.titulo}</b>\n` +
          `🕒 ${formatarQuando(reuniao.inicio, reuniao.duracaoMinutos)}\n` +
          `⏱️ ${reuniao.duracaoMinutos} min\n` +
          `📁 ${grupo?.name ?? 'Sem lista'}`,
        { parse_mode: 'HTML', ...botoesConfirmar }
      );

      return ctx.wizard.next();
    } catch (error: any) {
      console.error('Erro na reunião por áudio:', error);
      await ctx.telegram
        .editMessageText(
          ctx.chat?.id, espera.message_id, undefined,
          `❌ Não deu certo: ${error.message || 'erro desconhecido'}`
        )
        .catch(() => {});
      await ctx.reply('Tente de novo em instantes.', { ...menuKeyboard });
      return ctx.scene.leave();
    }
  },

  async (ctx: BotContext) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    const acao = ctx.callbackQuery.data;
    await ctx.answerCbQuery().catch(() => {});

    if (acao === 'cancel') {
      await ctx.reply('❌ Reunião descartada.', { ...menuKeyboard });
      return ctx.scene.leave();
    }

    if (acao === 'regravar') {
      await ctx.reply('🎤 Pode mandar o áudio de novo.');
      return ctx.wizard.back();
    }

    if (acao !== 'confirmar') return;

    const dados = (ctx.scene.session as any).reuniao;
    if (!dados) {
      await ctx.reply('Perdi os dados da reunião. Vamos do começo.', { ...menuKeyboard });
      return ctx.scene.leave();
    }

    try {
      const userId = await getDbUserId(ctx.from?.id);
      if (!userId) {
        await ctx.reply('Não foi possível identificar o usuário.', { ...menuKeyboard });
        return ctx.scene.leave();
      }

      // `dados.inicio` é hora de PAREDE — o que a pessoa falou e o que ela
      // acabou de conferir na tela. A coluna guarda UTC, então a virada é aqui,
      // no último passo. Sem ela a reunião das 16:00 nasce às 13:00 no
      // calendário, que foi o defeito de 17/09/2026.
      const parede = paraHoraDeParede(dados.inicio);
      if (!parede) {
        await ctx.reply('❌ Não entendi a data direito. Vamos de novo.', { ...menuKeyboard });
        return ctx.scene.leave();
      }

      await botApi.addTask(
        userId,
        dados.titulo,
        carimboUtc(paredeParaInstante(parede)),
        dados.groupId ?? undefined,
        dados.duracaoMinutos
      );

      await ctx.reply(
        '✅ <b>Reunião agendada!</b>\n\n' +
          `📝 ${dados.titulo}\n` +
          `🕒 ${formatarQuando(dados.inicio, dados.duracaoMinutos)}\n\n` +
          'Ela já está no calendário do app, e eu te aviso antes.',
        { parse_mode: 'HTML', ...menuKeyboard }
      );
    } catch (error) {
      console.error('Erro ao gravar reunião:', error);
      await ctx.reply('❌ Não consegui salvar a reunião.', { ...menuKeyboard });
    }

    return ctx.scene.leave();
  }
);
