# 1. Use a lightweight Alpine-based Node image for crash resilience and low memory usage
FROM node:20-alpine

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy only package files first to leverage Docker layer caching
COPY package*.json ./

# 4. Install only production dependencies (Pro-level DevOps move)
RUN npm ci --only=production

# 5. Copy the rest of the application code
COPY . .

# 6. Ensure environment variables can be externally configured
# The application will use this if no external ENV is passed
ENV PORT=3000
ENV NODE_ENV=production

# 7. Expose only the strictly required port for the backend
EXPOSE 3000

# 8. Start the Express server
CMD ["node", "server.js"]