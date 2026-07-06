import EditCategoryClient from "./EditCategoryClient";

export const metadata = {
    title: "Edit Kategori | Ambismart Backoffice",
    description: "Perbarui data paket kategori bimbingan skripsi AmbiSmart",
};

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: Props) {
    const { id } = await params;
    return <EditCategoryClient id={id} />;
}
