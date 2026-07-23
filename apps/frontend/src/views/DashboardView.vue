<template>
  <div class="min-h-screen bg-[var(--bg)] text-[var(--text)] flex h-screen overflow-hidden font-sans">
    <!-- Backdrop da gaveta (mobile) -->
    <div
      v-if="isSidebarOpen && viewMode !== 'calendar'"
      class="fixed inset-0 bg-black/60 z-40 md:hidden"
      @click="isSidebarOpen = false"
    ></div>

    <!-- Sidebar (oculta no calendário; no mobile vira gaveta deslizante) -->
    <aside
      v-if="viewMode !== 'calendar'"
      class="bg-[var(--bg-side)] flex flex-col border-r border-black/30 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-[290px] max-md:shadow-2xl max-md:transition-transform max-md:duration-200 transition-[width] duration-300"
      :class="[
        isSidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
        isSidebarMinimized ? 'w-[72px] items-center' : 'w-[300px]'
      ]"
    >
      <div class="p-4 flex-1 overflow-y-auto custom-scrollbar" :class="isSidebarMinimized ? 'px-2' : ''">

        <!-- Visualizar tudo / Concluídos -->
        <div class="mb-4 space-y-[2px]" :class="isSidebarMinimized ? 'w-full flex flex-col items-center' : ''">
          <div
            @click="setFilter('all')"
            @mouseenter="showTooltip($event, 'Tudo', counts.all)"
            @mouseleave="hideTooltip"
            :class="[
              'flex items-center py-2 rounded-lg cursor-pointer transition-all duration-150',
              isSidebarMinimized ? 'justify-center px-0 w-10' : 'justify-between px-3',
              filter === 'all' ? 'bg-[var(--bg-hover)] text-white' : 'hover:bg-[var(--bg-hover)] text-[var(--text)]'
            ]"
          >
            <div class="flex items-center gap-3">
              <div class="relative">
                <div class="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white shadow-sm bg-[#8e8e93] shrink-0">
                  <QueueListIcon class="w-4 h-4" />
                </div>
                <div v-if="isSidebarMinimized && counts.all > 0" class="absolute -top-1.5 -right-1.5 bg-[#ff453a] text-white text-[9px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center shadow-sm border-[1.5px] border-[var(--bg-side)] z-10 leading-none">
                  {{ counts.all }}
                </div>
              </div>
              <span v-if="!isSidebarMinimized" class="text-[13px] font-medium">Tudo</span>
            </div>
            <span v-if="!isSidebarMinimized" class="text-[13px] font-medium" :class="filter === 'all' ? 'text-white' : 'text-[var(--muted)]'">{{ counts.all }}</span>
          </div>
          <div
            @click="setFilter('completed')"
            @mouseenter="showTooltip($event, 'Concluídos', counts.completed)"
            @mouseleave="hideTooltip"
            :class="[
              'flex items-center py-2 rounded-lg cursor-pointer transition-all duration-150',
              isSidebarMinimized ? 'justify-center px-0 w-10' : 'justify-between px-3',
              filter === 'completed' ? 'bg-[var(--bg-hover)] text-white' : 'hover:bg-[var(--bg-hover)] text-[var(--text)]'
            ]"
          >
            <div class="flex items-center gap-3">
              <div class="relative">
                <div class="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white shadow-sm bg-[#30d158] shrink-0">
                  <CheckIcon class="w-4 h-4" />
                </div>
                <div v-if="isSidebarMinimized && counts.completed > 0" class="absolute -top-1.5 -right-1.5 bg-[#ff453a] text-white text-[9px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center shadow-sm border-[1.5px] border-[var(--bg-side)] z-10 leading-none">
                  {{ counts.completed }}
                </div>
              </div>
              <span v-if="!isSidebarMinimized" class="text-[13px] font-medium">Concluídos</span>
            </div>
            <span v-if="!isSidebarMinimized" class="text-[13px] font-medium" :class="filter === 'completed' ? 'text-white' : 'text-[var(--muted)]'">{{ counts.completed }}</span>
          </div>
        </div>

        <!-- My Lists -->
        <div :class="isSidebarMinimized ? 'flex flex-col items-center w-full' : ''">
          <h3 v-if="!isSidebarMinimized" class="text-[11px] font-bold text-[var(--muted)] mb-2 px-2 uppercase tracking-wide">My Lists</h3>
          <div class="space-y-[2px]" :class="isSidebarMinimized ? 'flex flex-col items-center w-full' : ''">
            <div 
              v-for="(group, idx) in groups" 
              :key="group.id" 
              @click="setFilter(group.id)"
              @mouseenter="showTooltip($event, group.name, counts.byGroup[group.id] || 0)"
              @mouseleave="hideTooltip"
              draggable="true"
              @dragstart="onDragStart(idx, $event)"
              @dragover.prevent="onGroupDragOver(idx, $event)"
              @dragleave="onGroupDragLeave(idx, $event)"
              @drop="onGroupDrop(idx, $event)"
              @dragend="onDragEnd"
              :class="[
                'group flex items-center py-2 rounded-lg cursor-pointer transition-all duration-150',
                isSidebarMinimized ? 'justify-center px-0 w-10' : 'justify-between px-3',
                filter === group.id ? 'bg-[var(--bg-hover)] text-white' : 'hover:bg-[var(--bg-hover)] text-[var(--text)]',
                draggedOverIndex === idx ? 'ring-2 ring-[var(--accent)] bg-[var(--bg-hover)]' : '',
                taskDropTargetGroupIdx === idx ? 'ring-2 ring-[#30d158] bg-[#30d158]/10 scale-[1.02]' : '',
                draggedIndex === idx ? 'opacity-50' : ''
              ]"
            >
              <div class="flex items-center gap-3" :class="isSidebarMinimized ? 'w-full' : ''">
                <div class="relative" :class="isSidebarMinimized ? 'mx-auto' : ''">
                  <div class="w-[28px] h-[28px] rounded-full flex items-center justify-center text-white shadow-sm overflow-hidden shrink-0" :class="group.color || getGroupColor(idx)">
                    <template v-if="group.icon && (group.icon.startsWith('http') || group.icon.startsWith('data:'))">
                      <img :src="group.icon" class="w-full h-full object-cover" />
                    </template>
                    <template v-else>
                      <component :is="iconMap[group.icon || 'ListBulletIcon']" class="w-4 h-4" />
                    </template>
                  </div>
                  <div v-if="isSidebarMinimized && (counts.byGroup[group.id] || 0) > 0" class="absolute -top-1.5 -right-1.5 bg-[#ff453a] text-white text-[9px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center shadow-sm border-[1.5px] border-[var(--bg-side)] z-10 leading-none">
                    {{ counts.byGroup[group.id] || 0 }}
                  </div>
                </div>
                <span v-if="!isSidebarMinimized" class="text-[13px] font-medium truncate flex-1">{{ group.name }}</span>
              </div>
              <div v-if="!isSidebarMinimized" class="flex items-center gap-2 shrink-0">
                <button @click.stop="openEditGroupModal(group)" class="max-md:opacity-100 opacity-0 group-hover:opacity-100 text-[var(--muted2)] hover:text-[var(--text)] transition-opacity">
                  <span class="text-[10px] uppercase font-bold">Edit</span>
                </button>
                <span class="text-[13px] font-medium" :class="filter === group.id ? 'text-white' : 'text-[var(--muted)]'">{{ counts.byGroup[group.id] || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="p-4 border-t border-black/30 flex items-center" :class="isSidebarMinimized ? 'flex-col justify-center gap-6 px-2' : 'justify-between'">
        <button class="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors text-[13px] font-medium" @click="openAddGroupModal" :title="isSidebarMinimized ? 'Add List' : ''">
          <PlusCircleIcon class="w-5 h-5 shrink-0" /> <span v-if="!isSidebarMinimized">Add List</span>
        </button>
        <div class="flex items-center" :class="isSidebarMinimized ? 'flex-col gap-4' : 'gap-3'">
          <button class="flex items-center text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden md:flex" @click="toggleSidebar" :title="isSidebarMinimized ? 'Expandir' : 'Minimizar'">
            <svg v-if="isSidebarMinimized" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" /></svg>
          </button>
          <button class="flex items-center text-[var(--muted)] hover:text-[var(--accent)] transition-colors" @click="isSettingsOpen = true" title="Configurações">
            <Cog6ToothIcon class="w-5 h-5" />
          </button>
          <button class="flex items-center text-[var(--muted)] hover:text-[#ff3b30] transition-colors" @click="logout" title="Logout">
            <ArrowRightOnRectangleIcon class="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Area (min-w-0/overflow-hidden: impede o conteúdo largo, ex. kanban,
         de esticar o flex além da viewport — o scroll fica interno) -->
    <main class="flex-1 min-w-0 overflow-hidden flex flex-col bg-[var(--bg)] p-4 sm:p-6 lg:p-10 relative">
      <!-- Hamburger (mobile) -->
      <button
        v-if="viewMode !== 'calendar'"
        @click="isSidebarOpen = true"
        class="md:hidden absolute top-4 left-4 z-30 p-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text)]"
        title="Listas"
      >
        <Bars3Icon class="w-5 h-5" />
      </button>

      <!-- Search fake bar + view switcher -->
      <div class="absolute top-4 right-4 flex items-center gap-2 sm:gap-4 z-30">
        <div class="flex items-center bg-[var(--bg-hover)] rounded-md border border-white/5 p-0.5">
          <button
            v-for="mode in viewModes"
            :key="mode.id"
            @click="viewMode = mode.id"
            class="p-1.5 rounded transition-colors"
            :class="viewMode === mode.id ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)]'"
            :title="mode.label"
          >
            <component :is="mode.icon" class="w-4 h-4" />
          </button>
        </div>
        <div v-if="viewMode === 'list'" class="bg-[var(--bg-hover)] rounded-md px-3 py-1 flex items-center gap-2 border border-white/5 w-36 sm:w-64">
          <MagnifyingGlassIcon class="w-4 h-4 text-[var(--muted)]" />
          <input
            v-model="tasksStore.searchQuery"
            type="text"
            placeholder="Search"
            class="bg-transparent border-none outline-none text-[13px] text-[var(--text)] placeholder-[var(--muted)] w-full"
          />
        </div>
      </div>

      <header class="mb-4 mt-14 md:mt-8" v-if="viewMode === 'list'">
        <div class="flex justify-between items-end mb-1">
          <h1 :class="['text-[36px] font-bold tracking-tight', headerColor]">{{ headerTitle }}</h1>
          <span class="text-[36px] font-semibold" :class="headerColor">{{ filteredTasks.length }}</span>
        </div>
        <div class="flex justify-between items-center text-[var(--muted)] text-[13px] border-b border-[var(--border-soft)] pb-3 font-medium">
          <span v-if="counts.completed > 0">{{ counts.completed }} Completed • <button class="text-[#30d158] hover:text-[#32d74b] transition-colors" @click="clearCompleted">Clear</button></span>
          <span v-else>0 Completed</span>
          <button class="text-[#30d158] hover:text-[#32d74b] transition-colors">Show</button>
        </div>
      </header>

      <!-- Calendar view -->
      <div v-if="viewMode === 'calendar'" class="flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar mt-12">
        <CalendarView :tasks="tasksStore.tasks" @task-click="openDetailsModal" />
      </div>



      <!-- List view (clique em área vazia foca o campo de novo item) -->
      <div v-else class="flex-1 overflow-y-auto custom-scrollbar pr-2 -mx-2 px-2" @click.self="focusNewTaskInput">
        <div
          v-for="(task, idx) in filteredTasks"
          :key="task.id"
          draggable="true"
          @dragstart="onTaskDragStart(idx, $event)"
          @dragover.prevent="onTaskDragOver(idx, $event)"
          @dragleave="onTaskDragLeave(idx, $event)"
          @drop="onTaskDrop(idx, $event)"
          @dragend="onTaskDragEnd"
          @click="editingTaskId !== task.id && openDetailsModal(task)"
          class="group flex items-start gap-3 py-3 px-3 -mx-2 border-b border-[var(--border-soft)] last:border-0 relative transition-all duration-150 rounded-xl cursor-pointer select-none"
          :class="[
            'hover:bg-[var(--bg-hover)] hover:shadow-md hover:-translate-y-px',
            draggedOverTaskIndex === idx ? 'bg-[var(--bg-hover)] ring-1 ring-[var(--accent)]' : '',
            draggedTaskIndex === idx ? 'opacity-50 scale-95' : ''
          ]"
        >
          <!-- priority accent left bar -->
          <span
            class="absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-opacity"
            :class="task.completedAt ? 'opacity-0' : 'opacity-80'"
            :style="{ backgroundColor: task.priority === 'high' ? '#ff3b30' : task.priority === 'medium' ? '#ff9500' : '#34c759' }"
          ></span>

          <div class="flex-1 flex flex-col min-w-0">
            <div v-if="editingTaskId !== task.id"
                 class="text-[14px] truncate w-full flex items-center gap-2"
                 :class="{ 'text-[var(--muted)] line-through': task.completedAt }">
              <template v-if="task.description.startsWith('http')">
                <a :href="task.description" target="_blank" class="text-blue-400 hover:underline truncate max-w-[200px] sm:max-w-xs" @click.stop>🔗 {{ getDomain(task.description) }}</a>
              </template>
              <template v-else>
                <span class="truncate font-medium">{{ task.description }}</span>
              </template>
              <ArrowPathIcon v-if="task.recurrence" class="w-3.5 h-3.5 text-[var(--accent)] shrink-0 opacity-80" title="Tarefa Recorrente" />
            </div>
            <input 
              v-else
              :id="'task-input-' + task.id"
              v-model="task.description"
              class="bg-transparent outline-none text-[14px] w-full"
              :class="{ 'text-[var(--muted)] line-through': task.completedAt }"
              @click.stop
              @blur="editingTaskId = null; updateTask(task)"
              @keydown.enter="($event.target as HTMLElement).blur()"
            />
            <div class="flex items-center gap-2 mt-1" v-if="task.scheduledAt || tasksStore.searchQuery.trim()">
              <span v-if="task.scheduledAt" class="text-[11px] text-[var(--muted)] flex items-center gap-1">
                <CalendarDaysIcon class="w-3 h-3" />
                {{ new Date(task.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }}
              </span>
              <span v-if="tasksStore.searchQuery.trim()" class="text-[10px] bg-[var(--bg-card)] text-[var(--muted)] px-1.5 py-0.5 rounded font-medium">
                {{ getTaskGroupName(task.groupId) }}
              </span>
            </div>
          </div>

          <!-- indicadores à direita (prioridade / lembrete / detalhes) — aparecem no hover; clique abre o gerenciar -->
          <div class="flex items-center gap-3 shrink-0 max-md:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity">
            <DocumentTextIcon v-if="task.details" class="w-5 h-5 text-[var(--accent)]" title="Tem detalhes" />
            <ClockIcon class="w-5 h-5" :class="task.scheduledAt ? 'text-[var(--accent)]' : 'text-[var(--muted2)]'" title="Lembrete" />
            <FlagIcon class="w-5 h-5" :class="getPriorityTextColor(task.priority)" title="Prioridade" />
          </div>
        </div>

        <!-- Add New Task Row -->
        <div class="flex items-start gap-3 py-3 px-3 cursor-text" v-if="filter !== 'completed'" @click="focusNewTaskInput">
          <PlusCircleIcon class="w-5 h-5 mt-0.5 text-[var(--muted)] shrink-0" />
          <input
            ref="newTaskInput"
            v-model="newTaskDescription"
            placeholder="New Reminder"
            class="bg-transparent outline-none text-[14px] flex-1 placeholder-[var(--muted2)]"
            @keydown.enter="createNewTask"
          />
        </div>
      </div>
    </main>
  </div>

  <!-- Add Group Modal -->
  <div v-if="isAddGroupModalOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10 transform transition-all">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-[var(--text)] mb-4">{{ editingGroupId ? 'Edit List' : 'New List' }}</h2>
        <input 
          v-model="newGroupData.name"
          type="text" 
          placeholder="List Name" 
          class="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all mb-4"
          @keydown.enter="confirmAddGroup"
          autofocus
        />
        
        <div class="mb-4">
          <label class="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Color</label>
          <div class="flex gap-2">
            <button v-for="c in groupColors" :key="c" @click="newGroupData.color = c" :class="[c, 'w-8 h-8 rounded-full border-2 transition-all', newGroupData.color === c ? 'border-[var(--text)]' : 'border-transparent hover:border-[var(--text)]/50']"></button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Icon</label>
          <div class="flex gap-2 mb-3 items-center">
            <button v-for="(iconComp, iconName) in iconMap" :key="iconName" @click="newGroupData.icon = iconName" :class="['w-8 h-8 rounded-full flex items-center justify-center transition-all border border-transparent flex-shrink-0', newGroupData.icon === iconName ? 'bg-[var(--bg-hover)] border-[var(--text)]/50 text-[var(--text)]' : 'text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]']">
              <component :is="iconComp" class="w-5 h-5" />
            </button>
            <button @click="fileInput?.click()" class="w-8 h-8 rounded-full flex items-center justify-center transition-all border border-transparent flex-shrink-0 text-[var(--muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]" title="Upload custom image">
              <PhotoIcon class="w-5 h-5" />
            </button>
            <input type="file" accept="image/*" class="hidden" ref="fileInput" @change="handleIconUpload" />

            <div v-if="newGroupData.icon && (newGroupData.icon.startsWith('http') || newGroupData.icon.startsWith('data:'))" class="w-8 h-8 rounded-full overflow-hidden border-2 border-white flex-shrink-0 ml-auto bg-black/20">
              <img :src="newGroupData.icon" class="w-full h-full object-cover" />
            </div>
          </div>
          <input 
            v-model="newGroupData.icon"
            type="text" 
            placeholder="Or enter image URL (https://...)" 
            class="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-2 text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all text-sm"
          />
        </div>
      </div>
      <div class="flex border-t border-[var(--border)]">
        <button 
          @click="isAddGroupModalOpen = false"
          class="flex-1 py-3.5 text-[var(--muted)] font-medium hover:bg-[var(--bg-hover)] transition-colors"
        >
          Cancel
        </button>
        <template v-if="editingGroupId">
          <div class="w-[1px] bg-[var(--border)]"></div>
          <button 
            @click="confirmDeleteGroup"
            class="flex-1 py-3.5 text-[#ff3b30] font-semibold hover:bg-[var(--bg-hover)] transition-colors"
          >
            Delete
          </button>
        </template>
        <div class="w-[1px] bg-[var(--border)]"></div>
        <button 
          @click="confirmAddGroup"
          class="flex-1 py-3.5 text-[var(--accent)] font-semibold hover:bg-[var(--bg-hover)] transition-colors"
          :disabled="!newGroupData.name.trim()"
          :class="{ 'opacity-50 cursor-not-allowed text-[var(--accent)]': !newGroupData.name.trim() }"
        >
          Save
        </button>
      </div>
    </div>
  </div>

  <!-- Priority Modal -->
  <div v-if="isPriorityModalOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10 transform transition-all">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-[var(--text)] mb-4">Set Priority</h2>
        <div class="flex flex-col gap-2">
          <button @click="setPriorityAndClose('low')" class="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors" :class="editingTaskForPriority?.priority === 'low' ? 'bg-[var(--bg-hover)]' : ''">
            <div class="flex items-center gap-3">
              <div class="w-4 h-4 rounded-full bg-[#34c759]"></div>
              <span class="text-[var(--text)] font-medium">Low (Verde)</span>
            </div>
            <CheckIcon v-if="editingTaskForPriority?.priority === 'low'" class="w-5 h-5 text-[#34c759]" />
          </button>
          <button @click="setPriorityAndClose('medium')" class="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors" :class="editingTaskForPriority?.priority === 'medium' ? 'bg-[var(--bg-hover)]' : ''">
            <div class="flex items-center gap-3">
              <div class="w-4 h-4 rounded-full bg-[#ffcc00]"></div>
              <span class="text-[var(--text)] font-medium">Medium (Amarelo)</span>
            </div>
            <CheckIcon v-if="editingTaskForPriority?.priority === 'medium'" class="w-5 h-5 text-[#ffcc00]" />
          </button>
          <button @click="setPriorityAndClose('high')" class="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors" :class="editingTaskForPriority?.priority === 'high' ? 'bg-[var(--bg-hover)]' : ''">
            <div class="flex items-center gap-3">
              <div class="w-4 h-4 rounded-full bg-[#ff3b30]"></div>
              <span class="text-[var(--text)] font-medium">High (Vermelha)</span>
            </div>
            <CheckIcon v-if="editingTaskForPriority?.priority === 'high'" class="w-5 h-5 text-[#ff3b30]" />
          </button>
        </div>
      </div>
      <div class="flex border-t border-[var(--border)]">
        <button 
          @click="isPriorityModalOpen = false; editingTaskForPriority = null"
          class="flex-1 py-3.5 text-[var(--muted)] font-medium hover:bg-[var(--bg-hover)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>

  <!-- Date Picker Modal -->
  <div v-if="isDatePickerModalOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10 transform transition-all">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-[var(--text)] mb-4">Data e Lembrete</h2>
        <template v-if="editingTaskForDate">
          <div class="flex items-center gap-3 py-2">
            <ClockIcon class="w-5 h-5 text-[var(--muted)] shrink-0" />
            <input
              v-model="editDateStr"
              type="date"
              class="flex-1 min-w-0 bg-[var(--bg)] text-[var(--text)] text-[14px] rounded-lg px-3 py-2 border border-transparent focus:border-[var(--accent)] outline-none transition-colors"
            />
            <input
              v-model="editTimeStr"
              type="time"
              class="w-[110px] bg-[var(--bg)] text-[var(--text)] text-[14px] rounded-lg px-3 py-2 border border-transparent focus:border-[var(--accent)] outline-none transition-colors"
            />
          </div>
          <div class="flex items-center gap-3 py-2">
            <ArrowPathIcon class="w-5 h-5 text-[var(--muted)] shrink-0" />
            <select
              v-model="editingTaskForDate.recurrence"
              class="flex-1 min-w-0 bg-[var(--bg)] text-[var(--text)] text-[14px] rounded-lg px-3 py-2 border border-transparent focus:border-[var(--accent)] outline-none transition-colors appearance-none cursor-pointer"
            >
              <option :value="null">Não se repete</option>
              <option value="daily">Todos os dias</option>
              <option value="weekdays">Dias úteis (seg a sex)</option>
              <option value="weekly">Toda semana</option>
              <option value="monthly">Todo mês</option>
              <option value="yearly">Todo ano</option>
            </select>
          </div>
          <button
            v-if="editDateStr"
            @click="editDateStr = ''; editTimeStr = ''"
            class="text-[13px] text-[#ff3b30] hover:text-[#ff6961] font-medium mt-2 transition-colors"
          >
            Limpar data
          </button>
        </template>
      </div>
      <div class="flex border-t border-[var(--border)]">
        <button 
          @click="isDatePickerModalOpen = false; editingTaskForDate = null"
          class="flex-1 py-3.5 text-[var(--muted)] font-medium hover:bg-[var(--bg-hover)] transition-colors"
        >
          Cancel
        </button>
        <div class="w-[1px] bg-[var(--border)]"></div>
        <button 
          @click="confirmDatePickerModal"
          class="flex-1 py-3.5 text-[var(--accent)] font-semibold hover:bg-[var(--bg-hover)] transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  </div>
  <!-- Details / Edit Modal -->
  <TaskDetailsPanel
    v-if="isTaskDetailsPanelOpen"
    :initial-task="editingTaskForDetails"
    @close="isTaskDetailsPanelOpen = false; editingTaskForDetails = null"
    @updated="tasksStore.fetchAll()"
  />

  <!-- Settings Modal -->
  <SettingsModal v-if="isSettingsOpen" @close="isSettingsOpen = false" />

  <!-- Tooltip personalizado para sidebar minimizada -->
  <Teleport to="body">
    <div
      v-if="hoverTooltip.visible"
      class="fixed z-[100] px-3 py-1.5 bg-[#2c2c2e] border border-white/10 shadow-2xl rounded-lg pointer-events-none transform -translate-y-1/2 flex items-center gap-2 transition-opacity duration-150"
      :style="{ left: hoverTooltip.x + 'px', top: hoverTooltip.y + 'px' }"
    >
      <span class="text-[13px] font-medium text-white">{{ hoverTooltip.text }}</span>
      <span class="text-[13px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded-md">{{ hoverTooltip.count }}</span>
    </div>
  </Teleport>

  <!-- Delete Group Modal -->
  <div v-if="isDeleteGroupModalOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
    <div class="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10 transform transition-all">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-[var(--text)] mb-2">Delete List</h2>
        <p class="text-[14px] text-[var(--muted)]">Are you sure you want to delete this list and all its tasks? This action cannot be undone.</p>
      </div>
      <div class="flex border-t border-[var(--border)]">
        <button 
          @click="isDeleteGroupModalOpen = false"
          class="flex-1 py-3.5 text-[var(--muted)] font-medium hover:bg-[var(--bg-hover)] transition-colors"
        >
          Cancel
        </button>
        <div class="w-[1px] bg-[var(--border)]"></div>
        <button 
          @click="executeDeleteGroup"
          class="flex-1 py-3.5 text-[#ff3b30] font-semibold hover:bg-[var(--bg-hover)] transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useTasksStore } from '@/stores/tasks';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/api/client';
import {
  CheckIcon,
  ClockIcon,
  ListBulletIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
  FolderIcon,
  BriefcaseIcon,
  ShoppingCartIcon,
  StarIcon,
  FlagIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  QueueListIcon,
  ArrowPathIcon,
  Bars3Icon,
  SwatchIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  PhotoIcon,
} from '@heroicons/vue/24/outline';
import CalendarView from '@/components/CalendarView.vue';
import TaskDetailsPanel from '@/components/TaskDetailsPanel.vue';

import SettingsModal from '@/components/SettingsModal.vue';
import '@/composables/useTheme'; // aplica o tema salvo já no carregamento
import { setAppBadge } from '@/composables/useAppBadge';

const tasksStore = useTasksStore();
const editingTaskId = ref<string | null>(null);

type ViewMode = 'list' | 'calendar';
const viewMode = ref<ViewMode>('calendar');
const viewModes: { id: ViewMode; label: string; icon: any }[] = [
  { id: 'list', label: 'Lista (⌘⌃1)', icon: QueueListIcon },
  { id: 'calendar', label: 'Calendário (⌘⌃2)', icon: CalendarDaysIcon },
];

const isTaskDetailsPanelOpen = ref(false);
const isSettingsModalOpen = ref(false);

const fileInput = ref<HTMLInputElement | null>(null);

const handleIconUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    if (e.target?.result) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 128;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          newGroupData.value.icon = canvas.toDataURL('image/jpeg', 0.8);
        }
      };
      img.src = e.target.result as string;
    }
  };
  reader.readAsDataURL(file);
};

