const STORAGE_KEY = "kcalTrackerMeals";
const DAILY_KCAL_GOAL = 2500;
const SEMI_RING_LENGTH = 267;
const MINUTES_IN_DAY = 1439;

const mealForm = document.querySelector("#mealForm");
const dateInput = document.querySelector("#dateInput");
const timeInput = document.querySelector("#timeInput");
const nameInput = document.querySelector("#nameInput");
const kcalInput = document.querySelector("#kcalInput");
const mealList = document.querySelector("#mealList");
const emptyState = document.querySelector("#emptyState");
const dailyTotal = document.querySelector("#dailyTotal");
const itemCount = document.querySelector("#itemCount");
const selectedDateText = document.querySelector("#selectedDateText");
const clearAllBtn = document.querySelector("#clearAllBtn");
const remainingKcal = document.querySelector("#remainingKcal");
const goalStatus = document.querySelector("#goalStatus");
const progressRing = document.querySelector("#progressRing");
const progressPercent = document.querySelector("#progressPercent");
const dayCountdown = document.querySelector("#dayCountdown");
const periodChart = document.querySelector("#periodChart") || document.querySelector("#kcalChart");
const periodChartEmptyState = document.querySelector("#periodChartEmptyState") || document.querySelector("#chartEmptyState");
const dayProgressChart = document.querySelector("#dayProgressChart");
const dayProgressEmptyState = document.querySelector("#dayProgressEmptyState");

let meals = loadMeals();

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function getCurrentMinutes() {
  const now = new Date();
  return Math.max(1, Math.min((now.getHours() * 60) + now.getMinutes(), MINUTES_IN_DAY));
}

function loadMeals() {
  const savedMeals = localStorage.getItem(STORAGE_KEY);

  if (!savedMeals) {
    return [];
  }

  try {
    const parsedMeals = JSON.parse(savedMeals);
    return Array.isArray(parsedMeals) ? parsedMeals : [];
  } catch (error) {
    console.error("Kon opgeslagen maaltijden niet lezen:", error);
    return [];
  }
}

function saveMeals() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
}

function formatIsoDateToInput(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return "";
  }

  const [year, month, day] = dateString.split("-");
  return `${day}-${month}-${year}`;
}

function parseDateInput(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return getToday();
  }

  let day;
  let month;
  let year;

  const dutchMatch = trimmedValue.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  const isoMatch = trimmedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (dutchMatch) {
    [, day, month, year] = dutchMatch;
  } else if (isoMatch) {
    [, year, month, day] = isoMatch;
  } else {
    return null;
  }

  const normalizedDay = String(Number(day)).padStart(2, "0");
  const normalizedMonth = String(Number(month)).padStart(2, "0");
  const isoDate = `${year}-${normalizedMonth}-${normalizedDay}`;
  const parsedDate = new Date(`${isoDate}T00:00:00`);

  const isValidDate = !Number.isNaN(parsedDate.getTime())
    && parsedDate.getFullYear() === Number(year)
    && parsedDate.getMonth() + 1 === Number(month)
    && parsedDate.getDate() === Number(day);

  return isValidDate ? isoDate : null;
}

function getSelectedDate() {
  return parseDateInput(dateInput.value);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatShortDate(dateString) {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(`${dateString}T00:00:00`));
}

