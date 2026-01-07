import { Button } from "@/components/ui/button";
import { useState } from "react";
import { GameStoreData } from "@/types/Game";
import { getStatusIcon, getStatusColor } from "./utils";

export function GameStatusSelector({
  currentStatus,
  onStatusChange,
}: {
  currentStatus: GameStoreData["status"];
  onStatusChange: (status: GameStoreData["status"]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const StatusIcon = getStatusIcon(currentStatus);

  const statusOptions: { value: GameStoreData["status"]; label: string }[] = [
    { value: "not-played", label: "Not Played" },
    { value: "playing", label: "Playing" },
    { value: "played", label: "Played" },
    { value: "completed", label: "Completed" },
    { value: "beaten", label: "Beaten" },
    { value: "trash", label: "Trash" },
  ];

  const handleStatusSelect = (status: GameStoreData["status"]) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  return (
    <div className='relative'>
      <Button
        variant='outline'
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 ${getStatusColor(currentStatus)}`}
      >
        <StatusIcon className='w-4 h-4' />
        <span className='hidden sm:inline'>
          {statusOptions.find((s) => s.value === currentStatus)?.label ||
            "Not Played"}
        </span>
      </Button>

      {isOpen && (
        <>
          <div
            className='fixed inset-0 z-10'
            onClick={() => setIsOpen(false)}
          />
          <div className='absolute top-full mt-1 right-0 z-20 w-48 rounded-md shadow-lg border border-gray-200'>
            {statusOptions.map((option) => {
              const OptionIcon = getStatusIcon(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  className={`
                    w-full flex items-center gap-2 px-3 bg-card py-2 text-sm text-left hover:bg-gray-800
                    first:rounded-t-md last:rounded-b-md
                    ${option.value === currentStatus ? "bg-gray-900" : ""}
                  `}
                >
                  <OptionIcon className='w-4 h-4' />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
