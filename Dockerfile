# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install app dependencies for production
# Use 'npm ci' for faster, more reliable installs in CI/CD environments
RUN npm ci --only=production

# Copy the rest of the application code
# The .dockerignore file will prevent unnecessary files from being copied
COPY . .

# The app binds to port 3000 by default
EXPOSE 3000

# Command to run the application
CMD [ "node", "server/index.js" ]
