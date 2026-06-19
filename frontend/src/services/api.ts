const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const headers = { ...options.headers };

    // Inject Auth token
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorMsg = "Something went wrong";
        try {
            const errJson = await response.json();
            const detail = errJson.error?.message || errJson.detail;
            if (detail) {
                if (typeof detail === "string") {
                    errorMsg = detail;
                } else if (Array.isArray(detail)) {
                    errorMsg = detail.map((d: any) => `${d.loc?.slice(1).join('.') || 'field'}: ${d.msg}`).join(", ");
                } else {
                    errorMsg = JSON.stringify(detail);
                }
            }
        } catch {
            // Keep default
        }
        throw new Error(errorMsg);
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

export const api = {
    get: <T>(path: string, options?: RequestOptions) => 
        request<T>(path, { ...options, method: "GET" }),
        
    post: <T>(path: string, body?: any, options?: RequestOptions) => {
        const headers: Record<string, string> = {};
        let requestBody = undefined;
        
        if (body !== undefined && body !== null) {
            headers["Content-Type"] = "application/json";
            requestBody = JSON.stringify(body);
        }
        
        return request<T>(path, {
            ...options,
            method: "POST",
            headers: {
                ...headers,
                ...(options?.headers || {}),
            },
            body: options?.body !== undefined ? options.body : requestBody,
        });
    },
        
    delete: <T>(path: string, options?: RequestOptions) => 
        request<T>(path, { ...options, method: "DELETE" }),
};
