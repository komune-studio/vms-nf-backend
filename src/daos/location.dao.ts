import PrismaService from "../services/prisma.service";

const location = PrismaService.getVisionaire().location;

export default class LocationDAO {
    static async getAll() {
        return location.findMany();
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