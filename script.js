const statusBox = document.getElementById("status");
const prayerList = document.getElementById("prayerList");
const qiblaInfo = document.getElementById("qiblaInfo");
const needle = document.getElementById("needle");
const enableCompassBtn = document.getElementById("enableCompassBtn");

let qiblaDirection = 0;

const prayerNames = [
  "Fajr",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha"
];

function startApp() {
  if (!navigator.geolocation) {
    statusBox.textContent = "Geolocation not supported.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async function(position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      statusBox.textContent =
        `Location found: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;

      await getPrayerTimes(lat, lon);
      await getQiblaDirection(lat, lon);
    },
    function() {
      statusBox.textContent =
        "Location permission denied.";
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

async function getPrayerTimes(lat, lon) {
  try {
    const response = await fetch(
      `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=3`
    );

    const data = await response.json();
    const timings = data.data.timings;

    prayerList.innerHTML = "";

    prayerNames.forEach(function(name) {
      const card = document.createElement("div");
      card.className = "prayer-card";

      card.innerHTML = `
        <span class="prayer-name">${name}</span>
        <span class="prayer-time">${cleanTime(timings[name])}</span>
      `;

      prayerList.appendChild(card);
    });

  } catch (error) {
    statusBox.textContent = "Could not load prayer times.";
    console.error(error);
  }
}

async function getQiblaDirection(lat, lon) {
  try {
    const response = await fetch(
      `https://api.aladhan.com/v1/qibla/${lat}/${lon}`
    );

    const data = await response.json();

    qiblaDirection = data.data.direction;

    qiblaInfo.textContent =
      `Qibla direction: ${qiblaDirection.toFixed(2)}° from North`;

  } catch (error) {
    qiblaInfo.textContent = "Could not load Qibla direction.";
    console.error(error);
  }
}

function cleanTime(timeString) {
  return timeString.split(" ")[0];
}

enableCompassBtn.addEventListener("click", enableCompass);

async function enableCompass() {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    try {
      const permission =
        await DeviceOrientationEvent.requestPermission();

      if (permission === "granted") {
        window.addEventListener(
          "deviceorientation",
          handleOrientation,
          true
        );
      } else {
        qiblaInfo.textContent = "Compass permission denied.";
      }

    } catch (error) {
      console.error(error);
    }

  } else {
    window.addEventListener(
      "deviceorientationabsolute",
      handleOrientation,
      true
    );

    window.addEventListener(
      "deviceorientation",
      handleOrientation,
      true
    );
  }
}

function handleOrientation(event) {
  let heading;

  if (event.webkitCompassHeading) {
    heading = event.webkitCompassHeading;

  } else if (event.alpha !== null) {
    heading = 360 - event.alpha;

  } else {
    qiblaInfo.textContent =
      "Compass unavailable on this device.";
    return;
  }

  const rotation = qiblaDirection - heading;

  needle.style.transform =
    `rotate(${rotation}deg)`;

  const difference =
    Math.abs(normalizeAngle(rotation));

  if (difference < 5) {
    qiblaInfo.textContent =
      "You are facing the Qibla.";
  } else {
    qiblaInfo.textContent =
      "Turn until the yellow needle points upward.";
  }
}

function normalizeAngle(angle) {
  return ((angle + 180) % 360) - 180;
}

startApp();