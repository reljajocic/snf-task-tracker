import Page from "../../../../../invoices/expenses/[id]/edit/page";
import { AppModal } from "../../../../AppModal";

// invoices/expenses/[id]/edit, opened from inside the app: in a window over the page (the full page on a direct link or refresh).
export default function InvoicesExpensesIdEditModal(props: PageProps<"/invoices/expenses/[id]/edit">) {
  return (
    <AppModal>
      <Page {...props} />
    </AppModal>
  );
}
