import PrismaService from "../services/prisma.service";

const admins = PrismaService.getVisionaire().admin;

export default class AdminDAO {
    static async getById(id : number) {
        return admins.findFirst({
            where: {id}
        });
    }

    static async getByEmail(email : string) {
        return admins.findFirst({
            where: {email}
        });
    }

    static async getAll() {
        return admins.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                created_at: true,
                modified_at: true,
                active: true
            }
        });
    }

    static async create(obj : any) {
        return admins.create({
            data: obj
        });
    }

    static async update(id: number, data : any) {
        return admins.update({
            where: {
                id
            }, data
        });
    }

    static async delete(id : number) {
        return admins.delete({
            where: {
                id
            }
        })
    }
}
