
 * Core JavaScript Logic (script.js)
 *
 * This script handles:
 * 1. Seasonal theming based on the current date.
 * 2. Real-time countdowns for all events listed on the page.
 * 3. Fetching a Daily Devotion verse via the Gemini API (structured JSON output).
 * 4. Searching for specific Bible passages via the Gemini API (grounded search).
 */

// --- Global Constants and Configuration ---

// API key is set to an empty string; the Canvas environment will provide the actual key at runtime.
const API_KEY = "";
const BASE_URL_GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODEL_FLASH = "gemini-2.5-flash-preview-09-2025";
const MAX_RETRIES = 5;

// --- Utility Functions ---

/**
 * Implements exponential backoff for API calls.
 * @param {Function} fetcher - The async function to execute.
 * @param {number} maxRetries - Maximum number of retries.
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(fetcher, maxRetries = MAX_RETRIES) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetcher();
            if (response.ok) {
                return response;
            } else if (response.status === 429 && i < maxRetries - 1) {
                // Rate limit hit (429), retry with exponential backoff
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                console.warn(`Rate limit hit (429). Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Handle other non-rate-limit errors or final rate-limit failure
                throw new Error(`API call failed with status: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            if (i === maxRetries - 1) {
                console.error("Fetch failed after all retries:", error);
                throw error;
            }
            // If it's a network error, retry might still be necessary
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            console.warn(`Network error. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}


// --- API Call Handlers (Gemini) ---

/**
 * 1. Fetches a daily devotion verse using the Gemini API.
 */
async function fetchDailyDevotion() {
    const verseEl = document.getElementById('verse');
    const referenceEl = document.getElementById('reference');

    // System instruction requires a concise JSON object.
    const systemPrompt = "You are a Christian spiritual guide. Provide a single, inspiring Bible verse and its reference for a 'Daily Devotion'. Output the verse and reference in a JSON object with keys 'verse' and 'reference'.";
    const userQuery = "Provide today's daily devotion Bible verse.";

    const apiUrl = `${BASE_URL_GEMINI}${MODEL_FLASH}:generateContent?key=${API_KEY}`;
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "verse": { "type": "STRING" },
                    "reference": { "type": "STRING" }
                },
                "propertyOrdering": ["verse", "reference"]
            }
        }
    };

    try {
        const fetcher = () => fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const response = await fetchWithRetry(fetcher);
        const result = await response.json();

        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) throw new Error("API response was empty or malformed.");

        const devotion = JSON.parse(jsonText);

        verseEl.textContent = devotion.verse || "Error: Could not retrieve verse.";
        referenceEl.textContent = devotion.reference || "";

    } catch (error) {
        console.error("Failed to fetch daily devotion:", error);
        verseEl.textContent = "Oops! We couldn't load today's devotion.";
        referenceEl.textContent = "Please check your connection.";
    }
}

/**
 * 2. Searches for a specific Bible verse using the Gemini API with Google Search grounding.
 * @param {string} passage - The Bible passage to search for (e.g., "John 3:16").
 */
async function searchBibleVerse(passage) {
    const resultEl = document.getElementById('bibleResult');
    const errorEl = document.getElementById('error-message');
    const loadingEl = document.getElementById('loading-message');

    resultEl.textContent = '';
    errorEl.style.display = 'none';
    loadingEl.style.display = 'block';

    // System instruction is simple for text transcription
    const systemPrompt = "You are an accurate Bible transcription service. Given a Bible passage, return the exact text of that passage from the Bible (KJV or NIV). Only return the verse text.";
    const userQuery = `Find the text for the Bible passage: ${passage}`;

    const apiUrl = `${BASE_URL_GEMINI}${MODEL_FLASH}:generateContent?key=${API_KEY}`;
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        tools: [{ "google_search": {} }], // Use Google Search for grounding
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        }
    };

    try {
        const fetcher = () => fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const response = await fetchWithRetry(fetcher);
        const result = await response.json();

        loadingEl.style.display = 'none';

        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text && text.length > 5 && !text.includes('could not find') && !text.includes('sorry')) {
            resultEl.innerHTML = `<strong>${passage}:</strong> ${text.trim()}`;
        } else {
            throw new Error("Could not find a valid verse for that passage.");
        }

    } catch (error) {
        console.error("Failed to search Bible verse:", error);
        loadingEl.style.display = 'none';
        errorEl.textContent = `Error: Please check the passage (${passage}) or connection.`;
        errorEl.style.display = 'block';
    }
}

/**
 * 3. Sets up the event listener for the Bible Verse Finder section.
 */
