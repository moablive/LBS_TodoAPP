<template>
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 transform transition-all max-h-[90vh] flex flex-col">
      <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
        <div class="flex items-center gap-3 mb-5">
          <Cog6ToothIcon class="w-6 h-6 text-[var(--accent)]" />
          <h2 class="text-xl font-semibold text-[var(--text)]">Configurações</h2>
        </div>

        <div v-if="isLoading" class="text-[var(--muted)] text-sm py-8 text-center">Carregando…</div>

        <template v-else>
          <h2 class="text-lg font-bold text-[var(--text)] mb-4 flex items-center gap-2"><BellAlertIcon class="w-5 h-5 text-[var(--muted)]" /> Lembretes</h2>
          
          <!-- Telegram -->
          <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
            <PaperAirplaneIcon class="w-4 h-4" /> Telegram
          </h3>
          <div class="bg-[var(--bg)] rounded-xl divide-y divide-[var(--border)] mb-6">
            <div class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-[14px] text-[var(--text)] font-medium">Notificações pelo Bot</p>
                <p class="text-[12px] text-[var(--muted)]">Receber lembretes e resumos no Telegram</p>
              </div>
              <ToggleSwitch v-model="settings.notifyTelegram" />
            </div>

            <!-- Vinculo da conta: fora do `v-if` do toggle de proposito. Quem
                 ainda nao vinculou precisa ver o botao mesmo com as notificacoes
                 desligadas — e desvincular tem de continuar alcancavel. -->
            <TelegramLinkCard />

            <template v-if="settings.notifyTelegram">
              <!-- Nome de exibição -->
              <div class="px-4 py-3">
                <p class="text-[13px] text-[var(--text)] font-medium mb-1">Nome de exibição</p>
                <p class="text-[12px] text-[var(--muted)] mb-2">Como o bot deve te chamar (ex.: "☀️ Bom dia, Patrão!")</p>
                <input
                  v-model="displayNameInput"
                  type="text"
                  maxlength="60"
                  placeholder="Patrão"
                  class="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text)] text-[14px] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <!-- Resumos Diários -->
              <div class="px-4 py-3">
                <p class="text-[13px] text-[var(--text)] font-medium mb-3">Resumos Diários</p>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <p class="text-[13px] text-[var(--text)]">Manhã</p>
                      <input type="time" v-model="settings.morningDigestTime" :disabled="!settings.morningDigestEnabled" class="bg-[var(--bg-card)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[12px] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]" />
                    </div>
                    <ToggleSwitch v-model="settings.morningDigestEnabled" />
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <p class="text-[13px] text-[var(--text)]">Tarde</p>
                      <input type="time" v-model="settings.afternoonDigestTime" :disabled="!settings.afternoonDigestEnabled" class="bg-[var(--bg-card)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[12px] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]" />
                    </div>
                    <ToggleSwitch v-model="settings.afternoonDigestEnabled" />
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <p class="text-[13px] text-[var(--text)]">Noite</p>
                      <input type="time" v-model="settings.nightDigestTime" :disabled="!settings.nightDigestEnabled" class="bg-[var(--bg-card)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[12px] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]" />
                    </div>
                    <ToggleSwitch v-model="settings.nightDigestEnabled" />
                  </div>
                  <!-- Toggle: somente tarefas do dia -->
                  <div class="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                    <div>
                      <p class="text-[13px] text-[var(--text)]">Somente tarefas do dia</p>
                      <p class="text-[11px] text-[var(--muted)]">Resumo filtra apenas tarefas agendadas para hoje</p>
                    </div>
                    <ToggleSwitch v-model="settings.digestTodayOnly" />
                  </div>
                </div>
              </div>

              <!-- Lembretes (Regras gerais) -->
              <div class="px-4 py-3 border-t border-[var(--border)]">
                <p class="text-[13px] text-[var(--text)] font-medium mb-3">Quando lembrar</p>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-[13px] text-[var(--text)]">No horário</p>
                      <p class="text-[11px] text-[var(--muted)]">Avisar na hora exata</p>
                    </div>
                    <ToggleSwitch v-model="settings.remindAtTime" />
                  </div>
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-[13px] text-[var(--text)]">Antes do horário</p>
                      <div class="flex items-center gap-1 text-[11px] text-[var(--muted)]">
                        <input
                          v-model.number="settings.remindBeforeMinutes"
                          type="number" min="1" max="1440"
                          class="w-12 bg-[var(--bg-card)] border border-[var(--border)] rounded px-1 py-0.5 text-[var(--text)] text-center focus:outline-none focus:border-[var(--accent)]"
                          :disabled="!settings.remindBeforeEnabled"
                        />
                        <span>min (padrão: 30)</span>
                      </div>
                    </div>
                    <ToggleSwitch v-model="settings.remindBeforeEnabled" />
                  </div>
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-[13px] text-[var(--text)]">Dias antes</p>
                      <div class="flex items-center gap-1 text-[11px] text-[var(--muted)]">
                        <input
                          v-model.number="settings.remindDaysBefore"
                          type="number" min="1" max="60"
                          class="w-12 bg-[var(--bg-card)] border border-[var(--border)] rounded px-1 py-0.5 text-[var(--text)] text-center focus:outline-none focus:border-[var(--accent)]"
                          :disabled="!settings.remindDaysEnabled"
                        />
                        <span>dias (padrão: 7)</span>
                      </div>
                    </div>
                    <ToggleSwitch v-model="settings.remindDaysEnabled" />
                  </div>
                </div>
              </div>

              <div class="px-4 py-3 border-t border-[var(--border)]">
                <p class="text-[13px] text-[var(--text)] font-medium mb-2">Quais tarefas notificar?</p>
                <div class="flex gap-4 mb-3">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" v-model="settings.notificationStyle" value="all" class="accent-[var(--accent)]" />
                    <span class="text-[13px] text-[var(--text)]">Todas</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" v-model="settings.notificationStyle" value="category" class="accent-[var(--accent)]" />
                    <span class="text-[13px] text-[var(--text)]">Por lista</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" v-model="settings.notificationStyle" value="priority" class="accent-[var(--accent)]" />
                    <span class="text-[13px] text-[var(--text)]">Por prioridade</span>
                  </label>
                </div>
                <div v-if="settings.notificationStyle === 'category'" class="mt-2 max-h-40 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                  <label v-for="g in taskGroups" :key="g.id" class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="settings.notifiedCategories" :value="g.id" class="accent-[var(--accent)] rounded" />
                    <div class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: g.color || '#ccc' }"></div>
                    <span class="text-[12px] text-[var(--text)]">{{ g.name }}</span>
                  </label>
                  <div v-if="taskGroups.length === 0" class="text-[12px] text-[var(--muted)]">Nenhuma lista encontrada.</div>
                </div>
                <div v-if="settings.notificationStyle === 'priority'" class="mt-2 flex flex-col gap-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="settings.notifiedPriorities" value="high" class="accent-[var(--accent)] rounded" />
                    <span class="w-2 h-2 rounded-full bg-[#ff3b30]"></span>
                    <span class="text-[12px] text-[var(--text)]">Alta</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="settings.notifiedPriorities" value="medium" class="accent-[var(--accent)] rounded" />
                    <span class="w-2 h-2 rounded-full bg-[#ffcc00]"></span>
                    <span class="text-[12px] text-[var(--text)]">Média</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="settings.notifiedPriorities" value="low" class="accent-[var(--accent)] rounded" />
                    <span class="w-2 h-2 rounded-full bg-[#34c759]"></span>
                    <span class="text-[12px] text-[var(--text)]">Baixa</span>
                  </label>
                </div>
              </div>

              <!-- Filtro de Período -->
              <div class="px-4 py-3 border-t border-[var(--border)]">
                <p class="text-[13px] text-[var(--text)] font-medium mb-2">Período de Notificação</p>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" v-model="settings.notificationPeriod" value="today" class="accent-[var(--accent)]" />
                    <span class="text-[13px] text-[var(--text)]">Somente do dia</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" v-model="settings.notificationPeriod" value="all" class="accent-[var(--accent)]" />
                    <span class="text-[13px] text-[var(--text)]">Todas as tarefas</span>
                  </label>
                </div>
              </div>

            </template>
          </div>

          <!-- Web Push -->
          <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
            <DevicePhoneMobileIcon class="w-4 h-4 text-[#30d158]" /> Notificações Push
          </h3>
          <div class="bg-[var(--bg)] rounded-xl divide-y divide-[var(--border)] mb-5">
            <div class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-[14px] text-[var(--text)] font-medium">Push Neste Aparelho</p>
                <p class="text-[12px] text-[var(--muted)]">Receber alertas nativos</p>
              </div>
              <ToggleSwitch v-model="settings.notifyPush" />
            </div>
            
            <div class="px-4 py-3" v-if="settings.notifyPush">
              <template v-if="!push.isSupported">
                <p class="text-[13px] text-[var(--muted)]">
                  Este navegador não suporta notificações push. Instale o app na tela inicial e tente por lá.
                </p>
              </template>
              <template v-else-if="push.permission.value === 'denied'">
                <p class="text-[13px] text-[#ff9500]">
                  Notificações bloqueadas pelo navegador. Libere nas configurações do site para receber push.
                </p>
              </template>
              <template v-else>
                <div class="flex items-center justify-between gap-3">
                  <p class="text-[13px]" :class="push.isSubscribed.value ? 'text-[#30d158]' : 'text-[var(--muted)]'">
                    {{ push.isSubscribed.value ? '✓ Este aparelho recebe notificações' : 'Este aparelho ainda não recebe notificações' }}
                  </p>
                  <button
                    v-if="!push.isSubscribed.value"
                    @click="enablePush"
                    :disabled="push.isBusy.value"
                    class="shrink-0 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-[13px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {{ push.isBusy.value ? 'Ativando…' : 'Ativar' }}
                  </button>
                  <button
                    v-else
                    @click="push.disable()"
                    :disabled="push.isBusy.value"
                    class="shrink-0 bg-[var(--bg-hover)] hover:bg-[var(--bg-hover)] disabled:opacity-50 text-[#ff3b30] text-[13px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Desativar
                  </button>
                </div>
                <p v-if="push.error.value" class="text-[12px] text-[#ff3b30] mt-2">{{ push.error.value }}</p>
              </template>
            </div>
          </div>
          <!-- Integrações -->
          <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2 mt-5">Integrações</h3>
          <div class="bg-[var(--bg)] rounded-xl divide-y divide-[var(--border)] mb-8">
            <!-- Vínculo por pessoa: quem não tem conta no MoneyAPP não tem o que
                 ajustar aqui, e oferecer o botão seria propaganda de um app que
                 ela não assina. -->
            <div v-if="hasMoneyAppLink" class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-[14px] text-[var(--text)] font-medium">Eventos do MoneyAPP</p>
                <p class="text-[12px] text-[var(--muted)]">Exibir faturas e compromissos no calendário</p>
              </div>
              <div class="flex items-center gap-3">
                <label v-if="prefs.showMoneyAppEvents" class="w-6 h-6 rounded-full overflow-hidden cursor-pointer shadow border border-[var(--border)] shrink-0" :style="{ backgroundColor: prefs.moneyAppColor || '#30d158' }">
                  <input type="color" v-model="prefs.moneyAppColor" class="opacity-0 absolute" />
                </label>
                <ToggleSwitch v-model="prefs.showMoneyAppEvents" />
              </div>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-[14px] text-[var(--text)] font-medium">Feriados Nacionais (BR)</p>
                <p class="text-[12px] text-[var(--muted)]">Exibir feriados oficiais no calendário</p>
              </div>
              <div class="flex items-center gap-3">
                <label v-if="prefs.showHolidays" class="w-6 h-6 rounded-full overflow-hidden cursor-pointer shadow border border-[var(--border)] shrink-0" :style="{ backgroundColor: prefs.holidayColor || '#6b7280' }">
                  <input type="color" v-model="prefs.holidayColor" class="opacity-0 absolute" />
                </label>
                <ToggleSwitch v-model="prefs.showHolidays" />
              </div>
            </div>
          </div>

          <!-- Calendários externos (.ics) -->
          <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Calendários externos</h3>
          <p class="text-[12px] text-[var(--muted)] mb-3 leading-relaxed">
            Cole o link <strong>.ics</strong> do Proton Calendar, Google Calendar ou Outlook. Os eventos entram
            sozinhos no grupo <strong>📅 Agenda</strong> e são atualizados a cada 15 minutos.
          </p>

          <div class="bg-[var(--bg)] rounded-xl divide-y divide-[var(--border)] mb-3">
            <div v-if="!calendars.length" class="px-4 py-4 text-[13px] text-[var(--muted)]">
              Nenhum calendário assinado ainda.
            </div>
            <div v-for="cal in calendars" :key="cal.id" class="px-4 py-3">
              <div class="flex items-center gap-3">
                <label class="w-6 h-6 rounded-full overflow-hidden cursor-pointer shadow border border-[var(--border)] shrink-0 relative" :style="{ backgroundColor: cal.color || '#5b8cff' }">
                  <input type="color" :value="cal.color || '#5b8cff'" @change="updateCalendar(cal, { color: ($event.target as HTMLInputElement).value })" class="opacity-0 absolute inset-0 cursor-pointer" />
                </label>
                <div class="flex-1 min-w-0">
                  <p class="text-[14px] text-[var(--text)] font-medium truncate">{{ cal.name }}</p>
                  <p class="text-[11px] truncate" :class="cal.lastStatus === 'error' ? 'text-red-400' : 'text-[var(--muted)]'">
                    {{ calendarStatus(cal) }}
                  </p>
                </div>
                <button
                  @click="syncCalendar(cal)"
                  :disabled="syncingId === cal.id"
                  class="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
                  title="Sincronizar agora"
                >
                  <ArrowPathIcon class="w-4 h-4" :class="syncingId === cal.id ? 'animate-spin' : ''" />
                </button>
                <ToggleSwitch :model-value="cal.enabled" @update:model-value="updateCalendar(cal, { enabled: $event })" />
                <button
                  @click="removeCalendar(cal)"
                  class="p-2 rounded-lg text-[var(--muted)] hover:text-red-400 hover:bg-[var(--bg-hover)] transition-colors"
                  title="Remover calendário (apaga os eventos sincronizados)"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-2 mb-2">
            <input
              v-model="newCalendar.name"
              type="text"
              placeholder="Nome (ex: Proton Calendar)"
              class="sm:w-[38%] bg-[var(--bg)] text-[var(--text)] text-[13px] rounded-lg px-3 py-2 border border-transparent focus:border-[var(--accent)] outline-none transition-colors"
            />
            <input
              v-model="newCalendar.url"
              type="url"
              placeholder="https://…/basic.ics ou webcal://…"
              class="flex-1 min-w-0 bg-[var(--bg)] text-[var(--text)] text-[13px] rounded-lg px-3 py-2 border border-transparent focus:border-[var(--accent)] outline-none transition-colors"
              @keydown.enter="addCalendar"
            />
            <button
              @click="addCalendar"
              :disabled="isAddingCalendar || !newCalendar.url.trim() || !newCalendar.name.trim()"
              class="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px] font-semibold disabled:opacity-40 transition-opacity shrink-0"
            >
              <PlusIcon class="w-4 h-4" /> {{ isAddingCalendar ? 'Assinando…' : 'Assinar' }}
            </button>
          </div>
          <p v-if="calendarError" class="text-[12px] text-red-400 mb-8">{{ calendarError }}</p>
          <div v-else class="mb-8"></div>

          <!-- Exportar Tarefas -->
          <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Exportar Tarefas (.ics)</h3>
          <p class="text-[12px] text-[var(--muted)] mb-3 leading-relaxed">
            Exporte suas tarefas agendadas para o Google Calendar, Outlook ou Apple Calendar. 
            Este link é exclusivo seu, copie e cole no seu calendário na opção "Adicionar por URL".
          </p>
          <div v-if="prefs.icsExportToken" class="flex items-center gap-2 mb-8 bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
            <input 
              type="text" 
              readonly 
              :value="`${apiBaseUrl}/feed/${prefs.icsExportToken}.ics`" 
              class="flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none min-w-0" 
              @click="($event.target as HTMLInputElement).select()"
            />
            <button 
              @click="copyToClipboard(`${apiBaseUrl}/feed/${prefs.icsExportToken}.ics`)" 
              class="px-3 py-1.5 bg-[var(--accent)] text-white text-[12px] font-semibold rounded-lg shrink-0 transition-opacity hover:opacity-90"
            >
              Copiar Link
            </button>
          </div>
          <div v-else class="mb-8 text-[13px] text-[var(--muted)]">
            Carregando link de exportação...
          </div>

          <h2 class="text-lg font-bold text-[var(--text)] mb-4 flex items-center gap-2"><SwatchIcon class="w-5 h-5 text-[var(--muted)]" /> Aparência</h2>

          <!-- Modo -->
          <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Tema</h3>
          <div class="grid grid-cols-2 gap-2 mb-5">
            <button
              @click="theme.setMode('dark')"
              class="flex items-center justify-center gap-2 py-3 rounded-xl border text-[13px] font-semibold transition-colors"
              :class="theme.mode.value === 'dark' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'"
            >
              <MoonIcon class="w-4 h-4" /> Escuro
            </button>
            <button
              @click="theme.setMode('light')"
              class="flex items-center justify-center gap-2 py-3 rounded-xl border text-[13px] font-semibold transition-colors"
              :class="theme.mode.value === 'light' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'"
            >
              <SunIcon class="w-4 h-4" /> Claro
            </button>
          </div>

          <!-- Cor de destaque -->
          <h3 class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Cor de destaque</h3>
          <div class="flex flex-wrap gap-2.5 items-center pb-4">
            <button
              v-for="c in accentPresets"
              :key="c"
              @click="theme.setAccent(c)"
              class="w-9 h-9 rounded-full border-2 transition-transform hover:scale-110"
              :style="{ backgroundColor: c }"
              :class="theme.accent.value.toLowerCase() === c ? 'border-[var(--text)]' : 'border-transparent'"
            ></button>
            <!-- Cor personalizada -->
            <label
              class="w-9 h-9 rounded-full border-2 border-dashed border-[var(--muted)] flex items-center justify-center cursor-pointer hover:border-[var(--text)] transition-colors relative overflow-hidden"
              title="Cor personalizada"
            >
              <span
                v-if="isCustomAccent"
                class="absolute inset-0"
                :style="{ backgroundColor: theme.accent.value }"
              ></span>
              <PlusIcon v-if="!isCustomAccent" class="w-4 h-4 text-[var(--muted)]" />
              <input
                type="color"
                :value="theme.accent.value"
                @input="theme.setAccent(($event.target as HTMLInputElement).value)"
                class="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>

          <h2 class="text-lg font-bold text-[var(--text)] mb-4 mt-4 flex items-center gap-2">
            <svg class="w-5 h-5 text-[var(--muted)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.02-.398-1.11-.94l-.149-.894c-.07-.424-.384-.764-.78-.93-.398-.164-.855-.142-1.205.108l-.737.527a1.125 1.125 0 01-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Sistema e Conta
          </h2>
          <div class="bg-[var(--bg)] rounded-xl divide-y divide-[var(--border)] mb-8">
            <div class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-[14px] text-[var(--text)] font-medium">Recarregar Aplicativo</p>
                <p class="text-[12px] text-[var(--muted)]">Limpa o cache e atualiza para a versão mais recente do app (PWA)</p>
              </div>
              <button
                @click="hardReload"
                class="shrink-0 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                Forçar Atualização
              </button>
            </div>
          </div>
        </template>
      </div>

      <div class="flex border-t border-[var(--border)]">
        <button
          @click="$emit('close')"
          class="flex-1 py-3.5 text-[var(--muted)] font-medium hover:bg-[var(--bg-hover)] transition-colors"
        >
          Cancelar
        </button>
        <div class="w-[1px] bg-[var(--border)]"></div>
        <button
          @click="save"
          :disabled="isSaving || isLoading"
          class="flex-1 py-3.5 text-[var(--accent)] font-semibold hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
        >
          {{ isSaving ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api } from '@/api/client';
import { usePush } from '@/composables/usePush';
import { useTheme, accentPresets } from '@/composables/useTheme';
import {
  BellAlertIcon,
  DevicePhoneMobileIcon,
  PaperAirplaneIcon,
  Cog6ToothIcon,
  SwatchIcon,
  MoonIcon,
  SunIcon,
  PlusIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/vue/24/outline';
import ToggleSwitch from './ToggleSwitch.vue';
import TelegramLinkCard from './TelegramLinkCard.vue';

interface ReminderSettings {
  remindAtTime: boolean;
  remindBeforeEnabled: boolean;
  remindBeforeMinutes: number;
  remindDaysEnabled: boolean;
  remindDaysBefore: number;
  notifyPush: boolean;
  notifyTelegram: boolean;
  displayName: string | null;
  morningDigestEnabled: boolean;
  morningDigestTime: string;
  afternoonDigestEnabled: boolean;
  afternoonDigestTime: string;
  nightDigestEnabled: boolean;
  nightDigestTime: string;
  notificationStyle: 'all' | 'category' | 'priority';
  notifiedCategories: string[];
  notifiedPriorities: ('low' | 'medium' | 'high')[];
  notificationPeriod: 'today' | 'all';
  digestTodayOnly: boolean;
}

interface TaskGroup {
  id: string;
  name: string;
  color: string | null;
}

interface UserPrefs {
  kanbanLists: string[];
  showMoneyAppEvents: boolean;
  moneyAppColor?: string;
  showHolidays?: boolean;
  holidayColor?: string;
  icsExportToken?: string | null;
}

const emit = defineEmits<{ (e: 'close'): void }>();

const rawBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
const apiBaseUrl = rawBase.startsWith('http') 
  ? rawBase 
  : `${window.location.origin}${rawBase.startsWith('/') ? rawBase : '/' + rawBase}`;

const push = usePush();
const theme = useTheme();

const isCustomAccent = computed(
  () => !accentPresets.includes(theme.accent.value.toLowerCase())
);

const isLoading = ref(true);
const isSaving = ref(false);

const settings = ref<ReminderSettings>({
  remindAtTime: true,
  remindBeforeEnabled: true,
  remindBeforeMinutes: 30,
  remindDaysEnabled: true,
  remindDaysBefore: 7,
  notifyPush: true,
  notifyTelegram: true,
  displayName: null,
  morningDigestEnabled: true,
  morningDigestTime: "08:00",
  afternoonDigestEnabled: true,
  afternoonDigestTime: "13:00",
  nightDigestEnabled: false,
  nightDigestTime: "20:00",
  notificationStyle: 'all',
  notifiedCategories: [],
  notifiedPriorities: [],
  notificationPeriod: 'all',
  digestTodayOnly: false,
});

const taskGroups = ref<TaskGroup[]>([]);

const displayNameInput = ref('');

/** Tem conta no MoneyAPP ligada à daqui? Ver /integrations/moneyapp/status. */
const hasMoneyAppLink = ref(false);

const prefs = ref<UserPrefs>({
  kanbanLists: [],
  showMoneyAppEvents: true,
  moneyAppColor: '#30d158',
  showHolidays: true,
  holidayColor: '#6b7280',
  icsExportToken: null,
});

// ── Calendários externos (.ics) ─────────────────────────────────────────────
interface CalendarSubscription {
  id: string;
  name: string;
  url: string;
  color: string | null;
  enabled: boolean;
  lastSyncAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  lastEventCount: number;
}

interface SyncResult {
  ok: boolean;
  created: number;
  updated: number;
  deleted: number;
  events: number;
  error?: string;
}

const calendars = ref<CalendarSubscription[]>([]);
const newCalendar = ref({ name: '', url: '' });
const isAddingCalendar = ref(false);
const syncingId = ref<string | null>(null);
const calendarError = ref('');

function calendarStatus(cal: CalendarSubscription): string {
  if (cal.lastStatus === 'error') return `Erro: ${cal.lastError || 'falha na sincronização'}`;
  if (!cal.lastSyncAt) return 'Ainda não sincronizado';
  const when = new Date(cal.lastSyncAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  return `${cal.lastEventCount} evento(s) · última sync ${when}`;
}

async function addCalendar() {
  const name = newCalendar.value.name.trim();
  const url = newCalendar.value.url.trim();
  if (!name || !url || isAddingCalendar.value) return;

  isAddingCalendar.value = true;
  calendarError.value = '';
  try {
    // A primeira sync é síncrona no backend: se a URL não presta, o erro volta
    // aqui em vez de sumir num log.
    const created = await api.post<CalendarSubscription & { sync?: SyncResult }>('/calendars', { name, url });
    calendars.value.push(created);
    newCalendar.value = { name: '', url: '' };
    if (created.sync && !created.sync.ok) {
      calendarError.value = created.sync.error || 'Não consegui ler esse feed.';
    }
  } catch (err: any) {
    calendarError.value = err?.message || 'Não consegui assinar esse calendário.';
  } finally {
    isAddingCalendar.value = false;
  }
}

async function updateCalendar(cal: CalendarSubscription, patch: Partial<CalendarSubscription>) {
  Object.assign(cal, patch);
  try {
    await api.patch(`/calendars/${cal.id}`, patch);
  } catch (err) {
    console.error('Erro ao atualizar calendário:', err);
  }
}

async function syncCalendar(cal: CalendarSubscription) {
  syncingId.value = cal.id;
  calendarError.value = '';
  try {
    const result = await api.post<SyncResult>(`/calendars/${cal.id}/sync`, {});
    const fresh = await api.get<CalendarSubscription[]>('/calendars');
    calendars.value = fresh;
    if (!result.ok) calendarError.value = result.error || 'Falha na sincronização.';
  } catch (err: any) {
    calendarError.value = err?.message || 'Falha na sincronização.';
  } finally {
    syncingId.value = null;
  }
}

async function removeCalendar(cal: CalendarSubscription) {
  if (!window.confirm(`Remover "${cal.name}"? Os eventos sincronizados dele saem do calendário.`)) return;
  try {
    await api.delete(`/calendars/${cal.id}`);
    calendars.value = calendars.value.filter((c) => c.id !== cal.id);
  } catch (err) {
    console.error('Erro ao remover calendário:', err);
  }
}

const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close');
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    // Optionally we could show a toast here, but simple copy is fine for now
  }).catch(err => {
    console.error('Falha ao copiar:', err);
  });
}

