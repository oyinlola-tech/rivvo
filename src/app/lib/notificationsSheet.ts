export const NOTIFICATIONS_SHEET_EVENT = "rivvo:open-notifications-sheet";

export const openNotificationsSheet = () => {
  window.dispatchEvent(new Event(NOTIFICATIONS_SHEET_EVENT));
};
