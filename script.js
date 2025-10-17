/***********************
 * UTILITIES
 ***********************/
/**
 * Simple validation for a Bible reference format (e.g., John 3:16).
 * @param {string} reference - The raw text input.
 * @returns {boolean} - True if the format is likely a valid reference.
 */
function isValidReference(reference) {
    // Regex for: optional number (1-3), book name (letters/spaces), chapter:verse
    const simpleRegex = /^[1-3]?\s?[A-Za-z ]+\s\d{1,3}:\d{1,3}$/;
    return simpleRegex.test(reference.trim());
}

/***********************
 * DAILY DEVOTION
 ***********************/
/**
 * Fetches and displays the daily Bible verse from the OurManna API.
 * Uses a default verse on failure.
 */
function loadDailyVerse() {
    fetch("https://beta.ourmanna.com/api/v1/get/?format=json")
        .then((res) => res.json())
        .then((data) => {
            const verseObj = data.verse.details;
            document.getElementById("verse").innerText = verseObj.text;
            document.getElementById("reference").innerText = verseObj.reference;
        })
        .catch(() => {
            // Fallback content if API fails
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
    "“Rejoice in the Lord always.” – Philippians 4:4",
    "“Love one another.” – John 13:34",
    "“The steadfast love of the Lord never ceases.” – Lamentations 3:22",
];

/**
 * Loads a random scripture into the hero banner.
 */
function loadBanner() {
    const heroP = document.querySelector(".hero p");
    const randomIndex = Math.floor(Math.random() * banners.length);
    heroP.innerText = banners[randomIndex];
}

/***********************
 * SEASONAL THEME SWITCH
 ***********************/
/**
 * Determines the current season based on the month and sets the corresponding
 * data-theme attribute on the body element. CSS handles the visual changes.
 */
function setSeasonTheme() {
    const now = new Date();
    const month = now.getMonth(); // 0 (Jan) to 11 (Dec)
    let theme;

    // Approximate Northern Hemisphere Seasons (Used to match your file naming convention)
    if (month >= 2 && month <= 4) {
        // March (2) - May (4)
        theme = "spring";
    } else if (month >= 5 && month <= 7) {
        // June (5) - August (7)
        theme = "summer";
    } else if (month >= 8 && month <= 10) {
        // September (8) - November (10)
        theme = "fall";
    } else {
        // December (11) - February (1)
        theme = "winter";
    }

    // This attribute triggers the theme styles defined in the CSS
    document.body.setAttribute("data-theme", theme);
}

/***********************
 * EVENT COUNTDOWN
 ***********************/
/**
 * Calculates the time until the next recurring event (Sunday Worship and Friday Prayer).
 */
function updateCountdowns() {
    const now = new Date();
    const currentDay = now.getDay(); // 0: Sunday, 1: Monday, ..., 5: Friday, 6: Saturday

    // 1. Sunday Worship: Every Sunday, 10:30 AM
    let nextWorship = new Date(now);
    let daysUntilNextSunday = (7 - currentDay) % 7;
    // Check if worship already passed today (Sunday)
    if (daysUntilNextSunday === 0 && (now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() >= 30))) {
        daysUntilNextSunday = 7; // Set to next week
    } else if (daysUntilNextSunday === 0) {
        daysUntilNextSunday = 0; // Target today
    }
    nextWorship.setDate(now.getDate() + daysUntilNextSunday);
    nextWorship.setHours(10, 30, 0, 0); // 10:30 AM

    displayCountdown("worship-countdown", nextWorship, "Worship Service");


    // 2. Friday Prayer: Every Friday, 7:00 PM
    let nextPrayer = new Date(now);
    let daysUntilNextFriday = (5 - currentDay + 7) % 7;
    // Check if prayer meeting already passed today (Friday)
    if (daysUntilNextFriday === 0 && (now.getHours() > 19 || (now.getHours() === 19 && now.getMinutes() >= 0))) {
        daysUntilNextFriday = 7; // Set to next week
    } else if (daysUntilNextFriday === 0) {
        daysUntilNextFriday = 0; // Target today
    }
    nextPrayer.setDate(now.getDate() + daysUntilNextFriday);
    nextPrayer.setHours(19, 0, 0, 0); // 7:00 PM

    displayCountdown("prayer-countdown", nextPrayer, "Prayer Meeting");
}

/**
 * Calculates and displays the time difference to the target date.
 * @param {string} elementId - ID of the element to update.
 * @param {Date} targetDate - The date/time of the next event.
 * @param {string} eventName - Name of the event.
 */
function displayCountdown(elementId, targetDate, eventName) {
    const now = new Date().getTime();
    const distance = targetDate.getTime() - now;
    const element = document.getElementById(elementId);

    if (distance < 0) {
        element.textContent = `${eventName} is happening now!`;
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    element.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}


/***********************
 * BIBLE SEARCH
 ***********************/
/**
 * Handles the search functionality for Bible verses using the bible-api.com.
 */
function searchBible() {
    const query = document.getElementById("bibleSearch").value.trim();
    const resultBox = document.getElementById("bibleResult");
    const errorBox = document.getElementById("bibleError");

    resultBox.style.display = "none";
    errorBox.style.display = "none";

    if (!query) {
        errorBox.textContent = "Please enter a Bible reference (e.g., John 3:16).";
        errorBox.style.display = "block";
        return;
    }

    // Simple common spelling/typo corrections before API call
    const corrections = {
        "philipians": "philippians",
        "corinthians": "corinthians",
        "revalation": "revelation",
        "samual": "samuel",
        "colosians": "colossians"
        // Add more common typos as needed
    };

    let correctedQuery = query;
    Object.keys(corrections).forEach((wrong) => {
        // Global, case-insensitive replace
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
                // Display the verse text, replacing newlines with <br> for HTML rendering
                resultBox.innerHTML = `<strong>${data.reference}</strong><br>${data.text.replace(/\n/g, "<br>")}`;
                resultBox.style.display = "block";
            } else {
                throw new Error("Could not retrieve verse text.");
            }
        })
        .catch((err) => {
            // Display error message
            errorBox.textContent = `Error: ${err.message}`;
            errorBox.style.display = "block";
        });
}

/***********************
 * INITIALIZE ON LOAD
 ***********************/
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize content and themes
    loadDailyVerse(); // Load devotion
    loadBanner(); // Load random scripture banner
    setSeasonTheme(); // Set initial theme and hero background

    // 2. Initialize and update countdowns
    updateCountdowns();
    // Update countdown timers every second
    setInterval(updateCountdowns, 1000);

    // 3. Set up Bible search listeners
    const searchBtn = document.getElementById("searchBtn");
    const searchInput = document.getElementById("bibleSearch");

    if (searchBtn) {
        searchBtn.addEventListener("click", searchBible);
    }

    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault(); // Prevent default action (like form submission)
                searchBible();
            }
        });
    }
});
