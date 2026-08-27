# Migrations arquivadas (até 2026-08-27)

Estas 29 migrations **não são mais executadas**. Elas foram substituídas pelo
`drizzle/0000_baseline.sql`, gerado a partir do schema em 27/08/2026 e validado
contra a produção — 85 colunas e as constraints idênticos.

Ficam aqui como documentação de como o banco chegou onde chegou. Não devolva
nenhuma delas para `drizzle/`.

## Por que precisaram sair

A cadeia **não reconstruía o banco**. Quem rodasse o migrator num banco vazio
falhava na `0010_loose_jackal`:

```
error: relation "user_settings" does not exist
```

A tabela `user_settings` existe em produção mas nunca foi criada por migration
nenhuma — apareceu à mão. Como o migrator roda cada migration em transação, a
falha derrubava tudo: o banco de teste terminava com zero tabelas.

O NotesAPP caiu no mesmo ponto e pelo mesmo motivo que o MoneyAPP e o TodoAPP:
os tres tinham `user_settings` criada a mao.

Havia mais um defeito no caminho:

- **13 arquivos fora do journal.** Havia 29 `.sql` no diretório para 16
  entradas no journal.
- **O schema TS divergia da produção em cinco pontos**, e a comparação foi o que
  revelou: o FK `tasks.group_id` é `ON DELETE CASCADE` no banco e dizia
  `SET NULL` no código; `tasks.scheduled_at`, `created_at`, `completed_at` e
  `task_groups.created_at` são `timestamp` **sem fuso** no banco e diziam
  `timestamptz`; faltavam no código o índice único parcial
  `tasks_calendar_uid_uidx` e o índice de `telegram_link_tokens(expira_em)`.
  Em todos, o código foi alinhado ao banco — mudar o banco deslocaria carimbo
  já gravado ou alteraria o que acontece ao apagar um grupo.

> ⚠️ **Apagar um grupo apaga as tarefas dele.** É o `ON DELETE CASCADE` acima,
> comportamento real da produção. Se a intenção era `SET NULL`, isso é mudança
> de comportamento e merece migration própria, decidida de propósito.

## A regra que faltava

1. **Migration aplicada não se edita.** Precisa mudar? Gera uma nova.
2. **Limpeza de dados pontual não é migration.** Vai para script avulso, fora
   de `drizzle/`, com o nome de quem rodou e quando.
3. **Mudança de schema não se faz à mão no psql.** Foi assim que `user_settings`
   e o índice `telegram_link_tokens_expira_idx` passaram a existir sem que o
   repositório soubesse — e é o que quebrou a cadeia.
