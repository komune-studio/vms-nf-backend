import PrismaService from "../services/prisma.service"

const prisma = PrismaService.getVisionaire();
const enrolledFace = prisma.enrolled_face;

export default class EnrolledFaceDAO {
    static async getByFaceId(id : string) {
        const faceId = BigInt(id);

        let result = enrolledFace.findFirst({
            where: {
                face_id: faceId
            }
        });

        return result;
    }

    static async getFaceIdByEnrolledFaceId(id : number) {
        let result = enrolledFace.findFirst({
            select: {
                face_id: true
            },
            where: {
                id: id
            }
        });

        return result;
    }
}
