
const API_BASE = "https://mrcutssalon.trashbroyourtrash.workers.dev";

const TIME_SLOTS = [
  "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00"
];

const calendar = document.getElementById("calendar");
const form = document.getElementById("bookingForm");

if (calendar && form) {
  const title = document.getElementById("monthTitle");
  const days = document.getElementById("days");
  const dateInput = document.getElementById("bookingDate");
  const dateLabel = document.getElementById("selectedDate");
  const timeSelect = document.getElementById("bookingTime");
  const serviceSelect = document.getElementById("service");
  const message = document.getElementById("bookingMessage");
  const submitButton = document.getElementById("submitBooking");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDate = "";
  let bookings = [];
  let servicesLoaded = false;
  let availabilityLoaded = false;

  function iso(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  async function api(path, options = {}) {
    const response = await fetch(API_BASE + path, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  function setMessage(text) {
    message.textContent = text;
  }

  async function loadServices() {
    try {
      const data = await api("/api/services");
      const services = Array.isArray(data) ? data : data.services;

      if (!Array.isArray(services) || services.length === 0) {
        throw new Error("No services are available.");
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
      setMessage("Could not load services. Please try again later.");
    }
  }

  function availableTimes(date) {
    const used = bookings
      .filter(booking => booking.date === date)
      .map(booking => booking.time);

    return TIME_SLOTS.filter(time => !used.includes(time));
  }

  async function loadAvailability() {
    availabilityLoaded = false;
    renderCalendar();

    try {
      const data = await api("/api/availability");
      bookings = Array.isArray(data) ? data : data.bookings;

      if (!Array.isArray(bookings)) {
        throw new Error("Unexpected availability response.");
      }

      availabilityLoaded = true;
      renderCalendar();

      if (selectedDate) showSelection(selectedDate);
      else setMessage("Choose an available date.");
    } catch (error) {
      setMessage("Could not load availability. Please refresh the page.");
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

    const first = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < first; i++) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      days.appendChild(empty);
    }

    for (let d = 1; d <= count; d++) {
      const key = iso(year, month, d);
      const date = new Date(year, month, d);
      const isPast = date < today;
      const remaining = availableTimes(key);
      const isBooked = availabilityLoaded && remaining.length === 0;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "day";

      if (isBooked) button.classList.add("booked");
      if (selectedDate === key) button.classList.add("selected");

      const small = document.createElement("small");

      if (isPast) small.textContent = "Past";
      else if (!availabilityLoaded) small.textContent = "Loading";
      else if (isBooked) small.textContent = "Booked";
      else small.textContent = "Open";

      button.append(document.createTextNode(d), small);
      button.disabled = isPast || isBooked || !availabilityLoaded;

      if (!button.disabled) {
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
    const [y, m, d] = date.split("-").map(Number);
    dateLabel.textContent = new Date(y, m - 1, d).toLocaleDateString(
      "en-US",
      { weekday: "long", month: "long", day: "numeric", year: "numeric" }
    );

    dateInput.value = date;
    timeSelect.innerHTML = "";

    const times = availableTimes(date);

    if (!availabilityLoaded || times.length === 0) {
      timeSelect.add(new Option("No times available", ""));
      timeSelect.disabled = true;
      return;
    }

    timeSelect.add(new Option("Choose a time", ""));
    times.forEach(time => timeSelect.add(new Option(time, time)));
    timeSelect.disabled = false;

    setMessage("Choose a service and time, then request your appointment.");
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

    if (!servicesLoaded || !availabilityLoaded) {
      setMessage("Please wait for services and availability to load.");
      return;
    }

    if (!name || !phone || !service || !date || !time) {
      setMessage("Please fill in all required fields.");
      return;
    }

    if (!availableTimes(date).includes(time)) {
      setMessage("That time may have just been booked. Refreshing availability.");
      await loadAvailability();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      await api("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, service, date, time })
      });

      setMessage(
        `Thanks, ${name}! Your appointment request was submitted. It is pending confirmation by the salon.`
      );

      form.reset();
      selectedDate = "";
      dateInput.value = "";
      dateLabel.textContent = "None";
      timeSelect.innerHTML = '<option value="">Choose a date first</option>';
      timeSelect.disabled = true;

      await loadAvailability();
    } catch (error) {
      setMessage("Booking failed: " + error.message);
      await loadAvailability();
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Request appointment";
    }
  });

  loadServices();
  loadAvailability();
}
