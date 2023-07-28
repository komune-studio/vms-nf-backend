import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const recognizedEvent = prisma.recognized_event;
export default class RecognizedEventDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS recognized_event (
               id BIGSERIAL PRIMARY KEY,
             face_id bigint NOT NULL,
            timestamp bigint NOT NULL,
            stream_name text NOT NULL,
            image bytea NOT NULL,
            enrollment_id bigint NOT NULL
        );`
    }

    static async create(obj : any) {
        return recognizedEvent.create({
            data: obj
        });
    }

    static async getByFaceIds(ids : bigint[]) {
        return recognizedEvent.findMany({
            where: {
                face_id: {in: ids}
            }
        });
    }
}
