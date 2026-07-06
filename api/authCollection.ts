import { api } from "@/utils/apiService";
import { __DEV__ } from "@/utils/envValue";
const env = process.env;

export function login(username: string, password: string, rememberMe: boolean = false) {
  __DEV__ && console.log(`Login to api at ${env.NEXT_PUBLIC_API}/api/user/login`);
  const response = api().post("/api/user/login", {
    username,
    password,
    browser: true,
    rememberMe,
  });
  return response;
}

export function logout() {
  const response = api().post("/api/user/logout");
  return response;
}

export async function verifySession() {
  try {
    const response = await api().get("/api/user/verify");
    __DEV__ && console.log("Verifying session response : ", response);
    return response;
  } catch (error) {
    __DEV__ && console.error("Error verifying session : ", error);
    throw error; // biar bisa ditangkap di authContext
  }
}
