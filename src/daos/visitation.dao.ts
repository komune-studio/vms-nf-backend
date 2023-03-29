import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const visitation = PrismaService.getVisionaire().visitation;

export default class VisitationDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS visitation (
            id SERIAL PRIMARY KEY,
            enrolled_face_id bigint NOT NULL,
            employee_id int NOT NULL,
            location_id int NOT NULL,
            allowed_sites bigint[] NOT NULL,
            purpose VARCHAR(100) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()           
        );`
    }
}
