import PrismaService from "../services/prisma.service";

const resolutions = PrismaService.getVisionaire().camera_resolution;

export default class cameraResolutionDAO {
    static async getByStreamID(streamID: string) {
        return resolutions.findMany({
            where: {
                stream_id: streamID
            }
        });
    }
}
