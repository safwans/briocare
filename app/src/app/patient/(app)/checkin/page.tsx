import { getPatientHome } from "@/lib/patient";
import CheckinFlow from "@/components/CheckinFlow";

export default async function CheckinPage() {
  const home = await getPatientHome();
  const groupHref = "/patient/group";
  return (
    <div className="max-w-md md:max-w-lg mx-auto px-5 md:px-6 py-6">
      <CheckinFlow groupHref={groupHref} />
    </div>
  );
}
