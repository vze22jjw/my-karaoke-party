# My Karaoke Party 🎤

![image](https://github.com/user-attachments/assets/45a1f009-d93a-487f-ada7-2b79b60dc416)

YouTube-based karaoke party web app with remote searching and queuing from QR code.

**[🇧🇷 Versão em Português](#versão-em-português)**

## Features

- 🎉 Host a karaoke party
- 📱 Join existing party via link or QR code
- 🔍 Search karaoke videos on YouTube
- 📋 Add videos to the party queue
- ⚖️ Queue sorted by "fairness" to avoid mic hogs
- 🔄 Real-time updates via REST API polling
- 💻 100% cross-platform compatible (Windows, Linux, macOS)

## Stack

Based on [T3 App](https://create.t3.gg/)

- **Next.js 14** - React framework
- **PostgreSQL** - Database
- **Prisma ORM** - Database toolkit
- **Tailwind CSS** - Styling
- **tRPC** - Type-safe APIs
- **REST API** - Playlist management with polling

## Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Docker (for PostgreSQL)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/flaviokosta79/my-karaoke-party.git
   cd my-karaoke-party
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in:
   - `DATABASE_URL` - PostgreSQL connection string
   - `YOUTUBE_API_KEY` - YouTube Data API v3 key

4. **Start PostgreSQL with Docker**
   ```bash
   docker run --name karaokeparty-postgres \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=mykaraoke_party \
     -p 5432:5432 \
     -d postgres:15
   ```

5. **Push database schema**
   ```bash
   pnpm db:push
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

### Important Notes

- ✅ **No PartyKit required!** The app now uses REST API with polling for real-time updates
- ✅ **Works on Windows!** 100% cross-platform compatible
- ⚡ Playlist updates every 3 seconds via polling
- 🔧 For production deployment, consider adding environment variable for API base URL

## Project Structure

```
my-karaoke-party/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/
│   │   │   └── playlist/       # REST API endpoints
│   │   ├── party/              # Party host interface
│   │   └── player/             # Display/player interface
│   ├── components/             # React components
│   ├── server/
│   │   ├── api/routers/        # tRPC routers
│   │   └── db.ts               # Database client
│   └── styles/                 # Global styles
├── prisma/
│   └── schema.prisma           # Database schema
└── doc/                        # Additional documentation
```

## API Endpoints

### REST API

- `GET /api/playlist/[hash]` - Get party playlist
- `POST /api/playlist/add` - Add video to playlist
- `POST /api/playlist/remove` - Remove video from playlist
- `POST /api/playlist/played` - Mark video as played

## Contribution

Contributions are welcome! Feel free to:

- 🐛 Report bugs
- 💡 Suggest new features
- 🔧 Submit pull requests

Live site: https://www.mykaraoke.party

---

# Versão em Português

## Funcionalidades

- 🎉 Crie uma festa de karaokê
- 📱 Entre em festas via link ou QR code
- 🔍 Pesquise vídeos de karaokê no YouTube
- 📋 Adicione vídeos à fila da festa
- ⚖️ Fila organizada por "justiça" para evitar monopolização do microfone
- 🔄 Atualizações em tempo real via polling REST API
- 💻 100% compatível multi-plataforma (Windows, Linux, macOS)

## Tecnologias

Baseado no [T3 App](https://create.t3.gg/)

- **Next.js 14** - Framework React
- **PostgreSQL** - Banco de dados
- **Prisma ORM** - Toolkit para banco de dados
- **Tailwind CSS** - Estilização
- **tRPC** - APIs type-safe
- **REST API** - Gerenciamento de playlist com polling

## Desenvolvimento

### Pré-requisitos

- Node.js 18+
- pnpm (recomendado) ou npm
- Docker (para PostgreSQL)

### Início Rápido

1. **Clone o repositório**
   ```bash
   git clone https://github.com/flaviokosta79/my-karaoke-party.git
   cd my-karaoke-party
   ```

2. **Instale as dependências**
   ```bash
   pnpm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env
   ```

   Edite o `.env` e preencha:
   - `DATABASE_URL` - String de conexão PostgreSQL
   - `YOUTUBE_API_KEY` - Chave da API YouTube Data v3

4. **Inicie o PostgreSQL com Docker**
   ```bash
   docker run --name karaokeparty-postgres \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=mykaraoke_party \
     -p 5432:5432 \
     -d postgres:15
   ```

5. **Sincronize o schema do banco**
   ```bash
   pnpm db:push
   ```

6. **Inicie o servidor de desenvolvimento**
   ```bash
   pnpm dev
   ```

7. **Abra seu navegador**
   Acesse `http://localhost:3000`

### Notas Importantes

- ✅ **PartyKit não é necessário!** O app agora usa REST API com polling para atualizações em tempo real
- ✅ **Funciona no Windows!** 100% compatível multi-plataforma
- ⚡ Playlist atualiza a cada 3 segundos via polling
- 🔧 Para deploy em produção, considere adicionar variável de ambiente para URL base da API

## Estrutura do Projeto

```
my-karaoke-party/
├── src/
│   ├── app/                    # Diretório do Next.js
│   │   ├── api/
│   │   │   └── playlist/       # Endpoints REST API
│   │   ├── party/              # Interface do host da festa
│   │   └── player/             # Interface do display/player
│   ├── components/             # Componentes React
│   ├── server/
│   │   ├── api/routers/        # Routers tRPC
│   │   └── db.ts               # Cliente do banco de dados
│   └── styles/                 # Estilos globais
├── prisma/
│   └── schema.prisma           # Schema do banco de dados
└── doc/                        # Documentação adicional
```

## Endpoints da API

### REST API

- `GET /api/playlist/[hash]` - Obtém a playlist da festa
- `POST /api/playlist/add` - Adiciona vídeo à playlist
- `POST /api/playlist/remove` - Remove vídeo da playlist
- `POST /api/playlist/played` - Marca vídeo como tocado

## Contribuição

Contribuições são bem-vindas! Sinta-se livre para:

- 🐛 Reportar bugs
- 💡 Sugerir novas funcionalidades
- 🔧 Enviar pull requests

Site ao vivo: https://www.mykaraoke.party

---

## License

This project is open source and available under the [MIT License](LICENSE).