const isSettingsOpen = ref(false);
const isSidebarOpen = ref(false);
const isSidebarMinimized = ref(localStorage.getItem('todo_sidebar_minimized') === 'true');
const toggleSidebar = () => {
  isSidebarMinimized.value = !isSidebarMinimized.value;
  localStorage.setItem('todo_sidebar_minimized', String(isSidebarMinimized.value));
  hideTooltip();
};

const hoverTooltip = ref({ visible: false, text: '', count: 0, x: 0, y: 0 });

const showTooltip = (e: MouseEvent, text: string, count: number) => {
  if (!isSidebarMinimized.value) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  hoverTooltip.value = {
    visible: true,
    text,
    count,
    x: rect.right + 12,
    y: rect.top + (rect.height / 2)
  };
};

const hideTooltip = () => {
  hoverTooltip.value.visible = false;
};

function getDomain(urlStr: string) {
  try {
    return new URL(urlStr).hostname.replace('www.', '');
  } catch (e) {
    return urlStr;
  }
}
const authStore = useAuthStore();
const newTaskDescription = ref('');
const newTaskInput = ref<HTMLInputElement | null>(null);

function focusNewTaskInput() {
  if (filter.value === 'completed') return;
  newTaskInput.value?.focus();
}

const isAddGroupModalOpen = ref(false);
const isDeleteGroupModalOpen = ref(false);
const editingGroupId = ref<string | null>(null);

