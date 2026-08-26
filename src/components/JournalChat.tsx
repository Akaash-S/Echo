import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, CheckCircle2, RotateCcw, HelpCircle, Compass, MessageSquare, Loader2, ArrowRight } from 'lucide-react';
import { JournalSession, JournalMessage, EndSessionResponse } from '../types';
import { EchoApiClient } from '../lib/api';
import Markdown from 'react-markdown';

interface JournalChatProps {
  api: EchoApiClient;
  currentSession: JournalSession | null;
  previousTheme: string | null;
  onSessionUpdated: (session: JournalSession) => void;
  onEndSessionSuccess: (analysis: EndSessionResponse) => void;
  onStartNewSession: () => void;
}

export const JournalChat: React.FC<JournalChatProps> = ({
  api,
  currentSession,
  previousTheme,
  onSessionUpdated,
  onEndSessionSuccess,
  onStartNewSession,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isSending]);

  // Handle textarea auto-height
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending || !currentSession) return;

    const messageText = inputText.trim();
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setErrorMessage(null);
    setIsSending(true);

    // Optimistically update local message list for responsive feel
    const tempUserMsg: JournalMessage = {
      id: `temp_${Date.now()}`,
      role: 'user',
      text: messageText,
      timestamp: new Date().toISOString(),
    };

    const optimisticSession: JournalSession = {
      ...currentSession,
      messages: [...currentSession.messages, tempUserMsg],
    };
    onSessionUpdated(optimisticSession);

    try {
      const response = await api.sendMessage(currentSession.sessionId, messageText);
      const updatedSession: JournalSession = {
        ...currentSession,
        messages: response.messages,
      };
      onSessionUpdated(updatedSession);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to receive response from Echo.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEndSession = async () => {
    if (!currentSession || isEnding) return;
    setIsEnding(true);
    setErrorMessage(null);
    try {
      const result = await api.endSession(currentSession.sessionId);
      onEndSessionSuccess(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to synthesize session.');
    } finally {
      setIsEnding(false);
    }
  };

  const quickPrompts = [
    "I'm feeling conflicted about a key decision and want to explore both sides.",
    "Let's untangle my thoughts on this week's creative burnout.",
    "I want to brainstorm a strategy for my upcoming milestone.",
    "Reflecting on a breakthrough moment I had earlier today.",
  ];

  if (!currentSession) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-serif font-bold text-stone-100 mb-2">Begin a Reflective Session</h2>
        <p className="text-sm text-stone-400 max-w-md mb-6">
          Echo connects with your previous thoughts or welcomes a fresh journal entry.
        </p>
        <button
          onClick={onStartNewSession}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-2xl text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-105 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Start New Journal Entry
        </button>
      </div>
    );
  }

  const userMessagesCount = currentSession.messages.filter((m) => m.role === 'user').length;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] max-w-4xl w-full mx-auto px-4 sm:px-6 py-4">
      {/* Session Top Bar */}
      <div className="flex items-center justify-between py-2 px-4 rounded-2xl bg-stone-900/60 border border-stone-800/80 mb-4 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <h1 className="text-xs font-semibold text-stone-200 truncate max-w-[200px] sm:max-w-md">
              {currentSession.title || 'Current Journal Reflection'}
            </h1>
            <span className="text-[10px] text-stone-400">
              {new Date(currentSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
              {userMessagesCount} user reflections
            </span>
          </div>
        </div>

        <button
          id="end-session-header-btn"
          onClick={handleEndSession}
          disabled={isEnding || userMessagesCount === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            userMessagesCount > 0
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              : 'bg-stone-800/40 text-stone-500 border border-stone-800 cursor-not-allowed'
          }`}
          title={userMessagesCount === 0 ? 'Share at least one thought before reflecting' : 'End session and synthesize'}
        >
          {isEnding ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Synthesizing...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>End & Reflect</span>
            </>
          )}
        </button>
      </div>

      {/* Signature Feature: Next-Session Callback Banner */}
      {previousTheme && (
        <div
          id="next-session-callback-banner"
          className="mb-4 bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-amber-200/90 shadow-sm shrink-0"
        >
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-300">Continuous Memory Callback</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                Phase 3 Signature Feature
              </span>
            </div>
            <p className="text-stone-300 text-[11px] mt-0.5">
              Echo opened this session referencing your last theme: <span className="text-amber-300 font-medium">"{previousTheme}"</span>.
            </p>
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 shrink-0">
          {errorMessage}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4">
        {currentSession.messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id || index}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 font-bold text-xs mt-1">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-amber-600/90 text-stone-950 font-medium rounded-tr-sm shadow-md'
                    : 'bg-stone-900/90 border border-stone-800 text-stone-200 rounded-tl-sm shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-black/10 dark:border-white/5 text-[10px] opacity-70">
                  <span className="font-semibold uppercase tracking-wider">{isUser ? 'You' : 'Echo'}</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className={isUser ? 'whitespace-pre-wrap' : 'markdown-body text-stone-200'}>
                  {isUser ? (
                    msg.text
                  ) : (
                    <Markdown>{msg.text}</Markdown>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-stone-800 border border-stone-700 text-stone-300 flex items-center justify-center shrink-0 font-bold text-xs mt-1">
                  You
                </div>
              )}
            </div>
          );
        })}

        {isSending && (
          <div className="flex gap-3 justify-start items-center text-stone-400 text-xs py-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            </div>
            <div className="bg-stone-900 border border-stone-800 px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
              <span className="inline-block w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="inline-block w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="text-stone-400 text-xs ml-1">Echo is reflecting...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starters if only 1 opening message exists */}
      {userMessagesCount === 0 && (
        <div className="mb-3 shrink-0">
          <p className="text-[11px] text-stone-500 mb-2 font-medium">Quick starters to explore:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInputText(prompt)}
                className="text-left text-xs p-2.5 rounded-xl bg-stone-900/60 hover:bg-stone-850 border border-stone-800/80 hover:border-amber-500/40 text-stone-300 transition-colors flex items-center justify-between group"
              >
                <span className="truncate">{prompt}</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 shrink-0 ml-1" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="relative shrink-0">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-2.5 focus-within:border-amber-500/60 focus-within:ring-1 focus-within:ring-amber-500/30 transition-all shadow-xl">
          <textarea
            ref={textareaRef}
            id="journal-input-field"
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Write your thoughts, stream of consciousness, or ideas... (Press Enter to send)"
            className="w-full bg-transparent text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none resize-none px-2 py-1 max-h-40"
          />

          <div className="flex items-center justify-between pt-2 border-t border-stone-800/60 mt-1">
            <span className="text-[11px] text-stone-500 hidden sm:inline">
              Shift + Enter for new line • Backed by Firestore & Gemini 3.7
            </span>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="submit"
                id="send-reflection-btn"
                disabled={!inputText.trim() || isSending}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  inputText.trim() && !isSending
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/10'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
