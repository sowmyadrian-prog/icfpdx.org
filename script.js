/***********************
 * UTILITIES
 ***********************/
function isValidReference(reference) {
  const simpleRegex = /^[1-3]?\s?[A-Za-z ]+\s\d{1,3}:\d{1,3}$/;
  return simpleRegex.test(reference.trim());
}

function fetchVerse(reference) {
  return fetch(`https://bible-api.com/${encodeURIComponent(reference)}`).then(
    (res) => {
      if (!res.ok) throw new Error("Verse not found.");
      return res.json();
    }
  );
}

/***********************
 * DAILY DEVOTION
 ***********************/
function loadDailyVerse() {
  fetch("https://beta.ourmanna.com/api/v1/get/?format=json")
    .then((res) => res.json())
    .then((data) => {
      const verseObj = data.verse.details;
      document.getElementById("verse").innerText = verseObj.text;
      document.getElementById("reference").innerText = verseObj.reference;
    })
    .catch(() => {
      document.getElementById("verse").innerText =
        "The Lord is my shepherd; I shall not want.";
      document.getElementById("reference").innerText = "Psalm 23:1";
    });
}

/***********************
 * HERO BANNER SCRIPTURE
 ***********************/
const banners = [
  "“The Lord bless you and keep you.” – Numbers 6:24",
  "“I am the way and the truth and the life.” – John 14:6",
  "“Rejoice in the Lord always.” – Philippians 4:4"
];

function loadBanner() {
  const banner = banners[Math.floor(Math.random() * banners.length)];
  const hero = document.querySelector(".hero p");
  if (hero) hero.innerText = banner;
}

/***********************
 * SEASONAL COLOR SWITCHING
 ***********************/
function setSeasonTheme() {
  const month = new Date().getMonth(); // 0 = January, 11 = December
  const body = document.body;
  const hero = document.querySelector(".hero");

  // Remove any existing season classes to ensure a clean slate
  body.classList.remove("spring", "summer", "fall", "winter");

  if ([2, 3, 4].includes(month)) {
    // March, April, May
    body.classList.add("spring");
    if (hero) hero.style.backgroundImage = "url('spring-blossoms.jpg')";
  } else if ([5, 6, 7].includes(month)) {
    // June, July, August
    body.classList.add("summer");
    if (hero) hero.style.backgroundImage = "url('summer-floral.jpg.png')";
  } else if ([8, 9, 10].includes(month)) {
    // September, October, November
    body.classList.add("fall");
    if (hero) hero.style.backgroundImage = "url('fall-leaves.jpg.png')";
  } else {
    // December, January, February
    body.classList.add("winter");
    if (hero) hero.style.backgroundImage = "url('winter-snow.jpg.png')";
  }
}

/***********************
 * EVENT COUNTDOWN
 ***********************/
function formatRemaining(ms) {
  if (isNaN(ms)) return "Invalid date";

  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function updateCountdowns() {
  const now = new Date();
  const cards = Array.from(document.querySelectorAll(".event-card"));
  const upcoming = [];

  cards.forEach((card) => {
    const dateStr = card.getAttribute("data-date");
    const cdEl = card.querySelector(".countdown");
    if (!cdEl) return; // Skip if no countdown element

    if (!dateStr) {
      cdEl.textContent = "No date set";
      return;
    }

    const eventDate = new Date(dateStr);
    if (isNaN(eventDate.getTime())) {
      cdEl.textContent = "Invalid date format";
      return;
    }

    const diff = eventDate - now;
    card.classList.remove("past", "today");

    if (diff <= 0) {
      if (Math.abs(diff) < 3 * 3600 * 1000) {
        card.classList.add("today");
        cdEl.textContent = "Happening now";
      } else {
        card.classList.add("past");
        cdEl.textContent = "Event ended";
      }
    } else {
      upcoming.push({
        card,
        eventDate,
        diff
      });
      cdEl.textContent = `Starts in ${formatRemaining(diff)}`;
    }
  });

  const banner = document.getElementById("next-event-banner");
  if (banner) {
    if (upcoming.length === 0) {
      banner.textContent = "No upcoming events.";
    } else {
      upcoming.sort((a, b) => a.eventDate - b.eventDate);
      const next = upcoming[0];
      const title = next.card.querySelector("h3")?.textContent || "Next Event";
      const dateHuman = next.eventDate.toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      banner.textContent = `${title} — ${dateHuman} • Starts in ${formatRemaining(
        next.diff
      )}`;
    }
  }
}

/***********************
 * BIBLE VERSE SEARCH
 ***********************/
function searchBible() {
  const rawQuery = document.getElementById("bibleSearch").value.trim();
  const resultBox = document.getElementById("bibleResult");
  const errorBox = document.getElementById("error-message");

  resultBox.style.display = "none";
  errorBox.style.display = "none";

  if (!rawQuery) {
    errorBox.textContent = "Please enter a verse reference (e.g., John 3:16).";
    errorBox.style.display = "block";
    return;
  }

  const corrections = {
    jhon: "John",
    psalms: "Psalm",
    genisis: "Genesis",
    exudos: "Exodus",
    rommans: "Romans"
  };
  let correctedQuery = rawQuery;
  Object.keys(corrections).forEach((wrong) => {
    const regex = new RegExp(`\\b${wrong}\\b`, "gi");
    correctedQuery = correctedQuery.replace(regex, corrections[wrong]);
  });

  fetch(`https://bible-api.com/${encodeURIComponent(correctedQuery)}`)
    .then((res) => {
      if (!res.ok) throw new Error("Verse not found or invalid reference.");
      return res.json();
    })
    .then((data) => {
      if (data.text) {
        resultBox.innerHTML = `<strong>${
          data.reference
        }</strong><br>${data.text.replace(/\n/g, "<br>")}`;
        resultBox.style.display = "block";
      } else {
        throw new Error("Could not retrieve verse text.");
      }
    })
    .catch((err) => {
      errorBox.textContent = err.message;
      errorBox.style.display = "block";
    });
}

/***********************
 * INITIALIZE ON LOAD
 ***********************/
document.addEventListener("DOMContentLoaded", () => {
  // Initialize content and themes
  loadDailyVerse();
  loadBanner();
  setSeasonTheme();

  // Initialize and update countdowns
  updateCountdowns();
  setInterval(updateCountdowns, 1000); // Update every second

  // Set up Bible search listeners
  document.getElementById("searchBtn").addEventListener("click", searchBible);
  document.getElementById("bibleSearch").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchBible();
    }
  });
});