const isDatePickerModalOpen = ref(false);
const editingTaskForDate = ref<any>(null);

const isPriorityModalOpen = ref(false);
const editingTaskForPriority = ref<any>(null);


const editingTaskForDetails = ref<any>(null);

const newGroupData = ref({
  name: '',
  color: 'bg-[#0a7aff]',
  icon: 'ListBulletIcon'
});

const iconMap: Record<string, any> = {
  ListBulletIcon,
  FolderIcon,
  BriefcaseIcon,
  ShoppingCartIcon,
  StarIcon
};

const draggedIndex = ref<number | null>(null);
const draggedOverIndex = ref<number | null>(null);

const draggedTaskIndex = ref<number | null>(null);
const draggedOverTaskIndex = ref<number | null>(null);

function onDragStart(idx: number, event: DragEvent) {
  draggedIndex.value = idx;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('type', 'group');
  }
}

// Índice do grupo alvo quando arrastamos uma TASK para a sidebar.
const taskDropTargetGroupIdx = ref<number | null>(null);

function onGroupDragOver(idx: number, event: DragEvent) {
  // Se é uma task sendo arrastada para a sidebar → destacar como alvo de mover.
  if (draggedTaskIndex.value !== null) {
    taskDropTargetGroupIdx.value = idx;
  } else {
    draggedOverIndex.value = idx;
  }
}

