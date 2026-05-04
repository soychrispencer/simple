'use client';

type AuthFeedbackProps = {
  message: string;
  tone?: 'error' | 'success';
  className?: string;
};

export function AuthFeedback({ message, tone = 'error', className = '' }: AuthFeedbackProps) {
  if (!message) return null;
  return (
    <div
      className={`rounded-xl p-4 text-sm ${className}`.trim()}
      style={{
        background: tone === 'success' ? 'var(--success)' : 'var(--error)',
        color: 'var(--accent-contrast)',
      }}
    >
      {message}
    </div>
  );
}
