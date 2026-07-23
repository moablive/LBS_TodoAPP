const rangeStart = new Date("2026-07-13T00:00:00.000");
const rangeEnd = new Date("2026-07-20T00:00:00.000");
const baseDate = new Date("2026-07-17T23:00:00.000"); // Friday 23:00

const out = [];

function pushOccurrenceSplit(task, baseDate, baseKey) {
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

pushOccurrenceSplit({ id: 'task1', durationMinutes: 390 }, baseDate, 'task1');
console.log(out);
