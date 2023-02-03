import request from "./api.utils";

export default class IdentifAI {

    private static authorizationKey : string;
    private static timestamp : string;

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
        
        try {

            let result : any = await request(endpoint, "POST", body);
            let date = result.headers["x-nodeflux-timestamp"].split("T")[0];

            this.authorizationKey = `NODEFLUX-HMAC-SHA256 Credential=${accessKey}/${date}/nodeflux.api.v1beta1.ImageAnalytic/StreamImageAnalytic, SignedHeaders=x-nodeflux-timestamp, Signature=${result.token}`
            this.timestamp = result.headers["x-nodeflux-timestamp"];

            console.log(`[IdentifAI] New Authorization Key generated: ${this.authorizationKey} ${this.timestamp}`);

        } catch (e) {
            throw e;
        }
    }

    static async executeOCR(image : string, mimetype : string) {

        let endpoint = process.env.IDENTIFAI_API_URL;
    
        if (!endpoint) return null;

        if (!this.authorizationKey || !this.timestamp) {
            await this.generateKey();
        }

        endpoint = `${endpoint}/syncv2/analytics/ocr-ktp`;

        let body = {
            images: [
                `data:${mimetype};base64,${image}`
            ]
        };

        let additionalHeaders = {
            Authorization: this.authorizationKey,
            "x-nodeflux-timestamp": this.timestamp
        }
        
        try {
            let response = await request(endpoint, "POST", body, additionalHeaders);
            return response;
        } catch (e) {
            throw e;
        }
    }
    
}