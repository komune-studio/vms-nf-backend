import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const dashboardCustomization = prisma.dashboard_customization;

export default class DashboardCustomizationDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS dashboard_customization (
            key text PRIMARY KEY,
            custom_text text,
            custom_file bytea,
            custom_json_array jsonb[] default '{}'
        );`
    }

    static async getAll() {
        return dashboardCustomization.findMany();
    }

    static async getByKey(key : string) {
        return dashboardCustomization.findFirst({
            where: {key}
        });
    }

    static async insert(obj : any) {
        return dashboardCustomization.create({
            data: obj
        });
    }

    static async update(key: string, data : any) {
        return dashboardCustomization.update({
            where: {
                key
            }, data
        });
    }
}
