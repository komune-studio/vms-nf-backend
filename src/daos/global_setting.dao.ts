import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const globalSetting = prisma.global_setting;

export default class GlobalSettingDAO {
    static async getAll() {
        return globalSetting.findMany({
            select: {
                id: true,
                similarity: true
            }
        });
    }

    static async create(obj : any) {
        return globalSetting.create({
            data: obj
        });
    }

    static async update(id: bigint, data: any) {
        return globalSetting.update({
            where: {
                id
            }, data
        });
    }
}
