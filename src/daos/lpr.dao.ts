import PrismaService from "../services/prisma.service";
import request from "../utils/api.utils";

const prisma = PrismaService.getVisionaire();
const admins = prisma.admin;

export default class LprDAO {
    static async licensePlateRecognition(image : string) {
        try {
            let result = await request(`${process.env.NF_LPR_API_URL}/license-plate-recognition`, 'POST', {images: [image]});

            return result
        } catch (e) {
            throw(e);
        }
    }
}
