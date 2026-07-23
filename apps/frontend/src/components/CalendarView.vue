<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <div class="flex items-center gap-3">
        <button
          @click="openCreate(null)"
          class="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-semibold pl-3 pr-4 py-2 rounded-xl shadow transition-colors"
        >
          <PlusIcon class="w-4 h-4" /> Criar
        </button>
        <h2 class="text-[15px] sm:text-[20px] font-bold text-[var(--text)] capitalize">{{ title }}</h2>
      </div>

      <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <button
          @click="toggleTasksVisibility"
          class="flex items-center gap-2 text-[13px] font-semibold pl-2 pr-3 py-1.5 rounded-xl transition-colors border"
          :class="isTasksVisible ? 'bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]' : 'bg-[var(--bg-hover)] border-white/5 text-[var(--muted)] hover:text-white'"
          title="Exibir TodoAPP"
        >
          <img src="/logo/icon-192.png" class="w-4 h-4 rounded-full" alt="" /><span class="hidden sm:inline">TodoAPP</span>
        </button>

        <button
          @click="toggleMoneyAppVisibility"
          class="flex items-center gap-2 text-[13px] font-semibold pl-2 pr-3 py-1.5 rounded-xl transition-colors border"
          :class="isMoneyAppVisible ? 'bg-[#30d158]/20 border-[#30d158] text-[#30d158]' : 'bg-[var(--bg-hover)] border-white/5 text-[var(--muted)] hover:text-white'"
          title="Exibir lançamentos do MoneyAPP"
        >
          <img src="/moneyapp-logo.png" class="w-4 h-4 rounded-full" alt="" /><span class="hidden sm:inline">MoneyAPP</span>
        </button>

        <button @click="navigate(-1)" title="Anterior (←)" class="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          <ChevronLeftIcon class="w-5 h-5" />
        </button>
        <button @click="navigate(1)" title="Próximo (→)" class="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          <ChevronRightIcon class="w-5 h-5" />
        </button>
        <div class="flex items-center bg-[var(--bg-hover)] rounded-lg border border-white/5 p-0.5 ml-1">
          <button
            v-for="vt in viewTypes"
            :key="vt.id"
            @click="setViewType(vt.id)"
            :title="`${vt.label} (${vt.key.toUpperCase()})`"
            class="px-2 sm:px-3 py-1 rounded-md text-[12px] sm:text-[13px] font-medium transition-colors flex items-center gap-1.5"
            :class="viewType === vt.id ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'"
          >
            {{ vt.label }}
            <span class="hidden sm:inline text-[10px] font-bold uppercase" :class="viewType === vt.id ? 'opacity-60' : 'opacity-40'">{{ vt.key }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════ MONTH ══════════ -->
    <template v-if="viewType === 'month'">
      <div class="grid grid-cols-7 gap-px mb-1">
        <div
          v-for="(wd, i) in weekdayHeaders"
          :key="wd"
          class="text-center text-[11px] font-bold uppercase tracking-wide py-1"
          :class="i >= 5 ? 'text-[#ff453a]/70' : 'text-[var(--muted)]'"
        >
          {{ wd }}
        </div>
      </div>
      <div class="grid grid-cols-7 gap-px bg-[var(--border-soft)] rounded-xl overflow-hidden flex-1 auto-rows-fr">
        <div
          v-for="cell in monthCells"
          :key="cell.key"
          class="bg-[var(--bg)] p-1 md:p-1.5 min-h-[60px] md:min-h-[92px] flex flex-col overflow-hidden cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
          :class="{ 'opacity-40': !cell.inMonth, 'weekend-cell': isWeekend(cell.date) }"
          @click.self="openCreate(cell.date)"
        >
          <div class="flex justify-between items-center mb-1 pointer-events-none">
            <span
              class="text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors"
              :class="cell.isToday ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--muted)]'"
            >
              {{ cell.date.getDate() }}
            </span>
          </div>
          <div class="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
            <button
              v-for="occ in cell.occurrences"
              :key="occ.key"
              @click.stop="onEventClick(occ)"
              class="w-full text-left rounded-md pl-2 pr-1 py-0.5 text-[10px] leading-tight text-white transition-all border-l-2 overflow-hidden"
              :class="[occ.task.completedAt ? 'opacity-35 line-through' : 'hover:brightness-110']"
              :style="eventMonthStyle(occ.task)"
              :title="occ.task.description"
            >
              <span class="flex items-center gap-1 min-w-0">
                <img v-if="occ.isMoneyApp" src="/moneyapp-logo.png" class="w-3 h-3 rounded-full shrink-0" alt="" />
                <span class="truncate font-medium">{{ timeLabel(occ.date) }}{{ occ.task.description }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ══════════ YEAR ══════════ -->
    <template v-else-if="viewType === 'year'">
      <div class="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
          <div v-for="m in yearMonths" :key="m.index" class="bg-[var(--bg)] border border-[var(--border-soft)] rounded-xl p-3">
            <button
              @click="cursor = new Date(cursor.getFullYear(), m.index, 1); viewType = 'month'"
              class="text-[13px] font-semibold text-[var(--accent)] capitalize mb-2 hover:underline"
            >
              {{ m.name }}
            </button>
            <div class="grid grid-cols-7 gap-y-0.5">
              <span v-for="(wd, i) in weekdayHeaders" :key="i" class="text-center text-[9px] font-bold text-[var(--muted)]">
                {{ wd.charAt(0) }}
              </span>
              <button
                v-for="(cell, i) in m.cells"
                :key="i"
                :disabled="!cell"
                @click="cell && (cursor = new Date(cell.date), viewType = 'day')"
                class="relative h-7 flex items-center justify-center text-[11px] rounded-full transition-colors"
                :class="cell ? (cell.isToday ? 'bg-[#ff3b30] text-white font-bold' : 'text-[var(--text)] hover:bg-[var(--bg-hover)]') : ''"
              >
                <template v-if="cell">
                  {{ formatDateCell(cell.date) }}
                  <span
                    v-if="cell.eventStyle && !cell.isToday"
                    class="absolute bottom-0.5 w-1 h-1 rounded-full"
                    :style="{ backgroundColor: cell.eventStyle.backgroundColor }"
                  ></span>
                </template>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══════════ WEEK / DAY ══════════ -->
    <template v-else>
      <!-- No mobile a semana rola horizontalmente (cabeçalho e grade juntos) -->
      <div class="flex-1 bg-[var(--bg)] border border-[var(--border-soft)] rounded-xl overflow-x-auto overflow-y-hidden min-h-0 custom-scrollbar">
      <div class="h-full flex flex-col" :class="viewType === 'week' ? 'min-w-[680px]' : ''">
        <!-- Day headers + all-day row -->
        <div class="flex border-b border-[var(--border-soft)] shrink-0">
          <div class="w-14 shrink-0 border-r border-[var(--border-soft)]"></div>
          <div
            v-for="day in gridDays"
            :key="day.key"
            class="flex-1 min-w-0 py-2 px-1 text-center border-r border-[var(--border-soft)] last:border-r-0 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
            :class="{ 'weekend-cell': isWeekend(day.date) }"
            @click="cursor = new Date(day.date); viewType = 'day'"
          >
            <p class="text-[10px] font-bold uppercase tracking-widest mb-0.5" :class="day.isToday ? 'text-[var(--accent)]' : (isWeekend(day.date) ? 'text-[#ff453a]/80' : 'text-[var(--muted)]')">
              {{ weekdays[day.date.getDay()] }}
            </p>
            <span
              class="text-[17px] font-bold w-9 h-9 flex items-center justify-center rounded-full mx-auto transition-all"
              :class="day.isToday ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/40' : 'text-[var(--text)] hover:bg-[var(--bg-hover)]'"
            >
              {{ day.date.getDate() }}
            </span>
            <div class="space-y-0.5 mt-1.5">
              <button
                v-for="occ in day.allDay"
                :key="occ.key"
                @click.stop="onEventClick(occ)"
                class="w-full text-left rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white transition-all border-l-2 overflow-hidden"
                :class="[occ.task.completedAt ? 'opacity-40 line-through' : 'hover:brightness-110']"
                :style="eventMonthStyle(occ.task)"
                :title="occ.task.description"
              >
                <span class="flex items-center gap-1 min-w-0">
                  <img v-if="occ.isMoneyApp" src="/moneyapp-logo.png" class="w-3 h-3 rounded-full shrink-0" alt="" />
                  <span class="truncate">{{ occ.task.description }}</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Time grid -->
        <div class="flex-1 overflow-y-auto custom-scrollbar" ref="scrollEl">
          <div class="flex relative" :style="{ height: 24 * HOUR_PX + 'px' }">
            <!-- Hour gutter -->
            <div class="w-14 shrink-0 border-r border-[var(--border-soft)] relative">
              <span
                v-for="h in 23"
                :key="h"
                class="absolute right-1.5 -translate-y-1/2 text-[10px] text-[var(--muted)]"
                :style="{ top: h * HOUR_PX + 'px' }"
              >
                {{ String(h).padStart(2, '0') }}:00
              </span>
            </div>

            <!-- Day columns -->
            <div
              v-for="day in gridDays"
              :key="day.key"
              class="flex-1 min-w-0 relative border-r border-[var(--border-soft)] last:border-r-0 cursor-pointer"
              :class="{ 'weekend-cell': isWeekend(day.date) }"
              @click="onSlotClick(day.date, $event)"
              @mousemove="onSlotHover(day.key, $event)"
              @mouseleave="hoverSlot = null"
            >
              <!-- hour lines -->
              <div
                v-for="h in 23"
                :key="h"
                class="absolute left-0 right-0 border-t border-[var(--border-soft)] pointer-events-none"
                :style="{ top: h * HOUR_PX + 'px' }"
              ></div>

              <!-- hover ghost (slots de 30 min, estilo Google Calendar) -->
              <div
                v-if="hoverSlot && hoverSlot.dayKey === day.key"
                class="absolute left-0.5 right-1 rounded-md bg-[var(--accent-soft)] border border-[var(--accent)] pointer-events-none z-[5] px-1.5 pt-0.5"
                :style="{ top: (hoverSlot.min / 60) * HOUR_PX + 1 + 'px', height: HOUR_PX / 2 - 2 + 'px' }"
              >
                <span class="text-[10px] font-semibold text-[var(--accent)] leading-none">{{ fmtMin(hoverSlot.min) }}</span>
              </div>

              <!-- events -->
              <button
                v-for="occ in day.timed"
                :key="occ.key"
                @click.stop="onEventClick(occ)"
                @mousemove.stop="hoverSlot = null"
                class="absolute text-left text-[11px] leading-tight text-white overflow-hidden transition-all rounded-md"
                :class="[occ.task.completedAt ? 'opacity-35 line-through' : 'hover:brightness-110 hover:shadow-lg', resizingState?.occKey === occ.key ? 'z-50 !transition-none' : '']"
                :style="[occ.style, eventTimedStyle(occ.task), resizingState?.occKey === occ.key ? { top: resizingState.topPx, height: resizingState.heightPx } : {}]"
                :title="occ.task.description"
              >
                <!-- left accent bar -->
                <span class="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md" :style="{ backgroundColor: priorityAccentColor(occ.task) }"></span>
                <div class="pl-2 pr-1 py-1 flex flex-col h-full justify-start pointer-events-none">
                  <span class="font-semibold truncate text-[11px] leading-none mb-0.5 flex items-center gap-1">
                    <img v-if="occ.isMoneyApp" src="/moneyapp-logo.png" class="w-3 h-3 rounded-full shrink-0" alt="" />
                    <span class="truncate">{{ occ.task.description }}</span>
                  </span>
                  <span class="text-[9.5px] opacity-75 font-medium">{{ resizingState?.occKey === occ.key ? resizingState.labelTime : timedRangeLabel(occ) }}</span>
                </div>

                <!-- Drag handles -->
                <div v-if="!occ.isMoneyApp && !occ.task.completedAt" class="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-20" @mousedown.stop="onResizeStart($event, occ, 'top')"></div>
                <div v-if="!occ.isMoneyApp && !occ.task.completedAt" class="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20" @mousedown.stop="onResizeStart($event, occ, 'bottom')"></div>
              </button>

              <!-- current time indicator -->
              <div
                v-if="day.isToday"
                class="absolute left-0 right-0 pointer-events-none z-10"
                :style="{ top: nowOffsetPx + 'px' }"
              >
                <div class="relative border-t-[1.5px] border-[#ff3b30]">
                  <span class="absolute -left-1 -top-[5px] w-2.5 h-2.5 rounded-full bg-[#ff3b30] time-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </template>
  </div>

  <TaskDetailsPanel
    v-if="isCreateOpen"
    :initial-date="createDate"
    @close="isCreateOpen = false"
  />

  <div v-if="conflictPrompt" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" @click.self="conflictPrompt = null">
    <div class="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-sm border border-white/10 p-6">
      <h3 class="text-lg font-semibold text-white mb-4">{{ conflictPrompt.events.length > 1 ? 'Múltiplos eventos' : 'Evento Existente' }}</h3>
      <p class="text-[13px] text-[var(--muted)] mb-5">
        {{ conflictPrompt.events.length > 1 ? 'Você clicou em um horário com múltiplos eventos. O que deseja fazer?' : 'Você clicou em um horário que já possui um evento. O que deseja fazer?' }}
      </p>
      <div class="flex flex-col gap-2">
        <button @click="openCreate(conflictPrompt.date); conflictPrompt = null" class="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium transition-colors">
          Inserir novo evento
        </button>
        <button
          v-for="occ in conflictPrompt.events"
          :key="occ.key"
          @click="viewOccurrence(occ)"
          class="w-full py-2.5 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg)] border border-[var(--border)] text-white font-medium transition-colors truncate px-3"
        >
          Visualizar: {{ occ.task.description }}
        </button>
      </div>
      <div class="mt-4 pt-4 border-t border-white/5">
        <button @click="conflictPrompt = null" class="w-full py-2 rounded-xl text-[var(--muted)] hover:text-white hover:bg-[var(--bg-hover)] font-medium transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  </div>

  <!-- Lista de lançamentos do MoneyAPP no dia -->
  <div v-if="moneyList" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" @click.self="moneyList = null">
    <div class="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md border border-white/10 p-6">
      <div class="flex items-center gap-2 mb-1">
        <img src="/moneyapp-logo.png" class="w-5 h-5 rounded-full" alt="MoneyAPP" />
        <h3 class="text-lg font-semibold text-white flex-1">Lançamentos do MoneyAPP</h3>
        <span class="text-[12px] font-bold text-[#30d158] bg-[#30d158]/10 border border-[#30d158]/40 rounded-full px-2.5 py-0.5">
          {{ moneyList.events.length }}
        </span>
      </div>
      <p class="text-[13px] text-[var(--muted)] capitalize mb-4">
        {{ moneyList.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}
      </p>

      <div class="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-2 pr-1">
        <button
          v-for="ev in moneyList.events"
          :key="ev.id"
          @click="moneyDetail = ev"
          class="w-full flex items-center gap-3 rounded-xl bg-[var(--bg)] hover:bg-[var(--bg-hover)] border border-white/5 px-3 py-2.5 text-left transition-colors"
        >
          <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: ev.color || '#30d158' }"></span>
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-semibold text-white truncate">{{ ev.title }}</p>
            <p class="text-[11px] text-[var(--muted)]">{{ timeLabel(new Date(ev.date), true).trim() }}<template v-if="ev.category"> · {{ ev.category }}</template></p>
          </div>
          <span class="text-[13px] font-bold shrink-0" :class="ev.type === 'expense' ? 'text-[#ff453a]' : 'text-[#30d158]'">
            {{ moneyAmountLabel(ev) }}
          </span>
        </button>
      </div>

      <div class="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
        <span class="text-[13px] text-[var(--muted)]">Total do dia:
          <span class="font-bold" :class="moneyListTotal < 0 ? 'text-[#ff453a]' : 'text-[#30d158]'">
            {{ (moneyListTotal < 0 ? '-' : '+') + formatBRL(moneyListTotal) }}
          </span>
        </span>
        <button @click="moneyList = null" class="px-4 py-2 rounded-full text-[13px] font-semibold text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-white transition-colors">
          Fechar
        </button>
      </div>
    </div>
  </div>

  <!-- Detalhes da transação (estilo MoneyAPP) -->
  <div v-if="moneyDetail" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4" @click.self="moneyDetail = null">
    <div class="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md border border-white/10 p-6">
      <div class="flex items-center gap-2.5 mb-5">
        <img src="/moneyapp-logo.png" class="w-8 h-8 rounded-full" alt="MoneyAPP" />
        <div>
          <h3 class="text-xl font-bold text-white leading-tight">Detalhes da Transação</h3>
          <p class="text-[11px] font-semibold text-[#30d158] uppercase tracking-wide">MoneyAPP</p>
        </div>
      </div>

      <div class="bg-[var(--bg)] rounded-xl px-4 py-3 border border-white/5 mb-3">
        <p class="text-[12px] text-[var(--muted)] mb-0.5">Descrição</p>
        <p class="text-[15px] font-semibold text-white break-words">{{ moneyDetail.title }}</p>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="bg-[var(--bg)] rounded-xl px-4 py-3 border border-white/5">
          <p class="text-[12px] text-[var(--muted)] mb-0.5">💰 Valor</p>
          <p class="text-[16px] font-bold" :class="moneyDetail.type === 'expense' ? 'text-[#ff453a]' : 'text-[#30d158]'">
            {{ moneyAmountLabel(moneyDetail) }}
          </p>
        </div>
        <div class="bg-[var(--bg)] rounded-xl px-4 py-3 border border-white/5">
          <p class="text-[12px] text-[var(--muted)] mb-0.5">📅 Data</p>
          <p class="text-[15px] font-semibold text-white">{{ moneyDateLabel(moneyDetail) }}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="bg-[var(--bg)] rounded-xl px-4 py-3 border border-white/5">
          <p class="text-[12px] text-[var(--muted)] mb-0.5 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full inline-block" :style="{ backgroundColor: moneyDetail.color || '#30d158' }"></span>Categoria
          </p>
          <p class="text-[15px] font-semibold text-white truncate">{{ moneyDetail.category || 'Sem categoria' }}</p>
        </div>
        <div class="bg-[var(--bg)] rounded-xl px-4 py-3 border border-white/5">
          <p class="text-[12px] text-[var(--muted)] mb-1">Status</p>
          <span class="inline-block text-[11px] font-bold border rounded-full px-2.5 py-0.5" :class="moneyStatusInfo(moneyDetail).cls">
            {{ moneyStatusInfo(moneyDetail).label }}
          </span>
        </div>
      </div>

      <div v-if="moneyDetail.hasReceipt" class="flex items-center justify-between bg-[var(--bg)] rounded-xl px-4 py-3 border border-white/5 mb-3">
        <p class="text-[13px] font-semibold text-[#30d158]">🧾 Comprovante</p>
        <button
          @click="openReceipt"
          :disabled="receiptLoading"
          class="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-white text-black hover:bg-white/80 disabled:opacity-50 transition-colors"
        >
          {{ receiptLoading ? 'Carregando…' : 'Ver Comprovante' }}
        </button>
      </div>

      <div class="flex justify-end gap-2 mt-5">
        <button
          @click="openMoneyApp"
          class="px-4 py-2 rounded-full text-[13px] font-semibold text-[#30d158] border border-[#30d158]/40 hover:bg-[#30d158]/10 transition-colors"
        >
          Abrir no MoneyAPP
        </button>
        <button
          @click="moneyDetail = null"
          class="px-4 py-2 rounded-full text-[13px] font-semibold bg-[var(--bg-hover)] text-white hover:bg-[var(--bg)] border border-white/10 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>

  <!-- Visualizador de comprovante (imagem ou PDF) -->
  <div v-if="receiptView" class="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[80] p-4" @click.self="closeReceipt">
    <button
      @click="closeReceipt"
      class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-lg font-bold transition-colors"
      title="Fechar (Esc)"
    >
      ✕
    </button>
    <iframe v-if="receiptView.isPdf" :src="receiptView.url" class="w-full max-w-3xl h-[85vh] rounded-xl bg-white border-0"></iframe>
    <img v-else :src="receiptView.url" class="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" alt="Comprovante" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { api } from '@/api/client';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  ArrowPathIcon,
  ListBulletIcon,
  FolderIcon,
  BriefcaseIcon,
  ShoppingCartIcon,
  StarIcon
} from '@heroicons/vue/24/outline';
import { CalendarIcon } from '@heroicons/vue/24/solid';
import type { TaskDto, Occurrence } from '@todoapp/models';
import { useTasksStore } from '@/stores/tasks';
import TaskDetailsPanel from './TaskDetailsPanel.vue';

const props = defineProps<{ tasks: TaskDto[] }>();
const emit = defineEmits<{ (e: 'task-click', task: TaskDto): void }>();

const tasksStore = useTasksStore();

const HOUR_PX = 48;
// Indexado por getDay() (0=Dom) — usado nos cabeçalhos de Semana/Dia.
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
// Ordem visual das colunas do Mês (semana começa na segunda).
const weekdayHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

type ViewType = 'month' | 'week' | 'day' | 'year';
// No mobile a semana força rolagem horizontal — abre direto na visão Dia.
const viewType = ref<ViewType>(window.innerWidth < 640 ? 'day' : 'week');
const viewTypes: { id: ViewType; label: string; key: string }[] = [
  { id: 'day', label: 'Dia', key: 'd' },
  { id: 'week', label: 'Semana', key: 'w' },
  { id: 'month', label: 'Mês', key: 'm' },
  { id: 'year', label: 'Ano', key: 'y' },
];

function setViewType(vtId: ViewType) {
  if (vtId === 'day' || vtId === 'week') {
    cursor.value = new Date();
  }
  viewType.value = vtId;
}

const cursor = ref(new Date());
const now = ref(new Date());
const nowTimer = window.setInterval(() => (now.value = new Date()), 60_000);
onBeforeUnmount(() => window.clearInterval(nowTimer));

const isCreateOpen = ref(false);
const createDate = ref<Date | null>(null);

const scrollEl = ref<HTMLElement | null>(null);
async function scrollToMorning() {
  await nextTick();
  if (scrollEl.value) scrollEl.value.scrollTop = 7 * HOUR_PX;
}
onMounted(scrollToMorning);
watch(viewType, scrollToMorning);

// Atalhos estilo Google Calendar: D/W/M trocam a visão, T = hoje, ←/→ navegam.
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (receiptView.value) {
      closeReceipt();
      e.preventDefault();
      return;
    }
    if (moneyDetail.value) {
      moneyDetail.value = null;
      e.preventDefault();
      return;
    }
    if (moneyList.value) {
      moneyList.value = null;
      e.preventDefault();
      return;
    }
    if (conflictPrompt.value) {
      conflictPrompt.value = null;
      e.preventDefault();
      return;
    }
    if (isCreateOpen.value) {
      isCreateOpen.value = false;
      e.preventDefault();
      return;
    }
  }

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    if (!isCreateOpen.value && !conflictPrompt.value && !moneyDetail.value && !moneyList.value && !receiptView.value) {
      openCreate(null);
    }
    return;
  }

  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target as HTMLElement | null;
  if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
  if (isCreateOpen.value || conflictPrompt.value || moneyDetail.value || moneyList.value || receiptView.value) return;

  switch (e.key.toLowerCase()) {
    case 'd': setViewType('day'); break;
    case 'w': setViewType('week'); break;
    case 'm': setViewType('month'); break;
    case 'y': setViewType('year'); break;
    case 't': goToday(); break;
    case 'c': openCreate(null); break;
    case 'arrowleft':
    case 'p':
    case 'k': navigate(-1); break;
    case 'arrowright':
    case 'n':
    case 'j': navigate(1); break;
    default: return;
  }
  e.preventDefault();
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

