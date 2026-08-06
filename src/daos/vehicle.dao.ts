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
        if(plate_nums.length === 0) return []

        plate_nums = plate_nums.map(plate => `'${plate}'`)

        const sql = `select distinct on (e.pipeline_data->>'plate_number') e.pipeline_data->>'plate_number' plate_number, s.name as stream_name, e.created_at as event_time from events e LEFT JOIN streams s ON s.id = e.stream_id where (e.analytic_id = 'NFV4-LPR' OR e.analytic_id = 'NFV4-LPR2') AND e.pipeline_data->>'plate_number' in (${plate_nums.join(", ")}) ORDER BY e.pipeline_data->>'plate_number', e.created_at DESC ;`

        console.log(sql)

        return prisma.$queryRaw(Prisma.raw(sql))
    }
}
