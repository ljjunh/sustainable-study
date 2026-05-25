"use client";

import { createInitialState } from "@/src/planner";
import { useEffect, useReducer, useState } from "react";
import type { Clock, EventDraft, PlannerState, TaskDraft } from "@/src/planner";
import { systemClock } from "@/src/planner-clock";
import {
  plannerReducer,
  type PlannerAction,
} from "@/src/hooks/planner-reducer";
import { browserPlannerStorage, browserScheduler } from "@/src/planner-runtime";
import type { PlannerStoragePort, SchedulerPort } from "@/src/planner-runtime";
import {
  decodeStoragePlannerState,
  encodeStoragePlannerState,
} from "@/src/planner-storage";

const STORAGE_KEY = "plain-planner:v1";

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

  useEffect(
    function hydratePlannerStore() {
      dispatch({ type: "replace", state: readPlannerState(clock, storage) });
      setHydrated(true);
    },
    [clock, storage]
  );

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

  useEffect(
    function startNotificationRefreshTimer() {
      const timer = scheduler.setInterval(() => {
        dispatch({ type: "refreshNotifications" });
      }, 30_000);

      return () => scheduler.clearInterval(timer);
    },
    [scheduler]
  );

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
