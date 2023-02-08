import request from "./api.utils";

export default class IdentifAI {

    private static async generateKey() {

        let endpoint = process.env.IDENTIFAI_API_URL;
    
        if (!endpoint) return null;
    
        endpoint = `${endpoint}/public/auth/v1/signatures`
        const accessKey = process.env.IDENTIFAI_ACCESS_KEY;
        const secretKey = process.env.IDENTIFAI_SECRET_KEY;
    
        let body = {
            access_key: accessKey,
            secret_key: secretKey
        }

        console.log(body)

        try {

            let result : any = await request(endpoint, "POST", body);
            console.log(result)
            let date = result.headers["x-nodeflux-timestamp"].split("T")[0];

            let authorizationKey = `NODEFLUX-HMAC-SHA256 Credential=${accessKey}/${date}/nodeflux.api.v1beta1.ImageAnalytic/StreamImageAnalytic, SignedHeaders=x-nodeflux-timestamp, Signature=${result.token}`
            let timestamp = result.headers["x-nodeflux-timestamp"];

            return {authorizationKey, timestamp}

        } catch (e) {
            throw e;
        }
    }

    static async executeOCR(image : string, mimetype : string) {

        let endpoint = process.env.IDENTIFAI_API_URL;
    
        if (!endpoint) return null;

        let generated = await this.generateKey()

        endpoint = `${endpoint}/syncv2/analytics/ocr-ktp`;

        let body = {
            images: [
                `data:${mimetype};base64,${image}`
            ]
        };

        let additionalHeaders = {
            Authorization: generated?.authorizationKey,
            "x-nodeflux-timestamp": generated?.timestamp
        }
        
        try {
            return await request(endpoint, "POST", body, additionalHeaders);
        } catch (e) {
            throw e;
        }
    }
    
}