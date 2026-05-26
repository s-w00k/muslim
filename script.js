const statusBox = document.getElementById("status");
const prayerList = document.getElementById("prayerList");
const qiblaInfo = document.getElementById("qiblaInfo");
const needle = document.getElementById("needle");
const enableCompassBtn = document.getElementById("enableCompassBtn");

let qiblaDirection = 0;
let smoothedHeading = null;

const prayerNames = [
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha"
];

function startApp() {
  if (!navigator.geolocation) {
    statusBox.textContent = "Geolocation is not supported on this device.";
    return;
  }

  const userAccepted = confirm(
    "This app needs your location to show prayer times and Qibla direction. Please tap OK, then allow location access."
  );

  if (!userAccepted) {
    statusBox.textContent =
      "Location permission is required to use the app.";
    return;
  }

  requestLocation();
}

function requestLocation() {
  statusBox.textContent = "Requesting your location...";

  navigator.geolocation.getCurrentPosition(
    async function(position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      statusBox.textContent = "Location found. Finding city name...";

      const placeName = await getPlaceName(lat, lon);

      statusBox.textContent = `Location: ${placeName}`;

      await getPrayerTimes(lat, lon);
      await getQiblaDirection(lat, lon);
    },

    function(error) {
      console.error(error);

      if (error.code === 1) {
        statusBox.textContent =
          "Location denied. Please refresh and allow access.";
      } else if (error.code === 2) {
        statusBox.textContent =
          "Location unavailable. Please turn on GPS.";
      } else if (error.code === 3) {
        statusBox.textContent =
          "Location timed out. Please try again.";
      } else {
        statusBox.textContent =
          "Could not get your location.";
      }
    },

    {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000
    }
  );
}

async function getPlaceName(lat, lon) {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

    const response = await fetch(url);
    const data = await response.json();

    const address = data.address;

    const city =
      address.city ||
      address.town ||
      address.village ||
      address.suburb ||
      address.state ||
      "Unknown city";

    const country =
      address.country ||
      "Unknown country";

    return `${city}, ${country}`;

  } catch (error) {
    console.error(error);
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
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
    console.error(error);
    statusBox.textContent = "Could not load prayer times.";
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
    console.error(error);
    qiblaInfo.textContent = "Could not load Qibla direction.";
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

        qiblaInfo.textContent =
          "Compass enabled. Turn your phone until the yellow needle points to the Qibla.";
      } else {
        qiblaInfo.textContent = "Compass permission denied.";
      }

    } catch (error) {
      console.error(error);
      qiblaInfo.textContent = "Could not enable compass.";
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

    qiblaInfo.textContent =
      "Compass enabled. Turn your phone until the yellow needle points to the Qibla.";
  }
}

function handleOrientation(event) {
  let rawHeading;

  if (event.webkitCompassHeading) {
    rawHeading = event.webkitCompassHeading;
  } else if (event.alpha !== null) {
    rawHeading = 360 - event.alpha;
  } else {
    qiblaInfo.textContent = "Compass unavailable on this device.";
    return;
  }

  // SMOOTHING FACTOR
  // lower = smoother but slower response
  const smoothing = 0.1;

  if (smoothedHeading === null) {
    smoothedHeading = rawHeading;
  }

  // Handle wraparound (359° -> 0° problem)
  let delta = rawHeading - smoothedHeading;

  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;

  smoothedHeading += delta * smoothing;

  if (smoothedHeading < 0) smoothedHeading += 360;
  if (smoothedHeading >= 360) smoothedHeading -= 360;

  const rotation = qiblaDirection - smoothedHeading;

  needle.style.transform = `rotate(${rotation}deg)`;

  const difference = Math.abs(normalizeAngle(rotation));

  if (difference < 10) {
    qiblaInfo.textContent = "You are facing the Qibla.";
  } else {
    qiblaInfo.textContent =
      `Turn until the yellow needle points to the Qibla.`;
  }
}

function normalizeAngle(angle) {
  return ((angle + 180) % 360) - 180;
}

startApp();
