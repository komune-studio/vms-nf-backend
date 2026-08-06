FROM node:20

ENV TZ="Asia/Jakarta"

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# 🔥 generate semua prisma di container
RUN npx prisma generate --schema=prisma/nfv4.prisma
RUN npx prisma generate --schema=prisma/nfvisionaire.prisma
RUN npx prisma generate --schema=prisma-face/schema.prisma

CMD sh -c "node generate-env.js && npm start"