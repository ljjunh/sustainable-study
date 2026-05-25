export type IsoDate = string;
export type LocalDateTime = string;
export type Priority = "low" | "medium" | "high";
export type EventCategory = "work" | "personal" | "study" | "health";
export type NotificationStatus = "scheduled" | "ready" | "read";

export interface Clock {
  now(): Date;
  todayIso(): IsoDate;
  nowLocalDateTime(): LocalDateTime;
}

export interface Task {
  id: string;
  title: string;
  dueDate: IsoDate;
  priority: Priority;
  done: boolean;
  note: string;
  reminderAt: LocalDateTime | null;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  date: IsoDate;
  startTime: string;
  endTime: string;
  category: EventCategory;
  note: string;
  reminderAt: LocalDateTime | null;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
}

export interface PlannerNotification {
  id: string;
  sourceId: string;
  sourceType: "task" | "event";
  title: string;
  body: string;
  notifyAt: LocalDateTime;
  status: NotificationStatus;
  createdAt: LocalDateTime;
}

export interface PlannerState {
  tasks: Task[];
  events: ScheduleEvent[];
  notifications: PlannerNotification[];
  selectedDate: IsoDate;
  visibleMonth: IsoDate;
}

export interface TaskDraft {
  title: string;
  dueDate: IsoDate;
  priority: Priority;
  note: string;
  reminderAt: LocalDateTime | null;
}

export interface EventDraft {
  title: string;
  date: IsoDate;
  startTime: string;
  endTime: string;
  category: EventCategory;
  note: string;
  reminderAt: LocalDateTime | null;
}

export interface CalendarDay {
  date: IsoDate;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface WeekDay {
  date: IsoDate;
  dayOfMonth: number;
  weekday: string;
  isToday: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

export function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now());
  return `${prefix}_${random}`;
}

