import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const customizedForms = prisma.customized_forms;

export default class CustomizedFormDao {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS customized_forms (
            id SERIAL PRIMARY KEY,
            type VARCHAR(100) NOT NULL UNIQUE,
            fields VARCHAR(100)[] NOT NULL default '{}'
        );`
    }

    static async getAll() {
        return customizedForms.findMany({
            select: {
                id: true,
               type: true,
                fields: true
            }
        });
    }

    static async getOne(id : number) {
        return customizedForms.findUnique({
            where: {
                id: id
            }
        });
    }

    static async create(obj : any) {
        return customizedForms.create({
            data: obj
        });
    }

    static async update(id: number, data : any) {
        return customizedForms.update({
            where: {
                id
            }, data
        });
    }

    static async delete(id : number) {
        return customizedForms.delete({
            where: {
                id
            }
        })
    }
}