function onGroupDragLeave(idx: number, event: DragEvent) {
  if (draggedOverIndex.value === idx) draggedOverIndex.value = null;
  if (taskDropTargetGroupIdx.value === idx) taskDropTargetGroupIdx.value = null;
}

async function onGroupDrop(idx: number, event: DragEvent) {
  // Caso 1: Task arrastada para um grupo da sidebar → mover de categoria.
  if (draggedTaskIndex.value !== null) {
    const task = filteredTasks.value[draggedTaskIndex.value];
    const targetGroup = groups.value[idx];
    taskDropTargetGroupIdx.value = null;
    draggedTaskIndex.value = null;
    draggedOverTaskIndex.value = null;
    if (task && targetGroup && task.groupId !== targetGroup.id) {
      task.groupId = targetGroup.id;
      await api.patch(`/tasks/${task.id}`, { groupId: targetGroup.id });
      await tasksStore.fetchAll();
    }
    return;
  }

  // Caso 2: Grupo arrastado sobre outro grupo → reordenar listas.
  const fromIdx = draggedIndex.value;
  draggedOverIndex.value = null;
  draggedIndex.value = null;

  if (fromIdx !== null && fromIdx !== idx) {
    const newGroups = [...groups.value];
    const [moved] = newGroups.splice(fromIdx, 1);
    newGroups.splice(idx, 0, moved);
    await tasksStore.reorderGroups(newGroups);
  }
}

