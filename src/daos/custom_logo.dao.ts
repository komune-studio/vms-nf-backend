import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const custom_logo = prisma.custom_logo;

export default class CustomLogoDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS custom_logo (
  id SERIAL PRIMARY KEY,
  image bytea NOT NULL,
  height int NOT NULL
);`
    }

    static async create(obj: any) {
        return custom_logo.create({
            data: obj
        });
    }

    static async update(obj: any) {
        return custom_logo.update({
            where: {
                id: 1
            }, data: obj
        });
    }

    static async getAll() {
        return custom_logo.findFirst();
    }
}
