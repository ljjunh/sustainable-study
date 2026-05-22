"use client";

import { useMemo, useState } from "react";
import { compareDateTime, formatDateTime } from "@/src/planner";
import type { PlannerNotification } from "@/src/planner";

type NotificationFilter = "ready" | "scheduled" | "read" | "all";

interface NotificationMenuProps {
  notifications: PlannerNotification[];
  onRead(id: string): void;
  onSnooze(id: string, minutes: number): void;
}

export function NotificationMenu({ notifications, onRead, onSnooze }: NotificationMenuProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("ready");
  const readyCount = notifications.filter((notification) => notification.status === "ready").length;

  const visibleNotifications = useMemo(() => {
    return notifications
      .filter((notification) => filter === "all" || notification.status === filter)
      .sort((left, right) => compareDateTime(left.notifyAt, right.notifyAt));
  }, [filter, notifications]);

  return (
    <div className="notification-menu-wrap">
      <button
        className="menu-button"
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        알림
        {readyCount > 0 ? <span className="menu-badge">{readyCount}</span> : null}
      </button>

      {open ? (
        <div className="notification-menu-popover" role="menu">
          <div className="panel-header">
            <h2>알림</h2>
            <button className="icon-button" type="button" aria-label="알림 닫기" onClick={() => setOpen(false)}>
              X
            </button>
          </div>
          <div className="panel-body">
            <div className="segmented notification-filter" aria-label="알림 필터">
              {notificationFilters.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={filter === item.value ? "active" : ""}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="list notification-list">
              {visibleNotifications.length === 0 ? (
                <div className="empty-state">알림 없음</div>
              ) : (
                visibleNotifications.map((notification) => (
                  <article className={`notification-row ${notification.status}`} key={notification.id}>
                    <div className="item-line">
                      <div>
                        <div className="item-title">{notification.title}</div>
                        <div className="item-meta">
                          <span className="tag">{statusLabel[notification.status]}</span>
                          <span className="tag">{formatDateTime(notification.notifyAt)}</span>
                        </div>
                        <div className="item-meta">{notification.body}</div>
                      </div>
                      <div className="row-actions">
                        <button className="secondary-button" type="button" onClick={() => onSnooze(notification.id, 10)}>
                          +10분
                        </button>
                        <button className="primary-button" type="button" onClick={() => onRead(notification.id)}>
                          확인
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const notificationFilters: Array<{ value: NotificationFilter; label: string }> = [
  { value: "ready", label: "도착" },
  { value: "scheduled", label: "예정" },
  { value: "read", label: "확인" },
  { value: "all", label: "전체" }
];

const statusLabel: Record<PlannerNotification["status"], string> = {
  scheduled: "예정",
  ready: "도착",
  read: "확인"
};