function onDragEnd() {
  draggedIndex.value = null;
  draggedOverIndex.value = null;
  taskDropTargetGroupIdx.value = null;
}

function onTaskDragStart(idx: number, event: DragEvent) {
  draggedTaskIndex.value = idx;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('type', 'task');
  }
}

function onTaskDragOver(idx: number, event: DragEvent) {
  draggedOverTaskIndex.value = idx;
}

function onTaskDragLeave(idx: number, event: DragEvent) {
  if (draggedOverTaskIndex.value === idx) {
    draggedOverTaskIndex.value = null;
  }
}

async function onTaskDrop(idx: number, event: DragEvent) {
  const fromIdx = draggedTaskIndex.value;
  draggedOverTaskIndex.value = null;
  draggedTaskIndex.value = null;

  if (fromIdx !== null && fromIdx !== idx) {
    await tasksStore.reorderTasks(fromIdx, idx, filteredTasks.value);
  }
}

function onTaskDragEnd() {
  draggedTaskIndex.value = null;
  draggedOverTaskIndex.value = null;
  taskDropTargetGroupIdx.value = null;
}

// Atalhos de visualização: 
// Mac: ⌘+Ctrl+1 Lista, ⌘+Ctrl+2 Calendário
// Win: Ctrl+Shift+1 Lista, Ctrl+Shift+2 Calendário
function onViewShortcut(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    if (!isTaskDetailsPanelOpen.value) {
      editingTaskForDetails.value = null;
      isTaskDetailsPanelOpen.value = true;
    }
    return;
  }

  const isMacShortcut = e.metaKey && e.ctrlKey && !e.shiftKey && !e.altKey;
  const isWinShortcut = e.ctrlKey && e.shiftKey && !e.metaKey && !e.altKey;

  if (!isMacShortcut && !isWinShortcut) return;

  const map: Record<string, ViewMode> = { Digit1: 'list', Digit2: 'calendar' };
  const mode = map[e.code];
  if (!mode) return;
  e.preventDefault();
  viewMode.value = mode;
}

