import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const patrolCars = prisma.patrol_cars;

export default class PatrolCarsDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.patrol_cars (
        id         BIGSERIAL PRIMARY KEY,
        name       text NOT NULL
);`
    }

    static async getAll() {
        return patrolCars.findMany({
            select: {
                id: true,
                name: true
            },
            orderBy: {
                name: 'asc'
            },
        });
    }

    static async getById(id: number) {
        return patrolCars.findMany({
            where: {
                id: id
            }
        });
    }

    static async update(id: number, data : any) {
        return patrolCars.update({
            where: {
                id
            }, data
        });
    }

    static async create(obj : any) {
        return patrolCars.create({
            data: obj
        });
    }
}
