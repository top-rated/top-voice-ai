# Use an official Node.js runtime as a parent image (LTS version, Alpine for smaller size)
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
# This allows Docker to cache the npm install step if these files haven't changed
COPY package*.json ./

# Install production dependencies
# --omit=dev ensures that devDependencies are not installed
RUN npm install --omit=dev

# Copy the rest of the application source code into the container
# It's good practice to have a .dockerignore file to exclude unnecessary files (e.g., node_modules, .git)
COPY . .

# Your application's main entry point is src/index.js, and it likely runs on a port.
# Express applications commonly use port 3000. If your app uses a different port,
# please adjust this value accordingly.
EXPOSE 3000

# Define the command to run the application using the start script from package.json
CMD [ "npm", "start" ]