// ── date helpers ────────────────────────────────────────────────────────────

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}
// Semana começa na SEGUNDA (getDay: 0=Dom … 6=Sáb → offset até a segunda anterior).
function startOfWeek(d: Date) {
  const offset = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
}

function formatDateCell(date: Date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}

// ── recurrence expansion (estilo Google Calendar) ──────────────────────────
// `scheduledAt` é a primeira ocorrência; a regra gera as seguintes.

function nextOccurrence(d: Date, rule: string, base: Date): Date {
  if (rule === 'daily') return addDays(d, 1);
  if (rule === 'weekdays') {
    let c = addDays(d, 1);
    while (c.getDay() === 0 || c.getDay() === 6) c = addDays(c, 1);
    return c;
  }
  if (rule === 'weekly') return addDays(d, 7);
  if (rule === 'monthly') {
    let y = d.getFullYear();
    let m = d.getMonth();
    for (let i = 0; i < 24; i++) {
      m++;
      if (m > 11) { m = 0; y++; }
      const c = new Date(y, m, base.getDate(), base.getHours(), base.getMinutes());
      if (c.getDate() === base.getDate()) return c; // pula meses sem esse dia (ex: 31)
    }
  }
  if (rule === 'yearly') {
    let y = d.getFullYear();
    for (let i = 0; i < 8; i++) {
      y++;
      const c = new Date(y, base.getMonth(), base.getDate(), base.getHours(), base.getMinutes());
      if (c.getDate() === base.getDate()) return c; // pula 29/02 em ano não bissexto
    }
  }
  return addDays(d, 1);
}



