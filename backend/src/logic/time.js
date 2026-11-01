function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

module.exports = { formatTimestamp };
