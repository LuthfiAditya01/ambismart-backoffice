"use client";

import { useState, useEffect, useMemo } from "react";
import { getCategories, CategoryItem, deleteCategory } from "@/api/categoryCollection";
import Swal from "sweetalert2";
import { SyncLoader } from "react-spinners";
import { useRouter } from "next/navigation";

export default function CategoryClient() {
    const route = useRouter();
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Controls
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortBy, setSortBy] = useState<string>("default");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);

    const fetchCategories = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await getCategories();
            
            if (response && response.data) {
                const dataArray = Array.isArray(response.data.data) 
                    ? response.data.data 
                    : Array.isArray(response.data) 
                    ? response.data 
                    : [];
                setCategories(dataArray);
            }
        } catch (err: unknown) {
            const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
            console.error("Failed to load categories:", err);
            const errMsg = errorObj?.response?.data?.message || errorObj?.message || "Gagal memuat data kategori dari server";
            setError(errMsg);
            Swal.fire({
                icon: "error",
                title: "Gagal Memuat Data",
                text: errMsg,
                confirmButtonColor: "#6366f1",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const initFetch = async () => {
            try {
                const response = await getCategories();
                if (isMounted && response && response.data) {
                    const dataArray = Array.isArray(response.data.data) 
                        ? response.data.data 
                        : Array.isArray(response.data) 
                        ? response.data 
                        : [];
                    setCategories(dataArray);
                }
            } catch (err: unknown) {
                if (!isMounted) return;
                const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
                console.error("Failed to load categories:", err);
                const errMsg = errorObj?.response?.data?.message || errorObj?.message || "Gagal memuat data kategori dari server";
                setError(errMsg);
                Swal.fire({
                    icon: "error",
                    title: "Gagal Memuat Data",
                    text: errMsg,
                    confirmButtonColor: "#6366f1",
                });
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };
        initFetch();
        return () => {
            isMounted = false;
        };
    }, []);

    // Format mata uang IDR
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Format tanggal
    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        try {
            return new Date(dateString).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        } catch {
            return dateString;
        }
    };

    // Filter dan Sorting
    const filteredCategories = useMemo(() => {
        let result = [...categories];

        // Search Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (item) =>
                    item.name?.toLowerCase().includes(q) ||
                    item.description?.toLowerCase().includes(q) ||
                    item.benefits?.some((b) => b.toLowerCase().includes(q))
            );
        }

        // Sorting
        if (sortBy === "price-asc") {
            result.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (sortBy === "price-desc") {
            result.sort((a, b) => (b.price || 0) - (a.price || 0));
        } else if (sortBy === "name-asc") {
            result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        } else if (sortBy === "name-desc") {
            result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        }

        return result;
    }, [categories, searchQuery, sortBy]);

    // Statistik Ringkas
    const stats = useMemo(() => {
        const total = categories.length;
        const avgPrice = total > 0 ? categories.reduce((acc, curr) => acc + (curr.price || 0), 0) / total : 0;
        const minPrice = total > 0 ? Math.min(...categories.map((c) => c.price || 0)) : 0;
        const maxPrice = total > 0 ? Math.max(...categories.map((c) => c.price || 0)) : 0;
        return { total, avgPrice, minPrice, maxPrice };
    }, [categories]);

    // Action demo hander
    const handleAddCategory = () => {
        route.push("/category/add");
        // Swal.fire({
        //     title: "Tambah Kategori Baru",
        //     text: "Modul penambahan kategori baru sedang dalam tahap sinkronisasi dengan endpoint backend.",
        //     icon: "info",
        //     confirmButtonColor: "#6366f1",
        //     confirmButtonText: "Mengerti",
        // });
    };

    const handleDelete = async (item: CategoryItem, e: React.MouseEvent) => {
        e.stopPropagation();
        const result = await Swal.fire({
            title: "Hapus Kategori?",
            text: `Apakah Anda yakin ingin menghapus "${item.name}"? Action ini tidak dapat dibatalkan.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Ya, Hapus",
            cancelButtonText: "Batal",
        });

        if (!result.isConfirmed) return;

        try {
            // BUG FIX #1: axios membungkus response di dalam .data,
            // sehingga response.success selalu undefined.
            // Akses yang benar: response.data.success
            const response = await deleteCategory(item._id);
            const isSuccess = response?.data?.success ?? response?.status === 200;

            if (isSuccess) {
                // BUG FIX #2: hapus item dari local state supaya UI
                // langsung terupdate tanpa perlu refetch ke server
                setCategories((prev) => prev.filter((c) => c._id !== item._id));

                Swal.fire({
                    title: "Berhasil Dihapus",
                    text: `Paket "${item.name}" telah dihapus dari database.`,
                    icon: "success",
                    confirmButtonColor: "#10b981",
                    timer: 3000,
                    timerProgressBar: true,
                });
            }
        } catch (err: unknown) {
            // BUG FIX #3: tidak ada error handling sebelumnya —
            // jika API gagal, user tidak mendapat feedback apapun
            const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
            const errMsg =
                errorObj?.response?.data?.message ||
                errorObj?.message ||
                "Gagal menghapus kategori. Silakan coba lagi.";

            Swal.fire({
                icon: "error",
                title: "Gagal Menghapus",
                text: errMsg,
                confirmButtonColor: "#6366f1",
            });
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header Title Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                            Manajemen Layanan
                        </span>
                    </div>
                    <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Daftar Kategori &amp; Paket Bimbingan
                    </h1>
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                        Kelola struktur paket, harga investasi, durasi bimbingan, serta daftar manfaat eksklusif yang ditawarkan kepada mahasiswa.
                    </p>
                </div>
        2 
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchCategories}
                        disabled={isLoading}
                        title="Refresh Data"
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-200 transition-all duration-200 shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center"
                    >
                        <svg
                            className={`w-5 h-5 ${isLoading ? "animate-spin text-indigo-500" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </button>

                    <button
                        onClick={handleAddCategory}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:via-indigo-400 hover:to-cyan-400 text-white font-semibold text-sm shadow-[0_4px_20px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.4)] transition-all duration-200 active:scale-[0.98] flex items-center gap-2 cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Tambah Kategori</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/60 backdrop-blur transition-all duration-300 hover:shadow-md hover:border-indigo-500/30 group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Total Paket Tersedia
                        </span>
                        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {isLoading ? "..." : stats.total}
                        </span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            Aktif
                        </span>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/60 backdrop-blur transition-all duration-300 hover:shadow-md hover:border-cyan-500/30 group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-cyan-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Rata-Rata Harga Paket
                        </span>
                        <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {isLoading ? "..." : formatCurrency(stats.avgPrice)}
                        </span>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/60 backdrop-blur transition-all duration-300 hover:shadow-md hover:border-amber-500/30 sm:col-span-2 lg:col-span-1 group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Rentang Investasi
                        </span>
                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{isLoading ? "..." : formatCurrency(stats.minPrice)}</span>
                        <span className="text-slate-400">→</span>
                        <span>{isLoading ? "..." : formatCurrency(stats.maxPrice)}</span>
                    </div>
                </div>
            </div>

            {/* Controls Bar: Search, Sort & View Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm dark:bg-slate-900/60 dark:border-white/10 backdrop-blur">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari paket, deskripsi, atau benefit..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Right controls: Sort & View Toggle */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">Urutkan:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="py-2.5 px-3.5 text-sm bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                        >
                            <option value="default">Terbaru (Default)</option>
                            <option value="price-asc">Harga: Rendah ke Tinggi</option>
                            <option value="price-desc">Harga: Tinggi ke Rendah</option>
                            <option value="name-asc">Nama: A - Z</option>
                            <option value="name-desc">Nama: Z - A</option>
                        </select>
                    </div>

                    <div className="flex items-center bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => setViewMode("grid")}
                            title="Tampilan Kartu (Grid)"
                            className={`p-2 rounded-lg text-sm transition-all cursor-pointer ${
                                viewMode === "grid"
                                    ? "bg-white dark:bg-white/15 text-indigo-600 dark:text-white shadow-sm"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            title="Tampilan Tabel"
                            className={`p-2 rounded-lg text-sm transition-all cursor-pointer ${
                                viewMode === "table"
                                    ? "bg-white dark:bg-white/15 text-indigo-600 dark:text-white shadow-sm"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Message Box if any */}
            {error && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Gagal Memuat Kategori</h3>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchCategories}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow transition-colors shrink-0 cursor-pointer"
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {/* Content Section */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-white/10">
                    <SyncLoader color="#6366f1" size={10} speedMultiplier={0.8} />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse mt-2">
                        Mengambil data kategori dari server...
                    </p>
                </div>
            ) : filteredCategories.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-white/10">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">Tidak ada kategori ditemukan</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                        {searchQuery
                            ? `Pencarian dengan kata kunci "${searchQuery}" tidak menghasilkan cocok dengan paket manapun.`
                            : "Belum ada paket atau kategori yang terdaftar dalam database."}
                    </p>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="mt-5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer"
                        >
                            Reset Pencarian
                        </button>
                    )}
                </div>
            ) : viewMode === "grid" ? (
                /* Grid Cards View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCategories.map((item) => (
                        <div
                            key={item._id}
                            onClick={() => setSelectedCategory(item)}
                            className="flex flex-col justify-between rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 p-6 shadow-sm hover:shadow-xl hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all duration-300 group cursor-pointer relative overflow-hidden"
                        >
                            {/* Subtle top glow on hover */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <div>
                                {/* Card Header: Title & Duration Badge */}
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                                        {item.name}
                                    </h3>
                                    <span className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20">
                                        {item.duration || "N/A"}
                                    </span>
                                </div>

                                {/* Price Display */}
                                <div className="mt-4 flex items-baseline gap-1.5">
                                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                        {formatCurrency(item.price || 0)}
                                    </span>
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                        / paket
                                    </span>
                                </div>

                                {/* Description */}
                                <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[2.25rem]">
                                    {item.description || "Tidak ada deskripsi paket."}
                                </p>

                                <hr className="my-4 border-slate-100 dark:border-white/5" />

                                {/* Benefits Preview */}
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                                        <span>Keuntungan &amp; Fasilitas</span>
                                        <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                                            {item.benefits?.length || 0}
                                        </span>
                                    </p>
                                    <ul className="space-y-2">
                                        {item.benefits?.slice(0, 3).map((benefit, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                                <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="line-clamp-1">{benefit}</span>
                                            </li>
                                        ))}
                                        {(item.benefits?.length || 0) > 3 && (
                                            <li className="text-xs font-medium text-indigo-600 dark:text-indigo-400 pl-6 pt-0.5">
                                                + {(item.benefits?.length || 0) - 3} fasilitas lainnya...
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                                <span className="text-[11px] text-slate-400 shrink-0">
                                    Dibuat: {formatDate(item.createdAt)}
                                </span>

                                <div className="flex items-center gap-2">
                                    {/* Primary action — solid indigo, labeled */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCategory(item);
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white text-xs font-bold shadow-[0_2px_12px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_16px_rgba(99,102,241,0.5)] transition-all duration-200 cursor-pointer"
                                        aria-label={`Lihat detail ${item.name}`}
                                    >
                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        <span>Detail</span>
                                    </button>

                                    {/* Edit action — solid amber */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            route.push(`/category/edit/${item._id}`);
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white text-xs font-bold shadow-[0_2px_12px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_16px_rgba(245,158,11,0.4)] transition-all duration-200 cursor-pointer"
                                        aria-label={`Edit kategori ${item.name}`}
                                    >
                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        <span>Edit</span>
                                    </button>

                                    {/* Destructive action — solid red, labeled */}
                                    <button
                                        onClick={(e) => handleDelete(item, e)}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-red-500 hover:bg-red-600 active:scale-[0.97] text-white text-xs font-bold shadow-[0_2px_12px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.4)] transition-all duration-200 cursor-pointer"
                                        aria-label={`Hapus kategori ${item.name}`}
                                    >
                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Hapus</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Table View */
                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/80 backdrop-blur">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/50">
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Nama Paket &amp; Deskripsi
                                    </th>
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Durasi
                                    </th>
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Harga Investasi
                                    </th>
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Total Benefit
                                    </th>
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Diperbarui
                                    </th>
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {filteredCategories.map((item) => (
                                    <tr
                                        key={item._id}
                                        onClick={() => setSelectedCategory(item)}
                                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                    >
                                        <td className="py-4 px-6 max-w-sm">
                                            <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {item.name}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                                {item.description}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 whitespace-nowrap">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20">
                                                {item.duration}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 whitespace-nowrap">
                                            <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                                                {formatCurrency(item.price || 0)}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                                {item.benefits?.length || 0} fasilitas
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                                            {formatDate(item.updatedAt || item.createdAt)}
                                        </td>
                                        <td className="py-4 px-6 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setSelectedCategory(item)}
                                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-white/5 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                                                >
                                                    Detail
                                                </button>
                                                <button
                                                    onClick={() => route.push(`/category/edit/${item._id}`)}
                                                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                                                    aria-label={`Edit kategori ${item.name}`}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(item, e)}
                                                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-white/5 dark:hover:bg-red-500/15 dark:hover:text-red-300 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detail Modal / Drawer */}
            {selectedCategory && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
                    onClick={() => setSelectedCategory(null)}
                >
                    <div
                        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-2xl transition-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20">
                                {selectedCategory.duration}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                                ID: {selectedCategory._id}
                            </span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                            {selectedCategory.name}
                        </h2>

                        <div className="mt-3 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(selectedCategory.price || 0)}
                        </div>

                        <div className="mt-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Deskripsi Paket
                            </h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5">
                                {selectedCategory.description || "Tidak ada deskripsi tersedia."}
                            </p>
                        </div>

                        <div className="mt-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                                <span>Daftar Keuntungan &amp; Benefit ({selectedCategory.benefits?.length || 0})</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {selectedCategory.benefits?.map((benefit, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5"
                                    >
                                        <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 mt-0.5 shrink-0">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
                                            {benefit}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                            <div>
                                Dibuat: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(selectedCategory.createdAt)}</span> &bull; Diperbarui: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(selectedCategory.updatedAt)}</span>
                            </div>
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs shadow transition-all cursor-pointer"
                            >
                                Tutup Detail
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