const moneyAppEvents = ref<any[]>([]);
const isMoneyAppVisible = ref(true);
const moneyAppColor = ref('#30d158');
const isTasksVisible = ref(true);

const holidays = ref<any[]>([]);
const isHolidaysVisible = ref(true);
const holidayColor = ref('#6b7280');
const fetchedHolidaysYears = new Set<number>();

async function fetchHolidays(year: number) {
  if (!isHolidaysVisible.value || fetchedHolidaysYears.has(year)) return;
  try {
    fetchedHolidaysYears.add(year);
    const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
    if (res.ok) {
      const data = await res.json();
      const newHolidays = data.map((h: any) => ({
        id: `holiday-${h.date}`,
        date: new Date(h.date + 'T12:00:00Z'),
        name: h.name,
      }));
      holidays.value.push(...newHolidays);
    }
  } catch (err) {
    console.error('Failed to fetch holidays:', err);
  }
}

watch(() => cursor.value.getFullYear(), (y) => {
  if (isHolidaysVisible.value) {
    fetchHolidays(y - 1);
    fetchHolidays(y);
    fetchHolidays(y + 1);
  }
});

function toggleTasksVisibility() {
  isTasksVisible.value = !isTasksVisible.value;
}

async function fetchMoneyAppEvents() {
  try {
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    const res = await api.get<any[]>(`/integrations/moneyapp/calendar?start=${startStr}&end=${endStr}`);
    moneyAppEvents.value = (res || []).map(ev => {
      let dStr = ev.date;
      if (dStr && typeof dStr === 'string') {
        // Parse date correctly in local time (midnight) instead of UTC to avoid day shifts
        dStr = dStr.substring(0, 10) + 'T00:00:00';
      }
      return { ...ev, date: dStr };
    });
  } catch (err) {
    console.error('Failed to fetch moneyapp events:', err);
  }
}

