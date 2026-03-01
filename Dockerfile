FROM node:20-alpine

WORKDIR /app

# Instalar dependências de build se necessário
RUN apk add --no-cache python3 make g++ sqlite

COPY package*.json ./
RUN npm install

COPY . .

# Permissões pro SQLite e porta
RUN mkdir -p /app/data && mkdir -p /app/server/uploads && chown -R node:node /app/data /app/server/uploads

ENV PORT=80
ENV DB_PATH=/app/data/sp_system.db
EXPOSE 80

CMD ["npm", "start"]
