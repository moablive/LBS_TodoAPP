# TODO Bot - Astral Wave Label

Um bot de Telegram avançado para gerenciamento de tarefas, inspirado na simplicidade e organização do Apple Reminders, turbinado com Inteligência Artificial.

## Funcionalidades Principais 🚀

- **Listas (Task Groups):** Crie múltiplas listas (ex: Developer, Pessoal, Compras) e agrupe suas tarefas.
- **Gerenciamento de Tarefas:** Adicione, liste e remova tarefas de qualquer lista através de uma interface interativa (Inline Keyboards) no Telegram.
- **Conclusão Guiada:** Sistema intuitivo (Wizard) de "Concluir Tarefas" onde o bot lista as pendências numeradas da lista escolhida para baixa rápida no sistema.
- **Inteligência Artificial (Voz para Tarefa):** Envie áudios para o bot! Ele transcreve a sua voz instantaneamente usando o modelo **Whisper-Large-V3 (via Groq API)** e entende a intenção usando seu LLM local (**Ollama - llama3**). Ele identifica sozinho a tarefa, a data e a lista correta para inserção.
- **Notificações:** Um Cron Job interno avisa quando uma tarefa agendada chegou no horário.
- **Autenticação Segura:** Usuários validam acesso via LoginHub para vincular sua conta do Telegram de forma segura.

## Tecnologias Utilizadas 🛠️

- **Linguagem:** TypeScript / Node.js
- **Banco de Dados:** PostgreSQL (`pg`)
- **Framework Bot:** Telegraf
- **Transcrição STT:** GroqCloud API (Whisper)
- **Motor de Inteligência LLM:** Ollama Local API
- **Validação e Tipagem:** Zod

## Como Executar 🐳

O projeto foi projetado para rodar na infraestrutura Docker via `docker-compose`.

1. **Configuração:**
   Copie ou crie o arquivo `.env` na raiz do projeto contendo as seguintes chaves obrigatórias:
   ```env
   NODE_ENV=production
   TELEGRAM_BOT_TOKEN=seu_token_aqui

   DATABASE_URL=postgres://usuario:senha@host:5432/todo_bot
   GROQ_API_KEY=sua_chave_groq_aqui
   ```

2. **Subindo o Container:**
   ```bash
   docker compose up -d --build
   ```

3. **Interagindo:**
   Abra o seu bot no Telegram e envie o comando `/start`.

## Estrutura do Projeto 📂

- `src/index.ts`: Ponto de entrada e configuração do bot.
- `src/handlers/`: Controladores para ações como listar, adicionar e voz.
- `src/scenes/`: Wizards interativos (passo-a-passo) para criação de Grupos e Tarefas usando a Session do Telegraf.
- `src/vendor/ai/`: Lógica de integração com a API do Groq e Ollama.
- `src/vendor/api-client/`: Lógica de persistência no PostgreSQL usando SQL puro (`pg`).
- `src/cron/`: Tarefas agendadas em background (node-cron).

## Atualizações Recentes 🆕

- **Assistente de Criação Melhorado**: A inserção manual de data e hora para as tarefas agora é feita em dois passos separados e amigáveis, facilitando o uso sem precisar lembrar do formato ISO (suporta formatos como `25/12/2026`, `hoje`, `amanhã`, `14:30`).
- **Resumo Diário de Tarefas (3 envios)**: Rotina automática com 3 horários fixos:
  - **08:00** ☀️ — Bom dia personalizado + apenas tarefas **prioritárias** (urgentes/alto)
  - **09:00** 🌅 — Resumo completo matinal com todas as tarefas por prioridade
  - **13:00** ☀️ — Resumo da tarde com todas as tarefas por prioridade
- **Numeração de Tarefas**: Substituição da exibição de GUIDs por ícones numéricos (1️⃣, 2️⃣, etc.) na listagem geral. A contagem reinicia para cada lista separadamente, mantendo a consistência com o assistente interativo de conclusão de tarefas.
- **Tratamento de Erro de IA**: Melhoria no pipeline de transcrição de voz. O sistema agora retorna a mensagem de erro exata (ex: problemas no Ollama local) em vez de mensagens genéricas relacionadas à Groq API.
- **Notificações de Tarefas**: O bot do Telegram agora inclui a data e hora formatadas na notificação de tarefas agendadas, garantindo que o usuário saiba exatamente quando a demanda deveria ocorrer.

---
*Desenvolvido para uso interno na infraestrutura da Astral Wave Label.*
