interface ErrorAlertProps {
  error: { message: string } | null | undefined;
  prefix?: string;
}

export function ErrorAlert({ error, prefix = "오류가 발생했습니다" }: ErrorAlertProps) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
      {prefix}: {error.message}
    </div>
  );
}
