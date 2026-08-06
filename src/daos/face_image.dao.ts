import PrismaService from "../services/prisma.service"
import moment from "moment";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const faceImage = prisma.face_image;

export default class FaceImageDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.face_image (
    id BIGSERIAL PRIMARY KEY,
    enrolled_face_id bigint NOT NULL,
    variation character varying NOT NULL,
    image bytea NOT NULL,
    created_at timestamp(6) with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp(6) with time zone,
    image_thumbnail bytea
);
`
    }

    static async create(data : any) {
        return faceImage.create({data});
    }

    static async softDeleteByEnrolledFaceId(id : number) {
        return faceImage.updateMany({
            where: {
                enrolled_face_id: BigInt(id)
            },
            data: {deleted_at: new Date()}
        });
    }

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

    static async getActiveByEnrolledFaceId(id : number) {
        return faceImage.findMany({
            orderBy: {id: 'desc'},
            where: {
                enrolled_face_id: BigInt(id),
                deleted_at: {equals: null}
            }
        });
    }

    static async getByEnrolledFaceId(id : number) {
        const faceId = BigInt(id);

        let result = faceImage.findMany({
            where: {
                enrolled_face_id: faceId
            }
        });

        return result;
    }

    static async recover(id : number) {
        let result = faceImage.update({
            where: {
                id
            },
            data: {deleted_at: null}
        });

        return result;
    }

    static async getById(id: number) {
        return faceImage.findUnique({
            where: {
                id: BigInt(id)
            }
        });
    }
}
