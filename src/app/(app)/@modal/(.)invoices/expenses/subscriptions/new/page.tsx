import Page from "../../../../../invoices/expenses/subscriptions/new/page";
import { AppModal } from "../../../../AppModal";

// invoices/expenses/subscriptions/new, opened from inside the app: in a window over the page (the full page on a direct link or refresh).
export default function InvoicesExpensesSubscriptionsNewModal() {
  return (
    <AppModal>
      <Page />
    </AppModal>
  );
}
