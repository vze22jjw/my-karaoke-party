# My Karaoke Party 🎤

![image](https://github.com/user-attachments/assets/45a1f009-d93a-487f-ada7-2b79b60dc416)

A web app for hosting YouTube-based karaoke parties. Guests can join via a QR code or link to search for songs and add them to a real-time, shared queue.

## Features

- 🎉 **Host a Party**: Create a new karaoke party with a unique 4-character code.
- 📱 **Join as a Guest**: Guests can join via a simple link or QR code, with no app install required.
- 📺 **TV/Player Mode**: A dedicated player view (`/player/[hash]`) designed for a main screen or TV.
- 🔐 **Host Controls**: A password-protected host page (`/host/[hash]`) to manage the party.
- 🔍 **YouTube Search**: Search for any karaoke video on YouTube.
- 📋 **Shared Queue**: Songs are added to a real-time queue, visible to all guests.
- ⚖️ **Fairness Mode**: The queue automatically sorts by "fairness" to ensure everyone gets a turn and prevent singers from going back-to-back. (Can be toggled off by the host).
- 🎶 **Song Suggestions**:
    - **Host Themes**: The host can add custom theme suggestions (e.g., "80s Night").
    - **Spotify Trends**: Guests see a list of "Hot Karaoke From Spotify" for inspiration (configurable by the host).
    - **Top Played**: The queue shows the all-time most-played songs for the whole app.
- 🆔 **Spotify Song Matching**:
    - Automatically matches added YouTube videos to their Spotify track ID.
    - Aggregates "Top Played" stats by song, not by individual video (e.g., "Bohemian Rhapsody - Official" and "Bohemian Rhapsody - Lyrics" count as one song).
    - Allows hosts to export a list of Spotify URIs to instantly create a playlist.
- 💬 **Idle Screen Messages**: Hosts can create a library of messages (quotes, lyrics, announcements) to display on the player screen when no music is playing.
- ⏯️ **Playback Controls**: Host can play, pause, and skip the current song.
- 🧹 **Auto-Cleanup**: Parties are automatically deleted after a period of inactivity to save resources.
- 🐳 **Docker Ready**: Fully containerized for easy deployment.
- 💻 **100% Cross-Platform**: Works on Windows, Linux, and macOS for development and hosting.

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