onMounted(async () => {
  try {
    const prefs = await api.get<{ showMoneyAppEvents: boolean; showHolidays?: boolean; moneyAppColor?: string; holidayColor?: string }>('/prefs');
    isMoneyAppVisible.value = prefs.showMoneyAppEvents;
    isHolidaysVisible.value = prefs.showHolidays ?? true;
    if (prefs.moneyAppColor) moneyAppColor.value = prefs.moneyAppColor;
    if (prefs.holidayColor) holidayColor.value = prefs.holidayColor;
    if (isMoneyAppVisible.value) {
      await fetchMoneyAppEvents();
    }
    if (isHolidaysVisible.value) {
      const y = cursor.value.getFullYear();
      fetchHolidays(y - 1);
      fetchHolidays(y);
      fetchHolidays(y + 1);
    }
  } catch (err) {
    console.error('Failed to load prefs:', err);
  }
});

async function toggleMoneyAppVisibility() {
  isMoneyAppVisible.value = !isMoneyAppVisible.value;
  try {
    await api.patch('/prefs', { showMoneyAppEvents: isMoneyAppVisible.value });
    if (isMoneyAppVisible.value && moneyAppEvents.value.length === 0) {
      await fetchMoneyAppEvents();
    }
  } catch(e) {
    console.error('Failed to update prefs', e);
  }
}

