import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const patrolCarsCoordinates = prisma.patrol_cars_coordinates;

export default class PatrolCarsCoordinatesDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.patrol_cars_coordinates (
        id                  BIGSERIAL          PRIMARY KEY,
        patrol_car_id       text               NOT NULL,
        latitude            double precision   NOT NULL,
        longitude           double precision   NOT NULL
);`
    }

    static async getAll() {
        return patrolCarsCoordinates.findMany({
            select: {
                id: true,
                patrol_car_id: true,
                latitude: true,
                longitude: true
            },
            orderBy: {
                id: 'asc'
            },
        });
    }

    static async getById(id: number) {
        return patrolCarsCoordinates.findMany({
            where: {
                id: id
            }
        });
    }

    static async update(id: number, data : any) {
        return patrolCarsCoordinates.update({
            where: {
                id
            }, data
        });
    }

    static async create(obj : any) {
        return patrolCarsCoordinates.create({
            data: obj
        });
    }
}
