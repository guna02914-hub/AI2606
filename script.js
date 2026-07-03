const currentTimeEl = document.querySelector("#currentTime");
const currentDateEl = document.querySelector("#currentDate");
const alarmForm = document.querySelector("#alarmForm");
const alarmTitleInput = document.querySelector("#alarmTitle");
const alarmTimeInput = document.querySelector("#alarmTime");
const alarmRepeatInput = document.querySelector("#alarmRepeat");
const alarmList = document.querySelector("#alarmList");
const alarmCount = document.querySelector("#alarmCount");
const emptyState = document.querySelector("#emptyState");
const clearBtn = document.querySelector("#clearBtn");
const notificationBtn = document.querySelector("#notificationBtn");
const alarmModal = document.querySelector("#alarmModal");
const modalTitle = document.querySelector("#modalTitle");
const modalTime = document.querySelector("#modalTime");
const stopAlarmBtn = document.querySelector("#stopAlarmBtn");

const STORAGE_KEY = "study-alarm-list";

let alarms = loadAlarms();
let activeAudioContext = null;
let activeOscillator = null;
let alarmStopTimer = null;

function loadAlarms() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveAlarms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

function formatDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).format(date);
}

function updateClock() {
  const now = new Date();

  currentTimeEl.textContent = now.toLocaleTimeString("ko-KR", {
    hour12: false,
  });

  currentDateEl.textContent = formatDate(now);

  checkAlarms(now);
}

