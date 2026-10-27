import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canEdit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCode } from "@/lib/format";
import { PropertyForm } from "../../property-form";
import { getFormOptions } from "../../form-options";

export const metadata: Metadata = { title: "Изменить объект — База недвижимости" };

export default async function EditPropertyPage({ params }: PageProps<"/objects/[id]/edit">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const property = Number.isInteger(id) ? await db.property.findUnique({ where: { id } }) : null;
  if (!property) notFound();
  if (!canEdit(user, property)) redirect(`/objects/${id}`);

  const { districts, agents } = await getFormOptions(user);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">
        Изменить объект <span className="font-mono text-zinc-500">{formatCode(property.id)}</span>
      </h1>
      <PropertyForm id={property.id} initial={property} districts={districts} agents={agents} />
    </div>
  );
}
