FROM node:19

ENV TZ="Asia/Jakarta"

# node-canvas renders the charts in the PDF export. Its prebuilt binary bundles
# cairo/pango, but the font FILES come from the OS -- without them every label
# on every chart comes out blank instead of failing loudly.
RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

CMD [ "node", "generate-env.js" ]
CMD [ "npm", "start" ]
