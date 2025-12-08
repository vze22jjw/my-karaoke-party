# Automated End-to-End Testing 🎭

This directory contains the robust **Playwright** test suite for **My Karaoke Party**. 
It simulates a real-world party environment with multiple simultaneous users (Host, Guest, Player) to ensure the entire flow works correctly.

---

## 🧪 What These Tests Do

The primary test suite (`core-flow.spec.ts`) runs a comprehensive "Party Lifecycle" scenario:

1.  **👑 Host (Desktop):** * Starts a new party with a unique name (e.g., "Auto Party 1234").
    * Manages playback settings.
    * Deletes songs and closes the party.
2.  **📱 Guest (Mobile):** * Joins via the party code.
    * Searches for and adds multiple songs.
    * Interacts with the Applause button.
3.  **📺 Player (TV):** * Connects to the session.
    * Verifies the "Waiting" screen, "Now Playing" video, and "Up Next" overlay.

### 🛡️ Safety & Cleanup Strategy
These tests are designed to be **safe for production**.
* **Unique Data:** Every run creates a uniquely named party.
* **Targeted Cleanup:** The test captures the specific `partyHash` it created and calls a secure API endpoint (`DELETE /api/admin/party/delete`) to remove *only* that party after the test finishes (pass or fail).

---

## 📂 Project Structure

```text
tests/
├── core-flow.spec.ts          # The main test scenario (Host + Guest + Player)
├── docker-compose.test.yml    # Docker config for the independent test runner
├── README.md                  # This documentation
└── screenshots/               # (Legacy/Fallback folder)
