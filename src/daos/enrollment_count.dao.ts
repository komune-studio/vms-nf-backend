import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const admins = prisma.admin;

export default class EnrollmentCountDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS enrollment_count (
            date DATE,
            count INT
        );`
    }
}
