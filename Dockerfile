FROM node:20-alpine

RUN apk add --no-cache python3 py3-pip curl

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p secrets logs

EXPOSE ${PORT:-3000}

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/api/health || exit 1

CMD ["npm", "start"]