function occurrencesInRange(rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const out: Occurrence[] = [];
  
  function pushOccurrenceSplit(task: any, baseDate: Date, baseKey: string) {
    const duration = task.durationMinutes || 60;
    const startMs = baseDate.getTime();
    const endMs = startMs + duration * 60000;
    
    let currentStart = new Date(startMs);
    let i = 0;
    
    while (currentStart.getTime() < endMs) {
      const endOfDay = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate() + 1, 0, 0, 0, 0);
      const currentEndMs = Math.min(endMs, endOfDay.getTime());
      const currentDurationMins = (currentEndMs - currentStart.getTime()) / 60000;
      
      if (currentStart >= rangeStart && currentStart < rangeEnd) {
        out.push({
          task,
          date: new Date(currentStart),
          key: `${baseKey}${i > 0 ? '-split-' + i : ''}`,
          durationOverride: currentDurationMins,
          isContinuation: i > 0
        });
      }
      
      currentStart = endOfDay;
      i++;
    }
  }
  
  if (isTasksVisible.value) {
    for (const task of props.tasks) {
      if (!task.scheduledAt) continue;
      const base = new Date(task.scheduledAt);

      if (!task.recurrence) {
        const duration = task.durationMinutes || 60;
        const endMs = base.getTime() + duration * 60000;
        if (endMs > rangeStart.getTime() && base.getTime() < rangeEnd.getTime()) {
          pushOccurrenceSplit(task, base, `${task.id}`);
        }
        continue;
      }

      let d = new Date(base);
      let guard = 0;
      while (d < rangeEnd && guard++ < 5000) {
        const skip = task.recurrence === 'weekdays' && (d.getDay() === 0 || d.getDay() === 6);
        if (!skip) {
          const duration = task.durationMinutes || 60;
          const endMs = d.getTime() + duration * 60000;
          if (endMs > rangeStart.getTime()) {
            pushOccurrenceSplit(task, d, `${task.id}-${d.getTime()}`);
          }
        }
        d = nextOccurrence(d, task.recurrence, base);
      }
    }
  }

  // Merge MoneyApp events — vários lançamentos no mesmo dia viram UM chip
  // "N lançamentos" (clique abre a lista); um só abre direto os detalhes.
  if (isMoneyAppVisible.value) {
    const byDay = new Map<string, any[]>();
    for (const ev of moneyAppEvents.value) {
      const d = new Date(ev.date);
      if (d >= rangeStart && d < rangeEnd) {
        const k = dayKey(d);
        if (!byDay.has(k)) byDay.set(k, []);
        byDay.get(k)!.push(ev);
      }
    }
    for (const [k, evs] of byDay) {
      evs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (evs.length === 1) {
        const ev = evs[0];
        const d = new Date(ev.date);
        const amount = ev.amount ? ` - R$ ${ev.amount}` : '';
        out.push({
          isMoneyApp: true,
          money: ev,
          task: {
            id: ev.id,
            // /api/calendar do MoneyAPP retorna { title, color }
            description: (ev.title ?? ev.description ?? '') + amount,
            completedAt: ev.status === 'paid' ? new Date().toISOString() : null,
            categoryColor: ev.color ?? ev.categoryColor,
            type: ev.type
          },
          date: d,
          key: `moneyapp-${ev.id}`
        });
      } else {
        out.push({
          isMoneyApp: true,
          moneyGroup: evs,
          task: {
            id: `moneyapp-group-${k}`,
            description: `${evs.length} lançamentos`,
            completedAt: null,
            categoryColor: '#30d158',
            type: 'group'
          },
          date: new Date(evs[0].date),
          key: `moneyapp-group-${k}`
        });
      }
    }
  }

  // Feriados Nacionais (BR)
  if (isHolidaysVisible.value) {
    for (const h of holidays.value) {
      if (h.date >= rangeStart && h.date < rangeEnd) {
        out.push({
          isHoliday: true,
          task: {
            id: h.id,
            description: `🏖️ ${h.name}`,
            completedAt: null,
            type: 'holiday'
          },
          date: h.date,
          key: h.id
        });
      }
    }
  }

  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ── month view ──────────────────────────────────────────────────────────────

