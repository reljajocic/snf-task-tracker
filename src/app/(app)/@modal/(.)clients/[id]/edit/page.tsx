import Page from "../../../../clients/[id]/edit/page";
import { AppModal } from "../../../AppModal";

// clients/[id]/edit, opened from inside the app: in a window over the page (the full page on a direct link or refresh).
export default function ClientsIdEditModal(props: PageProps<"/clients/[id]/edit">) {
  return (
    <AppModal>
      <Page {...props} />
    </AppModal>
  );
}
