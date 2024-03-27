import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const notifications = prisma.notifications;

export default class NotificationDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            title text NOT NULL,
            description text NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );`
    }

    static async getAll() {
        return notifications.findMany({
            orderBy: {
                created_at: 'desc'
            }
        });
    }
}
