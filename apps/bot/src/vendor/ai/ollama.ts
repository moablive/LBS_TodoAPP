import type { TaskGroup } from '../models/index.js';
import { agoraLocal, carimboNu, descricaoAgora, paraHoraDeParede, resolverQuando } from '../../lib/tempo.js';
import type { QuandoBruto } from '../../lib/tempo.js';

interface OllamaParsedTask {
  description: string;
  groupName: string | null;
  scheduledAt: string | null;
}

export interface ReuniaoExtraida {
  titulo: string;
  groupName: string | null;
  /** Hora de parede, "2026-09-17 15:00:00". Null = a IA não achou data. */
  inicio: string | null;
  duracaoMinutos: number;
}

function endpoint() {
  // Vinham fixos no código, o que tornava o .env inócuo para a IA. Agora saem do
  // ambiente (../shared.env define OLLAMA_URL e OLLAMA_TEXT_MODEL p/ todos os
  // apps); os valores antigos ficam como fallback para não mudar o padrão.
  const baseUrl = process.env.OLLAMA_URL || 'http://server_ollama:11434';
  return {
    url: `${baseUrl.replace(/\/+$/, '')}/api/generate`,
    model: process.env.OLLAMA_TEXT_MODEL || 'qwen2.5vl:7b',
  };
}

async function gerarJson(prompt: string): Promise<any> {
  const { url, model } = endpoint();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false, format: 'json' }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.parse(data.response);
}

export async function parseTaskWithOllama(
  transcription: string,
  availableGroups: TaskGroup[]
): Promise<OllamaParsedTask> {
  const groupNames = availableGroups.map((g) => g.name).join(', ');

  const systemPrompt = `
Você é um assistente de extração de tarefas que gera respostas EXCLUSIVAMENTE em JSON, sem texto adicional.
Dada a transcrição de áudio do usuário, você deve identificar:
1. A descrição da tarefa (clara e direta).
2. O nome da lista em que a tarefa deve ser salva, baseando-se nestas opções disponíveis: [${groupNames}]. Se não se encaixar perfeitamente, retorne null.
3. A data e hora para a tarefa, no formato YYYY-MM-DDTHH:mm:ss, SEM fuso horário (nada de "Z" no fim). Se não for mencionada uma data clara, retorne null.

AGORA é ${descricaoAgora()} no fuso do usuário (São Paulo).
Use esta referência para resolver "hoje", "amanhã", "depois de amanhã" e dias da semana.
"Sexta-feira" sem mais qualificação é a PRÓXIMA sexta-feira ainda por vir — nunca uma data passada.

Exemplo de saída esperada:
{
  "description": "Comprar pão",
  "groupName": "Compras",
  "scheduledAt": "2026-09-17T10:00:00"
}

Transcrição do usuário: "${transcription}"
`;

  try {
    const result = await gerarJson(systemPrompt);
    // A IA insiste em carimbar "Z" às vezes; aqui o fuso é descartado, não
    // convertido — ver o porquê em lib/tempo.ts.
    const quando = result.scheduledAt ? paraHoraDeParede(String(result.scheduledAt)) : null;

    return {
      description: result.description || 'Tarefa sem nome',
      groupName: result.groupName || null,
      scheduledAt: quando ? carimboNu(quando) : null,
    };
  } catch (error) {
    console.error('Erro ao conectar ao Ollama:', error);
    throw new Error('Falha na IA');
  }
}

/**
 * Extração de REUNIÃO — não é a mesma coisa que tarefa.
 *
 * Reunião tem hora de início e de fim; tarefa tem só um instante.
 *
 * A IA aqui NÃO calcula data. Ela classifica o que ouviu ("amanhã", "sexta",
 * "que vem") e devolve a hora; quem vira isso em dia do calendário é o
 * `resolverQuando`, em código. O motivo está medido: pedindo a data pronta, o
 * qwen2.5vl:7b devolveu para "sexta-feira" um 15/09 e um 22/09 em rodadas
 * diferentes — as duas terças-feiras. Classificar ele acerta; contar, não.
 */
export async function extrairReuniao(
  transcription: string,
  availableGroups: TaskGroup[]
): Promise<ReuniaoExtraida> {
  const groupNames = availableGroups.map((g) => g.name).join(', ');

  const prompt = `
Você extrai COMPROMISSOS de uma transcrição de áudio e responde EXCLUSIVAMENTE em JSON, sem texto adicional.
NÃO calcule datas. Apenas classifique o que foi dito. Hoje é ${descricaoAgora()}.

Campos:
1. "titulo": o compromisso em poucas palavras, começando por "Reunião" quando fizer sentido.
2. "groupName": uma destas listas [${groupNames}], ou null se nenhuma servir bem.
3. "quando": objeto com
   - "tipo": um de "hoje", "amanha", "depois_de_amanha", "dia_da_semana", "data".
   - "diaDaSemana": quando tipo for "dia_da_semana", o dia dito ("segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"). Senão null.
   - "data": quando tipo for "data", no formato YYYY-MM-DD. Senão null.
   - "hora": hora de início "HH:mm" em 24h. null se o áudio não disser.
   - "semanaQueVem": true se a pessoa disse "que vem", "da semana que vem" ou "próxima". Senão false.
4. "horaFim": hora de término "HH:mm" se o áudio disser até quando. Senão null.
5. "duracaoMinutos": duração em minutos se dita explicitamente ("uma hora e meia" = 90). Senão null.

Horários: "meio-dia" é 12:00, "meia-noite" é 00:00, "3 da tarde" é 15:00, "8 da manhã" é 08:00.

Exemplo — "reunião com o contador sexta que vem às 3 da tarde, uma hora":
{
  "titulo": "Reunião com o contador",
  "groupName": "Agenda",
  "quando": { "tipo": "dia_da_semana", "diaDaSemana": "sexta", "data": null, "hora": "15:00", "semanaQueVem": true },
  "horaFim": null,
  "duracaoMinutos": 60
}

Transcrição do usuário: "${transcription}"
`;

  try {
    const result = await gerarJson(prompt);

    const agora = agoraLocal();
    const bruto: QuandoBruto = result.quando || {};
    const inicio = bruto.hora ? resolverQuando(bruto, agora) : null;

    let duracao = Number(result.duracaoMinutos);
    // "das 9 ao meio-dia": a hora de fim é mais confiável que a conta da IA.
    if (result.horaFim && bruto.hora) {
      const [h1, m1] = String(bruto.hora).split(':').map(Number);
      const [h2, m2] = String(result.horaFim).split(':').map(Number);
      if ([h1, h2].every(Number.isFinite)) {
        let diff = (h2! * 60 + (m2 || 0)) - (h1! * 60 + (m1 || 0));
        if (diff <= 0) diff += 24 * 60; // atravessou a meia-noite
        duracao = diff;
      }
    }
    if (!Number.isFinite(duracao) || duracao <= 0 || duracao > 24 * 60) duracao = 60;

    return {
      titulo: String(result.titulo || '').trim() || 'Reunião',
      groupName: result.groupName || null,
      inicio: inicio ? carimboNu(inicio) : null,
      duracaoMinutos: Math.round(duracao),
    };
  } catch (error) {
    console.error('Erro ao extrair reunião no Ollama:', error);
    throw new Error('Falha na IA');
  }
}
