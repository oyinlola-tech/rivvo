export function EmptyChatState() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[var(--chat-bg)] text-muted-foreground">
      <div className="w-64 h-64 mb-8 opacity-20">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h3 className="text-xl mb-2">Select a chat to start messaging</h3>
      <p className="text-sm">Choose a conversation from the sidebar</p>
    </div>
  );
}
