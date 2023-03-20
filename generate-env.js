const fs = require('fs');

const env = {
    DATABASE_URL_NFV4_WITH_SCHEMA: `postgresql://postgres:nfvisionaire123@${process.env.SERVER_PORT}:${process.env.DB_PORT}/nfv4`,
    DATABASE_URL_NFVISIONAIRE_WITH_SCHEMA: `postgresql://postgres:nfvisionaire123@${process.env.SERVER_PORT}:${process.env.DB_PORT}/nfvisionaire`
}

let fileContent = '';

Object.keys(env).forEach(key => {
    fileContent += `${key}=${env[key]}\n`
})

fs.writeFileSync('.env', fileContent);
