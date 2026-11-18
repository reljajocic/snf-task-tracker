import Page from "../../../../../content/shoots/[id]/edit/page";
import { AppModal } from "../../../../AppModal";

// content/shoots/[id]/edit, opened from inside the app: in a window over the page (the full page on a direct link or refresh).
export default function ContentShootsIdEditModal(props: PageProps<"/content/shoots/[id]/edit">) {
  return (
    <AppModal>
      <Page {...props} />
    </AppModal>
  );
}
