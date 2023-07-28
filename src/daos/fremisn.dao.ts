import PrismaService from "../services/prisma.service";
import request from "../utils/api.utils";

const prisma = PrismaService.getVisionaire();
const admins = prisma.admin;

export default class FremisnDAO {
    static async createKeyspace(keyspace : string) {
        try {
            let result = await request(`${process.env.NF_FREMISN_API_URL}/face/keyspace`, 'POST', {keyspace});

            return result
        } catch (e) {
            throw(e);
        }
    }

    static async faceEnrollment(keyspace : string, image : string) {
        try {
            let result = await request(`${process.env.NF_FREMISN_API_URL}/face/enrollment`, 'POST', {keyspace, image});

            return result
        } catch (e) {
            throw(e);
        }
    }

    static async faceRecognition(keyspace : string, image : string, candidateCount : number) {
        try {
            let result = await request(`${process.env.NF_FREMISN_API_URL}/face/recognition`, 'POST', {keyspace, image, additional_params: {candidateCount}});

            return result
        } catch (e) {
            throw(e);
        }
    }
}
