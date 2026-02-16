FROM node:18-alpine

# Install Chromium for Playwright
RUN apk add --no-cache chromium \
    && npx playwright install chromium --with-deps

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
