import nodefetch, {RequestInit} from "node-fetch";
import FormData from "form-data";

export default async function request(endpoint : string, method : string, body? : any, additionalHeaders? : any) {
    let request  = {
        method: method,
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...additionalHeaders
        },
        body: JSON.stringify(body),
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

    response = await response.json();

    if (response.ok) {
        return response
    } else {
        // @ts-ignore
        if(response.errors && response.errors[0]) {
            // @ts-ignore
            response = {message: response.errors[0]}
        }

        throw response;
    }
}
