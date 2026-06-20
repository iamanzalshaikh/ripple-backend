export const DESKTOP_INTENT_ACTIONS = [
  "open_folder",
  "open_file",
  "open_item",
  "open_app",
  "switch_app",
  "close_app",
  "smart_search",
  "recall_last",
  "delete_file",
  "rename_file",
  "move_file",
  "create_folder",
  "create_file",
  "system_action",
  "none",
] as const;

export type DesktopIntentAction = (typeof DESKTOP_INTENT_ACTIONS)[number];

export type DesktopIntentEntities = {
  folder?: "downloads" | "documents" | "desktop";
  from_folder?: "downloads" | "documents" | "desktop";
  to_folder?: "downloads" | "documents" | "desktop";
  item_name?: string;
  file_token?: string;
  app_name?: string;
  new_name?: string;
  extension?: string;
  time?: "yesterday" | "today" | "last_week";
  recall_target?: "auto" | "file" | "folder" | "app" | "workspace";
  system_action?:
    | "lock"
    | "settings"
    | "bluetooth"
    | "network"
    | "wifi"
    | "control_panel"
    | "task_manager";
};

export type DesktopIntentPlan = {
  action: DesktopIntentAction;
  entities: DesktopIntentEntities;
  confidence: number;
  language?: string;
};