onMounted(async () => {
  document.addEventListener('keydown', handleEsc);
  try {
    const [s, p, g, c, link] = await Promise.all([
      api.get<ReminderSettings>('/reminders'),
      api.get<UserPrefs>('/prefs'),
      api.get<TaskGroup[]>('/groups'),
      api.get<CalendarSubscription[]>('/calendars'),
      // Falhar aqui não pode derrubar a tela inteira de configurações; sem
      // resposta, trata como quem não tem o vínculo e some com a linha.
      api.get<{ linked: boolean }>('/integrations/moneyapp/status').catch(() => ({ linked: false }))
    ]);
    settings.value = s;
    displayNameInput.value = s.displayName || '';
    prefs.value = p;
    taskGroups.value = g;
    calendars.value = c;
    hasMoneyAppLink.value = link.linked;
  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
  } finally {
    isLoading.value = false;
  }
  push.refresh();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc);
});

async function enablePush() {
  const ok = await push.enable();
  if (ok && !settings.value.notifyPush) {
    settings.value.notifyPush = true;
  }
}

async function save() {
  isSaving.value = true;
  // Inputs numéricos podem ficar vazios/NaN — normaliza para os padrões.
  settings.value.remindBeforeMinutes = Math.min(1440, Math.max(1, Math.round(Number(settings.value.remindBeforeMinutes) || 30)));
  settings.value.remindDaysBefore = Math.min(60, Math.max(1, Math.round(Number(settings.value.remindDaysBefore) || 7)));
  settings.value.displayName = displayNameInput.value.trim() || null;
  try {
    await Promise.all([
      api.patch<ReminderSettings>('/reminders', settings.value),
      api.patch<UserPrefs>('/prefs', prefs.value)
    ]);
    window.location.reload();
    emit('close');
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
  } finally {
    isSaving.value = false;
  }
}

async function hardReload() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    for (const key of keys) {
      await caches.delete(key);
    }
  }
  window.location.reload();
}
</script>
