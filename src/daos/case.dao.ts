import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const cases = prisma.cases;

export default class CaseDao {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS cases (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            deleted_at TIMESTAMPTZ
        );`
    }

    static async getAll() {
        return cases.findMany({
            where: {
                deleted_at: null
            }
        });
    }

    static async create(obj : any) {
        return cases.create({
            data: obj
        });
    }

    static async update(id: number, data : any) {
        return cases.update({
            where: {
                id
            }, data
        });
    }

    static async getById(id : number) {
        return cases.findFirst({
            select: {
                name: true
            },
            where: {
                id: {equals: id},
                deleted_at: null
            }
        });
    }
}
