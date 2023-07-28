import PrismaService from "../services/prisma.service"

const prisma = PrismaService.getVisionaire();
const faceImage = prisma.face_image;

export default class FaceImageDAO {
    static async getThumbnailByEnrolledFaceIds(ids: number[]) {
        let result = faceImage.findMany({
            select: {
                image_thumbnail: true
            },
            where: {
                enrolled_face_id: {
                    in: ids
                }
            }
        });

        return result;
    }
}
