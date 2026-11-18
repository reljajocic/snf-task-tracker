import Page from "../../../../../invoices/expenses/subscriptions/[id]/page";
import { AppModal } from "../../../../AppModal";

// invoices/expenses/subscriptions/[id], opened from inside the app: in a window over the page (the full page on a direct link or refresh).
export default function InvoicesExpensesSubscriptionsIdModal(props: PageProps<"/invoices/expenses/subscriptions/[id]">) {
  return (
    <AppModal>
      <Page {...props} />
    </AppModal>
  );
}
