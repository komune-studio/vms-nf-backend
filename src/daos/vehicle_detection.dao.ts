import PrismaService from "../services/prisma.service";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const vehicle_detection = prisma.vehicle_detection;

export default class VehicleDetectionDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS vehicle_detection (
  id SERIAL PRIMARY KEY,
  vehicle_id int NOT NULL,
  latitude decimal(10,7) NOT NULL,
  longitude decimal(10,7) NOT NULL,
  address varchar(255) DEFAULT NULL,
  report text,
  image bytea NOT NULL,
  user_id int,
  stream_name text,
  created_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
);`
    }

    static async create(obj: any) {
        return vehicle_detection.create({
            data: obj
        });
    }

    static async getAll(vehicleId?: string, caseId?: string, search? : string, userId? : string, startDate? : string, endDate? : string, id? : string, page? : string, limit? : string) {
        return vehicle_detection.findMany({
            skip: page && limit ? parseInt(page) * parseInt(limit) : undefined,
            take: limit ? parseInt(limit) : undefined,
            include: {
                user: {
                    select: {name: true}
                },
                vehicle: {
                   select: {plate_number: true, name: true}
                },
            },
            where: {
                id: id ? parseInt(id) : undefined,
                created_at: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined
                },
                user_id: userId ? parseInt(userId) : undefined,
                vehicle_id: vehicleId ? parseInt(vehicleId) : undefined,
                vehicle: {
                    name: {
                        contains: search,
                        mode: 'insensitive'
                    },
                    additional_info: caseId ? {
                        path: ['case_id'],
                        equals: parseInt(caseId)
                    } : undefined
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    }

    static async getCount(vehicleId?: string, caseId?: string, search? : string, userId? : string, startDate? : string, endDate? : string, id? : string) {
        return vehicle_detection.aggregate({
            _count: {id: true},
            where: {
                id: id ? parseInt(id) : undefined,
                created_at: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined
                },
                user_id: userId ? parseInt(userId) : undefined,
                vehicle_id: vehicleId ? parseInt(vehicleId) : undefined,
                vehicle: {
                    name: {
                        contains: search,
                        mode: 'insensitive'
                    },
                    additional_info: caseId ? {
                        path: ['case_id'],
                        equals: parseInt(caseId)
                    } : undefined
                }
            }
        });
    }

    static async getDetectionDistribution() {
        const sql = `select DATE(created_at) as timestamp, count(*) as count from vehicle_detection group by DATE(created_at) order by DATE(created_at) ASC LIMIT 10`

        return prisma.$queryRaw(Prisma.raw(sql))
    }
}
