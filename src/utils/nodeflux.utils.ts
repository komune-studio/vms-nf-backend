import request from "./api.utils";

export default class Nodeflux {

    static async createKeyspace() {

        let endpoint = process.env.NODEFLUX_API_URL;
        let keyspace = process.env.NODEFLUX_KEYSPACE;

        if (!endpoint) return null;
        endpoint = `${endpoint}/face/keyspace`;

        let body = {
            keyspace
        };

        try {
            return await request(endpoint, "POST", body);
        } catch (e) {
            throw e;
        }
    }

    static async enrollEmployeeFace(id : number, image : string) {

        let endpoint = process.env.NODEFLUX_API_URL;
        let keyspace = process.env.NODEFLUX_KEYSPACE;

        if (!endpoint) return null;
        endpoint = `${endpoint}/face/enrollment`;

        let body = {
            image, keyspace,
            "additional_params": {
                "face_id": id.toString()
            }
        }

        try {
            return await request(endpoint, "POST", body);
        } catch (e) {
            throw e;
        }

    }

    static async executeFaceRecognition(image : string) {

        let endpoint = process.env.NODEFLUX_API_URL;
        let keyspace = process.env.NODEFLUX_KEYSPACE;

        if (!endpoint) return null;
        endpoint = `${endpoint}/face/recognition`;

        let body = {
            keyspace,
            image: `${image}`
        };

        try {
            return await request(endpoint, "POST", body);
        } catch (e) {
            throw e;
        }
    }
}
