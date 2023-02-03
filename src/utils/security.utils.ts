import * as crypto from "crypto";

enum Algorithm {
    SHA1,
    SHA256,
    SHA512
}

export default class SecurityUtils {
    static generateSalt() {
        return crypto.randomBytes(24).toString("base64url");
    }

    static generatePassword(password : string, salt : string, algorithm : Algorithm = Algorithm.SHA512) {
        let str = salt + password;

        if (algorithm === Algorithm.SHA1) {
            return crypto.createHash('sha1').update(str).digest("base64url");
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
}