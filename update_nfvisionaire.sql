CREATE TABLE "enrolled_face" (
                                 "id" SERIAL NOT NULL,
                                 "face_id" BIGINT NOT NULL,
                                 "name" VARCHAR(200),
                                 "deleted_at" TIMESTAMPTZ(6),
                                 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 "identity_number" VARCHAR(200),
                                 "status" VARCHAR(200),
                                 "gender" VARCHAR(200),
                                 "birth_place" VARCHAR(200),
                                 "birth_date" DATE,
                                 "additional_info" JSONB NOT NULL,

                                 CONSTRAINT "enrolled_face_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site" (
                        "id" SERIAL NOT NULL,
                        "name" VARCHAR(200) NOT NULL,
                        "image" BYTEA,
                        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        "deleted_at" TIMESTAMPTZ(6),

                        CONSTRAINT "site_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "map_site_stream" (
                                   "id" SERIAL NOT NULL,
                                   "site_id" BIGINT NOT NULL,
                                   "stream_id" VARCHAR(200) NOT NULL,
                                   "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                   CONSTRAINT "map_site_stream_pkey" PRIMARY KEY ("id")
);