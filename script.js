// ============================================================================
// Clothes Bar Rentals — Rental Availability Calendar
// Vanilla JS. No build step. Designed to run as static files on GitHub Pages
// and be embedded in a Formester form via <iframe>.
// ============================================================================


// ============================================================================
// CONFIGURATION
// ============================================================================

// Replace these with your actual Supabase project values.
// Only use the anon/public key here — NEVER the service-role key.
const SUPABASE_URL = "https://iutyiqdkzhmjknclwygc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_b11etu5irSTh5FapghWnuA_rRpwcjH-";


// ============================================================================
// DRESS CONFIGURATION + PRICING
// ============================================================================

// Example:
// calendar.html?dress=daylight
//
// DAYLIGHT DRESS PRICING
//
// 1 day  = ₱2,500
// 2 days = ₱3,200
// 3 days = ₱4,200
// 4 days = ₱5,200
// 5 days = ₱6,200
// 6 days = ₱7,200
// 7 days = ₱8,100
// 8 days = ₱9,000
// 9 days = ₱9,900
// 10 days = ₱10,800
//
// MORE THAN 10 DAYS:
//
// Day 8 Rate + (TOTAL RENTAL DAYS × ₱300)
//
// Example:
// 20 days
// ₱9,000 + (20 × ₱300)
// = ₱15,000

const DRESSES = {

  daylight: {
    name: "Daylight Dress",

    pricing: {

      fixedRates: {
        1: 2500,
        2: 3200,
        3: 4200,
        4: 5200,
        5: 6200,
        6: 7200,
        7: 8100,
        8: 9000,
        9: 9900,
        10: 10800
      },

      day8Rate: 9000,

      additionalDayRate: 300
    }
  },


  // Pricing can be added later.
  // Calendar availability will still work.
  kensley: {
    name: "Kensley Co-Ords",
    pricing: null
  },


  vietta: {
    name: "Vietta Dress",
    pricing: null
  }

};


// ============================================================================
// DOM REFERENCES
// ============================================================================

const statusMessageEl =
  document.getElementById("status-message");

const calendarAppEl =
  document.getElementById("calendar-app");

const calendarEl =
  document.getElementById("calendar");

const dressTitleEl =
  document.getElementById("dress-title");

const selectedPeriodEl =
  document.getElementById("selected-period");

const startDateDisplayEl =
  document.getElementById("start-date-display");

const endDateDisplayEl =
  document.getElementById("end-date-display");

const durationDisplayEl =
  document.getElementById("duration-display");

const rentalRateRowEl =
  document.getElementById("rental-rate-row");

const rentalRateDisplayEl =
  document.getElementById("rental-rate-display");


// ============================================================================
// STATUS / UI HELPERS
// ============================================================================

function showStatus(message, type) {

  if (!statusMessageEl) {
    return;
  }


  statusMessageEl.textContent =
    message;

  statusMessageEl.hidden =
    false;

  statusMessageEl.classList.remove(
    "is-error"
  );


  if (type) {

    statusMessageEl.classList.add(
      type
    );

  }

}


function hideStatus() {

  if (!statusMessageEl) {
    return;
  }


  statusMessageEl.hidden =
    true;

  statusMessageEl.textContent =
    "";

  statusMessageEl.classList.remove(
    "is-error"
  );

}


function showCalendarApp() {

  if (calendarAppEl) {

    calendarAppEl.hidden =
      false;

  }

}


function hideCalendarApp() {

  if (calendarAppEl) {

    calendarAppEl.hidden =
      true;

  }

}


// ============================================================================
// PRICE FORMATTING
// ============================================================================

function formatPHP(amount) {

  return new Intl.NumberFormat(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }
  ).format(amount);

}


// ============================================================================
// RENTAL PRICE CALCULATION
// ============================================================================

function getRentalRate(
  dressId,
  rentalDays
) {

  const dress =
    DRESSES[dressId];


  if (
    !dress ||
    !dress.pricing ||
    rentalDays < 1
  ) {

    return null;

  }


  const pricing =
    dress.pricing;


  // DAYS 1–10
  // Use exact pricing table

  if (rentalDays <= 10) {

    return (
      pricing.fixedRates[rentalDays]
      ?? null
    );

  }


  // MORE THAN 10 DAYS
  //
  // Day 8 Rate
  // +
  // TOTAL rental days × ₱300
  //
  // Example:
  // 20 days =
  // ₱9,000 + (20 × ₱300)
  // = ₱15,000

  return (
    pricing.day8Rate +
    (
      rentalDays *
      pricing.additionalDayRate
    )
  );

}


// ============================================================================
// DATE HELPERS
// ============================================================================


// Convert a local Date to YYYY-MM-DD.
//
// Do NOT use toISOString()
// because that converts to UTC
// and may cause date shifting.