function createAlarmId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function renderAlarms() {
  alarmList.innerHTML = "";

  const sortedAlarms = [...alarms].sort((a, b) => a.time.localeCompare(b.time));

  sortedAlarms.forEach((alarm) => {
    const item = document.createElement("li");
    item.className = "alarm-item";

    const repeatText = alarm.repeat === "daily" ? "매일 반복" : "한 번만";
    const enabledText = alarm.enabled ? "활성화" : "비활성화";

    item.innerHTML = `
      <div class="alarm-time">${alarm.time}</div>
      <div class="alarm-info">
        <strong>${escapeHTML(alarm.title)}</strong>
        <span>${repeatText} · ${enabledText}</span>
      </div>
      <button class="badge" type="button" data-toggle-id="${alarm.id}">
        ${alarm.enabled ? "ON" : "OFF"}
      </button>
      <button class="icon-button" type="button" aria-label="알람 삭제" data-delete-id="${alarm.id}">
        ×
      </button>
    `;

    alarmList.appendChild(item);
  });

  emptyState.classList.toggle("hidden", alarms.length > 0);
  clearBtn.classList.toggle("hidden", alarms.length === 0);

  alarmCount.textContent =
    alarms.length === 0
      ? "등록된 알람이 없습니다."
      : `총 ${alarms.length}개의 알람이 등록되어 있습니다.`;
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function addAlarm(event) {
  event.preventDefault();

  const title = alarmTitleInput.value.trim();
  const time = alarmTimeInput.value;
  const repeat = alarmRepeatInput.value;

  if (!title || !time) {
    alert("알람 제목과 시간을 모두 입력해주세요.");
    return;
  }

  const alreadyExists = alarms.some(
    (alarm) => alarm.time === time && alarm.title === title
  );

  if (alreadyExists) {
    alert("같은 제목과 시간의 알람이 이미 있습니다.");
    return;
  }

  alarms.push({
    id: createAlarmId(),
    title,
    time,
    repeat,
    enabled: true,
    lastTriggeredDate: null,
  });

  saveAlarms();
  renderAlarms();
  alarmForm.reset();
  alarmRepeatInput.value = "daily";
}

function checkAlarms(now) {
  const currentHour = String(now.getHours()).padStart(2, "0");
  const currentMinute = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${currentHour}:${currentMinute}`;
  const todayKey = getTodayKey(now);

  let hasChanged = false;

  alarms.forEach((alarm) => {
    if (!alarm.enabled) {
      return;
    }

    const isSameTime = alarm.time === currentTime;
    const wasAlreadyTriggeredToday = alarm.lastTriggeredDate === todayKey;

    if (isSameTime && !wasAlreadyTriggeredToday) {
      triggerAlarm(alarm);

      alarm.lastTriggeredDate = todayKey;

      if (alarm.repeat === "once") {
        alarm.enabled = false;
      }

      hasChanged = true;
    }
  });

  if (hasChanged) {
    saveAlarms();
    renderAlarms();
  }
}

function triggerAlarm(alarm) {
  modalTitle.textContent = alarm.title;
  modalTime.textContent = alarm.time;
  alarmModal.classList.remove("hidden");

  playAlarmSound();

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Study Alarm", {
      body: `${alarm.time} · ${alarm.title}`,
      icon: "",
    });
  }

  clearTimeout(alarmStopTimer);
  alarmStopTimer = setTimeout(stopAlarm, 60_000);
}

function playAlarmSound() {
  stopAlarmSound();

  activeAudioContext = new AudioContext();
  activeOscillator = activeAudioContext.createOscillator();

  const gainNode = activeAudioContext.createGain();

  activeOscillator.type = "sine";
  activeOscillator.frequency.setValueAtTime(880, activeAudioContext.currentTime);

  gainNode.gain.setValueAtTime(0.0001, activeAudioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.25,
    activeAudioContext.currentTime + 0.04
  );

  activeOscillator.connect(gainNode);
  gainNode.connect(activeAudioContext.destination);

  activeOscillator.start();

  const interval = setInterval(() => {
    if (!activeOscillator || !activeAudioContext) {
      clearInterval(interval);
      return;
    }

    const frequency = activeOscillator.frequency.value === 880 ? 660 : 880;
    activeOscillator.frequency.setValueAtTime(
      frequency,
      activeAudioContext.currentTime
    );
  }, 350);
}

function stopAlarmSound() {
  if (activeOscillator) {
    activeOscillator.stop();
    activeOscillator.disconnect();
    activeOscillator = null;
  }

  if (activeAudioContext) {
    activeAudioContext.close();
    activeAudioContext = null;
  }
}

function stopAlarm() {
  stopAlarmSound();
  alarmModal.classList.add("hidden");
  clearTimeout(alarmStopTimer);
}

function deleteAlarm(alarmId) {
  alarms = alarms.filter((alarm) => alarm.id !== alarmId);
  saveAlarms();
  renderAlarms();
}

function toggleAlarm(alarmId) {
  alarms = alarms.map((alarm) => {
    if (alarm.id !== alarmId) {
      return alarm;
    }

    return {
      ...alarm,
      enabled: !alarm.enabled,
      lastTriggeredDate: null,
    };
  });

  saveAlarms();
  renderAlarms();
}

function clearAlarms() {
  const confirmed = confirm("등록된 알람을 모두 삭제할까요?");

  if (!confirmed) {
    return;
  }

  alarms = [];
  saveAlarms();
  renderAlarms();
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    alert("이 브라우저는 알림 기능을 지원하지 않습니다.");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    alert("브라우저 알림이 허용되었습니다.");
  } else {
    alert("브라우저 알림이 허용되지 않았습니다.");
  }
}

alarmForm.addEventListener("submit", addAlarm);

alarmList.addEventListener("click", (event) => {
  const deleteId = event.target.dataset.deleteId;
  const toggleId = event.target.dataset.toggleId;

  if (deleteId) {
    deleteAlarm(deleteId);
  }

  if (toggleId) {
    toggleAlarm(toggleId);
  }
});

clearBtn.addEventListener("click", clearAlarms);
notificationBtn.addEventListener("click", requestNotificationPermission);
stopAlarmBtn.addEventListener("click", stopAlarm);

window.addEventListener("beforeunload", stopAlarmSound);

renderAlarms();
updateClock();
setInterval(updateClock, 1000);
