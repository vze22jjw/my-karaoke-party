**Updates:** Mentioned the socket path requirement for Traefik.

````markdown
# Traefik Deployment / Deploy com Traefik

<details open>
<summary>🇬🇧 English</summary>

When deploying behind Traefik, you must ensure WebSocket headers are forwarded correctly.

## Labels Configuration
Add these labels to your `docker-compose.yml` service:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.karaoke.rule=Host(`karaoke.yourdomain.com`)"
  - "traefik.http.services.karaoke.loadbalancer.server.port=3000"
  # Critical for Socket.io
  - "traefik.http.middlewares.sslheader.headers.customrequestheaders.X-Forwarded-Proto=https"
  