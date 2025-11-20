# 401(k) Contribution App

This project is a simple full-stack web application that lets a user view and adjust their 401(k) contribution settings. It includes:

- A single-page web UI for managing contribution type and amount.
- A lightweight Node.js/Express backend that stores the current settings and provides mock account data for display and projections.

Everything runs locally with no external services.

---

## Features

### Core User Flows

- **Select contribution type**
  - Percentage of paycheck (e.g., 6% of each paycheck)
  - Fixed dollar amount per paycheck (e.g., $300 per paycheck)

- **Adjust contribution amount**
  - Number input for precise adjustment
  - Slider for quick adjustment
  - UI automatically adapts to percentage vs dollar mode

- **Display key account data (mocked)**
  - Annual salary
  - Paychecks per year
  - Year-to-date (YTD) 401(k) contributions
  - Current saved contribution setting

- **Show simple retirement impact**
  - Estimates the future value of contributions at retirement age
  - Shows the impact of a small increase:
    - +1% of pay (for percentage mode), or
    - +$100 per paycheck (for dollar mode)
  - Uses a basic compound-interest projection with configurable assumptions in the backend

- **Persist contribution settings**
  - The contribution type and value are sent to the backend via `POST /api/contribution`
  - The backend persists the settings to a JSON file
  - On page load, the frontend calls `GET /api/contribution` and initializes the UI from the stored value

---

## Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Storage:** Local JSON file (`data/contribution.json`)
- **Runtime:** Runs entirely on localhost with no third-party services

---

## Project Structure

```text
401k-contribution-app/
├─ package.json
├─ server.js
├─ data/
│  └─ contribution.json
└─ public/
   ├─ index.html
   └─ app.js
