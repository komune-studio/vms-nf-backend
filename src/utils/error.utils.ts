export class HTTPError extends Error {
    statusCode : number;
    errorCode : string;
    message : string;
    timestamp : Date;

    constructor(statusCode : number, errorCode : string, message : string | any, timestamp : Date = new Date()) {
        super();
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.message = message;
        this.timestamp = timestamp
    }
}

export class BadRequestError extends HTTPError {
    constructor(message : string | any, errorCode : string = "BAD_REQUEST_ERROR") {
        super(400, errorCode, message);
    }
}

export class UnauthorizedError extends HTTPError {
    constructor(message : string | any, errorCode : string = "UNAUTHORIZED_ACCESS_ERROR") {
        super(401, errorCode, message);
    }
}

export class ForbiddenError extends HTTPError {
    constructor(message : string | any, errorCode : string = "FORBIDDEN_ACCESS_ERROR") {
        super(403, errorCode, message);
    }
}

export class NotFoundError extends HTTPError {
    constructor(message : string | any, notFoundResource : string = "RESOURCE") {
        super(404, `${notFoundResource.toUpperCase()}_NOT_FOUND`, message);
    }
}

export class ConflictError extends HTTPError {
    constructor(message : string | any, conflictingResource : string = "RESOURCE") {
        super(409, `${conflictingResource.toUpperCase()}_ALREADY_EXISTS`, message);
    }
}

export class InternalServerError extends HTTPError {
    constructor(message : string | any, errorCode : string = "INTERNAL_SERVER_ERROR") {
        super(500, errorCode, message);
    }
}