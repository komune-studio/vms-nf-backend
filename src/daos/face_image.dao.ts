import PrismaService from "../services/prisma.service"

const prisma = PrismaService.getVisionaire();
const faceImage = prisma.face_image;

export default class FaceImageDAO {
    static async getByEnrolledFaceIds(ids: number[], image: boolean) {
        let result = faceImage.findMany({
            orderBy: {id: 'desc'},
            select: {
                id: true,
                enrolled_face_id: true,
                variation: true,
                created_at: true,
                image_thumbnail: image
            },
            where: {
                enrolled_face_id: {
                    in: ids
                },
                deleted_at: image ? {} : {equals: null}
            }
        });

        return result;
    }

    static async getThumbnailByEnrolledFaceIds(ids: number[]) {
        let result = faceImage.findMany({
            select: {
                enrolled_face_id: true,
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

    static async getFullSizeById(id: number) {
        let result = faceImage.findFirst({
            select: {
                image: true
            },
            where: {
                id
            }
        });

        return result;
    }
}
