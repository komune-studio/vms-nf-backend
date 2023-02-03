export default async function request(endpoint : string, method : string, body : any, additionalHeaders? : any) {

    let request : RequestInit = {
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