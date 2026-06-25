type InlineErrorSlotProps = {
  message: string;
  id?: string;
};

function InlineErrorSlot({ message, id }: InlineErrorSlotProps) {
  return (
    <p
      id={id}
      className={`inline-error-slot${message ? ' inline-error-slot--visible' : ''}`}
      aria-live="polite"
      aria-hidden={message ? undefined : true}
    >
      {message}
    </p>
  );
}

export default InlineErrorSlot;
