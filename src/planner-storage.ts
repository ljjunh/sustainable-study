import { isValidIsoDate } from "@/src/planner-invariants";
import type {
  PlannerNotification,
  PlannerState,
  ScheduleEvent,
  Task,
} from "@/src/planner";

export interface StoragePlannerStateV1 {
  version: 1;
  data: {
    tasks: Task[];
    events: ScheduleEvent[];
    notifications: PlannerNotification[];
    selectedDate: string;
    visibleMonth: string;
  };
}

// 내부 도메인 상태를 저장 전용 포맷(v1)으로 변환합니다.
export function encodeStoragePlannerState(
  state: PlannerState
): StoragePlannerStateV1 {
  return {
    version: 1,
    data: {
      tasks: state.tasks,
      events: state.events,
      notifications: state.notifications,
      selectedDate: state.selectedDate,
      visibleMonth: state.visibleMonth,
    },
  };
}

// 저장 데이터는 외부 입력으로 보고, 현재 포맷(v1)으로 복원을 시도합니다.
export function decodeStoragePlannerState(raw: unknown): PlannerState | null {
  return decodeV1(raw);
}

// 현재 저장 포맷: { version: 1, data: ... }
function decodeV1(raw: unknown): PlannerState | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (raw.version !== 1) {
    return null;
  }
  if (!isRecord(raw.data)) {
    return null;
  }
  return decodeDataRecord(raw.data);
}

// 공통 데이터 shape를 검증한 뒤 PlannerState로 복원합니다.
function decodeDataRecord(data: Record<string, unknown>): PlannerState | null {
  const tasks = parseTasks(data.tasks);
  const events = parseEvents(data.events);
  const notifications = parseNotifications(data.notifications);

  if (!tasks || !events || !notifications) {
    return null;
  }

  if (
    typeof data.selectedDate !== "string" ||
    !isValidIsoDate(data.selectedDate)
  ) {
    return null;
  }

  if (
    typeof data.visibleMonth !== "string" ||
    !isValidIsoDate(data.visibleMonth)
  ) {
    return null;
  }

  return {
    tasks,
    events,
    notifications,
    selectedDate: data.selectedDate,
    visibleMonth: data.visibleMonth,
  };
}

// 배열과 요소 타입을 모두 확인해 깨진 데이터를 차단합니다.
function parseTasks(value: unknown): Task[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  if (!value.every(isTask)) {
    return null;
  }
  return value;
}

function parseEvents(value: unknown): ScheduleEvent[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  if (!value.every(isEvent)) {
    return null;
  }
  return value;
}

function parseNotifications(value: unknown): PlannerNotification[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  if (!value.every(isNotification)) {
    return null;
  }
  return value;
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.dueDate === "string" &&
    isValidIsoDate(value.dueDate) &&
    (value.priority === "low" ||
      value.priority === "medium" ||
      value.priority === "high") &&
    typeof value.done === "boolean" &&
    typeof value.note === "string" &&
    isNullableString(value.reminderAt) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isEvent(value: unknown): value is ScheduleEvent {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.date === "string" &&
    isValidIsoDate(value.date) &&
    typeof value.startTime === "string" &&
    typeof value.endTime === "string" &&
    (value.category === "work" ||
      value.category === "personal" ||
      value.category === "study" ||
      value.category === "health") &&
    typeof value.note === "string" &&
    isNullableString(value.reminderAt) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isNotification(value: unknown): value is PlannerNotification {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.sourceId === "string" &&
    (value.sourceType === "task" || value.sourceType === "event") &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    typeof value.notifyAt === "string" &&
    (value.status === "scheduled" ||
      value.status === "ready" ||
      value.status === "read") &&
    typeof value.createdAt === "string"
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
