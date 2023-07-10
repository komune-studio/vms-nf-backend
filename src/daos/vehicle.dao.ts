import PrismaService from "../services/prisma.service";
import {Prisma} from "../prisma/nfvisionaire";
const prisma = PrismaService.getVisionaire();
const vehicles = PrismaService.getVisionaire().vehicle;

export default class VehicleDAO {
    static async create(vehicle : any) {
        return vehicles.create({
            data: vehicle
        })
    }
    static async getVehicles() {
        return vehicles.findMany();
    }
    static async getByPlate(plate : string) {
        return vehicles.findFirst({
            where: {
                plate_number: plate
            }
        })
    }
    static async getVehicle(id : number) {
        return vehicles.findFirst({
            where: {
                id: id
            }
        })
    }
    static async getByUniqueId(id : string) {
        return vehicles.findFirst({
            where: {
                unique_id: id
            }
        })
    }
    static async updateVehicle(id : string, vehicle : any) {
        return vehicles.update({
            where: {
                unique_id: id
            },
            data: vehicle
        })
    }
    static async deleteVehicle(id : number) {
        return vehicles.delete({
            where: {
                id: id
            }
        })
    }

    static async addAdditionalInfoColumn() {
        //enrollment only valid in the same day when they register
        const sql = `ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS additional_info JSONB default '{}';`

        return prisma.$queryRaw(Prisma.raw(sql))
    }
}