function isValidTime(value) {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

function normalizeTime(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return getCurrentTime();
  }

  const match = trimmedValue.match(/^(\d{1,2}):([0-5]\d)$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatTimeForMeal(meal) {
  if (meal.time) {
    return normalizeTime(meal.time) || meal.time;
  }

  if (meal.createdAt) {
    return new Intl.DateTimeFormat("nl-NL", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(meal.createdAt));
  }

  return "00:00";
}

function timeToMinutes(timeString) {
  if (!timeString || !timeString.includes(":")) {
    return 0;
  }

  const [hours, minutes] = timeString.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }

  return Math.max(0, Math.min((hours * 60) + minutes, MINUTES_IN_DAY));
}

function minutesToTimeLabel(totalMinutes) {
  const clampedMinutes = Math.max(0, Math.min(Math.round(totalMinutes), MINUTES_IN_DAY));
  const hours = Math.floor(clampedMinutes / 60);
  const minutes = clampedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getDefaultMealName(timeString = getCurrentTime()) {
  const minutes = timeToMinutes(timeString);

  if (minutes >= 360 && minutes < 600) {
    return "Ontbijt";
  }

  if (minutes >= 600 && minutes < 720) {
    return "Brunch";
  }

  if (minutes >= 720 && minutes < 900) {
    return "Lunch";
  }

  if (minutes >= 900 && minutes < 1050) {
    return "Pre-avondeten snack";
  }

  if (minutes >= 1050 && minutes < 1290) {
    return "Avondeten";
  }

  return "Late-night snacks";
}

function getSelectedTimeForDefaults() {
  return normalizeTime(timeInput.value) || getCurrentTime();
}

function updateInputPlaceholders() {
  dateInput.placeholder = formatIsoDateToInput(getToday());
  timeInput.placeholder = getCurrentTime();
  nameInput.placeholder = getDefaultMealName(getSelectedTimeForDefaults());

  const selectedDate = getSelectedDate();
  dateInput.classList.toggle("input-error", dateInput.value.trim() !== "" && !selectedDate);
  timeInput.classList.toggle("input-error", timeInput.value.trim() !== "" && !normalizeTime(timeInput.value));
}

function getMealsForSelectedDate() {
  const selectedDate = getSelectedDate();

  if (!selectedDate) {
    return [];
  }

  return meals.filter((meal) => meal.date === selectedDate);
}

function getDailyKcalTotals() {
  const totalsByDate = new Map();

  meals.forEach((meal) => {
    if (!meal.date) {
      return;
    }

    const currentTotal = totalsByDate.get(meal.date) || 0;
    totalsByDate.set(meal.date, currentTotal + (Number(meal.kcal) || 0));
  });

  return Array.from(totalsByDate, ([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function updateProgress(totalKcal) {
  const remaining = Math.max(DAILY_KCAL_GOAL - totalKcal, 0);
  const percentage = Math.min((totalKcal / DAILY_KCAL_GOAL) * 100, 100);
  const filledLength = (percentage / 100) * SEMI_RING_LENGTH;
  const emptyLength = SEMI_RING_LENGTH - filledLength;

  remainingKcal.textContent = remaining.toString();
  progressPercent.textContent = `${Math.round(percentage)}%`;
  progressRing.style.strokeDasharray = `${filledLength} ${emptyLength}`;

  if (totalKcal > DAILY_KCAL_GOAL) {
    goalStatus.textContent = `Je zit ${totalKcal - DAILY_KCAL_GOAL} kcal boven je dagdoel.`;
  } else {
    goalStatus.textContent = `${Math.round(percentage)}% van je dagdoel gehaald.`;
  }
}

function updateCountdown() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  const millisecondsLeft = midnight - now;
  const totalSecondsLeft = Math.max(Math.floor(millisecondsLeft / 1000), 0);
  const hours = Math.floor(totalSecondsLeft / 3600);
  const minutes = Math.floor((totalSecondsLeft % 3600) / 60);
  const seconds = totalSecondsLeft % 60;

  dayCountdown.textContent = [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function mixColor(start, end, ratio) {
  const clampedRatio = Math.max(0, Math.min(ratio, 1));
  const red = Math.round(start[0] + (end[0] - start[0]) * clampedRatio);
  const green = Math.round(start[1] + (end[1] - start[1]) * clampedRatio);
  const blue = Math.round(start[2] + (end[2] - start[2]) * clampedRatio);

  return `rgb(${red}, ${green}, ${blue})`;
}

function colorWithAlpha(color, alpha) {
  const values = color.match(/\d+/g) || [34, 197, 94];
  return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
}

function getGoalColor(ratio) {
  return mixColor([239, 68, 68], [34, 197, 94], ratio);
}

function resizeCanvasToDisplaySize(canvas) {
  const container = canvas.parentElement;
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(Math.floor(container.clientWidth), 320);
  const height = Math.max(Math.floor(container.clientHeight), 240);

  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  return { ctx, width, height };
}

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function drawRoundedLabel(ctx, text, x, y, options = {}) {
  const paddingX = options.paddingX ?? 7;
  const radius = options.radius ?? 7;
  const background = options.background ?? "rgba(15, 23, 42, 0.88)";
  const color = options.color ?? "#f9fafb";
  const font = options.font ?? "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

  ctx.save();
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const width = metrics.width + paddingX * 2;
  const height = 22;
  const left = x - width / 2;
  const top = y - height / 2;

  roundedRect(ctx, left, top, width, height, radius);
  ctx.fillStyle = background;
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

function getYAxisMax(values, minimum = DAILY_KCAL_GOAL) {
  const highestValue = Math.max(...values, minimum, 1);
  return Math.ceil((highestValue * 1.15) / 250) * 250;
}

function drawChartFrame(ctx, width, height, padding, yMax, options = {}) {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const ySteps = options.ySteps ?? 5;
  const xLabel = options.xLabel;
  const goalLineLabel = options.goalLineLabel;

  const yForValue = (value) => padding.top + chartHeight - (value / yMax) * chartHeight;

  ctx.save();
  ctx.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.lineWidth = 1;

  for (let step = 0; step <= ySteps; step += 1) {
    const value = Math.round((yMax / ySteps) * step);
    const y = yForValue(value);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = "rgba(249, 250, 251, 0.62)";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(value.toString(), padding.left - 10, y);
  }

  if (options.goalValue !== undefined && options.goalValue <= yMax) {
    const goalY = yForValue(options.goalValue);
    ctx.strokeStyle = "rgba(249, 250, 251, 0.38)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(padding.left, goalY);
    ctx.lineTo(width - padding.right, goalY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (goalLineLabel) {
      ctx.fillStyle = "rgba(249, 250, 251, 0.75)";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(goalLineLabel, padding.left + 8, goalY - 5);
    }
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();

  if (xLabel) {
    ctx.fillStyle = "rgba(249, 250, 251, 0.7)";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(xLabel, padding.left + chartWidth / 2, height - 8);
  }

  ctx.restore();

  return { chartWidth, chartHeight, yForValue };
}

function drawColoredLineAndArea(ctx, points, baselineY, colorForPoint) {
  if (points.length === 0) {
    return;
  }

  ctx.save();

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const color = colorForPoint(current, index);
    const nextColor = colorForPoint(next, index + 1);
    const gradient = ctx.createLinearGradient(current.x, 0, next.x, 0);

    gradient.addColorStop(0, colorWithAlpha(color, 0.3));
    gradient.addColorStop(1, colorWithAlpha(nextColor, 0.3));

    ctx.beginPath();
    ctx.moveTo(current.x, baselineY);
    ctx.lineTo(current.x, current.y);
    ctx.lineTo(next.x, next.y);
    ctx.lineTo(next.x, baselineY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  if (points.length === 1) {
    const point = points[0];
    const color = colorForPoint(point, 0);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = colorWithAlpha(color, 0.3);
    ctx.fill();
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const color = colorForPoint(current, index);
    const nextColor = colorForPoint(next, index + 1);
    const gradient = ctx.createLinearGradient(current.x, 0, next.x, 0);

    gradient.addColorStop(0, color);
    gradient.addColorStop(1, nextColor);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(current.x, current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
  }

  points.forEach((point, index) => {
    const color = colorForPoint(point, index);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(15, 23, 42, 0.92)";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.restore();
}

function renderPeriodChart() {
  if (!periodChart) {
    return;
  }

  const data = getDailyKcalTotals();
  const { ctx, width, height } = resizeCanvasToDisplaySize(periodChart);
  ctx.clearRect(0, 0, width, height);

  if (periodChartEmptyState) {
    periodChartEmptyState.style.display = data.length === 0 ? "block" : "none";
  }

  if (data.length === 0) {
    return;
  }

  const padding = {
    top: 26,
    right: 20,
    bottom: 54,
    left: 58
  };
  const yMax = getYAxisMax(data.map((day) => day.total));
  const { chartWidth, chartHeight, yForValue } = drawChartFrame(ctx, width, height, padding, yMax, {
    goalValue: DAILY_KCAL_GOAL,
    goalLineLabel: "2500 kcal",
    xLabel: "dagen"
  });

  const xForIndex = (index) => {
    if (data.length === 1) {
      return padding.left + chartWidth / 2;
    }

    return padding.left + (index / (data.length - 1)) * chartWidth;
  };

  const points = data.map((day, index) => ({
    x: xForIndex(index),
    y: yForValue(day.total),
    value: day.total,
    label: formatShortDate(day.date),
    rawDate: day.date
  }));

  drawColoredLineAndArea(ctx, points, padding.top + chartHeight, (point) => {
    return getGoalColor(Math.min(point.value / DAILY_KCAL_GOAL, 1));
  });

  ctx.save();
  ctx.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(249, 250, 251, 0.68)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const labelStep = Math.max(1, Math.ceil(data.length / 7));
  points.forEach((point, index) => {
    if (index % labelStep === 0 || index === points.length - 1) {
      ctx.fillText(point.label, point.x, padding.top + chartHeight + 12);
    }
  });

  const latestPoint = points[points.length - 1];
  drawRoundedLabel(ctx, `${Math.round(latestPoint.value)} kcal`, latestPoint.x, Math.max(latestPoint.y - 18, padding.top + 12), {
    background: "rgba(15, 23, 42, 0.9)"
  });

  ctx.restore();
}

function getDayProgressData(selectedMeals, endMinutes = MINUTES_IN_DAY) {
  const sortedMeals = selectedMeals
    .map((meal) => ({
      ...meal,
      minutes: timeToMinutes(formatTimeForMeal(meal)),
      kcalValue: Number(meal.kcal) || 0
    }))
    .filter((meal) => meal.minutes <= endMinutes)
    .sort((a, b) => a.minutes - b.minutes);

  let cumulativeKcal = 0;
  const points = [{ minutes: 0, value: 0, label: "00:00" }];

  sortedMeals.forEach((meal) => {
    cumulativeKcal += meal.kcalValue;
    points.push({
      minutes: meal.minutes,
      value: cumulativeKcal,
      label: minutesToTimeLabel(meal.minutes)
    });
  });

  if (points[points.length - 1].minutes < endMinutes) {
    points.push({
      minutes: endMinutes,
      value: cumulativeKcal,
      label: minutesToTimeLabel(endMinutes)
    });
  }

  return points;
}

function getDayProgressEndMinutes() {
  const selectedDate = getSelectedDate();
  return selectedDate === getToday() ? getCurrentMinutes() : MINUTES_IN_DAY;
}

function renderDayProgressChart(selectedMeals) {
  if (!dayProgressChart) {
    return;
  }

  const endMinutes = getDayProgressEndMinutes();
  const safeEndMinutes = Math.max(endMinutes, 1);
  const data = getDayProgressData(selectedMeals, safeEndMinutes);
  const { ctx, width, height } = resizeCanvasToDisplaySize(dayProgressChart);
  ctx.clearRect(0, 0, width, height);

  const hasMealData = selectedMeals.length > 0;

  if (dayProgressEmptyState) {
    dayProgressEmptyState.style.display = hasMealData ? "none" : "block";
  }

  const padding = {
    top: 26,
    right: 20,
    bottom: 54,
    left: 58
  };
  const targetAtEnd = (safeEndMinutes / MINUTES_IN_DAY) * DAILY_KCAL_GOAL;
  const yMax = getYAxisMax([...data.map((point) => point.value), targetAtEnd]);
  const { chartWidth, chartHeight, yForValue } = drawChartFrame(ctx, width, height, padding, yMax, {
    goalValue: DAILY_KCAL_GOAL,
    goalLineLabel: "2500 om 23:59",
    xLabel: "tijd"
  });

  const xForMinutes = (minutes) => padding.left + (minutes / safeEndMinutes) * chartWidth;
  const targetForMinutes = (minutes) => (minutes / MINUTES_IN_DAY) * DAILY_KCAL_GOAL;

  ctx.save();
  ctx.strokeStyle = "rgba(249, 250, 251, 0.35)";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(xForMinutes(0), yForValue(0));
  ctx.lineTo(xForMinutes(safeEndMinutes), yForValue(targetForMinutes(safeEndMinutes)));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(249, 250, 251, 0.7)";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("lineair schema", width - padding.right - 4, yForValue(targetForMinutes(safeEndMinutes)) - 6);
  ctx.restore();

  const chartPoints = data.map((point) => ({
    x: xForMinutes(point.minutes),
    y: yForValue(point.value),
    value: point.value,
    minutes: point.minutes,
    label: point.label
  }));

  drawColoredLineAndArea(ctx, chartPoints, padding.top + chartHeight, (point) => {
    const target = targetForMinutes(point.minutes);

    if (point.minutes === 0 && point.value === 0) {
      return getGoalColor(1);
    }

    if (target <= 0) {
      return getGoalColor(point.value > 0 ? 1 : 0);
    }

    return getGoalColor(Math.min(point.value / target, 1));
  });

  ctx.save();
  ctx.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(249, 250, 251, 0.68)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const tickCount = 4;
  for (let tickIndex = 0; tickIndex <= tickCount; tickIndex += 1) {
    const minutes = (safeEndMinutes / tickCount) * tickIndex;
    ctx.fillText(minutesToTimeLabel(minutes), xForMinutes(minutes), padding.top + chartHeight + 12);
  }

  if (hasMealData) {
    const latestPoint = chartPoints[chartPoints.length - 1];
    drawRoundedLabel(ctx, `${Math.round(latestPoint.value)} kcal`, latestPoint.x, Math.max(latestPoint.y - 18, padding.top + 12), {
      background: "rgba(15, 23, 42, 0.9)"
    });
  }

  ctx.restore();
}

function renderMeals() {
  updateInputPlaceholders();

  const selectedDate = getSelectedDate();
  const selectedMeals = getMealsForSelectedDate().sort((a, b) => {
    return formatTimeForMeal(a).localeCompare(formatTimeForMeal(b));
  });

  mealList.innerHTML = "";

  const totalKcal = selectedMeals.reduce((sum, meal) => sum + (Number(meal.kcal) || 0), 0);

  dailyTotal.textContent = totalKcal.toString();
  itemCount.textContent = selectedMeals.length.toString();
  selectedDateText.textContent = selectedDate ? formatDate(selectedDate) : "Ongeldige datum";
  emptyState.style.display = selectedMeals.length === 0 ? "block" : "none";

  selectedMeals.forEach((meal) => {
    const listItem = document.createElement("li");
    listItem.className = "meal-item";

    const mealInfo = document.createElement("div");

    const mealName = document.createElement("div");
    mealName.className = "meal-name";
    mealName.textContent = meal.name;

    const mealMeta = document.createElement("div");
    mealMeta.className = "meal-meta";
    mealMeta.textContent = `${formatTimeForMeal(meal)} · ${meal.kcal} kcal`;

    mealInfo.append(mealName, mealMeta);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Verwijder";
    deleteButton.addEventListener("click", () => {
      meals = meals.filter((item) => item.id !== meal.id);
      saveMeals();
      render();
    });

    listItem.append(mealInfo, deleteButton);
    mealList.appendChild(listItem);
  });

  updateProgress(totalKcal);
  renderDayProgressChart(selectedMeals);
}

function render() {
  renderMeals();
  renderPeriodChart();
}

mealForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const selectedDate = getSelectedDate();
  const selectedTime = normalizeTime(timeInput.value);
  const kcal = Number(kcalInput.value);

  if (!selectedDate) {
    alert("Vul de datum in als DD-MM-YYYY, bijvoorbeeld 26-09-2026.");
    dateInput.focus();
    return;
  }

  if (!selectedTime) {
    alert("Vul de tijd in als HH:MM, bijvoorbeeld 08:30.");
    timeInput.focus();
    return;
  }

  if (!Number.isFinite(kcal) || kcal < 0) {
    kcalInput.focus();
    return;
  }

  const mealName = nameInput.value.trim() || getDefaultMealName(selectedTime);
  const meal = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    date: selectedDate,
    time: selectedTime,
    name: mealName,
    kcal,
    createdAt: new Date().toISOString()
  };

  meals.push(meal);
  saveMeals();

  nameInput.value = "";
  kcalInput.value = "";
  nameInput.focus();
  render();
});

dateInput.addEventListener("input", render);
timeInput.addEventListener("input", () => {
  updateInputPlaceholders();
  renderDayProgressChart(getMealsForSelectedDate());
});
nameInput.addEventListener("input", updateInputPlaceholders);

clearAllBtn.addEventListener("click", () => {
  const confirmed = confirm("Weet je zeker dat je alle maaltijden wilt wissen?");

  if (!confirmed) {
    return;
  }

  meals = [];
  saveMeals();
  render();
});

window.addEventListener("resize", () => {
  renderPeriodChart();
  renderDayProgressChart(getMealsForSelectedDate());
});

updateInputPlaceholders();
updateCountdown();
render();

setInterval(() => {
  updateInputPlaceholders();
  renderDayProgressChart(getMealsForSelectedDate());
}, 60_000);
setInterval(updateCountdown, 1000);
