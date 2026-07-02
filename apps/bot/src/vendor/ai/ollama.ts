import type { TaskGroup } from '../models/index.js';

interface OllamaParsedTask {
  description: string;
  groupName: string | null;
  scheduledAt: string | null;
}

export async function parseTaskWithOllama(transcription: string, availableGroups: TaskGroup[]): Promise<OllamaParsedTask> {
  const ollamaUrl = 'http://ollama:11434/api/generate';
  const model = 'llama3:latest';

  const groupNames = availableGroups.map(g => g.name).join(', ');

  const systemPrompt = `
Você é um assistente de extração de tarefas que gera respostas EXCLUSIVAMENTE em JSON, sem texto adicional.
Dada a transcrição de áudio do usuário, você deve identificar:
1. A descrição da tarefa (clara e direta).
2. O nome da lista em que a tarefa deve ser salva, baseando-se nestas opções disponíveis: [${groupNames}]. Se não se encaixar perfeitamente, retorne null.
3. A data e hora para a tarefa, no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). Se não for mencionada uma data clara, retorne null. Hoje é ${new Date().toISOString()}.

Exemplo de saída esperada:
{
  "description": "Comprar pão",
  "groupName": "Compras",
  "scheduledAt": "2023-12-01T10:00:00.000Z"
}

Transcrição do usuário: "${transcription}"
`;

  try {
    const response = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: systemPrompt,
        stream: false,
        format: "json"
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.response);
    
    return {
      description: result.description || 'Tarefa sem nome',
      groupName: result.groupName || null,
      scheduledAt: result.scheduledAt || null
    };
  } catch (error) {
    console.error('Erro ao conectar ao Ollama:', error);
    throw new Error('Falha na IA');
  }
}
