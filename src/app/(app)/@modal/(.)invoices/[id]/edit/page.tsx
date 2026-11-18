import Page from "../../../../invoices/[id]/edit/page";
import { AppModal } from "../../../AppModal";

// invoices/[id]/edit, opened from inside the app: in a window over the page (the full page on a direct link or refresh).
export default function InvoicesIdEditModal(props: PageProps<"/invoices/[id]/edit">) {
  return (
    <AppModal wide>
      <Page {...props} />
    </AppModal>
  );
}