// ── Atualização automática (estilo MailAPP) ─────────────────────────
function onSwMessage(e: MessageEvent) {
  if (e.data?.type === 'new-task') tasksStore.fetchAll();
}
function onVisible() {
  if (document.visibilityState === 'visible') tasksStore.fetchAll();
}
let pollId: number | undefined;

onMounted(() => {
  tasksStore.fetchAll();
  window.addEventListener('keydown', onViewShortcut);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', onSwMessage);
  }
  document.addEventListener('visibilitychange', onVisible);
  pollId = window.setInterval(() => {
    if (document.visibilityState === 'visible') tasksStore.fetchAll();
  }, 60_000);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onViewShortcut);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('message', onSwMessage);
  }
  document.removeEventListener('visibilitychange', onVisible);
  if (pollId) clearInterval(pollId);
});

const counts = computed(() => tasksStore.counts);
watch(() => counts.value.all, (n) => setAppBadge(n), { immediate: true });

const filteredTasks = computed(() => tasksStore.filteredTasks);
const groups = computed(() => tasksStore.groups);
const filter = computed(() => tasksStore.selectedFilter);

const groupColors = [
  'bg-[#0a7aff]', // blue
  'bg-[#30d158]', // green
  'bg-[#ff3b30]', // red
  'bg-[#ff9500]', // orange
  'bg-[#ff2d55]', // pink
  'bg-[#bf5af2]', // purple
];

