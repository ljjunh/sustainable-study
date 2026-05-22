"use client";

import {
  createEventFromDraft,
  createEventNotification,
  createInitialState,
  createTaskFromDraft,
  createTaskNotification,
  refreshNotificationStatuses,
  snoozeNotification,
  updateEventFromDraft,
  updateTaskFromDraft
} from "@/src/planner";
import { useEffect, useReducer, useState } from "react";
import type { EventDraft, PlannerState, TaskDraft } from "@/src/planner";

const STORAGE_KEY = "plain-planner:v1";

type PlannerAction =
  | { type: "replace"; state: PlannerState }
  | { type: "selectDate"; date: string }
  | { type: "setVisibleMonth"; month: string }
  | { type: "addTask"; draft: TaskDraft }
  | { type: "updateTask"; id: string; draft: TaskDraft }
  | { type: "toggleTask"; id: string }
  | { type: "deleteTask"; id: string }
  | { type: "addEvent"; draft: EventDraft }
  | { type: "updateEvent"; id: string; draft: EventDraft }
  | { type: "deleteEvent"; id: string }
  | { type: "markNotificationRead"; id: string }
  | { type: "snoozeNotification"; id: string; minutes: number }
  | { type: "refreshNotifications" };

export function usePlannerStore() {
  const [state, dispatch] = useReducer(plannerReducer, undefined, () => createInitialState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    dispatch({ type: "replace", state: readPlannerState() });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      dispatch({ type: "refreshNotifications" });
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  return {
    state,
    hydrated,
    actions: {
      selectDate(date: string) {
        dispatch({ type: "selectDate", date });
      },
      setVisibleMonth(month: string) {
        dispatch({ type: "setVisibleMonth", month });
      },
      addTask(draft: TaskDraft) {
        dispatch({ type: "addTask", draft });
      },
      updateTask(id: string, draft: TaskDraft) {
        dispatch({ type: "updateTask", id, draft });
      },
      toggleTask(id: string) {
        dispatch({ type: "toggleTask", id });
      },
      deleteTask(id: string) {
        dispatch({ type: "deleteTask", id });
      },
      addEvent(draft: EventDraft) {
        dispatch({ type: "addEvent", draft });
      },
      updateEvent(id: string, draft: EventDraft) {
        dispatch({ type: "updateEvent", id, draft });
      },
      deleteEvent(id: string) {
        dispatch({ type: "deleteEvent", id });
      },
      markNotificationRead(id: string) {
        dispatch({ type: "markNotificationRead", id });
      },
      snoozeNotification(id: string, minutes: number) {
        dispatch({ type: "snoozeNotification", id, minutes });
      }
    }
  };
}

function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case "replace":
      return action.state;
    case "selectDate":
      return {
        ...state,
        selectedDate: action.date,
        visibleMonth: action.date.slice(0, 7) === state.visibleMonth.slice(0, 7) ? state.visibleMonth : action.date
      };
    case "setVisibleMonth":
      return { ...state, visibleMonth: action.month };
    case "addTask": {
      const task = createTaskFromDraft(action.draft);
      const notification = createTaskNotification(task);
      return {
        ...state,
        tasks: [task, ...state.tasks],
        notifications: notification ? [notification, ...state.notifications] : state.notifications,
        selectedDate: task.dueDate,
        visibleMonth: task.dueDate
      };
    }
    case "updateTask": {
      const original = state.tasks.find((task) => task.id === action.id);
      if (!original) {
        return state;
      }

      const task = updateTaskFromDraft(original, action.draft);
      const notification = createTaskNotification(task);
      return {
        ...state,
        tasks: state.tasks.map((item) => (item.id === action.id ? task : item)),
        notifications: [
          ...(notification ? [notification] : []),
          ...state.notifications.filter((item) => item.sourceId !== action.id)
        ],
        selectedDate: task.dueDate,
        visibleMonth: task.dueDate
      };
    }
    case "toggleTask":
      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.id ? { ...task, done: !task.done } : task))
      };
    case "deleteTask":
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.id),
        notifications: state.notifications.filter((notification) => notification.sourceId !== action.id)
      };
    case "addEvent": {
      const event = createEventFromDraft(action.draft);
      const notification = createEventNotification(event);
      return {
        ...state,
        events: [...state.events, event],
        notifications: notification ? [notification, ...state.notifications] : state.notifications,
        selectedDate: event.date,
        visibleMonth: event.date
      };
    }
    case "updateEvent": {
      const original = state.events.find((event) => event.id === action.id);
      if (!original) {
        return state;
      }

      const event = updateEventFromDraft(original, action.draft);
      const notification = createEventNotification(event);
      return {
        ...state,
        events: state.events.map((item) => (item.id === action.id ? event : item)),
        notifications: [
          ...(notification ? [notification] : []),
          ...state.notifications.filter((item) => item.sourceId !== action.id)
        ],
        selectedDate: event.date,
        visibleMonth: event.date
      };
    }
    case "deleteEvent":
      return {
        ...state,
        events: state.events.filter((event) => event.id !== action.id),
        notifications: state.notifications.filter((notification) => notification.sourceId !== action.id)
      };
    case "markNotificationRead":
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.id ? { ...notification, status: "read" } : notification
        )
      };
    case "snoozeNotification":
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.id ? snoozeNotification(notification, action.minutes) : notification
        )
      };
    case "refreshNotifications":
      return {
        ...state,
        notifications: refreshNotificationStatuses(state.notifications)
      };
    default:
      return state;
  }
}

function readPlannerState(): PlannerState {
  const fallback = createInitialState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PlannerState>;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : fallback.tasks,
      events: Array.isArray(parsed.events) ? parsed.events : fallback.events,
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : fallback.notifications,
      selectedDate: typeof parsed.selectedDate === "string" ? parsed.selectedDate : fallback.selectedDate,
      visibleMonth: typeof parsed.visibleMonth === "string" ? parsed.visibleMonth : fallback.visibleMonth
    };
  } catch {
    return fallback;
  }
}
