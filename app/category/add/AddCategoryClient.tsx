"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createCategory, CreateCategoryPayload } from "@/api/categoryCollection";
import Swal from "sweetalert2";

// ── Validation helpers ─────────────────────────────────────────────────────────

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

    if (!data.name.trim()) {
        errors.name = "Nama paket wajib diisi.";
    } else if (data.name.trim().length < 3) {
        errors.name = "Nama paket minimal 3 karakter.";
    }

    const priceNum = Number(data.price);
    if (!data.price.trim()) {
        errors.price = "Harga paket wajib diisi.";
    } else if (isNaN(priceNum) || priceNum <= 0) {
        errors.price = "Harga harus berupa angka positif.";
    }

    if (!data.description.trim()) {
        errors.description = "Deskripsi paket wajib diisi.";
    } else if (data.description.trim().length < 10) {
        errors.description = "Deskripsi minimal 10 karakter.";
    }

    if (!data.duration.trim()) {
        errors.duration = "Durasi paket wajib diisi.";
    }

    const validBenefits = data.benefits.filter((b) => b.trim().length > 0);
    if (validBenefits.length === 0) {
        errors.benefits = "Tambahkan setidaknya 1 (satu) benefit atau fasilitas.";
    }

    return errors;
}

// ── Duration suggestions ───────────────────────────────────────────────────────

const DURATION_SUGGESTIONS = ["3 Hari", "1 Minggu", "2 Minggu", "1 Bulan", "2 Bulan", "3 Bulan", "6 Minggu", "8 Minggu"];

