document.addEventListener("DOMContentLoaded", () => {
  const hoursInput = document.querySelector("#hoursInput");
  const minutesInput = document.querySelector("#minutesInput");
  const secondsInput = document.querySelector("#secondsInput");
  const messageInput = document.querySelector("#messageInput");
  const soundVolumeSlider = document.querySelector("#soundVolumeSlider");
  const soundVolumeValue = document.querySelector("#soundVolumeValue");
  const voiceVolumeSlider = document.querySelector("#voiceVolumeSlider");
  const voiceVolumeValue = document.querySelector("#voiceVolumeValue");
  const voiceBoostCheckbox = document.querySelector("#voiceBoostCheckbox");
  const timerDisplay = document.querySelector("#timerDisplay");
  const progressFill = document.querySelector("#progressFill");
  const toggleBtn = document.querySelector("#toggleBtn");
  const resetBtn = document.querySelector("#resetBtn");
  const testSoundBtn = document.querySelector("#testSoundBtn");
  const speakTestBtn = document.querySelector("#speakTestBtn");
  const statusText = document.querySelector("#statusText");
  const statusDetail = document.querySelector("#statusDetail");
  const selectedTime = document.querySelector("#selectedTime");
  const cycleCountEl = document.querySelector("#cycleCount");
  const toast = document.querySelector("#toast");

  const requiredElements = [
    hoursInput,
    minutesInput,
    secondsInput,
    messageInput,
    soundVolumeSlider,
    soundVolumeValue,
    voiceVolumeSlider,
    voiceVolumeValue,
    voiceBoostCheckbox,
    timerDisplay,
    progressFill,
    toggleBtn,
    resetBtn,
    testSoundBtn,
    speakTestBtn,
    statusText,
    statusDetail,
    selectedTime,
    cycleCountEl,
    toast,
  ];

  if (requiredElements.some((element) => !element)) {
    alert("타이머 화면 요소를 불러오지 못했습니다. Ctrl + F5로 새로고침해주세요.");
    return;
  }

  const STORAGE_KEY = "interval-timer-settings";

  let durationSeconds = 25 * 60;
  let remainingSeconds = durationSeconds;
  let timerId = null;
  let endTime = 0;
  let isRunning = false;
  let cycleCount = 0;
  let audioContext = null;
  let soundTimer = null;
  let activeNodes = [];

  loadSettings();
  updateFromInputs();
  render();

  function loadSettings() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {
      const data = JSON.parse(saved);
      hoursInput.value = data.hours ?? 0;
      minutesInput.value = data.minutes ?? 25;
      secondsInput.value = data.seconds ?? 0;
      messageInput.value = data.message ?? "타이머가 끝났습니다. 다시 시작합니다.";
      soundVolumeSlider.value = data.soundVolume ?? data.volume ?? 70;
      voiceVolumeSlider.value = data.voiceVolume ?? 100;
      voiceBoostCheckbox.checked = data.voiceBoost ?? true;
    } catch {
      hoursInput.value = 0;
      minutesInput.value = 25;
      secondsInput.value = 0;
      messageInput.value = "타이머가 끝났습니다. 다시 시작합니다.";
      soundVolumeSlider.value = 70;
      voiceVolumeSlider.value = 100;
      voiceBoostCheckbox.checked = true;
    }
  }

  function saveSettings() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        hours: getNumber(hoursInput.value),
        minutes: getNumber(minutesInput.value),
        seconds: getNumber(secondsInput.value),
        message: messageInput.value.trim(),
        soundVolume: getNumber(soundVolumeSlider.value),
        voiceVolume: getNumber(voiceVolumeSlider.value),
        voiceBoost: voiceBoostCheckbox.checked,
      })
    );
  }

  function getNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
  }

  function clampInputs() {
    hoursInput.value = Math.min(getNumber(hoursInput.value), 99);
    minutesInput.value = Math.min(getNumber(minutesInput.value), 59);
    secondsInput.value = Math.min(getNumber(secondsInput.value), 59);
  }

  function getInputSeconds() {
    clampInputs();

    const hours = getNumber(hoursInput.value);
    const minutes = getNumber(minutesInput.value);
    const seconds = getNumber(secondsInput.value);

    return hours * 3600 + minutes * 60 + seconds;
  }

  function updateFromInputs() {
    durationSeconds = getInputSeconds();

    if (!isRunning) {
      remainingSeconds = durationSeconds;
    }

    saveSettings();
    render();
  }

  function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, totalSeconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  function render() {
    timerDisplay.textContent = formatTime(remainingSeconds);
    selectedTime.textContent = formatTime(durationSeconds);
    cycleCountEl.textContent = `${cycleCount}회`;
    soundVolumeValue.textContent = `${soundVolumeSlider.value}%`;
    voiceVolumeValue.textContent = `${voiceVolumeSlider.value}%`;

    const progress = durationSeconds > 0
      ? ((durationSeconds - remainingSeconds) / durationSeconds) * 100
      : 0;

    progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;

    if (isRunning) {
      document.body.classList.add("running");
      toggleBtn.textContent = "OFF";
      statusText.textContent = "ON";
      statusDetail.textContent = "타이머가 무한 반복 중입니다.";
    } else {
      document.body.classList.remove("running");
      toggleBtn.textContent = "ON";
      statusText.textContent = "OFF";
      statusDetail.textContent = "타이머가 꺼져 있습니다.";
    }
  }

  function setInputDisabled(disabled) {
    hoursInput.disabled = disabled;
    minutesInput.disabled = disabled;
    secondsInput.disabled = disabled;
  }

  function startTimer() {
    updateFromInputs();

    if (durationSeconds <= 0) {
      alert("시간, 분, 초 중 하나 이상을 입력해주세요.");
      return;
    }

    isRunning = true;
    remainingSeconds = durationSeconds;
    endTime = Date.now() + durationSeconds * 1000;
    setInputDisabled(true);
    hideToast();
    render();

    clearInterval(timerId);
    timerId = setInterval(tick, 250);

    prepareAudio();
  }

  function stopTimer() {
    isRunning = false;
    clearInterval(timerId);
    timerId = null;
    stopSound();
    stopSpeaking();
    setInputDisabled(false);
    remainingSeconds = durationSeconds;
    hideToast();
    render();
  }

  function resetTimer() {
    stopTimer();
    cycleCount = 0;
    updateFromInputs();
    render();
  }

  function tick() {
    if (!isRunning) return;

    const millisecondsLeft = endTime - Date.now();
    remainingSeconds = Math.max(0, Math.ceil(millisecondsLeft / 1000));
    render();

    if (millisecondsLeft <= 0) {
      finishCycle();
    }
  }

  function finishCycle() {
    cycleCount += 1;
    remainingSeconds = durationSeconds;
    endTime = Date.now() + durationSeconds * 1000;

    playSound();
    speakMessage();
    showToast();
    render();
  }

  function prepareAudio() {
    try {
      const AudioConstructor = window.AudioContext || window.webkitAudioContext;

      if (!AudioConstructor) return null;

      if (!audioContext) {
        audioContext = new AudioConstructor();
      }

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      return audioContext;
    } catch {
      return null;
    }
  }

  function playSound() {
    const context = prepareAudio();

    if (!context) {
      showToast();
      return;
    }

    stopSound();

    const volume = getNumber(soundVolumeSlider.value) / 100;

    if (volume <= 0) return;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume * 0.35, context.currentTime + 0.03);

    const firstOscillator = context.createOscillator();
    const secondOscillator = context.createOscillator();

    firstOscillator.type = "sine";
    secondOscillator.type = "triangle";
    firstOscillator.frequency.setValueAtTime(880, context.currentTime);
    secondOscillator.frequency.setValueAtTime(1320, context.currentTime);

    firstOscillator.connect(gain);
    secondOscillator.connect(gain);
    gain.connect(context.destination);

    firstOscillator.start();
    secondOscillator.start();

    activeNodes = [firstOscillator, secondOscillator, gain];

    clearTimeout(soundTimer);
    soundTimer = setTimeout(stopSound, 900);
  }

  function stopSound() {
    clearTimeout(soundTimer);

    activeNodes.forEach((node) => {
      try {
        if (typeof node.stop === "function") node.stop();
        if (typeof node.disconnect === "function") node.disconnect();
      } catch {
        // 이미 정지된 노드는 무시합니다.
      }
    });

    activeNodes = [];
  }

  function speakMessage() {
    const text = messageInput.value.trim();

    if (!text) return;

    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      alert("이 브라우저는 글자 읽어주기 기능을 지원하지 않습니다.");
      return;
    }

    stopSpeaking();

    const voiceVolume = getNumber(voiceVolumeSlider.value) / 100;
    const useBoost = voiceBoostCheckbox.checked;

    // Web Speech API는 1.0을 초과한 실제 증폭을 허용하지 않습니다.
    // 그래서 음성은 별도 볼륨으로 최대치까지 올리고, 강조 모드에서는 짧은 문장을 한 번 더 읽어 체감 가독성을 높입니다.
    speakOnce(text, Math.min(1, voiceVolume));

    if (useBoost && text.length <= 45 && voiceVolume > 0) {
      setTimeout(() => {
        if (isRunning || document.hasFocus()) {
          speakOnce(text, Math.min(1, voiceVolume));
        }
      }, 900);
    }
  }

  function speakOnce(text, volume) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = volume;

    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("ko"));

    if (koreanVoice) {
      utterance.voice = koreanVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function showToast() {
    toast.classList.remove("hidden");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(hideToast, 1600);
  }

  function hideToast() {
    toast.classList.add("hidden");
  }

  [hoursInput, minutesInput, secondsInput].forEach((input) => {
    input.addEventListener("input", updateFromInputs);
  });

  messageInput.addEventListener("input", saveSettings);

  [soundVolumeSlider, voiceVolumeSlider].forEach((slider) => {
    slider.addEventListener("input", () => {
      saveSettings();
      render();
    });
  });

  voiceBoostCheckbox.addEventListener("change", saveSettings);

  toggleBtn.addEventListener("click", () => {
    if (isRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  resetBtn.addEventListener("click", resetTimer);
  testSoundBtn.addEventListener("click", playSound);
  speakTestBtn.addEventListener("click", speakMessage);

  window.addEventListener("beforeunload", () => {
    stopSound();
    stopSpeaking();
  });
});
