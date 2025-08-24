import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useUIStateStore from "@/store/ui-state-store";

function ConfirmationDialog() {
  const { confirmationModal } = useUIStateStore();
  return (
    <>
      <Dialog
        open={confirmationModal.status}
        onOpenChange={(open) => {
          if (!open) confirmationModal.onCancel();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Please Confirm Before Proceeding</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>

          <p>Are you sure you want to {confirmationModal.actionText}?</p>

          <DialogFooter>
            <Button variant='destructive' onClick={confirmationModal.onCancel}>
              Cancel
            </Button>
            <Button onClick={confirmationModal.onConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
export default ConfirmationDialog;
