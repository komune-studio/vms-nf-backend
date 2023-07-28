import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const unrecognizedEvent = prisma.unrecognized_event;

export default class UnrecognizedEventDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.unrecognized_event (
        id BIGSERIAL PRIMARY KEY,
        face_id bigint NOT NULL,
        timestamp bigint NOT NULL,
        stream_name text NOT NULL,
        image bytea NOT NULL
);`
    }

    static async create(obj : any) {
        return unrecognizedEvent.create({
            data: obj
        });
    }

    static async getByFaceIds(ids : bigint[]) {
        return unrecognizedEvent.findMany({
            where: {
                face_id: {in: ids}
            }
        });
    }
}
