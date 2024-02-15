import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const customStatus = prisma.custom_status;

export default class CustomStatusDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.custom_status (
        id         BIGSERIAL PRIMARY KEY,
        status   character varying(255) NOT NULL,
        color character varying(20),
        caption character varying(255),
        created_at TIMESTAMPTZ default NOW()
);`
    }

    static async getById(id : number) {
        return customStatus.findFirst({
            where: {
                id
            }
        });
    }

    static async getByStatus(status : string) {
        return customStatus.findFirst({
            where: {
                status
            }
        });
    }

    static async create(obj : any) {
        return customStatus.create({
            data: obj
        });
    }

    static async update(id : number, data : any) {
        return customStatus.update({where: {id}, data});
    }

    static async getAll() {
        return customStatus.findMany({
            orderBy: {
                id: 'asc'
            }
        });
    }
}
