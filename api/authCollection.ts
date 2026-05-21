import { api } from "@/utils/apiService"
import { __DEV__ } from "@/utils/envValue"
const env = process.env

export function login(username: string, password: string) {
    const response = (api().post('/api/user/login', { username, password, browser: true }))
    __DEV__ && console.log(`Login to api at ${env.NEXT_PUBLIC_API}/api/user/login`)
    return response;
}

export function logout() {
    const response = (api().post('/api/user/logout'))
    return response;
}