
const API_BASE = "https://mrcutssalon.trashbroyourtrash.workers.dev";

// Change these times to match your salon's actual opening hours.
const TIME_SLOTS = [
  "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00"
];

const calendar = document.getElementById("calendar");
const form = document.getElementById("bookingForm");

if (calendar && form) {
  const title = document.getElementById("monthTitle");
  const days = document.getElementById("days");
  const selectedDateText = document.getElementById("selectedDate");
  const dateInput = document.getElementById("bookingDate");
  const timeSelect = document.getElementById("bookingTime");
  const serviceSelect = document.getElementById("service");
  const message = document.getElementById("bookingMessage");
  const submitButton = document.getElementById("submitBooking");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDate = null;
  let bookings = [];
  let availabilityLoaded = false;
  let servicesLoaded = false;

  function iso(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function setMessage(text) {
    message.textContent = text;
  }

  async function getJSON(path) {
    const response = await fetch(`${API_BASE}${path}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "The server request failed.");
    }

    return data;
  }

  function bookedTimes(date) {
    return bookings
      .filter(item => item.date === date)
      .map(item => item.time);
  }

  function availableTimes(date) {
    const used = bookedTimes(date);
    return TIME_SLOTS.filter(time => !used.includes(time));
  }

  async function loadServices() {
    serviceSelect.innerHTML = '<option value="">Loading services...</option>';

    try {
      const data = await getJSON("/api/services");
      const services = Array.isArray(data) ? data : data.services;

      if (!Array.isArray(services) || services.length === 0) {
        throw new Error("No services are listed yet.");
      }

      serviceSelect.innerHTML = '<option value="">Choose a service</option>';

      services.forEach(service => {
        const option = document.createElement("option");
        option.value = service.name;
        option.textContent = `${service.name} — PKR ${service.price}`;
        serviceSelect.appendChild(option);
      });

      servicesLoaded = true;
    } catch (error) {
      serviceSelect.innerHTML = '<option value="">Could not load services</option>';
      setMessage(`Could not load services: ${error.message}`);
    }
  }

  async function loadAvailability() {
    availabilityLoaded = false;
    setMessage("Loading appointment availability...");
    renderCalendar();

    try {
      const data = await getJSON("/api/availability");
      bookings = Array.isArray(data) ? data : data.bookings;

      if (!Array.isArray(bookings)) {
        throw new Error("The availability response was not in the expected format.");
      }

      availabilityLoaded = true;
      renderCalendar();

      if (selectedDate) {
        showSelection(selectedDate);
      } else {
        setMessage("Choose an available date to see appointment times.");
      }
    } catch (error) {
      bookings = [];
      availabilityLoaded = false;
      renderCalendar();
      setMessage(`Could not load availability: ${error.message}`);
    }
  }

  function renderCalendar() {
    const year = view.getFullYear();
    const month = view.getMonth();

    title.textContent = view.toLocaleString("en-US", {
      month: "long",
      year: "numeric"
    });

    days.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay();
    const numberOfDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      empty.setAttribute("aria-hidden", "true");
      days.appendChild(empty);
    }

    for (let day = 1; day <= numberOfDays; day++) {
      const key = iso(year, month, day);
      const date = new Date(year, month, day);
      const isPast = date < today;
      const remaining = availableTimes(key);
      const fullyBooked = availabilityLoaded && remaining.length === 0;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "day";

      if (fullyBooked) button.classList.add("booked");
      if (selectedDate === key) button.classList.add("selected");

      const isUnavailable = isPast || fullyBooked || !availabilityLoaded;
      button.disabled = isUnavailable;

      const number = document.createElement("span");
      number.textContent = String(day);
      button.appendChild(number);

      const small = document.createElement("small");
      if (isPast) {
        small.textContent = "Past";
      } else if (!availabilityLoaded) {
        small.textContent = "Loading";
      } else if (fullyBooked) {
        small.textContent = "Booked";
      } else {
        small.textContent = "Open";
      }
      button.appendChild(small);

      if (!isUnavailable) {
        button.addEventListener("click", () => {
          selectedDate = key;
          renderCalendar();
          showSelection(key);
        });
      }

      days.appendChild(button);
    }

    document.getElementById("prevMonth").disabled =
      year === today.getFullYear() && month === today.getMonth();
  }

  function showSelection(date) {
    const parts = date.split("-").map(Number);
    const localDate = new Date(parts[0], parts[1] - 1, parts[2]);

    selectedDateText.textContent = localDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    dateInput.value = date;

    const times = availableTimes(date);
    timeSelect.innerHTML = "";

    if (!availabilityLoaded) {
      timeSelect.add(new Option("Availability unavailable", ""));
      timeSelect.disabled = true;
      return;
    }

    if (times.length === 0) {
      timeSelect.add(new Option("Fully booked", ""));
      timeSelect.disabled = true;
      setMessage("Sorry, there are no available times on this date.");
      return;
    }

    timeSelect.add(new Option("Choose a time", ""));

    times.forEach(time => {
      timeSelect.add(new Option(time, time));
    });

    timeSelect.disabled = false;
    setMessage("Choose a time and service, then request your appointment.");
  }

  document.getElementById("prevMonth").addEventListener("click", () => {
    if (
      view.getFullYear() === today.getFullYear() &&
      view.getMonth() === today.getMonth()
    ) return;

    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    renderCalendar();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    renderCalendar();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const service = serviceSelect.value;
    const date = dateInput.value;
    const time = timeSelect.value;

    if (!availabilityLoaded || !servicesLoaded) {
      setMessage("Services or availability have not loaded. Please try again.");
      return;
    }

    if (!name || !phone || !service || !date || !time) {
      setMessage("Please complete all required fields and choose a date and time.");
      return;
    }

    if (!availableTimes(date).includes(time)) {
      setMessage("That time may have just been booked. Refreshing availability...");
      await loadAvailability();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, service, date, time })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "The booking could not be submitted. Please try another time."
        );
      }

      setMessage(
        `Thank you, ${name}! Your appointment request for ${date} at ${time} has been submitted. It is pending confirmation by the salon.`
      );

      form.reset();
      selectedDate = null;
      dateInput.value = "";
      selectedDateText.textContent = "None";
      timeSelect.innerHTML = '<option value="">Choose a date first</option>';
      timeSelect.disabled = true;

      await loadAvailability();
    } catch (error) {
      setMessage(`Booking failed: ${error.message}`);
      await loadAvailability();
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Request appointment";
    }
  });

  loadServices();
  loadAvailability();
}
