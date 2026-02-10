# Automated End-to-End Testing 🎭

This directory contains a robust **Playwright** test suite for **My Karaoke Party**, designed to simulate real-world environments with multiple simultaneous users (Host, Guest, and Player).

## 🧪 Available Tests

The suite is divided into specialized test files to cover different aspects of the application:

* **`core-flow.spec.ts`**: A comprehensive "Happy Path" lifecycle. It verifies host creation, guest joining with tour walkthroughs, adding songs, and basic party interactions.
* **`queue-fairness.spec.ts`**: Focuses on the "Fair Queue" algorithm. It verifies that songs from different users are interleaved correctly and that manual reordering or deletions do not break the rotation.
* **`load-test.spec.ts`**: A backend-focused stress test. It uses direct tRPC API injection to rapidly add a large volume of songs across multiple users to stress the server and database without UI overhead.

## 📂 Artifacts & Reporting

Every test run creates a **single, unique timestamped folder** to prevent file clutter.

**Directory Pattern**: `playwright-report/run-YYYY-MM-DD-HH-mm/`

Inside this folder, you will find:

* 📄 **`report/index.html`**: Full HTML test report.
* 🎥 **`videos/`**: Screen recordings of the sessions (Host, Guest, and Player).
* 📸 **`screenshots/`**: Snapshots taken at key verification moments.
* 🔍 **`trace/`**: Debug traces for detailed failure analysis.

## 🚀 How to Run

Tests are executed via a wrapper script that manages Docker Compose, environment variables, and specific test selection.

### Execution Script: `run-test.sh`

The script allows passing configuration files and specific tests as arguments.

**Command Syntax**:

```bash
bash tests/run-test.sh --env <file> --test <filename> [--url <url>] [--token <token>]

```

#### Common Examples:

* **Run Core Flow using production settings**:
```bash
bash tests/run-test.sh --env .env.production --test core-flow.spec.ts

```


* **Run Backend Load Test with a URL override**:
```bash
bash tests/run-test.sh --env .env.example --test load-test.spec.ts --url https://my-karaoke.party

```


* **Run Queue Fairness using local settings**:
```bash
bash tests/run-test.sh --env .env --test queue-fairness.spec.ts

```



## ⚙️ Configuration

The test suite relies on the following key environment variables, which can be provided in the `--env` file or via command-line overrides:

* **`BASE_URL`**: The full URL of the application (e.g., `https://mykaraoke.party`).
* **`ADMIN_TOKEN`**: The password required to create and manage parties.

## 🛡️ Safety & Cleanup

These tests are safe for production environments. Every run creates a uniquely named party, and the `afterAll` hook automatically calls a secure API endpoint (`DELETE /api/admin/party/delete`) to remove only the data created during that specific test.
