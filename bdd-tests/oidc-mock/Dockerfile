FROM node:lts-alpine
WORKDIR /code
COPY package.json server.js private.pem ./
EXPOSE 8080
CMD ["npm", "start"]
