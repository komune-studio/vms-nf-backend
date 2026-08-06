import sharp from "sharp";
import request from "../utils/api.utils";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import FaceImageDAO from "../daos/face_image.dao";
import {BadRequestError} from "../utils/error.utils";

const KEYSPACE = 'default';

const THUMBNAIL_WIDTH = 200;

// FremisN rejects small crops outright, so normalise the same way booking.controller
// does before it hits /face/match.
const normalize = (image: Buffer) => sharp(image).resize(1000).jpeg({quality: 80}).toBuffer();

// -> {face_detected: [{top, left, width, height}], face_id: "...", variation: "..."}
const pushToFremisn = async (image: Buffer) => {
    const normalized = await normalize(image);

    return request(`${process.env.NF_FREMISN_API_URL}/face/enrollment`, 'POST', {
        image: normalized.toString('base64'),
        keyspace: KEYSPACE
    }).catch(async (e) => {
        // FremisN answers 400 with {code, description, message} when it can't use the
        // image ("Image is invalid", "the image field not found", ...). Surface that
        // instead of the bare Response.
        const body = typeof e?.json === 'function' ? await e.json().catch(() => null) : null;

        throw new BadRequestError(body?.description || "Face enrollment failed.");
    });
}

// -> {deleted_face_ids: ["..."]}
const deleteFromFremisn = (faceIds: bigint[]) =>
    request(`${process.env.NF_FREMISN_API_URL}/face/delete-enrollment`, 'POST', {
        face_ids: faceIds.map(faceId => faceId.toString()),
        keyspace: KEYSPACE
    });

const storeFaceImage = async (enrolledFaceId: number, enrollment: any, image: Buffer) =>
    FaceImageDAO.create({
        enrolled_face_id: BigInt(enrolledFaceId),
        // 20 digits, so it overflows bigint — FremisN hands it over as a string and
        // face_image.variation keeps it as varchar.
        variation: enrollment.variation,
        image: image,
        image_thumbnail: await sharp(image).resize(THUMBNAIL_WIDTH).jpeg({quality: 80}).toBuffer()
    });

// Only the columns enrolled_face actually has. The old code forwarded the whole request
// body to vanilla and let it pick; Prisma won't, and it reads undefined as "leave alone".
export const enrollmentFields = (body: any, status?: string) => {
    const fields: any = {
        name: body['name'],
        identity_number: body['identity_number'],
        status: status || body['status'],
        gender: body['gender'],
        birth_place: body['birth_place'],
        birth_date: body['birth_date'] ? new Date(body['birth_date']) : undefined,
        additional_info: body['additional_info'] ? JSON.parse(body['additional_info']) : undefined
    };

    Object.keys(fields).forEach(key => {
        if (fields[key] === undefined || fields[key] === '') delete fields[key];
    });

    return fields;
}

type EnrollmentInput = {
    image: Buffer,
    name: string,
    identity_number: string,
    status: string,
    gender?: string,
    birth_place?: string,
    birth_date?: string,
    additional_info?: string,
}

export default class EnrollmentService {
    static async enroll(input: EnrollmentInput) {
        const enrollment = await pushToFremisn(input.image);

        const enrolledFace = await EnrolledFaceDAO.create({
            face_id: BigInt(enrollment.face_id),
            name: input.name,
            identity_number: input.identity_number,
            status: input.status,
            gender: input.gender || null,
            birth_place: input.birth_place || null,
            birth_date: input.birth_date ? new Date(input.birth_date) : null,
            additional_info: input.additional_info ? JSON.parse(input.additional_info) : {}
        });

        await storeFaceImage(enrolledFace.id, enrollment, input.image);

        return enrolledFace;
    }

    // FremisN has no update endpoint, so swapping someone's photo means dropping the old
    // enrollment and creating a new one — which yields a new face_id and variation.
    static async replaceFace(enrolledFace: {id: number, face_id: bigint}, image: Buffer) {
        await deleteFromFremisn([enrolledFace.face_id]);

        const enrollment = await pushToFremisn(image);

        await FaceImageDAO.softDeleteByEnrolledFaceId(enrolledFace.id);
        await storeFaceImage(enrolledFace.id, enrollment, image);

        return EnrolledFaceDAO.update(enrolledFace.id, {face_id: BigInt(enrollment.face_id)});
    }

    static async remove(enrolledFace: {id: number, face_id: bigint}) {
        await deleteFromFremisn([enrolledFace.face_id]);

        // Soft delete on our side — reenroll() recovers the row and pushes it back to FremisN.
        await FaceImageDAO.softDeleteByEnrolledFaceId(enrolledFace.id);

        return EnrolledFaceDAO.softDelete(enrolledFace.id);
    }

    // face_id and the face_image ids are bigints, so they can't go through res.send() as-is.
    static async serialize(enrolledFace: any) {
        const faces = await FaceImageDAO.getActiveByEnrolledFaceId(enrolledFace.id);

        return {
            ...enrolledFace,
            face_id: enrolledFace.face_id.toString(),
            faces: faces.map(face => ({
                ...face,
                id: face.id.toString(),
                enrolled_face_id: face.enrolled_face_id.toString(),
                image: Buffer.from(face.image).toString('base64'),
                image_thumbnail: face.image_thumbnail ? Buffer.from(face.image_thumbnail).toString('base64') : null
            }))
        };
    }
}
