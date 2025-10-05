/**
 * Date utility functions for handling UTC dates and timezone conversion
 */

/**
 * Converts a UTC date string to the user's local timezone
 * @param utcDateString - Date string in UTC format (ISO string)
 * @returns Date object in local timezone
 */
export const utcToLocal = (utcDateString: string): Date => {
  return new Date(utcDateString);
};

/**
 * Formats a UTC date string to display in the user's local timezone
 * @param utcDateString - Date string in UTC format (ISO string)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string in local timezone
 */
export const formatUtcDate = (
  utcDateString: string, 
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const date = utcToLocal(utcDateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  });
};

/**
 * Formats a UTC date string to display time in the user's local timezone
 * @param utcDateString - Date string in UTC format (ISO string)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted time string in local timezone
 */
export const formatUtcTime = (
  utcDateString: string,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const date = utcToLocal(utcDateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    ...options
  });
};

/**
 * Formats a UTC date string to display both date and time in the user's local timezone
 * @param utcDateString - Date string in UTC format (ISO string)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date and time string in local timezone
 */
export const formatUtcDateTime = (
  utcDateString: string,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const date = utcToLocal(utcDateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  });
};

/**
 * Gets a relative time string (e.g., "2 hours ago", "in 3 days") from a UTC date
 * @param utcDateString - Date string in UTC format (ISO string)
 * @returns Relative time string
 */
export const getRelativeTime = (utcDateString: string): string => {
  const date = utcToLocal(utcDateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return formatUtcDate(utcDateString);
  }
};

/**
 * Formats a due date with relative information (e.g., "Due in 2 days", "Overdue by 1 day")
 * @param utcDateString - Due date string in UTC format (ISO string)
 * @returns Formatted due date string with relative information
 */
export const formatDueDate = (utcDateString: string): string => {
  const dueDate = utcToLocal(utcDateString);
  const now = new Date();
  const diffInDays = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < 0) {
    const overdueDays = Math.abs(diffInDays);
    return `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`;
  } else if (diffInDays === 0) {
    return 'Due today';
  } else if (diffInDays === 1) {
    return 'Due tomorrow';
  } else {
    return `Due in ${diffInDays} days`;
  }
};

/**
 * Converts a local date to UTC ISO string for sending to backend
 * @param localDate - Local Date object
 * @returns UTC ISO string
 */
export const localToUtc = (localDate: Date): string => {
  return localDate.toISOString();
};

/**
 * Gets the current date and time in UTC format
 * @returns Current UTC ISO string
 */
export const nowUtc = (): string => {
  return new Date().toISOString();
};

/**
 * Checks if a UTC date is overdue (past the current time)
 * @param utcDateString - Date string in UTC format (ISO string)
 * @returns true if the date is in the past
 */
export const isOverdue = (utcDateString: string): boolean => {
  const date = utcToLocal(utcDateString);
  return date < new Date();
};

/**
 * Checks if a UTC date is due soon (within the next 24 hours)
 * @param utcDateString - Date string in UTC format (ISO string)
 * @param hours - Number of hours to consider "soon" (default: 24)
 * @returns true if the date is within the specified hours
 */
export const isDueSoon = (utcDateString: string, hours: number = 24): boolean => {
  const dueDate = utcToLocal(utcDateString);
  const now = new Date();
  const hoursFromNow = new Date(now.getTime() + hours * 60 * 60 * 1000);
  
  return dueDate >= now && dueDate <= hoursFromNow;
};
