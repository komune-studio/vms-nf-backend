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
        return vehicles.findMany({
            orderBy: {
                created_at: 'desc'
            }
        });
    }
    static async getByLicensePlate(plate : string) {
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

    static async getLatestDetection(plate_nums : string[]) {
        plate_nums = plate_nums.map(plate => `'${plate}'`)

        const sql = `select distinct on (detection->'pipeline_data'->>'plate_number') detection->'pipeline_data'->>'plate_number' plate_number, detection->>'stream_name' as stream_name, event_time from event where (type = 'NFV4-LPR' OR type = 'NFV4-LPR2') AND detection->'pipeline_data'->>'plate_number' in (${plate_nums.join(", ")}) ORDER BY detection->'pipeline_data'->>'plate_number', event_time DESC ;`

        console.log(sql)

        return prisma.$queryRaw(Prisma.raw(sql))
    }
}
