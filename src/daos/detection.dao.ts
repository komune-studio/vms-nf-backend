import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();

export default class DetectionDao {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS detection (
            id SERIAL PRIMARY KEY,
             enrollment_id int NOT NULL,
              latitude decimal(10,7) NOT NULL,
              longitude decimal(10,7) NOT NULL,
              address varchar(500) DEFAULT NULL,
              report text,
              image bytea NOT NULL,
              user_id int DEFAULT NULL,
              emotion varchar(50) DEFAULT NULL,
              associate_id int DEFAULT NULL,
              emotion_count json DEFAULT NULL,
              emotion_analysis json DEFAULT NULL,
              created_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`
    }
}
