import {
  createEventFromDraft,
  createEventNotification,
  createTaskFromDraft,
  createTaskNotification,
  refreshNotificationStatuses,
  snoozeNotification,
  updateEventFromDraft,
  updateTaskFromDraft,
} from "@/src/planner";
import type { Clock, EventDraft, PlannerState, TaskDraft } from "@/src/planner";
import {
  validateEventDraft,
  validateTaskDraft,
} from "@/src/planner-invariants";

export function applySelectDate(
  state: PlannerState,
  date: string
): PlannerState {
  return {
    ...state,
    selectedDate: date,
    visibleMonth:
      date.slice(0, 7) === state.visibleMonth.slice(0, 7)
        ? state.visibleMonth
        : date,
  };
}

export function applySetVisibleMonth(
  state: PlannerState,
  month: string
): PlannerState {
  return { ...state, visibleMonth: month };
}

export function applyAddTask(
  state: PlannerState,
  draft: TaskDraft,
  clock: Clock
): PlannerState {
  const validation = validateTaskDraft(draft);
  if (!validation.ok) {
    return state;
  }

  const task = createTaskFromDraft(validation.value, clock);
  const notification = createTaskNotification(task, clock);
  return {
    ...state,
    tasks: [task, ...state.tasks],
    notifications: notification
      ? [notification, ...state.notifications]
      : state.notifications,
    selectedDate: task.dueDate,
    visibleMonth: task.dueDate,
  };
}

export function applyUpdateTask(
  state: PlannerState,
  id: string,
  draft: TaskDraft,
  clock: Clock
): PlannerState {
  const original = state.tasks.find((task) => task.id === id);
  if (!original) {
    return state;
  }

  const validation = validateTaskDraft(draft);
  if (!validation.ok) {
    return state;
  }

  const task = updateTaskFromDraft(original, validation.value, clock);
  const notification = createTaskNotification(task, clock);
  return {
    ...state,
    tasks: state.tasks.map((item) => (item.id === id ? task : item)),
    notifications: [
      ...(notification ? [notification] : []),
      ...state.notifications.filter((item) => item.sourceId !== id),
    ],
    selectedDate: task.dueDate,
    visibleMonth: task.dueDate,
  };
}

export function applyToggleTask(state: PlannerState, id: string): PlannerState {
  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === id ? { ...task, done: !task.done } : task
    ),
  };
}

export function applyDeleteTask(state: PlannerState, id: string): PlannerState {
  return {
    ...state,
    tasks: state.tasks.filter((task) => task.id !== id),
    notifications: state.notifications.filter(
      (notification) => notification.sourceId !== id
    ),
  };
}

export function applyAddEvent(
  state: PlannerState,
  draft: EventDraft,
  clock: Clock
): PlannerState {
  const validation = validateEventDraft(draft);
  if (!validation.ok) {
    return state;
  }
  const event = createEventFromDraft(validation.value, clock);
  const notification = createEventNotification(event, clock);
  return {
    ...state,
    events: [...state.events, event],
    notifications: notification
      ? [notification, ...state.notifications]
      : state.notifications,
    selectedDate: event.date,
    visibleMonth: event.date,
  };
}

export function applyUpdateEvent(
  state: PlannerState,
  id: string,
  draft: EventDraft,
  clock: Clock
): PlannerState {
  const original = state.events.find((event) => event.id === id);
  if (!original) {
    return state;
  }

  const validation = validateEventDraft(draft);
  if (!validation.ok) {
    return state;
  }

  const event = updateEventFromDraft(original, validation.value, clock);
  const notification = createEventNotification(event, clock);
  return {
    ...state,
    events: state.events.map((item) => (item.id === id ? event : item)),
    notifications: [
      ...(notification ? [notification] : []),
      ...state.notifications.filter((item) => item.sourceId !== id),
    ],
    selectedDate: event.date,
    visibleMonth: event.date,
  };
}

export function applyDeleteEvent(
  state: PlannerState,
  id: string
): PlannerState {
  return {
    ...state,
    events: state.events.filter((event) => event.id !== id),
    notifications: state.notifications.filter(
      (notification) => notification.sourceId !== id
    ),
  };
}

export function applyMarkNotificationRead(
  state: PlannerState,
  id: string
): PlannerState {
  return {
    ...state,
    notifications: state.notifications.map((notification) =>
      notification.id === id
        ? { ...notification, status: "read" }
        : notification
    ),
  };
}

export function applySnoozeNotification(
  state: PlannerState,
  id: string,
  minutes: number
): PlannerState {
  return {
    ...state,
    notifications: state.notifications.map((notification) =>
      notification.id === id
        ? snoozeNotification(notification, minutes)
        : notification
    ),
  };
}

export function applyRefreshNotifications(
  state: PlannerState,
  clock: Clock
): PlannerState {
  return {
    ...state,
    notifications: refreshNotificationStatuses(state.notifications, clock),
  };
}
