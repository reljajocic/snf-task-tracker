import Page from "../../../../../clients/[id]/projects/new/page";
import { AppModal } from "../../../../AppModal";

// clients/[id]/projects/new, opened from inside the app: in a window over the page (the full page on a direct link or refresh).
export default function ClientsIdProjectsNewModal(props: PageProps<"/clients/[id]/projects/new">) {
  return (
    <AppModal>
      <Page {...props} />
    </AppModal>
  );
}
