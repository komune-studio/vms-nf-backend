import PrismaService from "../services/prisma.service";

const admins = PrismaService.getInstance().admin;

export default class AdminDAO {
    static async getByEmail(email : string) {
        return admins.findFirst({
            where: {email}
        });
    }
}