function formatLocalISODate(date) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${year}-${month}-${day}`
  );

}


// Convert YYYY-MM-DD into a local Date.

function parseLocalISODate(iso) {

  const [
    year,
    month,
    day
  ] =
    iso
      .split("-")
      .map(Number);


  return new Date(
    year,
    month - 1,
    day
  );

}


// Human-readable date.

function formatReadableDate(date) {

  return date.toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  );

}


// Strip time from Date.

function startOfDay(date) {

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

}


// Inclusive rental-day count.
//
// Example:
//
// Sept 22 → Sept 22
// = 1 day
//
// Sept 22 → Sept 24
// = 3 days

function countInclusiveDays(
  startDate,
  endDate
) {

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;


  const startUTC =
    Date.UTC(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );


  const endUTC =
    Date.UTC(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate()
    );


  return (
    Math.round(
      (
        endUTC -
        startUTC
      )
      /
      millisecondsPerDay
    )
    +
    1
  );

}


// ============================================================================
// SUPABASE API
// ============================================================================


// READ-ONLY.
//
// Gets only:
//
// start_date
// end_date
//
// No customer information is retrieved.

async function fetchBookedRanges(
  dressId
) {

  const endpoint =
    `${SUPABASE_URL}/rest/v1/bookings`
    +
    `?dress_id=eq.${encodeURIComponent(
      dressId
    )}`
    +
    `&status=eq.booked`
    +
    `&select=start_date,end_date`;


  const response =
    await fetch(
      endpoint,
      {
        method: "GET",

        headers: {

          apikey:
            SUPABASE_ANON_KEY,

          Authorization:
            `Bearer ${SUPABASE_ANON_KEY}`

        }
      }
    );


  if (!response.ok) {

    throw new Error(
      `Supabase request failed with status ${response.status}`
    );

  }


  return response.json();

}


// ============================================================================
// BOOKING AVAILABILITY
// ============================================================================

let bookedRanges = [];


// Check whether the selected range
// overlaps an existing booking.

function rangeOverlapsBooking(
  startDate,
  endDate
) {

  const rangeStart =
    startOfDay(
      startDate
    ).getTime();


  const rangeEnd =
    startOfDay(
      endDate
    ).getTime();


  return bookedRanges.some(
    ({
      start,
      end
    }) => {

      const bookedStart =
        start.getTime();

      const bookedEnd =
        end.getTime();


      return (
        rangeStart <= bookedEnd
        &&
        bookedStart <= rangeEnd
      );

    }
  );

}


// Convert Supabase bookings
// into Flatpickr disabled ranges.

function buildDisableRanges() {

  return bookedRanges.map(
    ({
      start,
      end
    }) => ({

      from:
        formatLocalISODate(
          start
        ),

      to:
        formatLocalISODate(
          end
        )

    })
  );

}


// ============================================================================
// FORMESTER COMMUNICATION
// ============================================================================


// Formester receives:
//
// startDate
// endDate
// rentalDays
// rentalRate
// rentalRateFormatted

function sendDatesToFormester(
  dressId,
  startDate,
  endDate,
  rentalDays,
  rentalRate
) {

  window.parent.postMessage(
    {

      type:
        "CBR_RENTAL_DATES",

      dress:
        dressId,

      startDate:
        startDate || "",

      endDate:
        endDate || "",

      rentalDays:
        rentalDays || "",

      rentalRate:
        rentalRate ?? "",

      rentalRateFormatted:
        typeof rentalRate ===
          "number"

          ? formatPHP(
              rentalRate
            )

          : ""

    },

    "*"
  );

}


// ============================================================================
// RENTAL SUMMARY
// ============================================================================

function displaySelectedPeriod(
  dressId,
  startDate,
  endDate
) {

  if (
    startDateDisplayEl
  ) {

    startDateDisplayEl.textContent =
      formatReadableDate(
        startDate
      );

  }


  if (
    endDateDisplayEl
  ) {

    endDateDisplayEl.textContent =
      formatReadableDate(
        endDate
      );

  }


  const rentalDays =
    countInclusiveDays(
      startDate,
      endDate
    );


  const rentalRate =
    getRentalRate(
      dressId,
      rentalDays
    );


  if (
    durationDisplayEl
  ) {

    durationDisplayEl.textContent =
      `${rentalDays} ${
        rentalDays === 1
          ? "Day"
          : "Days"
      }`;

  }


  // If pricing exists,
  // show Rental Rate.

  if (
    typeof rentalRate ===
      "number"
  ) {

    if (
      rentalRateDisplayEl
    ) {

      rentalRateDisplayEl.textContent =
        formatPHP(
          rentalRate
        );

    }


    if (
      rentalRateRowEl
    ) {

      rentalRateRowEl.hidden =
        false;

    }

  }


  // If this dress does not have
  // pricing configured yet,
  // hide the rate row.

  else {

    if (
      rentalRateDisplayEl
    ) {

      rentalRateDisplayEl.textContent =
        "";

    }


    if (
      rentalRateRowEl
    ) {

      rentalRateRowEl.hidden =
        true;

    }

  }


  if (
    selectedPeriodEl
  ) {

    selectedPeriodEl.hidden =
      false;

  }


  return {

    rentalDays,

    rentalRate

  };

}


// Clear visible rental summary.

function clearSelectedPeriod() {

  if (
    startDateDisplayEl
  ) {

    startDateDisplayEl.textContent =
      "";

  }


  if (
    endDateDisplayEl
  ) {

    endDateDisplayEl.textContent =
      "";

  }


  if (
    durationDisplayEl
  ) {

    durationDisplayEl.textContent =
      "";

  }


  if (
    rentalRateDisplayEl
  ) {

    rentalRateDisplayEl.textContent =
      "";

  }


  if (
    rentalRateRowEl
  ) {

    rentalRateRowEl.hidden =
      true;

  }


  if (
    selectedPeriodEl
  ) {

    selectedPeriodEl.hidden =
      true;

  }

}


// ============================================================================
// SELECTION ERROR
// ============================================================================

let selectionErrorTimeoutId =
  null;


function showSelectionError(
  message
) {

  showStatus(
    message,
    "is-error"
  );


  if (
    selectionErrorTimeoutId
  ) {

    clearTimeout(
      selectionErrorTimeoutId
    );

  }


  selectionErrorTimeoutId =
    setTimeout(
      () => {

        hideStatus();

      },
      5000
    );

}


// ============================================================================
// FLATPICKR
// ============================================================================

function initializeCalendar(
  dressId
) {

  return flatpickr(
    calendarEl,
    {

      mode:
        "range",

      inline:
        true,

      dateFormat:
        "Y-m-d",

      minDate:
        "today",

      disable:
        buildDisableRanges(),


      onChange:
        function handleDateChange(
          selectedDates,
          dateStr,
          instance
        ) {


          // If customer has only selected
          // the first date or cleared dates,
          // remove old information.

          if (
            selectedDates.length < 2
          ) {

            clearSelectedPeriod();


            sendDatesToFormester(
              dressId,
              "",
              "",
              "",
              null
            );


            return;

          }


          const [
            startDate,
            endDate
          ] =
            selectedDates;


          // Extra safety:
          // prevent a range from
          // crossing booked dates.

          if (
            rangeOverlapsBooking(
              startDate,
              endDate
            )
          ) {

            showSelectionError(
              "Some dates within this rental period are already unavailable. Please choose another range."
            );


            instance.clear();


            clearSelectedPeriod();


            sendDatesToFormester(
              dressId,
              "",
              "",
              "",
              null
            );


            return;

          }


          hideStatus();


          // Calculate rental days
          // and rental price.

          const {
            rentalDays,
            rentalRate
          } =
            displaySelectedPeriod(
              dressId,
              startDate,
              endDate
            );


          // Send values to Formester.

          sendDatesToFormester(
            dressId,

            formatLocalISODate(
              startDate
            ),

            formatLocalISODate(
              endDate
            ),

            rentalDays,

            rentalRate
          );

        }

    }
  );

}


// ============================================================================
// APPLICATION STARTUP
// ============================================================================

async function init() {

  hideCalendarApp();


  const params =
    new URLSearchParams(
      window.location.search
    );


  const dressId =
    params.get(
      "dress"
    );


  // Missing dress parameter.

  if (!dressId) {

    showStatus(
      "Unable to load this rental calendar. Please return to the dress booking page.",
      "is-error"
    );


    return;

  }


  // Invalid dress parameter.

  if (
    !Object.prototype
      .hasOwnProperty
      .call(
        DRESSES,
        dressId
      )
  ) {

    showStatus(
      "Unable to load this rental calendar. Please return to the dress booking page.",
      "is-error"
    );


    return;

  }


  // Show dress name.

  if (
    dressTitleEl
  ) {

    dressTitleEl.textContent =
      DRESSES[dressId].name;


    dressTitleEl.hidden =
      false;

  }


  // Loading message.

  showStatus(
    "Loading availability…"
  );


  try {

    // Fetch booked dates.

    const rows =
      await fetchBookedRanges(
        dressId
      );


    bookedRanges =
      rows.map(
        row => ({

          start:
            parseLocalISODate(
              row.start_date
            ),

          end:
            parseLocalISODate(
              row.end_date
            )

        })
      );


    hideStatus();


    showCalendarApp();


    initializeCalendar(
      dressId
    );

  }


  catch (error) {

    console.error(
      "Failed to load availability from Supabase:",
      error
    );


    // IMPORTANT:
    // Do not show an open calendar
    // when Supabase fails.

    showStatus(
      "We couldn't load the latest availability. Please refresh the page or try again shortly.",
      "is-error"
    );

  }

}


// ============================================================================
// START
// ============================================================================

document.addEventListener(
  "DOMContentLoaded",
  init
);
