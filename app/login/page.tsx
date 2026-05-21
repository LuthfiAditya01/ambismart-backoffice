"use client"
import { useEffect, useState } from "react"
import { login } from "@/api/authCollection";
import { __DEV__ } from "@/utils/envValue";
import Swal from "sweetalert2";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        console.log({ username, password })
    }, [username, password])

    const postLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!username || !password) {
            Swal.fire({
                icon: "warning",
                title: "Data Belum Lengkap",
                text: "Silakan masukkan username dan password terlebih dahulu.",
                confirmButtonColor: "#6366f1"
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await login(username, password)
            __DEV__ && console.log("HASIL RESPONSE LOGIN BERHASIL : ", response)
            Swal.fire({
                icon: "success",
                title: "Success",
                text: "Login Berhasil",
                confirmButtonColor: "#10b981"
            }).then((confirm) => {
                if (confirm.isConfirmed) {
                    // Link("/")
                }
            })
        } catch (e: any) {

            // Jika Axios melempar error HTTP 401 Unauthorized
            if (e?.response?.status === 401) {
                Swal.fire({
                    icon: "error",
                    title: "Gagal",
                    text: "Username atau Password yang anda masukkan salah.",
                    confirmButtonColor: "#ef4444"
                })
            } else {
                console.error("Login error:", e)
                const errorMessage = e?.response?.data?.message || e?.message || e;

                if (__DEV__) {
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: `Error occured while trying to login : ${errorMessage}`,
                        confirmButtonColor: "#ef4444"
                    })
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: "Terjadi kesalahan saat login, ingin mencoba lagi?",
                        showCancelButton: true,
                        cancelButtonText: "Tidak",
                        confirmButtonText: "Ya",
                    }).then((res) => {
                        if (res.isConfirmed) {
                            postLogin();
                        }
                    })
                }
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen w-full flex bg-[#070b13] font-sans text-slate-100 overflow-hidden relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]"></div>
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[6000ms]"></div>

            {/* LEFT SIDE: Brand Visuals & Illustrations (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-7/12 relative flex-col justify-between p-12 bg-gradient-to-br from-[#0c1222] via-[#070b13] to-[#04060c] border-r border-slate-800/40 z-10 overflow-hidden">
                {/* Dots grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

                {/* Branding Mini header */}
                <div className="flex items-center gap-3.5 z-10">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800/80 p-1.5 flex items-center justify-center shadow-lg shadow-indigo-500/5">
                        <Image
                            src="/logo-ambismart.png"
                            alt="AmbiSmart Icon"
                            width={32}
                            height={32}
                            className="object-contain"
                        />
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-100 via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                        AmbiSmart
                    </span>
                </div>

                {/* Dashboard Mockup Centerpiece */}
                <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full max-w-xl mx-auto">
                    <div className="relative rounded-2xl p-1 bg-gradient-to-tr from-indigo-500/20 via-indigo-500/5 to-cyan-500/25 shadow-[0_0_60px_rgba(99,102,241,0.15)] overflow-hidden group transition-all duration-700 hover:scale-[1.015] border border-white/5">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="relative rounded-[14px] overflow-hidden bg-slate-950/70 backdrop-blur-xl">
                            <Image
                                src="/dashboard-mockup.png"
                                alt="Dashboard Mockup"
                                width={800}
                                height={600}
                                className="object-cover w-full h-auto transition-transform duration-700 group-hover:scale-[1.01]"
                                priority
                            />
                        </div>
                    </div>
                </div>

                {/* Quote / Footer tag */}
                <div className="relative z-10 mt-auto max-w-lg">
                    <h2 className="text-2xl font-bold leading-snug tracking-tight text-white mb-2.5">
                        Intelligent Backoffice Management Portal
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Access student metrics, process authentication, configure platform structures, and manage critical data models with an elegant administrative interface.
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE: Authentication Form */}
            <div className="w-full lg:w-5/12 flex flex-col justify-center items-center px-6 sm:px-12 md:px-16 py-12 z-10 bg-[#070b13]/80 backdrop-blur-md">
                <div className="w-full max-w-md flex flex-col gap-8">

                    {/* Header with Logo */}
                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 p-3 shadow-[0_0_40px_rgba(99,102,241,0.1)] flex items-center justify-center hover:rotate-[6deg] transition-all duration-300 group mb-5">
                            <Image
                                src="/logo-ambismart.png"
                                alt="AmbiSmart Logo"
                                width={64}
                                height={64}
                                className="object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                            Welcome Back
                        </h1>
                        <p className="text-sm text-slate-400 mt-2 font-medium">
                            Sign in to access your administrative dashboard
                        </p>
                    </div>

                    {/* Form Container */}
                    <form onSubmit={postLogin} className="flex flex-col gap-5">

                        {/* Username Field */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                                Username
                            </label>
                            <div className="relative rounded-xl bg-slate-950/80 border border-slate-800/80 focus-within:border-indigo-500/80 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-200">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 focus-within:text-indigo-400 pointer-events-none">
                                    <svg className="w-5 h-5 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full pl-11 pr-4 py-3.5 bg-transparent border-0 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-0 text-sm font-medium rounded-xl disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                                    Password
                                </label>
                                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                                    Forgot Password?
                                </a>
                            </div>
                            <div className="relative rounded-xl bg-slate-950/80 border border-slate-800/80 focus-within:border-indigo-500/80 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-200">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 focus-within:text-indigo-400 pointer-events-none">
                                    <svg className="w-5 h-5 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full pl-11 pr-12 py-3.5 bg-transparent border-0 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-0 text-sm font-medium rounded-xl disabled:opacity-50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none cursor-pointer"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center gap-2">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500/25 focus:ring-offset-slate-950 cursor-pointer"
                            />
                            <label htmlFor="remember-me" className="text-xs text-slate-400 font-medium select-none cursor-pointer">
                                Remember this device for 30 days
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:via-indigo-400 hover:to-cyan-400 text-white font-semibold text-sm shadow-[0_4px_25px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_30px_rgba(99,102,241,0.35)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Signing In...</span>
                                </>
                            ) : (
                                <span>Sign In</span>
                            )}
                        </button>
                    </form>

                    {/* Footer Info */}
                    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Enterprise-grade secure endpoint</span>
                    </div>

                </div>
            </div>
        </div>
    )
}