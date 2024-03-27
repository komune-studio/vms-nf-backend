import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const notificationsUsers = prisma.notifications_users;

export default class NotificationsUsersDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS notifications_users (
            id SERIAL PRIMARY KEY,
            notification_id integer NOT NULL,
            admin_id integer NOT NULL,
            is_read boolean NOT NULL default false,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );`
    }

    static async getByAdminId(adminId : number) {
        return notificationsUsers.findMany({
            where: {
                admin_id: adminId
            },
            orderBy: {
                notification: {
                    created_at: 'desc'
                }
            },
            include: {
                notification: true
            }
        })
    }

    static async markRead(adminId : number, id : number) {
        return notificationsUsers.updateMany({
            where: {
                notification_id: id,
                admin_id: adminId
            },
            data: {
                is_read: true
            }
        })
    }

    static async markAllAsRead(adminId : number) {
        return notificationsUsers.updateMany({
            where: {
                admin_id: adminId
            },
            data: {
                is_read: true
            }
        })
    }
}
