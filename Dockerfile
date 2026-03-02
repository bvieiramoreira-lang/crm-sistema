FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y sqlite3

COPY package*.json ./
RUN npm install

COPY . .

# Permissões pro SQLite e porta
RUN mkdir -p /app/data && mkdir -p /app/server/uploads && chown -R node:node /app

ENV PORT=3000
ENV DB_PATH=/app/data/sp_system.db

EXPOSE 3000

# Mudar para usuário node
USER node

CMD ["npm", "start"]
