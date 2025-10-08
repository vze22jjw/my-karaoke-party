# 🚀 Scripts de Desenvolvimento

Este projeto inclui scripts para facilitar o início do ambiente de desenvolvimento.

## Scripts Disponíveis

### Windows (PowerShell)

```powershell
# Inicia banco de dados + servidor de desenvolvimento
.\start-dev.ps1

# OU usando pnpm
pnpm dev:full
```

### Linux/macOS (Bash)

```bash
# Inicia banco de dados + servidor de desenvolvimento
./start-dev.sh

# OU usando pnpm
pnpm dev:full:sh
```

## O que os scripts fazem?

1. ✅ Verificam se o Docker está instalado
2. ✅ Verificam se o arquivo `.env` existe
3. 🐘 Iniciam o banco de dados PostgreSQL no Docker
   - Se o container não existir, cria um novo
   - Se o container existir mas estiver parado, inicia ele
   - Se já estiver rodando, apenas continua
4. 📊 Sincronizam o schema do Prisma com o banco de dados
5. 🚀 Iniciam o servidor de desenvolvimento Next.js

## Primeira vez rodando?

1. **Instale as dependências:**
   ```bash
   pnpm install
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   # Edite o .env e adicione sua YOUTUBE_API_KEY
   ```

3. **Inicie tudo:**
   ```bash
   # Windows
   pnpm dev:full

   # Linux/macOS
   pnpm dev:full:sh
   ```

4. **Acesse o app:**
   - Abra http://localhost:3000

## Parando os serviços

- **Servidor de desenvolvimento:** Pressione `Ctrl+C` no terminal
- **Banco de dados:**
  ```bash
  docker stop karaokeparty-t3-postgres
  ```

## Comandos úteis

```bash
# Apenas o servidor (sem iniciar o banco)
pnpm dev

# Apenas o banco de dados
docker start karaokeparty-t3-postgres

# Ver logs do banco de dados
docker logs karaokeparty-t3-postgres -f

# Parar o banco de dados
docker stop karaokeparty-t3-postgres

# Remover o banco de dados (cuidado: apaga os dados!)
docker rm karaokeparty-t3-postgres

# Abrir Prisma Studio (interface visual do banco)
pnpm db:studio
```

## Solução de Problemas

### Erro: "Docker não está instalado"
- **Windows:** Instale o [Docker Desktop](https://docs.docker.com/desktop/install/windows-install/)
- **Linux:** Siga o [guia oficial](https://docs.docker.com/engine/install/)
- **macOS:** Instale o [Docker Desktop](https://docs.docker.com/desktop/install/mac-install/)

### Erro: "Arquivo .env não encontrado"
```bash
cp .env.example .env
# Edite o arquivo e adicione suas variáveis de ambiente
```

### Porta 5432 já em uso
Outro serviço está usando a porta do PostgreSQL. Opções:
1. Pare o outro serviço PostgreSQL
2. Ou edite `start-dev.ps1`/`start-dev.sh` para usar outra porta

### Banco de dados não conecta
```bash
# Verifique se o container está rodando
docker ps

# Veja os logs do container
docker logs karaokeparty-t3-postgres

# Reinicie o container
docker restart karaokeparty-t3-postgres
```
