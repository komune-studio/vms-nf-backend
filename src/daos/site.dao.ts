import PrismaService from "../services/prisma.service";
const prisma = PrismaService.getVisionaire();
const sites = PrismaService.getVisionaire().site;

export default class SiteDAO {
    static async addImageColumn() {
        return prisma.$executeRaw`ALTER TABLE site ADD COLUMN IF NOT EXISTS image bytea`
    }

    static async getAll() {
        return sites.findMany({
            select: {
                id: true,
                name: true,
                image: true
            },
            where: {
                deleted_at: {equals: null}
            },
            orderBy: {
                name: 'asc'
            },
        });
    }

    static async getById(id : number) {
        return sites.findFirst({
            select: {
                name: true
            },
            where: {
                id: {equals: id}
            }
        });
    }

    static async create(obj: any) {
        return sites.create({
            data: obj
        });
    }

    static async update(id : number, obj: any) {
        return sites.update({
            where: {id},
            data: obj
        });
    }
}
