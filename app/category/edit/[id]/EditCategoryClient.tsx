"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    getCategoryById,
    updateCategory,
    CategoryItem,
    UpdateCategoryPayload,
} from "@/api/categoryCollection";
import Swal from "sweetalert2";
import { SyncLoader } from "react-spinners";

// ── Validation ─────────────────────────────────────────────────────────────────

interface FormErrors {
    name?: string;
    price?: string;
    description?: string;
    duration?: string;
    benefits?: string;
}

function validateForm(data: {
    name: string;
    price: string;
    description: string;
    duration: string;
    benefits: string[];
}): FormErrors {
    const errors: FormErrors = {};
    if (!data.name.trim()) errors.name = "Nama paket wajib diisi.";
    else if (data.name.trim().length < 3) errors.name = "Nama paket minimal 3 karakter.";

    const priceNum = Number(data.price);
    if (!data.price.trim()) errors.price = "Harga wajib diisi.";
    else if (isNaN(priceNum) || priceNum <= 0) errors.price = "Harga harus berupa angka positif.";

    if (!data.description.trim()) errors.description = "Deskripsi wajib diisi.";
    else if (data.description.trim().length < 10) errors.description = "Deskripsi minimal 10 karakter.";

    if (!data.duration.trim()) errors.duration = "Durasi wajib diisi.";

    if (data.benefits.filter((b) => b.trim()).length === 0)
        errors.benefits = "Tambahkan setidaknya 1 benefit.";

    return errors;
}

const DURATION_SUGGESTIONS = ["3 Hari", "1 Minggu", "2 Minggu", "1 Bulan", "2 Bulan", "3 Bulan", "6 Minggu", "8 Minggu"];

// ── Sub-components ─────────────────────────────────────────────────────────────