// ── Field component ────────────────────────────────────────────────────────────

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
                {required && (
                    <span className="text-red-500 dark:text-red-400" aria-hidden="true">
                        *
                    </span>
                )}
            </label>
            {children}
            {hint && !error && (
                <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
            )}
            {error && (
                <p
                    role="alert"
                    aria-live="polite"
                    className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                >
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AddCategoryClient() {
    const router = useRouter();

    // Form state
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState("");
    const [showDurationSuggestions, setShowDurationSuggestions] = useState(false);
    const [benefits, setBenefits] = useState<string[]>(["", "", "", ""]);

    // UI state
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [charCount, setCharCount] = useState(0);

    // ── Benefits management ─────────────────────────────────────────────────────

    const handleBenefitChange = (index: number, value: string) => {
        const updated = [...benefits];
        updated[index] = value;
        setBenefits(updated);
    };

    const addBenefit = () => {
        setBenefits((prev) => [...prev, ""]);
    };

    const removeBenefit = useCallback(
        (index: number) => {
            if (benefits.length <= 1) return;
            setBenefits((prev) => prev.filter((_, i) => i !== index));
        },
        [benefits.length]
    );

    const moveBenefit = (fromIdx: number, toIdx: number) => {
        if (toIdx < 0 || toIdx >= benefits.length) return;
        const updated = [...benefits];
        [updated[fromIdx], updated[toIdx]] = [updated[toIdx], updated[fromIdx]];
        setBenefits(updated);
    };

    // ── Blur / touched handlers ─────────────────────────────────────────────────

    const handleBlur = (field: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        const currentErrors = validateForm({ name, price, description, duration, benefits });
        setErrors(currentErrors);
    };

    // ── Price formatting for display ────────────────────────────────────────────

    const formatDisplayPrice = (raw: string) => {
        const num = raw.replace(/\D/g, "");
        if (!num) return "";
        return new Intl.NumberFormat("id-ID").format(Number(num));
    };

    const handlePriceInput = (val: string) => {
        const raw = val.replace(/\D/g, "");
        setPrice(raw);
    };

    // ── Submit handler ──────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Mark all touched
        setTouched({ name: true, price: true, description: true, duration: true, benefits: true });

        const currentErrors = validateForm({ name, price, description, duration, benefits });
        setErrors(currentErrors);

        if (Object.keys(currentErrors).length > 0) {
            // Focus the first invalid field
            const firstErrorKey = Object.keys(currentErrors)[0];
            const el = document.getElementById(`field-${firstErrorKey}`);
            el?.focus();
            return;
        }

        setIsSubmitting(true);

        const validBenefits = benefits.filter((b) => b.trim().length > 0);
        const payload: CreateCategoryPayload = {
            name: name.trim(),
            price: Number(price),
            benefits: validBenefits,
            description: description.trim(),
            duration: duration.trim(),
        };

        try {
            await createCategory(payload);

            await Swal.fire({
                icon: "success",
                title: "Kategori Berhasil Ditambahkan! 🎉",
                html: `<p class="text-sm text-slate-600">Paket <strong>${payload.name}</strong> telah berhasil disimpan ke database dan kini tersedia di daftar kategori.</p>`,
                confirmButtonColor: "#6366f1",
                confirmButtonText: "Lihat Daftar Kategori",
                showCancelButton: true,
                cancelButtonText: "Tambah Lagi",
                cancelButtonColor: "#64748b",
            }).then((result) => {
                if (result.isConfirmed) {
                    router.push("/category");
                } else if (result.isDismissed || result.dismiss) {
                    // Reset form untuk tambah lagi
                    setName("");
                    setPrice("");
                    setDescription("");
                    setDuration("");
                    setBenefits(["", "", "", ""]);
                    setErrors({});
                    setTouched({});
                    setCharCount(0);
                }
            });
        } catch (err: unknown) {
            const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
            const errMsg =
                errorObj?.response?.data?.message ||
                errorObj?.message ||
                "Terjadi kesalahan saat menyimpan kategori. Periksa koneksi Anda dan coba lagi.";

            Swal.fire({
                icon: "error",
                title: "Gagal Menyimpan Kategori",
                html: `<p class="text-sm text-slate-600">${errMsg}</p>`,
                confirmButtonColor: "#6366f1",
                confirmButtonText: "Coba Lagi",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Discard / back handler ──────────────────────────────────────────────────

    const handleDiscard = () => {
        const isDirty =
            name.trim() || price || description.trim() || duration.trim() || benefits.some((b) => b.trim());

        if (!isDirty) {
            router.push("/category");
            return;
        }

        Swal.fire({
            title: "Buang perubahan?",
            text: "Semua data yang sudah Anda isi akan hilang dan tidak dapat dikembalikan.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Ya, Buang",
            cancelButtonText: "Lanjut Mengisi",
        }).then((result) => {
            if (result.isConfirmed) {
                router.push("/category");
            }
        });
    };

    // ── Valid benefits count for real-time preview ──────────────────────────────

    const validBenefitCount = benefits.filter((b) => b.trim()).length;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={handleDiscard}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all duration-200 shadow-sm cursor-pointer"
                    aria-label="Kembali ke daftar kategori"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>

                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
                            Kategori
                        </span>
                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                            Tambah Baru
                        </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Tambah Kategori Paket Baru
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
                {/* ── Top Summary Preview Bar ─────────────────────────────────── */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-indigo-950/40 dark:to-cyan-950/30 border border-indigo-200/60 dark:border-indigo-500/20 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></span>
                            <span className="text-slate-500 dark:text-slate-400 text-xs">Nama:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs max-w-[140px] truncate">
                                {name.trim() || <span className="text-slate-400 italic">Belum diisi</span>}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                            <span className="text-slate-500 dark:text-slate-400 text-xs">Harga:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs font-mono">
                                {price ? `Rp ${formatDisplayPrice(price)}` : <span className="text-slate-400 italic">—</span>}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                            <span className="text-slate-500 dark:text-slate-400 text-xs">Benefit:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                {validBenefitCount > 0 ? `${validBenefitCount} item` : <span className="text-slate-400 italic">0 item</span>}
                            </span>
                        </div>
                        {duration && (
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                                <span className="text-slate-500 dark:text-slate-400 text-xs">Durasi:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{duration}</span>
                            </div>
                        )}
                    </div>
                    <span className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400">
                        Preview Langsung
                    </span>
                </div>

                {/* ── Main Form Card ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Core Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Section: Informasi Dasar */}
                        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 backdrop-blur p-6 sm:p-8 shadow-sm space-y-6">
                            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-white/5">
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Informasi Dasar</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Identitas dan posisi paket kategori</p>
                                </div>
                            </div>

                            {/* Nama Paket */}
                            <FormField
                                label="Nama Paket"
                                required
                                error={touched.name ? errors.name : undefined}
                                hint="Contoh: Basic (Biar Gak Blank) — gunakan nama yang menarik dan deskriptif"
                            >
                                <input
                                    id="field-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onBlur={() => handleBlur("name")}
                                    placeholder="Masukkan nama paket..."
                                    maxLength={80}
                                    autoComplete="off"
                                    aria-required="true"
                                    aria-describedby={touched.name && errors.name ? "err-name" : undefined}
                                    className={`${inputBase} ${touched.name && errors.name ? inputError : ""}`}
                                />
                            </FormField>

                            {/* Harga */}
                            <FormField
                                label="Harga Investasi (IDR)"
                                required
                                error={touched.price ? errors.price : undefined}
                                hint="Contoh: 99000 untuk Rp 99.000. Angka saja tanpa titik atau koma."
                            >
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
                                        aria-required="true"
                                        aria-describedby={touched.price && errors.price ? "err-price" : undefined}
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
                            </FormField>

                            {/* Durasi */}
                            <FormField
                                label="Durasi Paket"
                                required
                                error={touched.duration ? errors.duration : undefined}
                                hint="Contoh: 1 Minggu, 3 Hari, 1 Bulan"
                            >
                                <div className="relative">
                                    <input
                                        id="field-duration"
                                        type="text"
                                        value={duration}
                                        onChange={(e) => {
                                            setDuration(e.target.value);
                                            setShowDurationSuggestions(true);
                                        }}
                                        onBlur={() => {
                                            // Delay close to allow click on suggestion
                                            setTimeout(() => setShowDurationSuggestions(false), 150);
                                            handleBlur("duration");
                                        }}
                                        onFocus={() => setShowDurationSuggestions(true)}
                                        placeholder="Contoh: 1 Minggu"
                                        autoComplete="off"
                                        aria-required="true"
                                        className={`${inputBase} ${touched.duration && errors.duration ? inputError : ""}`}
                                    />

                                    {/* Dropdown Suggestions */}
                                    {showDurationSuggestions && (
                                        <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                                            <div className="p-1.5 flex flex-wrap gap-1.5">
                                                {DURATION_SUGGESTIONS.filter(
                                                    (s) => !duration || s.toLowerCase().includes(duration.toLowerCase())
                                                ).map((sug) => (
                                                    <button
                                                        key={sug}
                                                        type="button"
                                                        onMouseDown={() => {
                                                            setDuration(sug);
                                                            setShowDurationSuggestions(false);
                                                        }}
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
                            <FormField
                                label="Deskripsi Paket"
                                required
                                error={touched.description ? errors.description : undefined}
                                hint={`${charCount}/300 karakter. Jelaskan secara singkat keunggulan dan sasaran paket ini.`}
                            >
                                <textarea
                                    id="field-description"
                                    value={description}
                                    onChange={(e) => {
                                        setDescription(e.target.value);
                                        setCharCount(e.target.value.length);
                                    }}
                                    onBlur={() => handleBlur("description")}
                                    placeholder="Contoh: Paket basic untuk mahasiswa yang baru mulai mempersiapkan diri menghadapi sidang skripsi..."
                                    rows={4}
                                    maxLength={300}
                                    aria-required="true"
                                    className={`${inputBase} resize-none leading-relaxed ${touched.description && errors.description ? inputError : ""}`}
                                />
                                <div className="self-end">
                                    <span
                                        className={`text-[11px] font-mono ${charCount > 270 ? "text-amber-500" : "text-slate-400"}`}
                                    >
                                        {charCount}/300
                                    </span>
                                </div>
                            </FormField>
                        </div>
                    </div>

                    {/* Right Column: Preview Card */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            <div className="rounded-3xl border border-indigo-200/50 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/50 dark:to-slate-900/80 p-5 shadow-sm">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Pratinjau Kartu
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
                                        {price ? (
                                            <span>Rp {formatDisplayPrice(price)}</span>
                                        ) : (
                                            <span className="text-slate-400 font-normal text-sm italic">Rp 0</span>
                                        )}
                                    </div>

                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 min-h-[2rem]">
                                        {description.trim() || <span className="italic">Deskripsi paket akan tampil di sini...</span>}
                                    </p>

                                    <hr className="border-slate-100 dark:border-white/5 mb-3" />

                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                        Benefit ({validBenefitCount})
                                    </p>
                                    <ul className="space-y-1.5">
                                        {benefits
                                            .filter((b) => b.trim())
                                            .slice(0, 4)
                                            .map((b, i) => (
                                                <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                                                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span className="line-clamp-1">{b}</span>
                                                </li>
                                            ))}
                                        {validBenefitCount === 0 && (
                                            <li className="text-[11px] italic text-slate-400">Belum ada benefit...</li>
                                        )}
                                        {validBenefitCount > 4 && (
                                            <li className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                                                + {validBenefitCount - 4} lainnya
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Benefits Section ─────────────────────────────────────────── */}
                <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 backdrop-blur p-6 sm:p-8 shadow-sm">
                    <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-white/5 mb-6">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    Daftar Benefit &amp; Fasilitas
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Tambahkan keunggulan yang didapat oleh peserta
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
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.97]"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Tambah Benefit
                            </button>
                        </div>
                    </div>

                    {/* Global benefits error */}
                    {touched.benefits && errors.benefits && (
                        <div
                            role="alert"
                            className="flex items-center gap-2 p-3 mb-5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs font-medium text-red-600 dark:text-red-400"
                        >
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {errors.benefits}
                        </div>
                    )}

                    <div className="space-y-3">
                        {benefits.map((benefit, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2.5 group"
                            >
                                {/* Drag order indicator */}
                                <div className="flex flex-col gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => moveBenefit(index, index - 1)}
                                        disabled={index === 0}
                                        className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 disabled:opacity-30 transition-colors cursor-pointer"
                                        aria-label={`Naikkan benefit ke-${index + 1}`}
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveBenefit(index, index + 1)}
                                        disabled={index === benefits.length - 1}
                                        className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 disabled:opacity-30 transition-colors cursor-pointer"
                                        aria-label={`Turunkan benefit ke-${index + 1}`}
                                    >
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
                                        onChange={(e) => {
                                            handleBenefitChange(index, e.target.value);
                                        }}
                                        onBlur={() => handleBlur("benefits")}
                                        placeholder={`Benefit ${index + 1} — contoh: Konsultasi via WhatsApp Group`}
                                        className={`${inputBase} pl-10 ${touched.benefits && errors.benefits && !benefit.trim() ? inputError : ""}`}
                                        aria-label={`Benefit ke-${index + 1}`}
                                    />
                                </div>

                                {/* Remove button */}
                                <button
                                    type="button"
                                    onClick={() => removeBenefit(index)}
                                    disabled={benefits.length <= 1}
                                    className="shrink-0 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/15 hover:border-red-300 dark:hover:border-red-500/30 hover:text-red-600 dark:hover:text-red-400 text-slate-400 dark:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
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
                            Pastikan setiap baris yang tampil diisi dengan benefit yang relevan.
                        </p>
                    </div>
                </div>

                {/* ── Form Action Footer ────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="text-red-400">*</span>
                        Kolom bertanda bintang wajib diisi sebelum menyimpan.
                    </p>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleDiscard}
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all duration-200 disabled:opacity-50 cursor-pointer"
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.45)] transition-all duration-200 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2.5"
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
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Simpan Kategori</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
