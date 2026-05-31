import axios from "axios";
import { API_BASE_URL } from "./envValue";

export function api(token?: string) {
    if (token) {
        const instance = axios.create({
            baseURL: API_BASE_URL,
            withCredentials: true,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
            },
            timeout: 10000,
        });

        instance.interceptors.request.use((config) => {
            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }
            return config;
        });

        return instance;
    }

    return axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: 10000,
    });
}