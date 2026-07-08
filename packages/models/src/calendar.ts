import type { TaskDto } from "./tasks.js";

export interface Occurrence {
  task: TaskDto | any;
  date: Date;
  key: string;
  style?: Record<string, string>;
  isMoneyApp?: boolean;
  money?: any;
  moneyGroup?: any[];
  isHoliday?: boolean;
}
