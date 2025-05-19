/**
 * Formats a date into a relative time string (e.g., "2 days ago").
 * @param {string | Date} dateInput - The date to format, can be a date string or Date object.
 * @returns {string} The formatted relative time string.
 */
function formatDateRelative(dateInput) {
  const date = new Date(dateInput);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const weeks = Math.round(days / 7);
  const months = Math.round(days / 30.44); // Average days in a month
  const years = Math.round(days / 365.25); // Account for leap years

  if (seconds < 60) {
    return `${seconds} seconds ago`;
  }
  if (minutes < 60) {
    return minutes === 1 ? `1 minute ago` : `${minutes} minutes ago`;
  }
  if (hours < 24) {
    return hours === 1 ? `1 hour ago` : `${hours} hours ago`;
  }
  if (days < 7) {
    return days === 1 ? `1 day ago` : `${days} days ago`;
  }
  if (weeks < 4.345) { // Average weeks in a month
    return weeks === 1 ? `1 week ago` : `${weeks} weeks ago`;
  }
  if (months < 12) {
    return months === 1 ? `1 month ago` : `${months} months ago`;
  }
  return years === 1 ? `1 year ago` : `${years} years ago`;
}

module.exports = {
  formatDateRelative,
};
