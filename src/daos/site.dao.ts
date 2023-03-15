import PrismaService from "../services/prisma.service";

const sites = PrismaService.getVisionaire().site;

export default class SiteDAO {
    static async getAll() {
        return sites.findMany({
            select: {
                id: true,
                name: true
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
        console.log(id)
        console.log(obj)

        return sites.update({
            where: {id},
            data: obj
        });
    }
}
