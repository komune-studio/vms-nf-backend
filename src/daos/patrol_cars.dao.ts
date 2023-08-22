import PrismaService from "../services/prisma.service";
import {now} from "moment";

const prisma = PrismaService.getVisionaire();
const patrolCars = prisma.patrol_cars;

export default class PatrolCarsDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.patrol_cars (
        id             BIGSERIAL   PRIMARY KEY,
        name           text        NOT NULL,
        deleted_at     date        NULL
);`
    }

    static async getAll() {
        return patrolCars.findMany({
            select: {
                id: true,
                name: true,

            },
            where:{
                deleted_at: {
                    equals: null
                }
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

    static async delete(id: number) {
        return patrolCars.update({
            where: {
                id: id
            }, data:{
                deleted_at: new Date()
            }
        });
    }
}
