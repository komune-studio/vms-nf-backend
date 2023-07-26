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
}
