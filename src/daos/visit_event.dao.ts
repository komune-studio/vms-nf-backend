import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const visitEvent = prisma.visit_event;

export default class VisitEventDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS visit_event (
            id SERIAL PRIMARY KEY,
            event_id bigint NOT NULL,
            visitation_id int NOT NULL,
            unauthorized boolean NOT NULL DEFAULT false
        );`
    }

    static async create(data : any) {
        return visitEvent.create({
            data: data
        })
    }

    static async getByEventId(id : string) {
        return visitEvent.findFirst({
            where: {
                event_id: id
            }
        })
    }

    static async getAll() {
        return visitEvent.findMany();
    }
}