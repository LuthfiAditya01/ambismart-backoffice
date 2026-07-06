"use client";

import { useState, useEffect, useMemo } from "react";
import { getClasses, ClassItem } from "@/api/classCollection";
import Swal from "sweetalert2";
import { SyncLoader } from "react-spinners";
import { useRouter } from "next/navigation";

export default function ClassClient() {
    const router = useRouter();
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Controls
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [filterHighlight, setFilterHighlight] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("default");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

    const fetchClasses = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await getClasses();
            
            if (response && response.data) {
                const dataArray = Array.isArray(response.data.data) 
                    ? response.data.data 
                    : Array.isArray(response.data) 
                    ? response.data 
                    : [];
                setClasses(dataArray);
            }
        } catch (err: unknown) {
            const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
            console.error("Failed to load classes:", err);
            const errMsg = errorObj?.response?.data?.message || errorObj?.message || "Gagal memuat data kelas dari server";
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
                const response = await getClasses();
                if (isMounted && response && response.data) {
                    const dataArray = Array.isArray(response.data.data) 
                        ? response.data.data 
                        : Array.isArray(response.data) 
                        ? response.data 
                        : [];
                    setClasses(dataArray);
                }
            } catch (err: unknown) {
                if (!isMounted) return;
                const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
                console.error("Failed to load classes:", err);
                const errMsg = errorObj?.response?.data?.message || errorObj?.message || "Gagal memuat data kelas dari server";
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
    const formatDate = (dateString?: string) => {
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

    // Helper: cari harga minimum dari categories dalam satu kelas
    const getMinPrice = (item: ClassItem) => {
        if (!item.categories || item.categories.length === 0) return 0;
        const prices = item.categories.map((c) => c.price || 0);
        return Math.min(...prices);
    };

    // Filter dan Sorting
    const filteredClasses = useMemo(() => {
        let result = [...classes];

        // Filter Highlight
        if (filterHighlight === "highlight") {
            result = result.filter((item) => item.highlight === true);
        } else if (filterHighlight === "regular") {
            result = result.filter((item) => !item.highlight);
        }

        // Search Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (item) =>
                    item.name?.toLowerCase().includes(q) ||
                    item.subtitle?.toLowerCase().includes(q) ||
                    item.description?.toLowerCase().includes(q) ||
                    item.features?.some((f) => f.toLowerCase().includes(q)) ||
                    item.categories?.some((c) => c.name?.toLowerCase().includes(q))
            );
        }

        // Sorting
        if (sortBy === "price-asc") {
            result.sort((a, b) => getMinPrice(a) - getMinPrice(b));
        } else if (sortBy === "price-desc") {
            result.sort((a, b) => getMinPrice(b) - getMinPrice(a));
        } else if (sortBy === "name-asc") {
            result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        } else if (sortBy === "name-desc") {
            result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        }

        return result;
    }, [classes, searchQuery, filterHighlight, sortBy]);

    // Statistik Ringkas
    const stats = useMemo(() => {
        const total = classes.length;
        const highlighted = classes.filter((c) => c.highlight).length;
        const totalPackages = classes.reduce((acc, curr) => acc + (curr.categories?.length || 0), 0);
        return { total, highlighted, totalPackages };
    }, [classes]);

    // Action demo hander
    const handleAddClass = () => {
        router.push("/class/add")
        // Swal.fire({
        //     title: "Tambah Program Kelas",
        //     text: "Modul penambahan kelas baru sedang dalam tahap integrasi dengan database.",
        //     icon: "info",
        //     confirmButtonColor: "#6366f1",
        //     confirmButtonText: "Mengerti",
        // });
    };

    const handleDelete = (item: ClassItem, e: React.MouseEvent) => {
        e.stopPropagation();
        Swal.fire({
            title: "Hapus Program Kelas?",
            text: `Apakah Anda yakin ingin menghapus kelas "${item.name}"? Seluruh pilihan paket terkait juga akan terpengaruh.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Ya, Hapus",
            cancelButtonText: "Batal",
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: "Terhapus (Demo)",
                    text: `Program kelas ${item.name} berhasil ditandai untuk dihapus.`,
                    icon: "success",
                    confirmButtonColor: "#10b981",
                });
            }
        });
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header Title Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                            Manajemen Program
                        </span>
                    </div>
                    <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Daftar Program Kelas &amp; Bootcamp
                    </h1>
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                        Kelola program bimbingan intensif, kelas percepatan, fasilitas utama, tautan pendaftaran, serta variasi paket harga yang ditawarkan.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchClasses}
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
                        onClick={handleAddClass}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:via-indigo-400 hover:to-cyan-400 text-white font-semibold text-sm shadow-[0_4px_20px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.4)] transition-all duration-200 active:scale-[0.98] flex items-center gap-2 cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Tambah Kelas</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/60 backdrop-blur transition-all duration-300 hover:shadow-md hover:border-indigo-500/30 group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Total Program Kelas
                        </span>
                        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {isLoading ? "..." : stats.total}
                        </span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            Program
                        </span>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/60 backdrop-blur transition-all duration-300 hover:shadow-md hover:border-amber-500/30 group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Kelas Unggulan (Highlight)
                        </span>
                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {isLoading ? "..." : stats.highlighted}
                        </span>
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                            Populer
                        </span>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/60 backdrop-blur transition-all duration-300 hover:shadow-md hover:border-cyan-500/30 sm:col-span-2 lg:col-span-1 group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-cyan-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Total Opsi Paket
                        </span>
                        <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                            {isLoading ? "..." : stats.totalPackages}
                        </span>
                        <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 px-2 py-0.5 rounded-full">
                            Varian Harga
                        </span>
                    </div>
                </div>
            </div>

            {/* Controls Bar: Search, Filter, Sort & View Switcher */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm dark:bg-slate-900/60 dark:border-white/10 backdrop-blur">
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
                        placeholder="Cari kelas, deskripsi, atau fitur..."
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

                {/* Right controls: Filter, Sort & View Toggle */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Filter Highlight */}
                    <div className="flex items-center gap-2">
                        <select
                            value={filterHighlight}
                            onChange={(e) => setFilterHighlight(e.target.value)}
                            className="py-2.5 px-3 text-sm bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                        >
                            <option value="all">Semua Program</option>
                            <option value="highlight">⭐ Unggulan (Highlight)</option>
                            <option value="regular">Reguler (Non-Highlight)</option>
                        </select>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="py-2.5 px-3.5 text-sm bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                        >
                            <option value="default">Terbaru (Default)</option>
                            <option value="price-asc">Harga: Mulai Terendah</option>
                            <option value="price-desc">Harga: Mulai Tertinggi</option>
                            <option value="name-asc">Nama: A - Z</option>
                            <option value="name-desc">Nama: Z - A</option>
                        </select>
                    </div>

                    {/* View Switcher */}
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
                            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Gagal Memuat Data Kelas</h3>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchClasses}
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
                        Mengambil data program kelas dari server...
                    </p>
                </div>
            ) : filteredClasses.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-white/10">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">Tidak ada program kelas ditemukan</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                        {searchQuery || filterHighlight !== "all"
                            ? "Filter atau pencarian Anda tidak menghasilkan program yang sesuai."
                            : "Belum ada program kelas atau bootcamp yang terdaftar dalam database."}
                    </p>
                    {(searchQuery || filterHighlight !== "all") && (
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setFilterHighlight("all");
                            }}
                            className="mt-5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer"
                        >
                            Reset Filter
                        </button>
                    )}
                </div>
            ) : viewMode === "grid" ? (
                /* Grid Cards View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                    {filteredClasses.map((item) => {
                        const minPrice = getMinPrice(item);
                        const accentColor = item.color || "#6366f1";

                        return (
                            <div
                                key={item._id}
                                onClick={() => setSelectedClass(item)}
                                style={{ borderLeftColor: accentColor, borderLeftWidth: "6px" }}
                                className="flex flex-col justify-between rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 p-6 sm:p-7 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer relative overflow-hidden"
                            >
                                {/* Top right subtle glow */}
                                <div
                                    style={{ backgroundColor: `${accentColor}15` }}
                                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:scale-125 transition-transform duration-500"
                                ></div>

                                <div>
                                    {/* Header Info */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span
                                                style={{ backgroundColor: accentColor }}
                                                className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm"
                                            ></span>
                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                ID: {item._id.slice(-6)}
                                            </span>
                                        </div>

                                        {item.highlight && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                                                <span>⭐ Unggulan</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Class Title & Subtitle */}
                                    <div className="mt-2.5">
                                        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {item.name}
                                        </h3>
                                        <p className="text-xs sm:text-sm font-semibold text-indigo-500 dark:text-indigo-300 mt-1">
                                            {item.subtitle || "Program persiapan Bimbingan"}
                                        </p>
                                    </div>

                                    {/* Description */}
                                    <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
                                        {item.description || "Tidak ada deskripsi detail program kelas."}
                                    </p>

                                    {/* Pricing & Packages Tag */}
                                    <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                                        <div>
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                                Mulai Investasi
                                            </span>
                                            <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                                                {minPrice > 0 ? formatCurrency(minPrice) : "Gratis / Hubungi Admin"}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-bold border border-indigo-200/50 dark:border-indigo-500/20 inline-block">
                                                {item.categories?.length || 0} Pilihan Paket
                                            </span>
                                        </div>
                                    </div>

                                    {/* Features Preview */}
                                    {item.features && item.features.length > 0 && (
                                        <div className="mt-5">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                Fitur &amp; Fasilitas Program
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {item.features.slice(0, 4).map((feat, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                        <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span className="line-clamp-1">{feat}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer */}
                                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                                    <span className="text-[11px] text-slate-400">
                                        Dibuat: {formatDate(item.createdAt)}
                                    </span>

                                    <div className="flex items-center gap-2">
                                        {/* Primary action — solid indigo, labeled with icon */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedClass(item);
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
                                                router.push(`/class/edit/${item._id}`);
                                            }}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white text-xs font-bold shadow-[0_2px_12px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_16px_rgba(245,158,11,0.4)] transition-all duration-200 cursor-pointer"
                                            aria-label={`Edit program ${item.name}`}
                                        >
                                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <span>Edit</span>
                                        </button>

                                        {/* Destructive action — solid red */}
                                        <button
                                            onClick={(e) => handleDelete(item, e)}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-red-500 hover:bg-red-600 active:scale-[0.97] text-white text-xs font-bold shadow-[0_2px_12px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_16px_rgba(239,68,68,0.4)] transition-all duration-200 cursor-pointer"
                                            aria-label={`Hapus program ${item.name}`}
                                        >
                                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            <span>Hapus</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Table View */
                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/80 backdrop-blur">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/50">
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Program Kelas &amp; Subtitle
                                    </th>
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Status
                                    </th>
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Pilihan Paket
                                    </th>
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Harga Mulai
                                    </th>
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Tanggal Dibuat
                                    </th>
                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {filteredClasses.map((item) => {
                                    const minPrice = getMinPrice(item);
                                    return (
                                        <tr
                                            key={item._id}
                                            onClick={() => setSelectedClass(item)}
                                            className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                        >
                                            <td className="py-4 px-6 max-w-sm">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        style={{ backgroundColor: item.color || "#6366f1" }}
                                                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                                    ></span>
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {item.name}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5 line-clamp-1 pl-4">
                                                    {item.subtitle || item.description}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                {item.highlight ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                        ⭐ Unggulan
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                        Reguler
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-500/20">
                                                    {item.categories?.length || 0} Paket
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                                                    {minPrice > 0 ? formatCurrency(minPrice) : "-"}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                                                {formatDate(item.createdAt)}
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => setSelectedClass(item)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        <span>Detail</span>
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/class/edit/${item._id}`)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                                                        aria-label={`Edit program ${item.name}`}
                                                    >
                                                        <span>Edit</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(item, e)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-500 hover:text-white text-red-600 dark:bg-red-500/15 dark:hover:bg-red-500 dark:text-red-400 dark:hover:text-white text-xs font-bold transition-all cursor-pointer"
                                                        aria-label={`Hapus program ${item.name}`}
                                                    >
                                                        <span>Hapus</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detail Modal / Drawer */}
            {selectedClass && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
                    onClick={() => setSelectedClass(null)}
                >
                    <div
                        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-2xl transition-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setSelectedClass(null)}
                            className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Top Accent & Status */}
                        <div className="flex items-center gap-3 mb-4">
                            <span
                                style={{ backgroundColor: selectedClass.color || "#6366f1" }}
                                className="w-3 h-3 rounded-full inline-block shadow-sm"
                            ></span>
                            {selectedClass.highlight ? (
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                    ⭐ Program Unggulan
                                </span>
                            ) : (
                                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    Program Reguler
                                </span>
                            )}
                            <span className="text-xs font-mono text-slate-400">
                                ID: {selectedClass._id}
                            </span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                            {selectedClass.name}
                        </h2>
                        <p className="text-base font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                            {selectedClass.subtitle}
                        </p>

                        <div className="mt-6">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Deskripsi Program
                            </h4>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5">
                                {selectedClass.description || "Tidak ada deskripsi tersedia."}
                            </p>
                        </div>

                        {/* Features List */}
                        {selectedClass.features && selectedClass.features.length > 0 && (
                            <div className="mt-6">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                                    Fitur &amp; Keunggulan Kelas ({selectedClass.features.length})
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {selectedClass.features.map((feat, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5"
                                        >
                                            <div className="p-1 rounded bg-emerald-500/10 text-emerald-500 shrink-0">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {feat}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Associated Pricing Packages (Categories) */}
                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center justify-between">
                                <span>Pilihan Paket Harga ({selectedClass.categories?.length || 0})</span>
                                <span className="text-[11px] font-normal text-indigo-500">Terhubung dengan modul Kategori</span>
                            </h4>
                            
                            {(!selectedClass.categories || selectedClass.categories.length === 0) ? (
                                <p className="text-xs text-slate-400 italic">Belum ada paket kategori yang terhubung ke kelas ini.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {selectedClass.categories.map((cat) => (
                                        <div
                                            key={cat._id}
                                            className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-950/80 dark:to-indigo-950/20 border border-slate-200 dark:border-white/10 flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                                                        {cat.name}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500 shrink-0">
                                                        {cat.duration}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                                                    {formatCurrency(cat.price || 0)}
                                                </div>
                                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                                    {cat.description}
                                                </p>
                                            </div>

                                            {cat.benefits && cat.benefits.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5">
                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">
                                                        Benefit Utama:
                                                    </p>
                                                    <ul className="space-y-1">
                                                        {cat.benefits.slice(0, 2).map((b, bIdx) => (
                                                            <li key={bIdx} className="text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                                                <span className="truncate">{b}</span>
                                                            </li>
                                                        ))}
                                                        {cat.benefits.length > 2 && (
                                                            <li className="text-[10px] font-medium text-indigo-500">
                                                                + {cat.benefits.length - 2} benefit lainnya
                                                            </li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                            <div>
                                Dibuat: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(selectedClass.createdAt)}</span>
                            </div>
                            <button
                                onClick={() => setSelectedClass(null)}
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
