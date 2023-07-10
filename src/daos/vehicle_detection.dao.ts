import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();

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
  user_id int NOT NULL,
  created_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
);`
    }
}