export function toIsoDate(date: Date): IsoDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toLocalDateTime(date: Date): LocalDateTime {
  const isoDate = toIsoDate(date);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${isoDate}T${hour}:${minute}`;
}

export function parseIsoDate(value: IsoDate): Date {
  const [year = "0", month = "1", day = "1"] = value.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function addDays(value: IsoDate, amount: number): IsoDate {
  const date = parseIsoDate(value);
  date.setDate(date.getDate() + amount);
  return toIsoDate(date);
}

export function addMinutes(
  value: LocalDateTime,
  amount: number
): LocalDateTime {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + amount);
  return toLocalDateTime(date);
}

export function addMonths(value: IsoDate, amount: number): IsoDate {
  const date = parseIsoDate(value);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + amount, 1));
}

export function startOfWeek(value: IsoDate): IsoDate {
  const date = parseIsoDate(value);
  date.setDate(date.getDate() - date.getDay());
  return toIsoDate(date);
}

export function formatMonth(value: IsoDate): string {
  const date = parseIsoDate(value);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

export function formatWeekTitle(value: IsoDate): string {
  const date = parseIsoDate(value);
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const weekNumber =
    Math.floor((date.getDate() + firstDayOfMonth.getDay() - 1) / 7) + 1;
  return `${date.getFullYear()}년 ${
    date.getMonth() + 1
  }월 ${weekNumber}번째 주`;
}

export function formatDate(value: IsoDate): string {
  const date = parseIsoDate(value);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}.${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateTime(value: LocalDateTime): string {
  const [date, time = ""] = value.split("T");
  return `${formatDate(date)} ${time}`;
}

export function compareDateTime(
  left: LocalDateTime,
  right: LocalDateTime
): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

export function createMonthGrid(
  visibleMonth: IsoDate,
  today: IsoDate
): CalendarDay[] {
  const monthStart = parseIsoDate(visibleMonth);
  const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const gridStart = new Date(firstDay.getTime() - firstDay.getDay() * DAY_MS);
  const currentMonth = firstDay.getMonth();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getTime() + index * DAY_MS);
    const iso = toIsoDate(date);
    return {
      date: iso,
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === currentMonth,
      isToday: iso === today,
    };
  });
}

export function createWeekDays(
  selectedDate: IsoDate,
  today: IsoDate
): WeekDay[] {
  const start = startOfWeek(selectedDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const parsed = parseIsoDate(date);
    return {
      date,
      dayOfMonth: parsed.getDate(),
      weekday: weekdays[index],
      isToday: date === today,
    };
  });
}

export function getTasksForDate(tasks: Task[], date: IsoDate): Task[] {
  return tasks
    .filter((task) => task.dueDate === date)
    .sort(
      (left, right) =>
        Number(left.done) - Number(right.done) ||
        priorityWeight(right.priority) - priorityWeight(left.priority)
    );
}

export function getEventsForDate(
  events: ScheduleEvent[],
  date: IsoDate
): ScheduleEvent[] {
  return events
    .filter((event) => event.date === date)
    .sort((left, right) =>
      `${left.startTime}-${left.endTime}`.localeCompare(
        `${right.startTime}-${right.endTime}`
      )
    );
}

export function createInitialState(clock: Clock): PlannerState {
  const today = clock.todayIso();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);
  const createdAt = clock.nowLocalDateTime();

  const tasks: Task[] = [
    {
      id: "task_seed_1",
      title: "월간 회고 정리",
      dueDate: today,
      priority: "high",
      done: false,
      note: "",
      reminderAt: `${today}T16:00`,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "task_seed_2",
      title: "다음 주 준비 항목 점검",
      dueDate: tomorrow,
      priority: "medium",
      done: false,
      note: "",
      reminderAt: `${tomorrow}T09:30`,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  const events: ScheduleEvent[] = [
    {
      id: "event_seed_1",
      title: "제품 회의",
      date: today,
      startTime: "10:00",
      endTime: "10:50",
      category: "work",
      note: "",
      reminderAt: `${today}T09:50`,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "event_seed_2",
      title: "스터디",
      date: nextWeek,
      startTime: "20:00",
      endTime: "21:00",
      category: "study",
      note: "",
      reminderAt: `${nextWeek}T19:30`,
      createdAt,
      updatedAt: createdAt,
    },
  ];

  return {
    tasks,
    events,
    notifications: [
      ...tasks.map((task) => createTaskNotification(task, clock)),
      ...events.map((event) => createEventNotification(event, clock)),
    ].filter(
      (notification): notification is PlannerNotification =>
        notification !== null
    ),
    selectedDate: today,
    visibleMonth: today,
  };
}

export function createTaskFromDraft(
  draft: TaskDraft,
  clock: Clock
): Task {
  const timestamp = clock.nowLocalDateTime();
  return {
    id: createId("task"),
    title: draft.title.trim(),
    dueDate: draft.dueDate,
    priority: draft.priority,
    done: false,
    note: draft.note.trim(),
    reminderAt: draft.reminderAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createEventFromDraft(
  draft: EventDraft,
  clock: Clock
): ScheduleEvent {
  const timestamp = clock.nowLocalDateTime();
  return {
    id: createId("event"),
    title: draft.title.trim(),
    date: draft.date,
    startTime: draft.startTime,
    endTime: draft.endTime,
    category: draft.category,
    note: draft.note.trim(),
    reminderAt: draft.reminderAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateTaskFromDraft(
  task: Task,
  draft: TaskDraft,
  clock: Clock
): Task {
  return {
    ...task,
    title: draft.title.trim(),
    dueDate: draft.dueDate,
    priority: draft.priority,
    note: draft.note.trim(),
    reminderAt: draft.reminderAt,
    updatedAt: clock.nowLocalDateTime(),
  };
}

export function updateEventFromDraft(
  event: ScheduleEvent,
  draft: EventDraft,
  clock: Clock
): ScheduleEvent {
  return {
    ...event,
    title: draft.title.trim(),
    date: draft.date,
    startTime: draft.startTime,
    endTime: draft.endTime,
    category: draft.category,
    note: draft.note.trim(),
    reminderAt: draft.reminderAt,
    updatedAt: clock.nowLocalDateTime(),
  };
}

export function createTaskNotification(
  task: Task,
  clock: Clock
): PlannerNotification | null {
  if (!task.reminderAt) {
    return null;
  }
  const now = clock.nowLocalDateTime();

  return {
    id: createId("notice"),
    sourceId: task.id,
    sourceType: "task",
    title: task.title,
    body: `${task.dueDate}까지 완료`,
    notifyAt: task.reminderAt,
    status: compareDateTime(task.reminderAt, now) <= 0 ? "ready" : "scheduled",
    createdAt: now,
  };
}

export function createEventNotification(
  event: ScheduleEvent,
  clock: Clock
): PlannerNotification | null {
  if (!event.reminderAt) {
    return null;
  }
  const now = clock.nowLocalDateTime();

  return {
    id: createId("notice"),
    sourceId: event.id,
    sourceType: "event",
    title: event.title,
    body: `${event.date} ${event.startTime}-${event.endTime}`,
    notifyAt: event.reminderAt,
    status: compareDateTime(event.reminderAt, now) <= 0 ? "ready" : "scheduled",
    createdAt: now,
  };
}

export function refreshNotificationStatuses(
  notifications: PlannerNotification[],
  clock: Clock
): PlannerNotification[] {
  const now = clock.nowLocalDateTime();
  return notifications.map((notification) => {
    if (notification.status !== "scheduled") {
      return notification;
    }
    return compareDateTime(notification.notifyAt, now) <= 0
      ? { ...notification, status: "ready" }
      : notification;
  });
}

export function snoozeNotification(
  notification: PlannerNotification,
  minutes: number
): PlannerNotification {
  return {
    ...notification,
    notifyAt: addMinutes(notification.notifyAt, minutes),
    status: "scheduled",
  };
}

function priorityWeight(priority: Priority): number {
  if (priority === "high") {
    return 3;
  }
  if (priority === "medium") {
    return 2;
  }
  return 1;
}
