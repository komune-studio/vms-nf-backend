import * as crypto from "crypto";
const md5 = require('md5');
enum Algorithm {
    SHA1,
    SHA256,
    SHA512
}

export default class SecurityUtils {
    static generateSalt() {
        return crypto.randomBytes(24).toString("base64");
    }

    static generatePassword(password : string, salt : string, algorithm : Algorithm = Algorithm.SHA1) {
        let str = salt + password;

        if (algorithm === Algorithm.SHA1) {
            return crypto.createHash('sha1').update(str).digest("hex");
        }
        else if (algorithm === Algorithm.SHA256) {
            return crypto.createHash('sha256').update(str).digest("base64url");
        }
        else if (algorithm === Algorithm.SHA512) {
            return crypto.createHash('sha512').update(str).digest("base64url");
        }
        else {
            return "";
        }
    }

    static comparePassword(savedHash : string, password : string, salt : string) {
        let loginHash = this.generatePassword(password, salt);
        return loginHash === savedHash;
    }

    // generate guaranteed unique id
    static generateId() {
        return crypto.randomBytes(32).toString("hex");
    }

    static generatePublicKey() {
        let {publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        publicKey = publicKey.replace(/\n/g, "").replace("-----BEGIN PUBLIC KEY-----", "").replace("-----END PUBLIC KEY-----", "")

        return publicKey
    }

    static generateMd5(str : string | undefined) {
        return md5(str)
    }
}