const textColorMap: Record<string, string> = {
  'bg-[#0a7aff]': 'text-[#0a7aff]',
  'bg-[#30d158]': 'text-[#30d158]',
  'bg-[#ff3b30]': 'text-[#ff3b30]',
  'bg-[#ff9500]': 'text-[#ff9500]',
  'bg-[#ff2d55]': 'text-[#ff2d55]',
  'bg-[#bf5af2]': 'text-[#bf5af2]',
};

function getGroupColor(idx: number) {
  return groupColors[idx % groupColors.length];
}

function getTaskGroupName(groupId?: string) {
  if (!groupId) return 'No List';
  const g = groups.value.find((g: any) => g.id === groupId);
  return g ? g.name : 'No List';
}

const headerTitle = computed(() => {
  if (tasksStore.searchQuery.trim()) return 'Search Results';
  
  switch (filter.value) {
    case 'today': return 'Today';
    case 'scheduled': return 'Scheduled';
    case 'all': return 'Tudo';
    case 'flagged': return 'Flagged';
    case 'completed': return 'Concluídos';
    case 'urgent': return 'Urgent';
    default: return groups.value.find((g: any) => g.id === filter.value)?.name || 'List';
  }
});

const headerColor = computed(() => {
  if (tasksStore.searchQuery.trim()) return 'text-[var(--text)]';
  
  switch (filter.value) {
    case 'today': return 'text-[var(--accent)]';
    case 'scheduled': return 'text-[#ff3b30]';
    case 'all': return 'text-[var(--text)]';
    case 'flagged': return 'text-[#ff9500]';
    case 'completed': return 'text-[var(--muted2)]';
    case 'urgent': return 'text-[#ff2d55]';
    default: {
      const group = groups.value.find((g: any) => g.id === filter.value);
      if (group && group.color) {
        return textColorMap[group.color] || 'text-[#30d158]';
      }
      return 'text-[#30d158]';
    }
  }
});

