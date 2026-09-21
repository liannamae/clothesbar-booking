// ============================================================================
// Clothes Bar Rentals — Rental Availability Calendar
// Vanilla JS. No build step. Designed to run as static files on GitHub
// Pages and be embedded in a Formester form via <iframe>.
// ============================================================================

// ============================================================================
// Configuration
// ============================================================================

// Replace these with your project's values. Only ever use the
// anon/public key here — never the service role key. This key is
// visible to anyone who views this page's source, so make sure your
// Supabase Row Level Security policy on `bookings` only allows
// anonymous SELECT, and never allows anonymous INSERT, UPDATE, or
// DELETE.
const SUPABASE_URL = "https://iutyiqdkzhmjknclwygc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_b11etu5irSTh5FapghWnuA_rRpwcjH-";

// ============================================================================
// Dress configuration
// ============================================================================

// Maps the `dress` URL parameter to a customer-facing name and doubles
// as the allowlist of valid dresses. Add new dresses here as they're
// added to the business — nothing else in this file needs to change.
const DRESSES = {
  daylight: "Daylight Dress",
  kensley: "Kensley Co-Ords",
  vietta: "Vietta Dress",
};

// ============================================================================
// DOM references
// ============================================================================

const statusMessageEl = document.getElementById("status-message");
const calendarAppEl = document.getElementById("calendar-app");
const calendarEl = document.getElementById("calendar");
const dressTitleEl = document.getElementById("dress-title");
const selectedPeriodEl = document.getElementById("selected-period");
const startDateDisplayEl = document.getElementById("start-date-display");
const endDateDisplayEl = document.getElementById("end-date-display");
const durationDisplayEl = document.getElementById("duration-display");

// ============================================================================
// Utility functions
// ============================================================================

function showStatus(message, type) {
  statusMessageEl.textContent = message;
  statusMessageEl.hidden = false;
  statusMessageEl.classList.remove("is-error");
  if (type) {
    statusMessageEl.classList.add(type);
  }
}

function hideStatus() {
  statusMessageEl.hidden = true;
  statusMessageEl.textContent = "";
  statusMessageEl.classList.remove("is-error");
}

function showCalendarApp() {
  calendarAppEl.hidden = false;
}

function hideCalendarApp() {
  calendarAppEl.hidden = true;
}

// ============================================================================
// Date formatting
// ============================================================================

// Manual local-date formatting — never date.toISOString(), which
// converts to UTC first and can silently shift the calendar day
// depending on the visitor's timezone.
function formatLocalISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalISODate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatReadableDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Inclusive day count: Sep 25 -> Sep 28 is 25, 26, 27, 28 = 4 days.
function countInclusiveDays(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
}

// ============================================================================
// Supabase API
// ============================================================================

// Read-only: fetches only start_date/end_date for booked rows
// belonging to this dress. No customer information is ever requested.
async function fetchBookedRanges(dressId) {
  const endpoint =
    `${SUPABASE_URL}/rest/v1/bookings` +
    `?dress_id=eq.${encodeURIComponent(dressId)}` +
    `&status=eq.booked` +
    `&select=start_date,end_date`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with status ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Booking overlap checks
// ============================================================================

// Populated once at startup from Supabase; each entry's start/end are
// both inclusive booked days (matching how `disable` ranges are built
// below), so a stay is blocked if it touches either endpoint.
let bookedRanges = [];

function rangeOverlapsBooking(startDate, endDate) {
  const rangeStart = startOfDay(startDate).getTime();
  const rangeEnd = startOfDay(endDate).getTime();

  return bookedRanges.some(({ start, end }) => {
    const bookedStart = start.getTime();
    const bookedEnd = end.getTime();
    return rangeStart <= bookedEnd && bookedStart <= rangeEnd;
  });
}

function buildDisableRanges() {
  return bookedRanges.map(({ start, end }) => ({
    from: formatLocalISODate(start),
    to: formatLocalISODate(end),
  }));
}

// ============================================================================
// Formester communication
// ============================================================================

function sendDatesToFormester(dressId, startDate, endDate) {
  window.parent.postMessage(
    {
      type: "CBR_RENTAL_DATES",
      dress: dressId,
      startDate: startDate || "",
      endDate: endDate || "",
    },
    "*"
  );
}

// ============================================================================
// UI state
// ============================================================================

function displaySelectedPeriod(startDate, endDate) {
  startDateDisplayEl.textContent = formatReadableDate(startDate);
  endDateDisplayEl.textContent = formatReadableDate(endDate);

  const days = countInclusiveDays(startDate, endDate);
  durationDisplayEl.textContent = `${days} ${days === 1 ? "Day" : "Days"}`;

  selectedPeriodEl.hidden = false;
}

function clearSelectedPeriod() {
  startDateDisplayEl.textContent = "";
  endDateDisplayEl.textContent = "";
  durationDisplayEl.textContent = "";
  selectedPeriodEl.hidden = true;
}

let selectionErrorTimeoutId = null;

function showSelectionError(message) {
  showStatus(message, "is-error");
  if (selectionErrorTimeoutId) {
    clearTimeout(selectionErrorTimeoutId);
  }
  selectionErrorTimeoutId = setTimeout(() => {
    hideStatus();
  }, 5000);
}

// ============================================================================
// Flatpickr initialization
// ============================================================================

function initializeCalendar(dressId) {
  return flatpickr(calendarEl, {
    mode: "range",
    inline: true,
    dateFormat: "Y-m-d",
    minDate: "today",
    disable: buildDisableRanges(),
    onChange: function handleDateChange(selectedDates, dateStr, instance) {
      // Fewer than two dates means the customer cleared the
      // selection or has only picked a start date so far — either
      // way, Formester shouldn't keep stale dates around.
      if (selectedDates.length < 2) {
        clearSelectedPeriod();
        sendDatesToFormester(dressId, "", "");
        return;
      }

      const [startDate, endDate] = selectedDates;

      if (rangeOverlapsBooking(startDate, endDate)) {
        showSelectionError(
          "Some dates within this rental period are already unavailable. Please choose another range."
        );
        instance.clear();
        clearSelectedPeriod();
        sendDatesToFormester(dressId, "", "");
        return;
      }

      hideStatus();
      displaySelectedPeriod(startDate, endDate);
      sendDatesToFormester(
        dressId,
        formatLocalISODate(startDate),
        formatLocalISODate(endDate)
      );
    },
  });
}

// ============================================================================
// Application startup
// ============================================================================

async function init() {
  hideCalendarApp();

  const params = new URLSearchParams(window.location.search);
  const dressId = params.get("dress");

  if (!dressId) {
    showStatus(
      "Unable to load this rental calendar. Please return to the dress booking page.",
      "is-error"
    );
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(DRESSES, dressId)) {
    showStatus(
      "Unable to load this rental calendar. Please return to the dress booking page.",
      "is-error"
    );
    return;
  }

  dressTitleEl.textContent = DRESSES[dressId];
  dressTitleEl.hidden = false;

  showStatus("Loading availability…");

  try {
    const rows = await fetchBookedRanges(dressId);

    bookedRanges = rows.map((row) => ({
      start: parseLocalISODate(row.start_date),
      end: parseLocalISODate(row.end_date),
    }));

    hideStatus();
    showCalendarApp();
    initializeCalendar(dressId);
  } catch (error) {
    console.error("Failed to load availability from Supabase:", error);
    showStatus(
      "We couldn't load the latest availability. Please refresh the page or try again shortly.",
      "is-error"
    );
  }
}

document.addEventListener("DOMContentLoaded", init);
