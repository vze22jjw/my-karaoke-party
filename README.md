# My Karaoke Party 🎤

![image](https://github.com/user-attachments/assets/45a1f009-d93a-487f-ada7-2b79b60dc416)

A web app for hosting YouTube-based karaoke parties. Guests can join via a QR code or link to search for songs and add them to a real-time, shared queue.

## Project Screenshots

### Joining a Party
Guests can join by entering a unique 4-letter party code or by browsing a list of active parties.

![Playlist and Now Playing Screen](docs/images/party4.png)
*The streamlined Join Screen with options to enter a code manually or browse active sessions.*

![Add Songs](docs/images/party3.png)
*Add Songs Links to Sing To.*

### Singers & Applause
See who is singing next and interact with the performance in real-time.

![Singers Tab](docs/images/party2.png.png)
*The Singers tab displays the queue and current performer. Note the new "Applause" button centered in the header!*

![Applause Page](docs/images/party1.png)
*The dedicated Applause Page. Guests can tap this button repeatedly to send real-time applause and boost the singer's score!*

---

## Features

Features

🎉 Host a Party: Create a new karaoke party with a unique 4-character code.

📱 Join as a Guest: Guests can join via a simple link or QR code, with no app install required.

📺 TV/Player Mode: A dedicated player view (/player/[hash]) designed for a main screen or TV.

Security Note: When connecting manually to the player from the start page, the host must enter the 4-digit party code backwards (e.g., enter DCBA for party ABCD).

🔐 Host Controls: A password-protected host page (/host/[hash]) to manage the party.

🔍 YouTube Search: Search for any karaoke video on YouTube.

📋 Shared Queue: Songs are added to a real-time queue, visible to all guests.

⚖️ Fairness Mode: The queue automatically sorts by "fairness" to ensure everyone gets a turn and prevent singers from going back-to-back. (Can be toggled off by the host).

🎶 Song Suggestions:

Host Themes: The host can add custom theme suggestions (e.g., "80s Night").

Spotify Trends: Guests see a list of "Hot Karaoke From Spotify" for inspiration (configurable by the host).

Top Played: The queue shows the all-time most-played songs for the whole app.

🆔 Spotify Song Matching:

Automatically matches added YouTube videos to their Spotify track ID.

Aggregates "Top Played" stats by song, not by individual video.

Allows hosts to export a list of Spotify URIs to instantly create a playlist.

💬 Idle Screen Messages: Hosts can create a library of messages (quotes, lyrics, announcements) to display on the player screen when no music is playing.

⏯️ Playback Controls: Host can play, pause, and skip the current song.

💾 Backup & Restore: Save your party data to a JSON file and restore it later (or move it to another server).

🐳 Docker Ready: Fully containerized for easy deployment.

## 🌍 Internationalization (i18n)

The application supports multiple languages (currently English and Portuguese).

* **Auto-Detection:** The app attempts to detect the user's browser language automatically.
* **Manual Toggle:** A language switcher is available in the footer of every page (except the Player view).
* **Configuration:**
    * Set default language: `NEXT_PUBLIC_DEFAULT_LOCALE=en` (in `.env`)
    * Hide/Show footer toggle: `NEXT_PUBLIC_SHOW_FOOTER=true` (in `.env`)

💻 100% Cross-Platform: Works on Windows, Linux, and macOS for development and hosting.

💾 Data Retention & Storage

This application is designed to keep your party history forever. The automatic cleanup jobs have been disabled.

Why?
The data footprint of this application is extremely small. Since we only store text metadata (YouTube links, song titles, singer names) and not the actual video/audio files, the database grows very slowly.

The Math:
A typical party with 20 singers performing 6 songs each takes up approximately ~92 KB of database space.
Even on a free-tier database (e.g., 256 MB limit), you would need to host:

~2,700 Parties

Or host a monthly party for 225 Years

...before running out of space. Keeping the data allows you to maintain "All-Time" stats, leaderboards, and memories without cost concerns.

📦 Backup & Restore

Found in the Settings tab of the Host Controls.

Backup: Downloads a .json file containing all parties, singers, songs, and idle messages currently in the database.

Restore: Upload a previously saved .json file. The system will restore any parties that do not currently exist in the database (it skips duplicates based on the Party Hash).

This feature is useful for migrating data between servers or keeping local archives.

## Stack

Based on [T3 App](https://create.t3.gg/)

- **Next.js 14** - React framework
- **PostgreSQL** - Database
- **Prisma ORM** - Database toolkit
- **Tailwind CSS** - Styling
- **tRPC** - Type-safe APIs
- **Socket.io** - Real-time queue and playback synchronization
- **Spotify API** - For song matching and suggestions

## Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Docker (for PostgreSQL)

### Quick Start

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/flaviokosta79/my-karaoke-party.git](https://github.com/flaviokosta79/my-karaoke-party.git)
    cd my-karaoke-party
    ```

2.  **Install dependencies**
    ```bash
    pnpm install
    ```

3.  **Setup environment variables**
    ```bash
    cp .env.example .env
    ```

    Edit `.env` and fill in:
    - `DATABASE_URL` - PostgreSQL connection string
    - `YOUTUBE_API_KEY` - YouTube Data API v3 key
    - `ADMIN_TOKEN` - A password of your choice to protect host pages.
    - `SPOTIFY_CLIENT_ID` (Optional) - For Spotify features
    - `SPOTIFY_CLIENT_SECRET` (Optional) - For Spotify features

4.  **Start everything with one command** 🚀

    **Windows (PowerShell):**
    ```powershell
    pnpm dev:full
    ```

    **Linux/macOS:**
    ```bash
    pnpm dev:full:sh
    ```

    This will automatically:
    - ✅ Start PostgreSQL in Docker
    - ✅ Sync database schema
    - ✅ Start the development server

5.  **Open your browser**
    Navigate to `http://localhost:3000`

> 📝 **Tip:** Check [SCRIPTS.md](SCRIPTS.md) for more details about the development scripts

### Important Notes

- ✅ **Real-time with Sockets!** The app uses Socket.io for all real-time events.
- ✅ **Works on Windows!** 100% cross-platform compatible
- ⚡ Playlist, playback, and settings update instantly.
- 🐳 **Docker ready!** Deploy with Traefik + Portainer
- 🔒 **Auto SSL!** Let's Encrypt integration via Traefik

## Production Deployment

### Deploy with Docker + Traefik + Portainer

For production deployment on your own VPS with Traefik reverse proxy:

📖 **[Complete Traefik + Portainer Guide](doc/DEPLOY-TRAEFIK-PORTAINER.md)**

Quick overview:
- ✅ Traefik reverse proxy with automatic SSL
- ✅ Portainer for container management
- ✅ Multi-domain support
- ✅ Auto cleanup cron job
- ✅ Zero downtime updates

### Alternative: Deploy without Docker

For native deployment on Ubuntu VPS:

📖 **[Ubuntu VPS Deployment Guide](doc/DEPLOY-VPS-UBUNTU.md)**

## Admin Commands

### Cleanup All Parties

Delete all parties from the system:

```bash
# Preview (shows what would be deleted)
pnpm cleanup:all

# Delete all parties (with confirmation)
pnpm cleanup:all --confirm