function setupVerseFinder() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('bibleSearch');

    const handleSearch = () => {
        const passage = searchInput.value.trim();
        if (passage) {
            searchBibleVerse(passage);
        } else {
            document.getElementById('error-message').textContent = 'Please enter a passage (e.g., John 3:16).';
            document.getElementById('error-message').style.display = 'block';
            document.getElementById('bibleResult').textContent = '';
        }
    };

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
}

// --- Date and Time Handlers ---

/**
 * 4. Applies a seasonal theme class to the body element.
 */
function setSeasonalTheme() {
    const month = new Date().getMonth();
    let themeClass = 'winter';

    // Months are 0-indexed (0=Jan, 11=Dec)
    if (month >= 2 && month <= 4) { // March (2) to May (4)
        themeClass = 'spring';
    } else if (month >= 5 && month <= 7) { // June (5) to August (7)
        themeClass = 'summer';
    } else if (month >= 8 && month <= 10) { // September (8) to November (10)
        themeClass = 'fall';
    }
    // December (11), January (0), February (1) are winter (default)

    document.body.className = themeClass;
}

/**
 * 5. Updates the countdown for all event cards on the page.
 */
function updateCountdowns() {
    const now = new Date();
    const eventCards = document.querySelectorAll('.event-card');
    let nextEvent = null;
    let nextEventTimeDiff = Infinity;
    const today = now.toDateString();

    eventCards.forEach(card => {
        const dateStr = card.getAttribute('data-date');
        const eventDate = new Date(dateStr);
        const countdownEl = card.querySelector('.countdown');
        const timeDiff = eventDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        const eventDateString = eventDate.toDateString();

        card.classList.remove('past', 'today');

        if (timeDiff <= 0) {
            // Event is in the past or currently happening
            countdownEl.textContent = "Event Concluded";
            card.classList.add('past');
        } else {
            // Event is in the future
            let displayString = '';
            if (daysDiff === 0) {
                 displayString = "Happening TODAY!";
                 card.classList.add('today');
            } else if (daysDiff === 1) {
                 displayString = "Tomorrow!";
            } else {
                 displayString = `in ${daysDiff} days`;
            }
            countdownEl.textContent = displayString;

            // Track the next upcoming event
            if (timeDiff < nextEventTimeDiff) {
                nextEventTimeDiff = timeDiff;
                nextEvent = {
                    title: card.querySelector('h3').textContent,
                    date: eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
                    days: daysDiff
                };
            }
        }
    });

    // Update the next event banner
    const bannerEl = document.getElementById('next-event-banner');
    if (nextEvent) {
        bannerEl.innerHTML = `
            📅 Next Event: <strong>${nextEvent.title}</strong> on ${nextEvent.date}
            <span style="font-size:0.9em; font-weight:normal;">(${nextEvent.days > 0 ? 'in ' + nextEvent.days + ' days' : 'TODAY'})</span>
        `;
    } else {
        bannerEl.textContent = "No upcoming events scheduled.";
    }
}

/**
 * 6. Checks if the logo image loaded successfully.
 */
function checkLogo() {
    const logoImg = document.getElementById('logoImg');
    const fallbackUrl = 'https://placehold.co/50x50/3498db/ffffff?text=ICF';

    if (logoImg) {
        logoImg.onerror = function() {
            // Replace with a simple placeholder if the original image URL fails
            logoImg.src = fallbackUrl;
            logoImg.alt = 'ICF Logo Placeholder';
            console.warn("Original logo image failed to load. Using a placeholder.");
        };
    }
}

// --- Initialization ---

window.addEventListener('load', () => {
    // 1. Initialize logic
    setSeasonalTheme();
    checkLogo();

    // 2. Fetch API-dependent content
    fetchDailyDevotion();

    // 3. Setup user interactions
    setupVerseFinder();

    // 4. Initial update and set interval for real-time countdowns
    updateCountdowns();
    setInterval(updateCountdowns, 1000 * 60 * 60 * 6); // Update countdowns every 6 hours

    // Inject a loading message element for the search finder
    const finderSection = document.querySelector('.bible-verse-finder');
    if (finderSection) {
        const loadingMessageHtml = `
            <div id="loading-message" class="panel" style="background-color: #fff3cd; color: #856404; border-left: 5px solid #ffc107; font-weight: bold; display: none; text-align: left;">
                <i class="fas fa-spinner fa-spin"></i> Searching the Scriptures...
            </div>
        `;
        // Append the new loading and error messages right after the search bar for visibility
        finderSection.insertAdjacentHTML('beforeend', loadingMessageHtml);
    }
});
