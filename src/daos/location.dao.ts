import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const location = PrismaService.getVisionaire().location;

export default class LocationDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS location (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            modified_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ           
        );`
    }

    static async getAll() {
        return location.findMany({
            where: {
                deleted_at: null
            }
        });
    }

    static async getOne(id : number) {
        return location.findUnique({
            where: {
                id: id
            }
        });
    }

    static async create(data : any) {
        return location.create({
            data: data
        });
    }

    static async update(id : number, data : any) {
        return location.update({
            where: {
                id: id
            },
            data: data
        });
    }

    static async delete(id : number) {
        return location.delete({
            where: {
                id: id
            }
        });
    }
}
