// Notification event types and their defaults. Shared by the settings screen and the sender.
// Channels are pluggable: "email" now; WhatsApp/Slack can be added as new channels later.

export const NOTIFICATION_EVENTS = [
  "task_assigned",
  "task_commented",
  "task_status_changed",
  "task_due_tomorrow",
  "task_overdue",
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const NOTIFICATION_CHANNELS = ["email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** What's on when the user hasn't touched the setting. */
export const DEFAULT_ENABLED: Record<NotificationEvent, boolean> = {
  task_assigned: true,
  task_commented: true,
  task_status_changed: false,
  task_due_tomorrow: true,
  task_overdue: true,
};

export type Preference = { event_type: string; channel: string; enabled: boolean };

export function isEnabled(prefs: Preference[], event: NotificationEvent, channel: NotificationChannel = "email") {
  const row = prefs.find((p) => p.event_type === event && p.channel === channel);
  return row ? row.enabled : DEFAULT_ENABLED[event];
}
