import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();

export default class CasesDao {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS cases (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            deleted_at TIMESTAMPTZ
        );`
    }
}
