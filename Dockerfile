FROM node:20-alpine

WORKDIR /app

# Instalar dependências de build se necessário
RUN apk add --no-cache python3 make g++ sqlite

COPY package*.json ./
RUN npm install

COPY . .

# Permissões pro SQLite e porta
RUN mkdir -p /app/data && chown -R node:node /app/data

ENV PORT=80
EXPOSE 80

CMD ["npm", "start"]
