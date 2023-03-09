import PrismaService from "../services/prisma.service";

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
}