const monthCells = computed(() => {
  const year = cursor.value.getFullYear();
  const month = cursor.value.getMonth();
  const gridStart = startOfWeek(new Date(year, month, 1));
  const gridEnd = addDays(gridStart, 42);
  const occurrences = occurrencesInRange(gridStart, gridEnd);

  const byDay = new Map<string, Occurrence[]>();
  for (const occ of occurrences) {
    const key = dayKey(occ.date);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(occ);
  }

  const todayKey = dayKey(now.value);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    const key = dayKey(date);
    cells.push({
      key,
      date,
      inMonth: date.getMonth() === month,
      isToday: key === todayKey,
      occurrences: byDay.get(key) || [],
    });
  }
  return cells;
});

// ── year view ───────────────────────────────────────────────────────────────

const yearMonths = computed(() => {
  const year = cursor.value.getFullYear();
  // Um passe só pelo ano inteiro: dia → cor da lista do primeiro evento.
  const eventDays = new Map<string, any>();
  for (const occ of occurrencesInRange(new Date(year, 0, 1), new Date(year + 1, 0, 1))) {
    const key = dayKey(occ.date);
    if (!eventDays.has(key)) eventDays.set(key, groupStyle(occ.task));
  }
  const todayKey = dayKey(now.value);

  return Array.from({ length: 12 }, (_, index) => {
    const first = new Date(year, index, 1);
    const daysInMonth = new Date(year, index + 1, 0).getDate();
    const leading = (first.getDay() + 6) % 7; // colunas vazias até a segunda
    const cells: Array<{ date: Date; isToday: boolean; eventStyle?: any } | null> = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, index, d);
      const key = dayKey(date);
      cells.push({ date, isToday: key === todayKey, eventStyle: eventDays.get(key) });
    }
    return {
      index,
      name: first.toLocaleDateString('pt-BR', { month: 'long' }),
      cells,
    };
  });
});

// ── week / day views ────────────────────────────────────────────────────────

const gridDays = computed(() => {
  const first = viewType.value === 'day' ? startOfDay(cursor.value) : startOfWeek(cursor.value);
  const count = viewType.value === 'day' ? 1 : 7;
  const rangeEnd = addDays(first, count);
  const occurrences = occurrencesInRange(first, rangeEnd);
  const todayKey = dayKey(now.value);

  return Array.from({ length: count }, (_, i) => {
    const date = addDays(first, i);
    const key = dayKey(date);
    const dayOccs = occurrences.filter((o) => dayKey(o.date) === key);
    const allDay = dayOccs.filter((o) => o.date.getHours() === 0 && o.date.getMinutes() === 0 && !o.isContinuation);
    const timed = layoutTimed(dayOccs.filter((o) => o.date.getHours() !== 0 || o.date.getMinutes() !== 0 || o.isContinuation));
    return { key, date, isToday: key === todayKey, allDay, timed };
  });
});

// Duração visual do evento em minutos (padrão 1h; mínimo 15min p/ dar clique).
function occDuration(occ: Occurrence) {
  return Math.max(15, occ.durationOverride ?? occ.task.durationMinutes ?? 60);
}

