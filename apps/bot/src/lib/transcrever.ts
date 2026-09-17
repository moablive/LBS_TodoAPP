/**
 * Transcrição de áudio do Telegram (Whisper via Groq).
 *
 * Morava dentro do `handlers/voice.ts`; saiu de lá quando a cena de reunião por
 * áudio passou a precisar do mesmo passo. Uma cópia a mais seria uma chance a
 * mais de as duas divergirem no modelo ou no idioma.
 */
export async function transcreverAudio(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const blob = new Blob([audioBuffer as any], { type: 'audio/ogg' });
  const formData = new FormData();
  formData.append('file', blob, 'audio.ogg');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'pt');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API Error:', errorText);
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data: any = await response.json();
  return data.text;
}

/** Baixa o áudio da mensagem de voz e devolve o buffer. */
export async function baixarAudio(ctx: any, fileId: string): Promise<Buffer> {
  const fileLink = await ctx.telegram.getFileLink(fileId);
  const audioResponse = await fetch(fileLink.href);
  const arrayBuffer = await audioResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