function getTaskTextColor(task: any) {
  if (task.groupId) {
    const group = groups.value.find((g: any) => g.id === task.groupId);
    if (group && group.color) {
      return textColorMap[group.color] || 'text-[#30d158]';
    }
  }
  return 'text-[var(--accent)]';
}

function setFilter(f: string) {
  tasksStore.setFilter(f);
  isSidebarOpen.value = false; // mobile: fecha a gaveta ao escolher uma lista
}

async function createNewTask() {
  if (!newTaskDescription.value.trim()) return;
  const groupId = ['today', 'scheduled', 'all', 'flagged', 'completed', 'urgent'].includes(filter.value) ? undefined : filter.value;
  await tasksStore.addTask(newTaskDescription.value, groupId);
  newTaskDescription.value = '';
}

async function updateTask(task: any) {
  await api.patch(`/tasks/${task.id}`, {
    description: task.description,
    isFlagged: task.isFlagged,
    isUrgent: task.isUrgent,
    scheduledAt: task.scheduledAt ? new Date(task.scheduledAt).toISOString() : null,
    priority: task.priority,
    recurrence: task.recurrence ?? null,
    details: task.details || null
  });
}

async function clearCompleted() {
  const completedTasks = tasksStore.tasks.filter((t: any) => t.completedAt);
  for (const t of completedTasks) {
    await api.delete(`/tasks/${t.id}`);
  }
  await tasksStore.fetchAll();
}

function openAddGroupModal() {
  editingGroupId.value = null;
  newGroupData.value = { name: '', color: groupColors[groups.value.length % groupColors.length], icon: 'ListBulletIcon' };
  isAddGroupModalOpen.value = true;
}

function openEditGroupModal(group: any) {
  editingGroupId.value = group.id;
  newGroupData.value = { 
    name: group.name, 
    color: group.color || getGroupColor(groups.value.findIndex(g => g.id === group.id)),
    icon: group.icon || 'ListBulletIcon'
  };
  isAddGroupModalOpen.value = true;
}

async function confirmAddGroup() {
  const name = newGroupData.value.name.trim();
  if (name) {
    if (editingGroupId.value) {
      await tasksStore.updateGroup(editingGroupId.value, {
        name,
        color: newGroupData.value.color,
        icon: newGroupData.value.icon
      });
    } else {
      await api.post('/groups', { 
        name,
        color: newGroupData.value.color,
        icon: newGroupData.value.icon
      });
      await tasksStore.fetchAll();
    }
  }
  isAddGroupModalOpen.value = false;
}

function confirmDeleteGroup() {
  if (!editingGroupId.value) return;
  isDeleteGroupModalOpen.value = true;
}

async function executeDeleteGroup() {
  if (!editingGroupId.value) return;
  await tasksStore.deleteGroup(editingGroupId.value);
  isDeleteGroupModalOpen.value = false;
  isAddGroupModalOpen.value = false;
}

const editDateStr = ref('');
const editTimeStr = ref('');

function openDatePickerModal(task: any) {
  editingTaskForDate.value = task;
  if (task.scheduledAt) {
    const d = new Date(task.scheduledAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    editDateStr.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    editTimeStr.value = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    editDateStr.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    editTimeStr.value = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  isDatePickerModalOpen.value = true;
}

function confirmDatePickerModal() {
  if (editingTaskForDate.value) {
    if (editDateStr.value) {
      const [y, m, d] = editDateStr.value.split('-').map(Number);
      const [hh, mm] = (editTimeStr.value || '00:00').split(':').map(Number);
      editingTaskForDate.value.scheduledAt = new Date(y!, m! - 1, d!, hh || 0, mm || 0, 0, 0).toISOString();
    } else {
      editingTaskForDate.value.scheduledAt = null;
      editingTaskForDate.value.recurrence = null;
    }
    updateTask(editingTaskForDate.value);
  }
  isDatePickerModalOpen.value = false;
  editingTaskForDate.value = null;
}

function logout() {
  authStore.logout();
}

function openPriorityModal(task: any) {
  editingTaskForPriority.value = task;
  isTaskDetailsPanelOpen.value = true;
}

function getPriorityTextColor(p: string) {
  if (p === 'high') return 'text-[#ff3b30]';
  if (p === 'medium') return 'text-[#ffcc00]';
  return 'text-[#34c759]';
}

function setPriorityAndClose(priority: string) {
  if (editingTaskForPriority.value) {
    editingTaskForPriority.value.priority = priority;
    updateTask(editingTaskForPriority.value);
  }
  isPriorityModalOpen.value = false;
  editingTaskForPriority.value = null;
}

function openDetailsModal(task: any) {
  editingTaskForDetails.value = { ...task }; // Clone to avoid saving before confirm
  isTaskDetailsPanelOpen.value = true;
}
</script>