function FormField({
    label,
    required,
    error,
    hint,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {label}
                {required && <span className="text-red-500" aria-hidden="true">*</span>}
            </label>
            {children}
            {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
            {error && (
                <p role="alert" aria-live="polite" className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}

const inputBase =
    "w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200";
const inputError =
    "border-red-400 dark:border-red-500/60 focus:ring-red-500/40 focus:border-red-500";

// ── Loading skeleton ───────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800 ${className ?? ""}`} />;
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
    id: string;
}

export default function EditCategoryClient({ id }: Props) {
    const router = useRouter();

    // Data fetch state
    const [originalData, setOriginalData] = useState<CategoryItem | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState("");
    const [showDurationSuggestions, setShowDurationSuggestions] = useState(false);
    const [benefits, setBenefits] = useState<string[]>([""]);
    const [charCount, setCharCount] = useState(0);

    // UI state
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Load existing data ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        let isMounted = true;

        const load = async () => {
            try {
                setIsLoadingData(true);
                setFetchError(null);
                const res = await getCategoryById(id);
                if (!isMounted) return;

                const d = res.data?.data ?? (res.data as unknown as CategoryItem);
                if (!d) throw new Error("Data kategori tidak ditemukan.");

                setOriginalData(d);
                setName(d.name ?? "");
                setPrice(String(d.price ?? ""));
                setDescription(d.description ?? "");
                setDuration(d.duration ?? "");
                setCharCount((d.description ?? "").length);
                setBenefits(
                    d.benefits && d.benefits.length > 0 ? d.benefits : [""]
                );
            } catch (err: unknown) {
                if (!isMounted) return;
                const e = err as { response?: { data?: { message?: string } }; message?: string };
                const msg = e?.response?.data?.message || e?.message || "Gagal memuat data kategori.";
                setFetchError(msg);
            } finally {
                if (isMounted) setIsLoadingData(false);
            }
        };

        load();
        return () => { isMounted = false; };
    }, [id]);

    // ── Benefits helpers ────────────────────────────────────────────────────────
    const handleBenefitChange = (idx: number, val: string) => {
        setBenefits((prev) => prev.map((b, i) => (i === idx ? val : b)));
    };

    const addBenefit = () => setBenefits((prev) => [...prev, ""]);

    const removeBenefit = useCallback(
        (idx: number) => {
            if (benefits.length <= 1) return;
            setBenefits((prev) => prev.filter((_, i) => i !== idx));
        },
        [benefits.length]
    );

    const moveBenefit = (from: number, to: number) => {
        if (to < 0 || to >= benefits.length) return;
        const arr = [...benefits];
        [arr[from], arr[to]] = [arr[to], arr[from]];
        setBenefits(arr);
    };

    // ── Blur/touch handlers ─────────────────────────────────────────────────────
    const handleBlur = (field: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        setErrors(validateForm({ name, price, description, duration, benefits }));
    };

    // ── Price helpers ───────────────────────────────────────────────────────────
    const formatDisplayPrice = (raw: string) => {
        const n = raw.replace(/\D/g, "");
        return n ? new Intl.NumberFormat("id-ID").format(Number(n)) : "";
    };
    const handlePriceInput = (val: string) => setPrice(val.replace(/\D/g, ""));

    // ── Dirty check (has anything changed?) ────────────────────────────────────
    const isDirty = useCallback(() => {
        if (!originalData) return false;
        const validBenefits = benefits.filter((b) => b.trim());
        return (
            name.trim() !== (originalData.name ?? "") ||
            price !== String(originalData.price ?? "") ||
            description.trim() !== (originalData.description ?? "") ||
            duration.trim() !== (originalData.duration ?? "") ||
            JSON.stringify(validBenefits) !== JSON.stringify(originalData.benefits ?? [])
        );
    }, [name, price, description, duration, benefits, originalData]);

    // ── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ name: true, price: true, description: true, duration: true, benefits: true });
        const errs = validateForm({ name, price, description, duration, benefits });
        setErrors(errs);

        if (Object.keys(errs).length > 0) {
            document.getElementById(`field-${Object.keys(errs)[0]}`)?.focus();
            return;
        }

        if (!isDirty()) {
            Swal.fire({
                icon: "info",
                title: "Tidak Ada Perubahan",
                text: "Semua data masih sama seperti sebelumnya. Ubah setidaknya satu field untuk menyimpan.",
                confirmButtonColor: "#6366f1",
            });
            return;
        }

        setIsSubmitting(true);
        const validBenefits = benefits.filter((b) => b.trim());
        const payload: UpdateCategoryPayload = {
            name: name.trim(),
            price: Number(price),
            benefits: validBenefits,
            description: description.trim(),
            duration: duration.trim(),
        };

        try {
            await updateCategory(id, payload);
            await Swal.fire({
                icon: "success",
                title: "Kategori Berhasil Diperbarui! ✅",
                html: `<p class="text-sm text-slate-600">Data paket <strong>${payload.name}</strong> telah berhasil disimpan.</p>`,
                confirmButtonColor: "#6366f1",
                confirmButtonText: "Lihat Daftar",
                showCancelButton: true,
                cancelButtonText: "Tetap di Halaman Ini",
                cancelButtonColor: "#64748b",
            }).then((result) => {
                if (result.isConfirmed) router.push("/category");
            });
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            Swal.fire({
                icon: "error",
                title: "Gagal Memperbarui",
                text: e?.response?.data?.message || e?.message || "Terjadi kesalahan. Silakan coba lagi.",
                confirmButtonColor: "#6366f1",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Back / discard ──────────────────────────────────────────────────────────
    const handleBack = () => {
        if (!isDirty()) { router.push("/category"); return; }
        Swal.fire({
            title: "Buang perubahan?",
            text: "Data yang sudah Anda ubah belum disimpan dan akan hilang.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Ya, Buang",
            cancelButtonText: "Lanjut Mengedit",
        }).then((r) => { if (r.isConfirmed) router.push("/category"); });
    };

    const validBenefitCount = benefits.filter((b) => b.trim()).length;

    // ── Render: fetch error ─────────────────────────────────────────────────────
    if (fetchError) {
        return (
            <div className="max-w-xl mx-auto mt-16 text-center space-y-6 animate-fadeIn">
                <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gagal Memuat Data</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{fetchError}</p>
                </div>
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => router.push("/category")}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        ← Kembali
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow transition-all cursor-pointer"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    // ── Render: loading skeleton ────────────────────────────────────────────────
    if (isLoadingData) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
                {/* Header skeleton */}
                <div className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
                    <Skeleton className="w-11 h-11 rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-7 w-64" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 p-8 space-y-6 shadow-sm">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ))}
                    </div>
                    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 p-6 shadow-sm space-y-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-48 w-full rounded-2xl" />
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 p-8 shadow-sm space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>

                <div className="flex justify-center mt-6">
                    <SyncLoader color="#6366f1" size={8} speedMultiplier={0.8} />
                </div>
            </div>
        );
    }

    // ── Render: main form ───────────────────────────────────────────────────────
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            {/* ── Page Header ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
                <button
                    type="button"
                    onClick={handleBack}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all duration-200 shadow-sm cursor-pointer shrink-0"
                    aria-label="Kembali ke daftar kategori"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>

                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Kategori</span>
                        <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 truncate">{originalData?.name}</span>
                        <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-widest text-amber-500">Edit</span>
                    </div>
                    <h1 className="mt-0.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                        Edit Kategori Paket
                    </h1>
                </div>

                {/* Dirty indicator badge */}
                {isDirty() && (
                    <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Ada perubahan belum tersimpan
                    </span>
                )}
            </div>

            {/* ── Original data info strip ──────────────────────────────────── */}
            {originalData && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                        </svg>
                        <span className="text-slate-400">ID:</span>
                        <code className="font-mono text-slate-600 dark:text-slate-300">{originalData._id}</code>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-slate-400">Dibuat:</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                            {new Date(originalData.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="text-slate-400">Terakhir diperbarui:</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                            {new Date(originalData.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
                {/* ── Live Preview Bar ─────────────────────────────────────── */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                        {[
                            { label: "Nama", value: name.trim() || null, color: "bg-indigo-400" },
                            { label: "Harga", value: price ? `Rp ${formatDisplayPrice(price)}` : null, color: "bg-emerald-400" },
                            { label: "Benefit", value: validBenefitCount > 0 ? `${validBenefitCount} item` : null, color: "bg-cyan-400" },
                            { label: "Durasi", value: duration.trim() || null, color: "bg-amber-400" },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${color} shrink-0`}></span>
                                <span className="text-slate-500 dark:text-slate-400 text-xs">{label}:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs max-w-[140px] truncate">
                                    {value ?? <span className="text-slate-400 italic">—</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        {isDirty() && (
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-500/30">
                                ✎ Diubah
                            </span>
                        )}
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Preview Langsung</span>
                    </div>
                </div>

                {/* ── Main Two-Column Grid ─────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Core fields */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 backdrop-blur p-6 sm:p-8 shadow-sm space-y-6">
                            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-white/5">
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Informasi Dasar</h2>
                                    <p className="text-xs text-slate-500">Ubah identitas dan konfigurasi paket</p>
                                </div>
                            </div>

                            {/* Nama */}
                            <FormField label="Nama Paket" required error={touched.name ? errors.name : undefined} hint="Gunakan nama yang menarik dan mudah diingat">
                                <input
                                    id="field-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onBlur={() => handleBlur("name")}
                                    placeholder="Masukkan nama paket..."
                                    maxLength={80}
                                    autoComplete="off"
                                    className={`${inputBase} ${touched.name && errors.name ? inputError : ""}`}
                                />
                            </FormField>

                            {/* Harga */}
                            <FormField label="Harga Investasi (IDR)" required error={touched.price ? errors.price : undefined} hint="Masukkan angka saja, tanpa titik atau koma">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Rp</span>
                                    </div>
                                    <input
                                        id="field-price"
                                        type="text"
                                        inputMode="numeric"
                                        value={formatDisplayPrice(price)}
                                        onChange={(e) => handlePriceInput(e.target.value)}
                                        onBlur={() => handleBlur("price")}
                                        placeholder="0"
                                        className={`${inputBase} pl-10 font-mono tabular-nums ${touched.price && errors.price ? inputError : ""}`}
                                    />
                                    {price && (
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                Rp {formatDisplayPrice(price)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {/* Show delta from original */}
                                {originalData && price && Number(price) !== originalData.price && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <span className="text-slate-400">Sebelumnya:</span>
                                        <span className="font-mono line-through text-slate-400">
                                            Rp {new Intl.NumberFormat("id-ID").format(originalData.price)}
                                        </span>
                                        <span className={`font-bold ${Number(price) > originalData.price ? "text-emerald-600" : "text-red-500"}`}>
                                            {Number(price) > originalData.price ? "▲" : "▼"}
                                            {" "}Rp {new Intl.NumberFormat("id-ID").format(Math.abs(Number(price) - originalData.price))}
                                        </span>
                                    </div>
                                )}
                            </FormField>

                            {/* Durasi */}
                            <FormField label="Durasi Paket" required error={touched.duration ? errors.duration : undefined} hint="Pilih dari saran atau ketik sendiri">
                                <div className="relative">
                                    <input
                                        id="field-duration"
                                        type="text"
                                        value={duration}
                                        onChange={(e) => { setDuration(e.target.value); setShowDurationSuggestions(true); }}
                                        onBlur={() => { setTimeout(() => setShowDurationSuggestions(false), 150); handleBlur("duration"); }}
                                        onFocus={() => setShowDurationSuggestions(true)}
                                        placeholder="Contoh: 1 Minggu"
                                        autoComplete="off"
                                        className={`${inputBase} ${touched.duration && errors.duration ? inputError : ""}`}
                                    />
                                    {showDurationSuggestions && (
                                        <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                                            <div className="p-1.5 flex flex-wrap gap-1.5">
                                                {DURATION_SUGGESTIONS.filter(
                                                    (s) => !duration || s.toLowerCase().includes(duration.toLowerCase())
                                                ).map((sug) => (
                                                    <button
                                                        key={sug}
                                                        type="button"
                                                        onMouseDown={() => { setDuration(sug); setShowDurationSuggestions(false); }}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                                    >
                                                        {sug}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </FormField>

                            {/* Deskripsi */}
                            <FormField label="Deskripsi Paket" required error={touched.description ? errors.description : undefined} hint={`${charCount}/300 karakter`}>
                                <textarea
                                    id="field-description"
                                    value={description}
                                    onChange={(e) => { setDescription(e.target.value); setCharCount(e.target.value.length); }}
                                    onBlur={() => handleBlur("description")}
                                    placeholder="Jelaskan keunggulan dan sasaran paket secara singkat..."
                                    rows={4}
                                    maxLength={300}
                                    className={`${inputBase} resize-none leading-relaxed ${touched.description && errors.description ? inputError : ""}`}
                                />
                                <div className="self-end">
                                    <span className={`text-[11px] font-mono ${charCount > 270 ? "text-amber-500" : "text-slate-400"}`}>
                                        {charCount}/300
                                    </span>
                                </div>
                            </FormField>
                        </div>
                    </div>

                    {/* Right: Live preview card */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            <div className="rounded-3xl border border-amber-200/50 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 to-slate-50 dark:from-amber-950/40 dark:to-slate-900/80 p-5 shadow-sm">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-4 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Pratinjau Hasil Edit
                                </p>

                                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 p-5 shadow-sm">
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1">
                                            {name.trim() || <span className="text-slate-400 font-normal text-sm italic">Nama Paket...</span>}
                                        </h3>
                                        {duration && (
                                            <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-500/20">
                                                {duration}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
                                        {price
                                            ? <span>Rp {formatDisplayPrice(price)}</span>
                                            : <span className="text-slate-400 font-normal text-sm italic">Rp 0</span>}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 min-h-[2rem]">
                                        {description.trim() || <span className="italic">Deskripsi akan tampil di sini...</span>}
                                    </p>
                                    <hr className="border-slate-100 dark:border-white/5 mb-3" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Benefit ({validBenefitCount})</p>
                                    <ul className="space-y-1.5">
                                        {benefits.filter((b) => b.trim()).slice(0, 4).map((b, i) => (
                                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                                                <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="line-clamp-1">{b}</span>
                                            </li>
                                        ))}
                                        {validBenefitCount === 0 && <li className="text-[11px] italic text-slate-400">Belum ada benefit...</li>}
                                        {validBenefitCount > 4 && (
                                            <li className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">+ {validBenefitCount - 4} lainnya</li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Benefits Section ─────────────────────────────────────── */}
                <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 backdrop-blur p-6 sm:p-8 shadow-sm">
                    <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-white/5 mb-6">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Daftar Benefit &amp; Fasilitas</h2>
                                <p className="text-xs text-slate-500">
                                    Edit, hapus, atau tambah benefit yang didapat peserta
                                    <span className="text-red-400 ml-1">*</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
                                {validBenefitCount} aktif
                            </span>
                            <button
                                type="button"
                                onClick={addBenefit}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-[0.97]"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Tambah
                            </button>
                        </div>
                    </div>

                    {touched.benefits && errors.benefits && (
                        <div role="alert" className="flex items-center gap-2 p-3 mb-5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs font-medium text-red-600 dark:text-red-400">
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errors.benefits}
                        </div>
                    )}

                    <div className="space-y-3">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="flex items-center gap-2.5 group">
                                {/* Reorder arrows */}
                                <div className="flex flex-col gap-1 shrink-0">
                                    <button type="button" onClick={() => moveBenefit(index, index - 1)} disabled={index === 0}
                                        className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-500 disabled:opacity-30 transition-colors cursor-pointer" aria-label="Naikkan">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                        </svg>
                                    </button>
                                    <button type="button" onClick={() => moveBenefit(index, index + 1)} disabled={index === benefits.length - 1}
                                        className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-500 disabled:opacity-30 transition-colors cursor-pointer" aria-label="Turunkan">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="flex-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={benefit}
                                        onChange={(e) => handleBenefitChange(index, e.target.value)}
                                        onBlur={() => handleBlur("benefits")}
                                        placeholder={`Benefit ${index + 1}`}
                                        aria-label={`Benefit ke-${index + 1}`}
                                        className={`${inputBase} pl-10 ${touched.benefits && errors.benefits && !benefit.trim() ? inputError : ""}`}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => removeBenefit(index)}
                                    disabled={benefits.length <= 1}
                                    className="shrink-0 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/15 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                    aria-label={`Hapus benefit ke-${index + 1}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/15 flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                            Baris benefit yang <strong>dikosongkan</strong> tidak akan disimpan ke database.
                        </p>
                    </div>
                </div>

                {/* ── Footer Actions ────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="text-red-400">*</span>
                        Kolom bertanda bintang wajib diisi sebelum menyimpan.
                    </p>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting || !isDirty()}
                            className="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-sm shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.45)] transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2.5"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <span>Menyimpan...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Simpan Perubahan</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
