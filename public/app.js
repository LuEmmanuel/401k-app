// Grab DOM elements
const typeRadios = document.querySelectorAll('input[name="contributionType"]');
const valueInput = document.getElementById("valueInput");
const valueSlider = document.getElementById("valueSlider");
const valueLabel = document.getElementById("valueLabel");
const valueSuffix = document.getElementById("valueSuffix");

const salaryDisplay = document.getElementById("salaryDisplay");
const payFreqDisplay = document.getElementById("payFreqDisplay");
const ytdDisplay = document.getElementById("ytdDisplay");
const currentSettingDisplay = document.getElementById("currentSettingDisplay");

const impactBox = document.getElementById("impactBox");
const agePill = document.getElementById("agePill");
const retirementPill = document.getElementById("retirementPill");
const assumptionPill = document.getElementById("assumptionPill");

const saveButton = document.getElementById("saveButton");
const statusEl = document.getElementById("status");

// Will hold data from the backend
let state = null;

// Load data from backend and initialize UI
async function loadData() {
  try {
    const res = await fetch("/api/contribution");
    if (!res.ok) throw new Error("Failed to load data");
    state = await res.json();
    initUIFromState();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to load contribution data. Please refresh.";
    statusEl.className = "error";
  }
}

function formatMoney(amount) {
  return `$${amount.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function initUIFromState() {
  const { current, salary, payFrequencyPerYear, ytdContributions } = state;

  // Set radio selection
  for (const r of typeRadios) {
    r.checked = r.value === current.type;
  }

  // Set labels and slider limits based on current.type and paycheck size
  syncTypeLabels(current.type);

  // Now that min/max are set based on type, clamp current value into that range
  const max = Number(valueSlider.max);
  let v = Number(current.value) || 0;
  if (v < 0) v = 0;
  if (v > max) v = max;

  valueInput.value = v;
  valueSlider.value = v;

  // Snapshot stats
  salaryDisplay.textContent = formatMoney(salary);
  payFreqDisplay.textContent = String(payFrequencyPerYear);
  ytdDisplay.textContent = formatMoney(ytdContributions);
  currentSettingDisplay.textContent =
    current.type === "percent"
      ? `${v}% of each paycheck`
      : formatMoney(v) + " per paycheck";

  // Pills
  agePill.textContent = `Age (mock): ${state.age}`;
  retirementPill.textContent = `Retirement age: ${state.retirementAge}`;
  assumptionPill.textContent = `Assumed return: ${(state.assumedAnnualReturnRate * 100).toFixed(
    1
  )}% / year`;

  updateImpact();
}

function getSelectedType() {
  for (const r of typeRadios) {
    if (r.checked) return r.value;
  }
  return "percent";
}

function syncTypeLabels(type) {
  // Use salary and pay frequency from the backend to compute one paycheck
  const paycheckAmount = state
    ? state.salary / state.payFrequencyPerYear
    : null;

  if (type === "percent") {
    // Percent mode: 0–100%
    valueLabel.textContent = "Contribution (% of paycheck)";
    valueSuffix.textContent = "%";
    valueInput.step = "0.5";

    valueSlider.min = "0";
    valueSlider.max = "100";
  } else {
    // Dollar mode: 0–full paycheck amount (from mock data)
    valueLabel.textContent = "Contribution ($ per paycheck)";
    valueSuffix.textContent = "$";
    valueInput.step = "50";

    valueSlider.min = "0";

    // Max per paycheck contribution = salary / payFrequency
    // Fallback to 5000 if state is not ready for some reason
    const maxDollar = paycheckAmount || 5000;
    valueSlider.max = String(Math.round(maxDollar));
  }
}

function updateImpact() {
  if (!state) return;

  const type = getSelectedType();
  const value = Number(valueInput.value) || 0;

  const {
    salary,
    payFrequencyPerYear,
    age,
    retirementAge,
    assumedAnnualReturnRate,
  } = state;

  const years = retirementAge - age;
  const periods = years * payFrequencyPerYear;

  const rPerPeriod =
    Math.pow(1 + assumedAnnualReturnRate, 1 / payFrequencyPerYear) - 1;

  // Future value of an annuity (per paycheck contributions)
  function futureValuePerPay(perPay) {
    if (perPay <= 0 || periods <= 0 || rPerPeriod <= 0) return 0;
    return perPay * ((Math.pow(1 + rPerPeriod, periods) - 1) / rPerPeriod);
  }

  // Per-paycheck contribution for the chosen setting
  let perPayCurrent;
  if (type === "percent") {
    const pct = value / 100;
    perPayCurrent = (salary * pct) / payFrequencyPerYear;
  } else {
    perPayCurrent = value;
  }

  const fvCurrent = futureValuePerPay(perPayCurrent);

  // Compare vs small increase
  let perPayBoost;
  if (type === "percent") {
    const pctBoost = (value + 1) / 100;
    perPayBoost = (salary * pctBoost) / payFrequencyPerYear;
  } else {
    perPayBoost = perPayCurrent + 100;
  }
  const fvBoost = futureValuePerPay(perPayBoost);
  const diff = fvBoost - fvCurrent;

  if (type === "percent") {
    impactBox.textContent = `
If you contribute ${value.toFixed(
      1
    )}% of each paycheck, you could have about ${formatMoney(
      Math.round(fvCurrent)
    )} by age ${retirementAge} (assuming steady salary & ${(
      assumedAnnualReturnRate * 100
    ).toFixed(1)}% annual returns).
Bumping that up by just 1% (to ${(value + 1).toFixed(
      1
    )}%) could add roughly ${formatMoney(
      Math.round(diff)
    )} more to your nest egg.
`.trim();
  } else {
    impactBox.textContent = `
If you contribute ${formatMoney(
      Math.round(perPayCurrent)
    )} per paycheck, you could have about ${formatMoney(
      Math.round(fvCurrent)
    )} by age ${retirementAge}.
Adding an extra $100 per paycheck could increase that by roughly ${formatMoney(
      Math.round(diff)
    )}.
`.trim();
  }
}

/* Event listeners */

// Contribution type changed
typeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    const type = getSelectedType();

    // Update label, suffix, and slider min/max based on state
    syncTypeLabels(type);

    // Keep slider and input in sync and clamped to new range
    const max = Number(valueSlider.max);
    let value = Number(valueInput.value) || 0;
    if (value < 0) value = 0;
    if (value > max) value = max;

    valueInput.value = value;
    valueSlider.value = value;

    updateImpact();
  });
});

// Slider -> input
valueSlider.addEventListener("input", () => {
  const max = Number(valueSlider.max);
  let v = Number(valueSlider.value) || 0;
  if (v < 0) v = 0;
  if (v > max) v = max;

  valueInput.value = v;
  updateImpact();
});

// Input -> slider
valueInput.addEventListener("input", () => {
  let value = Number(valueInput.value) || 0;
  const max = Number(valueSlider.max);
  if (value < 0) value = 0;
  if (value > max) value = max;

  valueInput.value = value;
  valueSlider.value = value;
  updateImpact();
});

// Save to backend
saveButton.addEventListener("click", async () => {
  statusEl.textContent = "";
  statusEl.className = "";
  saveButton.disabled = true;

  const type = getSelectedType();
  const value = Number(valueInput.value) || 0;

  try {
    const res = await fetch("/api/contribution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, value }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to save");
    }

    // Update in-memory state
    state.current = data.current;

    // Format timestamp for toast
    const savedAt = data.current.savedAt
      ? new Date(data.current.savedAt)
      : new Date();

    const dateString = savedAt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const timeString = savedAt.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Update "current setting" line
    currentSettingDisplay.textContent =
      data.current.type === "percent"
        ? `${data.current.value}% of each paycheck`
        : formatMoney(data.current.value) + " per paycheck";

    // Success toast with time
    statusEl.textContent = `Your contribution setting was saved on ${dateString} at ${timeString}.`;
    statusEl.className = "success";
  } catch (err) {
    console.error(err);
    statusEl.textContent =
      "Something went wrong while saving. Please try again.";
    statusEl.className = "error";
  } finally {
    saveButton.disabled = false;
  }
});

// Kick things off
loadData();
