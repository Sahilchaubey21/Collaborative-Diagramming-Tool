FROM node:20-alpine
WORKDIR /app
COPY package.json ./
# COPY package-lock.json ./  # Removed because file may not exist
RUN npm install
COPY public ./public
COPY src ./src
CMD ["npm", "start"]
