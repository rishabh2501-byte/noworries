FROM mcr.microsoft.com/playwright:v1.41.2-jammy

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
