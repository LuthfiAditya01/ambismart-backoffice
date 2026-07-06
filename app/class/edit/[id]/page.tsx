import EditClassClient from "./EditClassClient";

export const metadata = {
    title: "Edit Program Kelas | Ambismart Backoffice",
    description: "Perbarui data program kelas bimbingan skripsi AmbiSmart",
};

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditClassPage({ params }: Props) {
    const { id } = await params;
    return <EditClassClient id={id} />;
}