// Blocos com a duração real; eventos sobrepostos dividem a largura (lanes).
function layoutTimed(occs: Occurrence[]): Occurrence[] {
  if (occs.length === 0) return [];

  // Ordena por horário de início
  const sorted = [...occs].sort((a, b) => {
    const aStart = a.date.getHours() * 60 + a.date.getMinutes();
    const bStart = b.date.getHours() * 60 + b.date.getMinutes();
    return aStart - bStart;
  });

  const clusters: { occ: Occurrence; start: number; end: number; col?: number }[][] = [];
  let currentCluster: { occ: Occurrence; start: number; end: number; col?: number }[] = [];
  let currentClusterEnd = 0;

  for (const occ of sorted) {
    const start = occ.date.getHours() * 60 + occ.date.getMinutes();
    const end = Math.min(start + occDuration(occ), 24 * 60); // clampa na meia-noite

    if (currentCluster.length > 0 && start >= currentClusterEnd) {
      clusters.push(currentCluster);
      currentCluster = [];
      currentClusterEnd = 0;
    }

    currentCluster.push({ occ, start, end });
    if (end > currentClusterEnd) {
      currentClusterEnd = end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const placed: Occurrence[] = [];

  for (const cluster of clusters) {
    const columns: typeof currentCluster[] = [];

    for (const item of cluster) {
      let placedInColumn = false;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const lastInCol = col[col.length - 1];
        if (lastInCol.end <= item.start) {
          col.push(item);
          item.col = i;
          placedInColumn = true;
          break;
        }
      }
      if (!placedInColumn) {
        item.col = columns.length;
        columns.push([item]);
      }
    }

    const numCols = columns.length;
    for (const item of cluster) {
      item.occ.style = {
        top: (item.start / 60) * HOUR_PX + 1 + 'px',
        height: ((item.end - item.start) / 60) * HOUR_PX - 2 + 'px',
        left: `calc(${(item.col! / numCols) * 100}% + 1px)`,
        width: `calc(${100 / numCols}% - 2px)`,
      };
      placed.push(item.occ);
    }
  }

  return placed;
}

const nowOffsetPx = computed(
  () => ((now.value.getHours() * 60 + now.value.getMinutes()) / 60) * HOUR_PX
);

// ── navigation / title ──────────────────────────────────────────────────────

function navigate(dir: number) {
  const c = cursor.value;
  if (viewType.value === 'year') cursor.value = new Date(c.getFullYear() + dir, c.getMonth(), 1);
  else if (viewType.value === 'month') cursor.value = new Date(c.getFullYear(), c.getMonth() + dir, 1);
  else if (viewType.value === 'week') cursor.value = addDays(c, 7 * dir);
  else cursor.value = addDays(c, dir);
}
function goToday() {
  cursor.value = new Date();
}

const title = computed(() => {
  const c = cursor.value;
  if (viewType.value === 'year') {
    return String(c.getFullYear());
  }
  if (viewType.value === 'month') {
    const monthName = c.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const num = `${String(c.getMonth() + 1).padStart(2, '0')}/${c.getFullYear()}`;
    return `${num} - ${monthName}`;
  }
  if (viewType.value === 'week') {
    const start = startOfWeek(c);
    const end = addDays(start, 6);
    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
  }
  
  const dayName = c.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const num = `${String(c.getDate()).padStart(2, '0')}/${String(c.getMonth() + 1).padStart(2, '0')}/${c.getFullYear()}`;
  return `${num} - ${dayName}`;
});

// ── create ──────────────────────────────────────────────────────────────────

function openCreate(date: Date | null) {
  if (date) {
    const d = new Date(date);
    if (d.getHours() === 0 && d.getMinutes() === 0) d.setHours(9, 0, 0, 0);
    createDate.value = d;
  } else {
    createDate.value = null;
  }
  isCreateOpen.value = true;
}

// Snap do mouse em slots de 30 min, robusto mesmo quando o alvo é um filho
// (usa a posição da coluna, não o offsetY do elemento sob o cursor).
const hoverSlot = ref<{ dayKey: string; min: number } | null>(null);

function slotMinFromEvent(event: MouseEvent): number {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const y = event.clientY - rect.top;
  const min = Math.floor(y / (HOUR_PX / 2)) * 30;
  return Math.max(0, Math.min(23 * 60 + 30, min));
}

function onSlotHover(dayKey: string, event: MouseEvent) {
  hoverSlot.value = { dayKey, min: slotMinFromEvent(event) };
}

function fmtMin(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

const conflictPrompt = ref<{ date: Date, events: Occurrence[] } | null>(null);

function onSlotClick(day: Date, event: MouseEvent) {
  const min = slotMinFromEvent(event);
  const slotStartMin = Math.floor(min / 30) * 30; // 30-min block start
  const slotEndMin = slotStartMin + 30;
  
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(min / 60), min % 60, 0, 0);

  const dayKeyStr = dayKey(day);
  const dayData = gridDays.value.find(g => g.key === dayKeyStr);

  if (dayData) {
    const overlappingEvents = dayData.timed.filter(occ => {
      const occStartMin = occ.date.getHours() * 60 + occ.date.getMinutes();
      const occEndMin = occStartMin + occDuration(occ);
      return slotStartMin < occEndMin && slotEndMin > occStartMin;
    });

    if (overlappingEvents.length >= 1) {
      conflictPrompt.value = { date: d, events: overlappingEvents };
      return;
    }
  }

  createDate.value = d;
  isCreateOpen.value = true;
}

function onEventClick(occ: Occurrence) {
  if (occ.moneyGroup) {
    moneyList.value = { date: occ.date, events: occ.moneyGroup };
    return;
  }
  if (occ.isMoneyApp) {
    moneyDetail.value = occ.money;
    return;
  }
  conflictPrompt.value = { date: occ.date, events: [occ] };
}

function viewOccurrence(occ: Occurrence) {
  conflictPrompt.value = null;
  if (occ.moneyGroup) moneyList.value = { date: occ.date, events: occ.moneyGroup };
  else if (occ.isMoneyApp) moneyDetail.value = occ.money;
  else emit('task-click', occ.task);
}

// ── resize ──────────────────────────────────────────────────────────────────

const resizingState = ref<{
  occKey: string;
  topPx: string;
  heightPx: string;
  labelTime: string;
  task: any;
  initialStartMin: number;
  initialDuration: number;
  newStartMin: number;
  newDuration: number;
  type: 'top' | 'bottom';
  initialY: number;
} | null>(null);

function onResizeStart(event: MouseEvent, occ: Occurrence, type: 'top' | 'bottom') {
  if (event.button !== 0) return; // Only left click
  event.stopPropagation();
  event.preventDefault();

  const startMin = occ.date.getHours() * 60 + occ.date.getMinutes();
  const dur = occDuration(occ);
  
  resizingState.value = {
    occKey: occ.key,
    task: occ.task,
    type,
    initialY: event.clientY,
    initialStartMin: startMin,
    initialDuration: dur,
    newStartMin: startMin,
    newDuration: dur,
    topPx: occ.style!.top as string,
    heightPx: occ.style!.height as string,
    labelTime: timedRangeLabel(occ)
  };

  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', onResizeEnd);
}

function onResizeMove(event: MouseEvent) {
  if (!resizingState.value) return;
  const state = resizingState.value;
  
  const diffPx = event.clientY - state.initialY;
  const diffMins = Math.round((diffPx / HOUR_PX) * 60 / 15) * 15;
  
  let newStart = state.initialStartMin;
  let newDur = state.initialDuration;

  if (state.type === 'bottom') {
    newDur = state.initialDuration + diffMins;
    if (newDur < 15) newDur = 15;
  } else if (state.type === 'top') {
    newStart = state.initialStartMin + diffMins;
    newDur = state.initialDuration - diffMins;
    if (newDur < 15) {
      const excess = 15 - newDur;
      newStart -= excess;
      newDur = 15;
    }
  }

  state.newStartMin = newStart;
  state.newDuration = newDur;
  state.topPx = (newStart / 60) * HOUR_PX + 1 + 'px';
  state.heightPx = (newDur / 60) * HOUR_PX - 2 + 'px';
  
  const startD = new Date();
  startD.setHours(Math.floor(newStart / 60), newStart % 60, 0, 0);
  const endD = new Date(startD.getTime() + newDur * 60000);
  state.labelTime = `${timeLabel(startD, true).trim()} – ${timeLabel(endD, true).trim()}`;
}

async function onResizeEnd() {
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
  
  if (!resizingState.value) return;
  
  const state = resizingState.value;
  resizingState.value = null;
  
  if (state.newDuration === state.initialDuration && state.newStartMin === state.initialStartMin) {
    return;
  }
  
  const updates: any = {};
  if (state.newDuration !== state.initialDuration) {
    updates.durationMinutes = state.newDuration;
  }
  if (state.newStartMin !== state.initialStartMin) {
    if (state.task.scheduledAt) {
      const d = new Date(state.task.scheduledAt);
      d.setHours(Math.floor(state.newStartMin / 60), state.newStartMin % 60, 0, 0);
      updates.scheduledAt = d.toISOString();
    }
  }
  
  try {
    await tasksStore.updateTaskFields(state.task.id, updates);
  } catch (err) {
    console.error('Failed to update task after resize', err);
  }
}

// ── modais do MoneyAPP (detalhe + lista do dia) ─────────────────────────────

const moneyDetail = ref<any | null>(null);
const moneyList = ref<{ date: Date; events: any[] } | null>(null);

const moneyListTotal = computed(() => {
  if (!moneyList.value) return 0;
  return moneyList.value.events.reduce((sum, ev) => {
    const v = Math.abs(Number(ev.amount) || 0);
    return sum + (ev.type === 'expense' ? -v : v);
  }, 0);
});

function formatBRL(n: number) {
  return Math.abs(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function moneyAmountLabel(ev: any) {
  const sign = ev.type === 'expense' ? '-' : '+';
  return `${sign}${formatBRL(Number(ev.amount) || 0)}`;
}

function moneyStatusInfo(ev: any): { label: string; cls: string } {
  const s = String(ev.status || '').toLowerCase();
  if (s === 'paid') return { label: 'PAGO', cls: 'text-[#30d158] border-[#30d158]/40 bg-[#30d158]/10' };
  if (s === 'pending') return { label: 'PENDENTE', cls: 'text-[#ffcc00] border-[#ffcc00]/40 bg-[#ffcc00]/10' };
  return { label: (ev.status || '—').toUpperCase(), cls: 'text-[var(--muted)] border-white/10 bg-white/5' };
}

function moneyDateLabel(ev: any) {
  const d = new Date(ev.date);
  const day = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.getHours() === 0 && d.getMinutes() === 0 ? '' : ` · ${timeLabel(d, true).trim()}`;
  return day + time;
}

function openMoneyApp() {
  const moneyAppUrl = import.meta.env.VITE_MONEYAPP_API_URL?.replace('/api', '');
  if (moneyAppUrl) window.open(moneyAppUrl, '_blank');
}

const receiptView = ref<{ url: string; isPdf: boolean } | null>(null);
const receiptLoading = ref(false);

async function openReceipt() {
  if (!moneyDetail.value || receiptLoading.value) return;
  receiptLoading.value = true;
  try {
    const blob = await api.getBlob(`/integrations/moneyapp/receipt/${moneyDetail.value.id}`);
    receiptView.value = { url: URL.createObjectURL(blob), isPdf: blob.type === 'application/pdf' };
  } catch (err) {
    console.error('Erro ao carregar comprovante:', err);
  } finally {
    receiptLoading.value = false;
  }
}

function closeReceipt() {
  if (receiptView.value) URL.revokeObjectURL(receiptView.value.url);
  receiptView.value = null;
}

function isWeekend(d: Date) {
  const g = d.getDay();
  return g === 0 || g === 6;
}

// ── misc ────────────────────────────────────────────────────────────────────

function timeLabel(d: Date, always = false) {
  if (!always && d.getHours() === 0 && d.getMinutes() === 0) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} `;
}

// "08:00 – 09:30" quando o evento tem duração explícita; senão só o início.
function timedRangeLabel(occ: Occurrence) {
  const start = timeLabel(occ.date, true).trim();
  if (!occ.task.durationMinutes && !occ.durationOverride) return start;
  const dur = occ.durationOverride ?? occ.task.durationMinutes;
  const end = new Date(occ.date.getTime() + dur * 60_000);
  return `${start} – ${timeLabel(end, true).trim()}`;
}

const fallbackColors = ['bg-[var(--accent)]', 'bg-[#30d158]', 'bg-[#ff3b30]', 'bg-[#ff9500]', 'bg-[#ff2d55]', 'bg-[#bf5af2]'];

function priorityAccentColor(task: any): string {
  if (task.categoryColor) return '#30d158';
  if (task.type === 'holiday') return '#6b7280';
  if (task.priority === 'high')   return '#ff3b30';
  if (task.priority === 'medium') return '#ff9500';
  if (task.priority === 'low')    return '#34c759';
  return 'var(--accent)';
}

function priorityBgColor(task: any): string {
  if (task.categoryColor) return moneyAppColor.value;
  if (task.type === 'holiday') return holidayColor.value;
  // Cor global do tema (Configurações → Cor de destaque) para TODOS os eventos;
  // a prioridade aparece só na bandeirinha/barrinha lateral (priorityAccentColor).
  return 'color-mix(in srgb, var(--accent) 16%, transparent)';
}

/** Estilo do card de grade (semana/dia) — fundo sutil + borda colorida */
function eventTimedStyle(task: any): Record<string, string> {
  const accent = priorityAccentColor(task);
  return {
    backgroundColor: priorityBgColor(task),
    borderLeft: `3px solid ${accent}`,
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    backdropFilter: 'blur(4px)',
  };
}

/** Estilo pill para visão de mês e eventos all-day */
function eventMonthStyle(task: any): Record<string, string> {
  const accent = priorityAccentColor(task);
  return {
    backgroundColor: priorityBgColor(task),
    borderLeftColor: accent,
    borderLeftWidth: '2px',
    borderLeftStyle: 'solid',
    color: '#fff',
  };
}

function groupColor(task: any) {
  if (task.type === 'holiday') return '';
  if (task.categoryColor) return '';
  return 'bg-[var(--accent)]';
}

function groupStyle(task: any) {
  if (task.type === 'holiday') return { backgroundColor: holidayColor.value, color: '#ffffff' };
  if (task.categoryColor) return { backgroundColor: moneyAppColor.value, color: '#ffffff' };
  return {};
}

function getPriorityTextColor(p: string) {
  if (p === 'high') return 'text-[#ff3b30] drop-shadow-sm';
  if (p === 'medium') return 'text-[#ffcc00] drop-shadow-sm';
  return 'text-[#34c759] drop-shadow-sm';
}

// Mesmo mapa de ícones da sidebar de listas do todo.
const iconMap: Record<string, any> = {
  ListBulletIcon,
  FolderIcon,
  BriefcaseIcon,
  ShoppingCartIcon,
  StarIcon,
};

function groupIconInfo(task: any): { img?: string; comp?: any } {
  if (task.categoryColor) {
    // Item do MoneyAPP → logo dele, sinalizando a origem.
    return { img: '/moneyapp-logo.png' };
  }
  const g = tasksStore.groups.find((gr: any) => gr.id === task.groupId);
  if (!g?.icon) return { comp: ListBulletIcon };
  if (g.icon.startsWith('http') || g.icon.startsWith('data:')) return { img: g.icon };
  return { comp: iconMap[g.icon] || ListBulletIcon };
}
</script>

<style scoped>
/* Fim de semana com vermelho fraco — sinaliza dia não útil. !important para
   vencer as utilities bg-* do Tailwind nas células que já têm fundo. */
.weekend-cell {
  background: color-mix(in srgb, #ff453a 6%, var(--bg)) !important;
}
.weekend-cell:hover {
  background: color-mix(in srgb, #ff453a 10%, var(--bg-hover)) !important;
}

/* Pulsação suave no indicador da hora atual */
@keyframes time-pulse-anim {
  0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.5); }
  50% { transform: scale(1.2); opacity: 0.9; box-shadow: 0 0 0 4px rgba(255, 59, 48, 0); }
}
.time-pulse {
  animation: time-pulse-anim 2s ease-in-out infinite;
}
</style>
