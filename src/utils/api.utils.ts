import nodefetch, {RequestInit} from "node-fetch";
import FormData from "form-data";

export default async function request(endpoint : string, method : string, body? : any, includesFile = false, additionalHeaders? : any, additionalOptions? : any) {
    let request = {
        method: method,
        headers: {
            "Accept": "application/json",
            ...additionalHeaders
        },
        body: includesFile ? body : JSON.stringify(body),
        ...additionalOptions
    }
    if (!includesFile) {
        request.headers["Content-Type"] = "application/json";
    }

    let response = await fetch(endpoint, request);

    if (response.ok) {
        return await response.json();
    }
    else {
        throw response;
    }
}

export async function requestWithFile(endpoint : string, method : string, body : FormData, additionalHeaders? : any, additionalOptions? : any) {
    let request : RequestInit = {
        method: method,
        headers: {
            "Accept": "application/json",
            ...additionalHeaders
        },
        body: body,
    }

    let response = await nodefetch(endpoint, request);

    if (response.ok) {
        return await response.json();
    }
    else {
        throw response;
    }
}
