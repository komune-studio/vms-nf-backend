const fs = require('fs');

const env = {
    DATABASE_URL_NFV4_WITH_SCHEMA: `postgresql://postgres:nfvisionaire123@${process.env.SERVER_PORT}:${process.env.DB_PORT}/nfv4`,
    DATABASE_URL_NFVISIONAIRE_WITH_SCHEMA: `postgresql://postgres:nfvisionaire123@${process.env.SERVER_PORT}:${process.env.DB_PORT}/nfvisionaire`,
    NF_IP: process.env.NF_IP,
    VANILLA_PORT: process.env.VANILLA_PORT,
    VISIONAIRE_PORT: process.env.VISIONAIRE_PORT,
    NF_VISIONAIRE_API_URL: `=http://${process.env.NF_IP}:${process.env.VISIONAIRE_PORT}`,
    NF_VANILLA_API_URL: `http://${process.env.NF_IP}:${process.env.VANILLA_PORT}/api`,
    NF_FREMISN_API_URL: `http://${process.env.NF_IP}:${process.env.FREMISN_PORT}/v1`,
}

if(process.env.SECRET_KEY) {
    env.SECRET_KEY = `"aHsJ09wtn0286735384h.jHF42hynwMntgY"`
}

let fileContent = '';

Object.keys(env).forEach(key => {
    fileContent += `${key}=${env[key]}\n`
})

fs.writeFileSync('.env', fileContent);
