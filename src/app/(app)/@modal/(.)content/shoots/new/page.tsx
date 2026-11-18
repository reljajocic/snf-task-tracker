import Page from "../../../../content/shoots/new/page";
import { AppModal } from "../../../AppModal";

// content/shoots/new, opened from inside the app: in a window over the page (the full page on a direct link or refresh).
export default function ContentShootsNewModal(props: PageProps<"/content/shoots/new">) {
  return (
    <AppModal>
      <Page {...props} />
    </AppModal>
  );
}
