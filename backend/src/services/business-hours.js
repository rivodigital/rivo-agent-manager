const DAY_MAP = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

function nowInTimezone(tz) {
  const now = new Date();
  const str = now.toLocaleString("en-US", { timeZone: tz });
  return new Date(str);
}

export function isWithinBusinessHours(agent) {
  if (!agent.businessHours) return { within: true };

  let bh;
  try {
    bh = JSON.parse(agent.businessHours);
  } catch {
    return { within: true };
  }

  if (!bh.schedule) return { within: true };

  const tz = bh.timezone || "America/Sao_Paulo";
  const now = nowInTimezone(tz);
  const dayKey = DAY_MAP[now.getDay()];
  const dayConfig = bh.schedule[dayKey];

  if (!dayConfig) {
    return { within: false, offHoursMessage: bh.offHoursMessage };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = dayConfig.start.split(":").map(Number);
  const [endH, endM] = dayConfig.end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const within = currentMinutes >= startMinutes && currentMinutes <= endMinutes;

  return {
    within,
    offHoursMessage: bh.offHoursMessage,
  };
}
