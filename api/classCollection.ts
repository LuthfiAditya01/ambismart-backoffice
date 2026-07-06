import { api } from "@/utils/apiService";
import { __DEV__ } from "@/utils/envValue";
import { CategoryItem } from "./categoryCollection";

export interface ClassItem {
    _id: string;
    name: string;
    categories?: CategoryItem[];
    subtitle?: string;
    description?: string;
    features?: string[];
    highlight?: boolean;
    color?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ClassListResponse {
    success: boolean;
    message: string;
    data: ClassItem[];
}

export async function getClasses() {
    try {
        if (__DEV__) {
            console.log("Fetching classes from /api/class");
        }
        const response = await api().get<ClassListResponse>("/api/class");
        if (__DEV__) {
            console.log("Get classes response : ", response);
        }
        return response;
    } catch (error: unknown) {
        const err = error as { response?: { status?: number }; code?: string; message?: string };
        // Fallback coba dengan trailing slash apabila endpoint butuh /api/class/
        if (err?.response?.status === 404 || err?.response?.status === 301 || err?.response?.status === 308) {
            try {
                if (__DEV__) {
                    console.log("Retrying with trailing slash /api/class/");
                }
                const retryResponse = await api().get<ClassListResponse>("/api/class/");
                return retryResponse;
            } catch (retryError) {
                if (__DEV__) {
                    console.error("Error fetching classes (retry) : ", retryError);
                }
                throw error;
            }
        }
        if (__DEV__) {
            console.error("Error fetching classes : ", error);
        }
        throw error;
    }
}

export interface CreateClassPayload {
    name: string;
    categories: string[]; // array of category _id
    subtitle?: string;
    description?: string;
    features?: string[];
    highlight?: boolean;
    color?: string;
}

export interface CreateClassResponse {
    success: boolean;
    message: string;
    data?: ClassItem;
}

export async function createClass(payload: CreateClassPayload) {
    try {
        if (__DEV__) {
            console.log("Creating class with payload : ", payload);
        }
        const response = await api().post<CreateClassResponse>("/api/class", payload);
        if (__DEV__) {
            console.log("Create class response : ", response);
        }
        return response;
    } catch (error: unknown) {
        if (__DEV__) {
            console.error("Error creating class : ", error);
        }
        throw error;
    }
}

export interface GetClassByIdResponse {
    success: boolean;
    message?: string;
    data?: ClassItem;
}

export type UpdateClassPayload = CreateClassPayload;

export async function getClassById(id: string) {
    try {
        if (__DEV__) {
            console.log(`Fetching class by id: ${id}`);
        }
        const response = await api().get<GetClassByIdResponse>(`/api/class/${id}`);
        if (__DEV__) {
            console.log("Get class by id response : ", response);
        }
        return response;
    } catch (error: unknown) {
        if (__DEV__) {
            console.error("Error fetching class by id : ", error);
        }
        throw error;
    }
}

export async function updateClass(id: string, payload: UpdateClassPayload) {
    try {
        if (__DEV__) {
            console.log(`Updating class id: ${id} with payload : `, payload);
        }
        const response = await api().put<GetClassByIdResponse>(`/api/class/${id}`, payload);
        if (__DEV__) {
            console.log("Update class response : ", response);
        }
        return response;
    } catch (error: unknown) {
        if (__DEV__) {
            console.error("Error updating class : ", error);
        }
        throw error;
    }
}

export async function deleteClass(id: string) {
    try {
        if (__DEV__) {
            console.log("Delete class with id : ", id);
        }
        const response = await api().delete(`/api/class/${id}`);
        if (__DEV__) {
            console.log("Delete class response : ", response);
        }
        return response;
    } catch (error: unknown) {
        if (__DEV__) {
            console.error("Error deleting class : ", error);
        }
        throw error;
    }
}

