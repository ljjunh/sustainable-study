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
  updateTaskFromDraft,
} from "@/src/planner";
import {
  validateEventDraft,
  validateTaskDraft,
} from "@/src/planner-invariants";
import { useEffect, useReducer, useState } from "react";
import type { Clock, EventDraft, PlannerState, TaskDraft } from "@/src/planner";
import { systemClock } from "@/src/planner-clock";
import {
  browserPlannerStorage,
  browserScheduler,
} from "@/src/planner-runtime";
import type { PlannerStoragePort, SchedulerPort } from "@/src/planner-runtime";
import {
  decodeStoragePlannerState,
  encodeStoragePlannerState,
} from "@/src/planner-storage";

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

interface UsePlannerStoreDeps {
  clock?: Clock;
  storage?: PlannerStoragePort;
  scheduler?: SchedulerPort;
}

export function usePlannerStore({
  clock = systemClock,
  storage = browserPlannerStorage,
  scheduler = browserScheduler,
}: UsePlannerStoreDeps = {}) {
  const [state, dispatch] = useReducer(
    (currentState: PlannerState, action: PlannerAction) =>
      plannerReducer(currentState, action, clock),
    undefined,
    () => createInitialState(clock)
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(function hydratePlannerStore() {
    dispatch({ type: "replace", state: readPlannerState(clock, storage) });
    setHydrated(true);
  }, [clock, storage]);

  useEffect(
    function persistPlannerState() {
      if (!hydrated) {
        return;
      }
      // 내부 상태를 저장 포맷으로 인코딩한 뒤 저장소 포트에 기록합니다.
      try {
        storage.setItem(
          STORAGE_KEY,
          JSON.stringify(encodeStoragePlannerState(state))
        );
      } catch {
        // 저장 실패는 UI 동작을 막지 않도록 무시합니다.
      }
    },
    [hydrated, state, storage]
  );

  useEffect(function startNotificationRefreshTimer() {
    const timer = scheduler.setInterval(() => {
      dispatch({ type: "refreshNotifications" });
    }, 30_000);

    return () => scheduler.clearInterval(timer);
  }, [scheduler]);

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
      },
    },
  };
}

/**
 * 플래너 상태를 액션 단위로 갱신하는 reducer입니다.
 *
 * 각 액션은 상태를 불변 방식으로 계산해 새 상태를 반환하며,
 * 로컬 스토리지 동기화/타이머 같은 부수효과는 reducer 밖에서 처리합니다.
 *
 * @param state 현재 플래너 상태
 * @param action 상태 변경 의도를 담은 액션
 * @returns 다음 플래너 상태
 */
function plannerReducer(
  state: PlannerState,
  action: PlannerAction,
  clock: Clock
): PlannerState {
  switch (action.type) {
    // 로컬 스토리지에서 복원한 상태로 전체를 교체합니다.
    case "replace":
      return action.state;
    // 선택한 날짜를 변경하고, 월이 달라졌다면 visibleMonth도 함께 맞춥니다.
    case "selectDate":
      return {
        ...state,
        selectedDate: action.date,
        visibleMonth:
          action.date.slice(0, 7) === state.visibleMonth.slice(0, 7)
            ? state.visibleMonth
            : action.date,
      };
    // 미니 캘린더 등에서 현재 보고 있는 월만 변경합니다.
    case "setVisibleMonth":
      return { ...state, visibleMonth: action.month };
    // 새 할 일을 추가하고, 필요한 알림/선택 날짜/표시 월을 동기화합니다.
    case "addTask": {
      const validation = validateTaskDraft(action.draft);
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
    // 기존 할 일을 수정하고, 연결된 알림도 재생성해 최신 상태로 맞춥니다.
    case "updateTask": {
      const original = state.tasks.find((task) => task.id === action.id);
      if (!original) {
        return state;
      }

      const validation = validateTaskDraft(action.draft);
      if (!validation.ok) {
        return state;
      }

      const task = updateTaskFromDraft(original, validation.value, clock);
      const notification = createTaskNotification(task, clock);
      return {
        ...state,
        tasks: state.tasks.map((item) => (item.id === action.id ? task : item)),
        notifications: [
          ...(notification ? [notification] : []),
          ...state.notifications.filter((item) => item.sourceId !== action.id),
        ],
        selectedDate: task.dueDate,
        visibleMonth: task.dueDate,
      };
    }
    // 할 일 완료 여부(done)를 토글합니다.
    case "toggleTask":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, done: !task.done } : task
        ),
      };
    // 할 일과 그 할 일에 연결된 알림을 함께 삭제합니다.
    case "deleteTask":
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.id),
        notifications: state.notifications.filter(
          (notification) => notification.sourceId !== action.id
        ),
      };
    // 새 일정을 추가하고, 필요한 알림/선택 날짜/표시 월을 동기화합니다.
    case "addEvent": {
      const validation = validateEventDraft(action.draft);
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
    // 기존 일정을 수정하고, 연결된 알림도 재생성해 최신 상태로 맞춥니다.
    case "updateEvent": {
      const original = state.events.find((event) => event.id === action.id);
      if (!original) {
        return state;
      }

      const validation = validateEventDraft(action.draft);
      if (!validation.ok) {
        return state;
      }

      const event = updateEventFromDraft(original, validation.value, clock);
      const notification = createEventNotification(event, clock);
      return {
        ...state,
        events: state.events.map((item) =>
          item.id === action.id ? event : item
        ),
        notifications: [
          ...(notification ? [notification] : []),
          ...state.notifications.filter((item) => item.sourceId !== action.id),
        ],
        selectedDate: event.date,
        visibleMonth: event.date,
      };
    }
    // 일정과 그 일정에 연결된 알림을 함께 삭제합니다.
    case "deleteEvent":
      return {
        ...state,
        events: state.events.filter((event) => event.id !== action.id),
        notifications: state.notifications.filter(
          (notification) => notification.sourceId !== action.id
        ),
      };
    // 특정 알림을 읽음 상태(read)로 변경합니다.
    case "markNotificationRead":
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.id
            ? { ...notification, status: "read" }
            : notification
        ),
      };
    // 특정 알림의 시간(notifyAt)을 뒤로 미루고 scheduled 상태로 되돌립니다.
    case "snoozeNotification":
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.id
            ? snoozeNotification(notification, action.minutes)
            : notification
        ),
      };
    // 현재 시각 기준으로 알림 상태를 scheduled -> ready로 갱신합니다.
    case "refreshNotifications":
      return {
        ...state,
        notifications: refreshNotificationStatuses(state.notifications, clock),
      };
    // 알 수 없는 액션은 현재 상태를 그대로 유지합니다.
    default:
      return state;
  }
}

/**
 * 로컬 스토리지에 저장된 플래너 상태를 읽어 안전하게 복원합니다.
 *
 * - 저장값이 없거나 JSON 파싱에 실패하면 초기 상태를 반환합니다.
 * - 필드별 타입을 검증한 뒤 유효한 값만 사용하고, 나머지는 초기 상태로 대체합니다.
 *
 * @returns 복원된 플래너 상태(`PlannerState`)
 */
function readPlannerState(
  clock: Clock,
  storage: PlannerStoragePort
): PlannerState {
  const fallback = createInitialState(clock);
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as unknown;
    // 저장 포맷을 도메인 상태로 디코딩합니다.
    const decoded = decodeStoragePlannerState(parsed);
    if (!decoded) {
      return fallback;
    }
    return decoded;
  } catch {
    return fallback;
  }
}
