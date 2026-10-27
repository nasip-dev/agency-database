import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { PropertyForm, type PropertyFormValues } from "../property-form";
import { getFormOptions } from "../form-options";

export const metadata: Metadata = { title: "Новый объект — База недвижимости" };

export default async function NewPropertyPage() {
  const user = await requireUser();
  const { districts, agents } = await getFormOptions(user);

  const initial: PropertyFormValues = {
    type: "APARTMENT", rooms: null, districtId: null, area: null, floor: null, totalFloors: null, listPrice: null, ownerPrice: null,
    currency: "USD", ownerName: "", ownerPhone: "", notes: null, status: "ACTIVE", agentId: user.id,
    bargain: false, docsReady: false, urgent: false, furnished: false, renovated: false,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Новый объект</h1>
      <p className="mb-6 text-sm text-zinc-500">ID объекту присвоится автоматически после сохранения</p>
      <PropertyForm id={null} initial={initial} districts={districts} agents={agents} />
    </div>
  );
}
