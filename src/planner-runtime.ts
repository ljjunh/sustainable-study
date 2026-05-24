export interface PlannerStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SchedulerPort {
  setInterval(callback: () => void, intervalMs: number): number;
  clearInterval(timerId: number): void;
}

export const browserPlannerStorage: PlannerStoragePort = {
  getItem(key) {
    return window.localStorage.getItem(key);
  },
  setItem(key, value) {
    window.localStorage.setItem(key, value);
  },
};

export const browserScheduler: SchedulerPort = {
  setInterval(callback, intervalMs) {
    return window.setInterval(callback, intervalMs);
  },
  clearInterval(timerId) {
    window.clearInterval(timerId);
  },
};
