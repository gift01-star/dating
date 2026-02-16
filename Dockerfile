FROM node:18-alpine

WORKDIR /app

# Copy backend package.json
COPY backend/package*.json ./backend/

# Install backend dependencies
RUN cd backend && npm install

# Copy all backend code
COPY backend ./backend

EXPOSE 5000

# Run backend server
CMD ["node", "backend/server.js"]
