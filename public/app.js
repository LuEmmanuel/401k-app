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

  // Set radio buttons
  for (const r of typeRadios) {
    r.checked = r.value === current.type;
  }

  // Adjust labels and slider limits for current type
  syncTypeLabels(current.type);

  // Set inputs
  valueInput.value = current.value;
  valueSlider.value =
    current.type === "percent"
      ? current.value
      : Math.min(current.value, Number(valueSlider.max));

  // Snapshot stats
  salaryDisplay.textContent = formatMoney(salary);
  payFreqDisplay.textContent = String(payFrequencyPerYear);
  ytdDisplay.textContent = formatMoney(ytdContributions);
  currentSettingDisplay.textContent =
    current.type === "percent"
      ? `${current.value}% of each paycheck`
      : formatMoney(current.value) + " per paycheck";

  // Pills
  agePill.textContent = `Age (mock): ${state.age}`;
  retirementPill.textContent = `Retirement age: ${state.retirementAge}`;
  assumptionPill.textContent = `Assumed return: ${(
    state.assumedAnnualReturnRate * 100
  ).toFixed(1)}% / year`;

  updateImpact();
}

function getSelectedType() {
  for (const r of typeRadios) {
    if (r.checked) return r.value;
  }
  return "percent";
}

function syncTypeLabels(type) {
  if (type === "percent") {
    valueLabel.textContent = "Contribution (% of paycheck)";
    valueSuffix.textContent = "%";
    valueInput.step = "0.5";
    valueSlider.max = "30";
  } else {
    valueLabel.textContent = "Contribution ($ per paycheck)";
    valueSuffix.textContent = "$";
    valueInput.step = "50";
    valueSlider.max = "5000";
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
    syncTypeLabels(type);

    // Clamp value and sync slider based on type
    if (type === "percent") {
      valueSlider.max = "30";
      if (Number(valueInput.value) > 30) valueInput.value = 30;
    } else {
      valueSlider.max = "5000";
    }

    valueSlider.value = valueInput.value || 0;
    updateImpact();
  });
});

// Slider -> input
valueSlider.addEventListener("input", () => {
  valueInput.value = valueSlider.value;
  updateImpact();
});

// Input -> slider
valueInput.addEventListener("input", () => {
  const value = Number(valueInput.value) || 0;
  const max = Number(valueSlider.max);
  valueSlider.value = Math.min(Math.max(0, value), max);
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

    statusEl.textContent = "Your contribution setting has been saved.";
    statusEl.className = "success";

    // Update in-memory state & display
    state.current = data.current;
    currentSettingDisplay.textContent =
      data.current.type === "percent"
        ? `${data.current.value}% of each paycheck`
        : formatMoney(data.current.value) + " per paycheck";
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
