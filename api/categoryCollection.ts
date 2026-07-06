import { api } from "@/utils/apiService";
import { __DEV__ } from "@/utils/envValue";

export interface CategoryItem {
    _id: string;
    name: string;
    price: number;
    benefits: string[];
    description: string;
    duration: string;
    createdAt: string;
    updatedAt: string;
    __v?: number;
}

export interface CreateCategoryPayload {
    name: string;
    price: number;
    benefits: string[];
    description: string;
    duration: string;
}

export interface CategoryListResponse {
    success: boolean;
    message: string;
    total: number;
    data: CategoryItem[];
}

export interface CreateCategoryResponse {
    success: boolean;
    message: string;
    data?: CategoryItem;
}

export interface GetCategoryByIdResponse {
    success: boolean;
    message: string;
    data: CategoryItem;
}

// Payload untuk update bisa partial — backend menerima field yang berubah saja
export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export async function getCategories() {
    try {
        if (__DEV__) {
            console.log("Fetching categories from /api/category");
        }
        const response = await api().get<CategoryListResponse>("/api/category");
        if (__DEV__) {
            console.log("Get categories response : ", response);
        }
        return response;
    } catch (error: unknown) {
        const err = error as { response?: { status?: number }; code?: string; message?: string };
        // Fallback coba dengan trailing slash apabila endpoint butuh /api/category/
        if (err?.response?.status === 404 || err?.response?.status === 301 || err?.response?.status === 308) {
            try {
                if (__DEV__) {
                    console.log("Retrying with trailing slash /api/category/");
                }
                const retryResponse = await api().get<CategoryListResponse>("/api/category/");
                return retryResponse;
            } catch (retryError) {
                if (__DEV__) {
                    console.error("Error fetching categories (retry) : ", retryError);
                }
                throw error;
            }
        }
        if (__DEV__) {
            console.error("Error fetching categories : ", error);
        }
        throw error;
    }
}

export async function createCategory(payload: CreateCategoryPayload) {
    try {
        if (__DEV__) {
            console.log("Creating category with payload : ", payload);
        }
        const response = await api().post<CreateCategoryResponse>("/api/category", payload);
        if (__DEV__) {
            console.log("Create category response : ", response);
        }
        return response;
    } catch (error: unknown) {
        if (__DEV__) {
            console.error("Error creating category : ", error);
        }
        throw error;
    }
}

export async function getCategoryById(id: string) {
    try {
        if (__DEV__) {
            console.log(`Fetching category by id: ${id}`);
        }
        const response = await api().get<GetCategoryByIdResponse>(`/api/category/${id}`);
        if (__DEV__) {
            console.log("Get category by id response : ", response);
        }
        return response;
    } catch (error: unknown) {
        if (__DEV__) {
            console.error("Error fetching category by id : ", error);
        }
        throw error;
    }
}

export async function updateCategory(id: string, payload: UpdateCategoryPayload) {
    try {
        if (__DEV__) {
            console.log(`Updating category id: ${id} with payload : `, payload);
        }
        const response = await api().put<GetCategoryByIdResponse>(`/api/category/${id}`, payload);
        if (__DEV__) {
            console.log("Update category response : ", response);
        }
        return response;
    } catch (error: unknown) {
        if (__DEV__) {
            console.error("Error updating category : ", error);
        }
        throw error;
    }
}

export async function deleteCategory(id: string){
    try {
        if (__DEV__) {
            console.log("Delete Category with id : ", id);
        }
        const response = await api().delete(`/api/category/${id}`);
        if (__DEV__) {
            console.log("Delete category response : ", response);
        }
        return response;
    } catch (error: unknown) {
        if (__DEV__) {
            console.error("Error deleting category : ", error);
        }
        throw error;
    }
}
