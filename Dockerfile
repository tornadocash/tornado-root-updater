FROM node:12
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn && yarn cache clean --force
COPY . .

CMD ["yarn", "start"]
