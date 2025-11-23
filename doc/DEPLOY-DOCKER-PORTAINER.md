# Deploy with Docker & Portainer / Deploy com Docker e Portainer

<details open>
<summary>🇬🇧 English</summary>

## Prerequisites
* A server with Docker and Docker Compose installed.
* Portainer (optional but recommended for management).
* A valid domain (CNAME) pointing to your server.

## Environment Variables
Create a stack in Portainer using the `docker-compose.yml` file. You MUST set the following environment variables for the app to function correctly:

```env
DATABASE_URL=postgresql://user:pass@db:5432/mykaraoke
NEXT_PUBLIC_APP_URL=[https://your-domain.com](https://your-domain.com)  <-- REQUIRED for Applause Feature
NEXT_PUBLIC_APPLAUSE_SOUND_CDN_URL=/sounds/applause.mp3 (Optional: Custom sound URL)
EVENT_DEBUG=false
