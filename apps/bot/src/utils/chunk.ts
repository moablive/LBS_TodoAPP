/**
 * O Telegram recusa `sendMessage` acima de 4096 caracteres com
 * `400: Bad Request: message is too long`. Com a agenda sincronizada isso
 * deixou de ser hipotese: um unico usuario chegou a 182 tarefas ativas, que
 * renderizam ~12.400 caracteres — tres vezes o teto. O efeito visivel era pior
 * do que uma listagem truncada: `finalizeTask` chama `handleListTasks` logo
 * depois de criar a tarefa, entao quem cadastrava via wizard via a tarefa ser
 * gravada e, em seguida, uma mensagem de erro.
 *
 * O corte e feito em quebra de linha, nunca no meio de uma tag HTML: a
 * listagem usa <b> e <i> por linha, e cortar por indice cru geraria
 * `can't parse entities`, trocando um erro por outro.
 */
const LIMITE_TELEGRAM = 4096;
const MARGEM = 96; // sobra para o sufixo de paginacao

export function fatiarMensagem(texto: string, limite = LIMITE_TELEGRAM - MARGEM): string[] {
  if (texto.length <= limite) return [texto];

  const partes: string[] = [];
  let atual = '';

  for (const linha of texto.split('\n')) {
    // Linha unica maior que o limite: nao ha quebra onde cortar com seguranca,
    // entao trunca com reticencias em vez de estourar o envio.
    const segura = linha.length > limite ? linha.slice(0, limite - 1) + '…' : linha;

    if (atual.length + segura.length + 1 > limite) {
      if (atual) partes.push(atual);
      atual = segura;
    } else {
      atual = atual ? `${atual}\n${segura}` : segura;
    }
  }
  if (atual) partes.push(atual);

  return partes;
}

/**
 * Envia em quantas mensagens forem necessarias. O teclado (`extra`) vai so na
 * ultima — repetir o menu em cada fatia empilharia botoes duplicados.
 */
export async function enviarLongo(
  enviar: (texto: string, extra?: Record<string, unknown>) => Promise<unknown>,
  texto: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const partes = fatiarMensagem(texto);
  for (let i = 0; i < partes.length; i++) {
    const ultima = i === partes.length - 1;
    const sufixo = partes.length > 1 ? `\n\n<i>(${i + 1}/${partes.length})</i>` : '';
    await enviar(partes[i] + sufixo, ultima ? extra : { parse_mode: extra.parse_mode });
  }
}
