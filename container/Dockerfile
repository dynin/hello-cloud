FROM node:22
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
USER node
COPY --chown=node:node . .
EXPOSE 6868
CMD [ "node", "server/main.js" ]
