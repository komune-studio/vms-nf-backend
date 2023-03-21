import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const admins = prisma.admin;

export default class AdminDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS admin (
            id SERIAL PRIMARY KEY,
            email VARCHAR(32) NOT NULL UNIQUE,
            name VARCHAR(32) NOT NULL,
            password VARCHAR(86) NOT NULL,
            salt VARCHAR(32) NOT NULL,
            role VARCHAR(10) NOT NULL,
            site_access BIGINT[],
            created_at TIMESTAMPTZ DEFAULT NOW(),
            modified_at TIMESTAMPTZ DEFAULT NOW(),
            active BOOLEAN DEFAULT true
        );`
    }

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
