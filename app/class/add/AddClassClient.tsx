"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClass, CreateClassPayload } from "@/api/classCollection";
import { getCategories, CategoryItem } from "@/api/categoryCollection";
import Swal from "sweetalert2";
import { SyncLoader } from "react-spinners";

// ── Helpers ────────────────────────────────────────────────────────────────────

interface FormErrors {
    name?: string;
    categories?: string;
    color?: string;
}

function validateForm(data: {
    name: string;
    selectedCategories: string[];
    color: string;
}): FormErrors {
    const errors: FormErrors = {};

    if (!data.name.trim()) {
        errors.name = "Nama kelas wajib diisi.";
    } else if (data.name.trim().length < 3) {
        errors.name = "Nama kelas minimal 3 karakter.";
    }

    if (data.selectedCategories.length === 0) {
        errors.categories = "Pilih setidaknya 1 kategori paket.";
    }

    if (data.color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(data.color)) {
        errors.color = "Format hex tidak valid. Contoh: #0F172A";
    }

    return errors;
}

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

// ── Preset colors ──────────────────────────────────────────────────────────────

const PRESET_COLORS = [
    { hex: "#0F172A", label: "Navy" },
    { hex: "#6366F1", label: "Indigo" },
    { hex: "#0369A1", label: "Blue" },
    { hex: "#059669", label: "Emerald" },
    { hex: "#D97706", label: "Amber" },
    { hex: "#DC2626", label: "Red" },
    { hex: "#7C3AED", label: "Violet" },
    { hex: "#DB2777", label: "Pink" },
    { hex: "#374151", label: "Slate" },
    { hex: "#1D4ED8", label: "Royal Blue" },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AddClassClient() {
    const router = useRouter();

    // Category data
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [categorySearch, setCategorySearch] = useState("");

    // Form fields
    const [name, setName] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [description, setDescription] = useState("");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [features, setFeatures] = useState<string[]>(["", "", ""]);
    const [highlight, setHighlight] = useState(false);
    const [color, setColor] = useState("#0F172A");

    // UI state
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [descCharCount, setDescCharCount] = useState(0);

    // ── Fetch categories on mount ───────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                setIsLoadingCategories(true);
                const res = await getCategories();
                const data = res?.data?.data ?? [];
                setCategories(data);
            } catch {
                Swal.fire({
                    icon: "error",
                    title: "Gagal Memuat Kategori",
                    text: "Daftar kategori tidak dapat dimuat. Pastikan koneksi Anda stabil.",
                    confirmButtonColor: "#6366f1",
                });
            } finally {
                setIsLoadingCategories(false);
            }
        };
        load();
    }, []);

    // ── Category toggle ─────────────────────────────────────────────────────────
    const toggleCategory = (id: string) => {
        setSelectedCategories((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        );
    };

    const filteredCategories = categories.filter((c) =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase())
    );

    // ── Features helpers ────────────────────────────────────────────────────────
    const handleFeatureChange = (idx: number, val: string) => {
        setFeatures((prev) => prev.map((f, i) => (i === idx ? val : f)));
    };

    const addFeature = () => setFeatures((prev) => [...prev, ""]);

    const removeFeature = useCallback(
        (idx: number) => {
            if (features.length <= 1) return;
            setFeatures((prev) => prev.filter((_, i) => i !== idx));
        },
        [features.length]
    );

    const moveFeature = (from: number, to: number) => {
        if (to < 0 || to >= features.length) return;
        const arr = [...features];
        [arr[from], arr[to]] = [arr[to], arr[from]];
        setFeatures(arr);
    };

    // ── Validation ──────────────────────────────────────────────────────────────
    const handleBlur = (field: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        setErrors(validateForm({ name, selectedCategories, color }));
    };

    // ── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ name: true, categories: true, color: true });
        const errs = validateForm({ name, selectedCategories, color });
        setErrors(errs);

        if (Object.keys(errs).length > 0) {
            document.getElementById(`field-${Object.keys(errs)[0]}`)?.focus();
            return;
        }

        setIsSubmitting(true);
        const validFeatures = features.filter((f) => f.trim());
        const payload: CreateClassPayload = {
            name: name.trim(),
            categories: selectedCategories,
            ...(subtitle.trim() && { subtitle: subtitle.trim() }),
            ...(description.trim() && { description: description.trim() }),
            ...(validFeatures.length > 0 && { features: validFeatures }),
            highlight,
            color,
        };

        try {
            await createClass(payload);
            await Swal.fire({
                icon: "success",
                title: "Kelas Berhasil Ditambahkan! 🎉",
                html: `<p class="text-sm text-slate-600">Kelas <strong>${payload.name}</strong> telah berhasil disimpan.</p>`,
                confirmButtonColor: "#6366f1",
                confirmButtonText: "Lihat Daftar Kelas",
                showCancelButton: true,
                cancelButtonText: "Tambah Lagi",
                cancelButtonColor: "#64748b",
            }).then((result) => {
                if (result.isConfirmed) {
                    router.push("/class");
                } else {
                    setName(""); setSubtitle(""); setDescription("");
                    setSelectedCategories([]); setFeatures(["", "", ""]); setHighlight(false);
                    setColor("#0F172A"); setErrors({}); setTouched({}); setDescCharCount(0);
                }
            });
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } }; message?: string };
            Swal.fire({
                icon: "error",
                title: "Gagal Menyimpan Kelas",
                text: e?.response?.data?.message || e?.message || "Terjadi kesalahan. Silakan coba lagi.",
                confirmButtonColor: "#6366f1",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Discard ─────────────────────────────────────────────────────────────────
    const handleDiscard = () => {
        const isDirty = name.trim() || subtitle.trim() || description.trim() ||
            selectedCategories.length > 0 || features.some((f) => f.trim());
        if (!isDirty) { router.push("/class"); return; }
        Swal.fire({
            title: "Buang perubahan?",
            text: "Data yang sudah diisi akan hilang.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Ya, Buang",
            cancelButtonText: "Lanjut Mengisi",
        }).then((r) => { if (r.isConfirmed) router.push("/class"); });
    };

    const validFeatureCount = features.filter((f) => f.trim()).length;
    const selectedCategoryNames = categories.filter((c) => selectedCategories.includes(c._id));

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">
                <button type="button" onClick={handleDiscard}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all duration-200 shadow-sm cursor-pointer shrink-0"
                    aria-label="Kembali ke daftar kelas">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Kelas</span>
                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tambah Baru</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Tambah Kelas Baru
                    </h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
                {/* ── Live Preview Strip ───────────────────────────────────── */}
                <div
                    className="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 transition-all duration-300"
                    style={{
                        background: color ? `linear-gradient(135deg, ${color}18, ${color}08)` : undefined,
                        borderColor: color ? `${color}40` : undefined,
                    }}
                >
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Color swatch */}
                        <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border-2 border-white shadow-md shrink-0"
                                style={{ backgroundColor: color }} />
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{color}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">Nama:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs max-w-[150px] truncate">
                                {name.trim() || <span className="text-slate-400 italic">Belum diisi</span>}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">Kategori:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                {selectedCategories.length > 0 ? `${selectedCategories.length} dipilih` : <span className="text-slate-400 italic">—</span>}
                            </span>
                        </div>
                        {highlight && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                                ⭐ Highlight
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] font-medium text-indigo-500">Preview Langsung</span>
                </div>

                {/* ── Two-column Grid ─────────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    {/* Left — 3 cols: core info + features */}
                    <div className="xl:col-span-3 space-y-6">

                        {/* Section 1: Informasi Dasar */}
                        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 backdrop-blur p-6 sm:p-8 shadow-sm space-y-6">
                            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-white/5">
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Informasi Dasar</h2>
                                    <p className="text-xs text-slate-500">Identitas dan akses kelas</p>
                                </div>
                            </div>

                            {/* Nama */}
                            <FormField label="Nama Kelas" required error={touched.name ? errors.name : undefined} hint="Contoh: Sempro Intensive Bootcamp">
                                <input id="field-name" type="text" value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onBlur={() => handleBlur("name")}
                                    placeholder="Masukkan nama kelas..." maxLength={100} autoComplete="off"
                                    className={`${inputBase} ${touched.name && errors.name ? inputError : ""}`} />
                            </FormField>

                            {/* Subtitle */}
                            <FormField label="Subtitle" hint="Tagline singkat, muncul di bawah judul kelas (opsional)">
                                <input type="text" value={subtitle}
                                    onChange={(e) => setSubtitle(e.target.value)}
                                    placeholder="Contoh: Belajar dari nol sampai siap kerja"
                                    maxLength={120}
                                    className={inputBase} />
                            </FormField>

                            {/* Deskripsi */}
                            <FormField label="Deskripsi Kelas" hint={`${descCharCount}/500 karakter (opsional)`}>
                                <textarea value={description}
                                    onChange={(e) => { setDescription(e.target.value); setDescCharCount(e.target.value.length); }}
                                    placeholder="Jelaskan secara singkat program dan manfaat kelas ini..."
                                    rows={4} maxLength={500}
                                    className={`${inputBase} resize-none leading-relaxed`} />
                                <div className="self-end">
                                    <span className={`text-[11px] font-mono ${descCharCount > 450 ? "text-amber-500" : "text-slate-400"}`}>
                                        {descCharCount}/500
                                    </span>
                                </div>
                            </FormField>
                        </div>

                        {/* Section 2: Fitur / Features */}
                        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 backdrop-blur p-6 sm:p-8 shadow-sm">
                            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-white/5 mb-6">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Fitur Unggulan</h2>
                                        <p className="text-xs text-slate-500">Yang didapat peserta dari kelas ini (opsional)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-500/20">
                                        {validFeatureCount} aktif
                                    </span>
                                    <button type="button" onClick={addFeature}
                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-[0.97]">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Tambah
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-2.5">
                                        <div className="flex flex-col gap-1 shrink-0">
                                            <button type="button" onClick={() => moveFeature(idx, idx - 1)} disabled={idx === 0}
                                                className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-500 disabled:opacity-30 transition-colors cursor-pointer" aria-label="Naikkan">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                                </svg>
                                            </button>
                                            <button type="button" onClick={() => moveFeature(idx, idx + 1)} disabled={idx === features.length - 1}
                                                className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-500 disabled:opacity-30 transition-colors cursor-pointer" aria-label="Turunkan">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="flex-1 relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                </svg>
                                            </div>
                                            <input type="text" value={feature}
                                                onChange={(e) => handleFeatureChange(idx, e.target.value)}
                                                placeholder={`Fitur ${idx + 1} — contoh: Mentoring mingguan`}
                                                aria-label={`Fitur ke-${idx + 1}`}
                                                className={`${inputBase} pl-10`} />
                                        </div>
                                        <button type="button" onClick={() => removeFeature(idx)} disabled={features.length <= 1}
                                            className="shrink-0 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/15 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                            aria-label={`Hapus fitur ke-${idx + 1}`}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right — 2 cols: categories + appearance */}
                    <div className="xl:col-span-2 space-y-6">

                        {/* Section: Pilih Kategori */}
                        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 backdrop-blur shadow-sm overflow-hidden">
                            <div className="p-6 pb-0">
                                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-white/5 mb-4">
                                    <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                            Kategori Paket
                                            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                                        </h2>
                                        <p className="text-xs text-slate-500">Pilih paket yang tersedia di kelas ini</p>
                                    </div>
                                </div>

                                {/* Selected badges */}
                                {selectedCategoryNames.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {selectedCategoryNames.map((c) => (
                                            <span key={c._id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                                                <span className="max-w-[100px] truncate">{c.name}</span>
                                                <button type="button" onClick={() => toggleCategory(c._id)}
                                                    className="text-indigo-400 hover:text-indigo-700 cursor-pointer" aria-label={`Hapus ${c.name}`}>
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Search */}
                                <div className="relative mb-2">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="field-categories"
                                        type="text"
                                        value={categorySearch}
                                        onChange={(e) => setCategorySearch(e.target.value)}
                                        placeholder="Cari kategori..."
                                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Category list — scrollable */}
                            <div className="max-h-64 overflow-y-auto px-6 pb-4">
                                {isLoadingCategories ? (
                                    <div className="flex justify-center py-8">
                                        <SyncLoader color="#6366f1" size={6} speedMultiplier={0.8} />
                                    </div>
                                ) : filteredCategories.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-sm">
                                        {categories.length === 0 ? "Tidak ada kategori tersedia." : `Tidak ada hasil untuk "${categorySearch}".`}
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {filteredCategories.map((cat) => {
                                            const isSelected = selectedCategories.includes(cat._id);
                                            return (
                                                <button
                                                    key={cat._id}
                                                    type="button"
                                                    onClick={() => {
                                                        toggleCategory(cat._id);
                                                        setTouched((p) => ({ ...p, categories: true }));
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                                                        isSelected
                                                            ? "bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                                                            : "bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:border-slate-300"
                                                    }`}
                                                    aria-pressed={isSelected}
                                                >
                                                    {/* Custom checkbox */}
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                                        isSelected
                                                            ? "bg-indigo-600 border-indigo-600"
                                                            : "border-slate-300 dark:border-slate-600"
                                                    }`}>
                                                        {isSelected && (
                                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold truncate">{cat.name}</p>
                                                        <p className="text-xs text-slate-400 font-mono">
                                                            Rp {new Intl.NumberFormat("id-ID").format(cat.price)}
                                                        </p>
                                                    </div>
                                                    {isSelected && (
                                                        <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Category error */}
                            {touched.categories && errors.categories && (
                                <div className="px-6 pb-4">
                                    <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {errors.categories}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Section: Tampilan & Visibilitas */}
                        <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 backdrop-blur p-6 shadow-sm space-y-5">
                            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-white/5">
                                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Tampilan &amp; Visibilitas</h2>
                                    <p className="text-xs text-slate-500">Warna tema dan pengaturan kelas</p>
                                </div>
                            </div>

                            {/* Color picker */}
                            <FormField label="Warna Tema Kelas" error={touched.color ? errors.color : undefined} hint="Warna utama yang merepresentasikan kelas ini">
                                {/* Preset swatches */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {PRESET_COLORS.map(({ hex, label }) => (
                                        <button
                                            key={hex}
                                            type="button"
                                            title={label}
                                            onClick={() => setColor(hex)}
                                            className={`w-7 h-7 rounded-lg border-2 transition-all cursor-pointer ${
                                                color === hex
                                                    ? "border-slate-900 dark:border-white scale-110 shadow-md"
                                                    : "border-transparent hover:scale-105 hover:border-slate-300"
                                            }`}
                                            style={{ backgroundColor: hex }}
                                            aria-label={`Pilih warna ${label}`}
                                        />
                                    ))}
                                </div>
                                {/* Hex input */}
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-xl border-2 border-slate-200 dark:border-white/10 shrink-0 transition-all"
                                        style={{ backgroundColor: color }} />
                                    <input
                                        id="field-color"
                                        type="text"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        onBlur={() => handleBlur("color")}
                                        placeholder="#0F172A"
                                        maxLength={7}
                                        className={`${inputBase} font-mono flex-1 ${touched.color && errors.color ? inputError : ""}`}
                                    />
                                </div>
                            </FormField>

                            {/* Highlight toggle */}
                            <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/15">
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Kelas Unggulan</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Tampilkan badge ⭐ &amp; prioritaskan di halaman utama
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={highlight}
                                    onClick={() => setHighlight((v) => !v)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                                        highlight
                                            ? "bg-amber-500 border-amber-500"
                                            : "bg-slate-200 dark:bg-slate-700 border-transparent"
                                    }`}
                                    aria-label="Toggle kelas unggulan"
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 mt-0.5 ${
                                        highlight ? "translate-x-5" : "translate-x-0.5"
                                    }`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer Actions ───────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="text-red-400">*</span>
                        Kolom bertanda bintang wajib diisi sebelum menyimpan.
                    </p>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button type="button" onClick={handleDiscard} disabled={isSubmitting}
                            className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all disabled:opacity-50 cursor-pointer">
                            Batal
                        </button>
                        <button type="submit" disabled={isSubmitting}
                            className="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.45)] transition-all duration-200 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2.5">
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
                                    <span>Simpan Kelas</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
