import PrismaService from "../services/prisma.service";

const admins = PrismaService.getInstance().admin;

export default class AdminDAO {
    static async getByEmail(email : string) {
        return admins.findFirst({
            where: {email}
        });
    }

    static async getAll() {
        return admins.findMany({
            select: {
                id: true,
                email: true,
                created_at: true,
                modified_at: true,
            }
        });
    }

    static async create(obj : any) {
        return admins.create({
            data: obj
        });
    }
}