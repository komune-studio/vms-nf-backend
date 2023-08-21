import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const resolutions = prisma.camera_resolution;

export default class CameraResolutionDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.camera_resolution (
        id         BIGSERIAL PRIMARY KEY,
        stream_id  text NOT NULL,
        resolution text NOT NULL
);`
    }
    static async getByStreamID(streamID: string) {
        return resolutions.findMany({
            where: {
                stream_id: streamID
            }
        });
    }

    static async getById(id: number) {
        return resolutions.findMany({
            where: {
                id: id
            }
        });
    }

    static async update(id: number, data : any) {
        return resolutions.update({
            where: {
                id
            }, data
        });
    }

    static async create(obj : any) {
        return resolutions.create({
            data: obj
        });
    }
}
