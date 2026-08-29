import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, X, Sparkles, Loader2, Square, AlertCircle, RefreshCw } from 'lucide-react';
import { JournalSession, JournalMessage, EndSessionResponse } from '../types';
import { EchoApiClient } from '../lib/api';
import Markdown from 'react-markdown';

interface JournalChatProps {
  api: EchoApiClient;
  currentSession: JournalSession | null;
  previousTheme: string | null;
  isInitializing?: boolean;
  sessionError?: string | null;
  onSessionUpdated: (session: JournalSession) => void;
  onEndSessionSuccess: (analysis: EndSessionResponse) => void;
  onStartNewSession: () => void;
  onRetrySession?: () => void;
}

export const JournalChat: React.FC<JournalChatProps> = ({
  api,
  currentSession,
  previousTheme,
  isInitializing = false,
  sessionError = null,
  onSessionUpdated,
  onEndSessionSuccess,
  onStartNewSession,
  onRetrySession,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [endNudge, setEndNudge] = useState<{
    summary: string;
    extractedTheme: string | null;
    followUpQuestion: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isSending, endNudge, isInitializing]);

  // Adjust textarea height dynamically
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText.trim();
    if (!textToSend || isSending || !currentSession || isInitializing) return;

    if (!customText) {
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
    setErrorMessage(null);
    setIsSending(true);

    // Optimistically add user turn
    const nowIso = new Date().toISOString();
    const tempUserMsg: JournalMessage = {
      role: 'user',
      text: textToSend,
      timestamp: nowIso,
    };

    const optimisticSession: JournalSession = {
      ...currentSession,
      messages: [...currentSession.messages, tempUserMsg],
    };
    onSessionUpdated(optimisticSession);

    try {
      const response = await api.sendMessage(currentSession.sessionId, textToSend);
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
    if (!currentSession || isEnding || isInitializing) return;
    setIsEnding(true);
    setErrorMessage(null);
    try {
      const result = await api.endSession(currentSession.sessionId);
      onEndSessionSuccess(result);
      if (result.followUpQuestion) {
        setEndNudge({
          summary: result.summary,
          extractedTheme: result.extractedTheme,
          followUpQuestion: result.followUpQuestion,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to synthesize session.');
    } finally {
      setIsEnding(false);
    }
  };

  const handleRespondToNudge = () => {
    if (!endNudge) return;
    setInputText(`Reflecting on: "${endNudge.followUpQuestion}" — `);
    setEndNudge(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const userMessagesCount = currentSession?.messages.filter((m) => m.role === 'user').length || 0;

  // Bug 1: If session start failed and there is no active session, show explicit error state with retry
  if (!currentSession && sessionError && !isInitializing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400 bg-stone-900">
        <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-900/60 flex items-center justify-center mb-4 text-rose-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-serif text-stone-200 mb-2 font-normal">Couldn't start session</h2>
        <p className="text-sm max-w-sm mb-6 text-stone-400 leading-relaxed">
          {sessionError}
        </p>
        <button
          onClick={onRetrySession || onStartNewSession}
          className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-white border border-stone-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry starting session</span>
        </button>
      </div>
    );
  }

  // If no session and not initializing and no error
  if (!currentSession && !isInitializing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400 bg-stone-900">
        <h2 className="text-xl font-serif text-stone-200 mb-2 font-normal">No active session</h2>
        <p className="text-sm max-w-sm mb-6 text-stone-400">
          Begin a clean session to reflect, think out loud, or brainstorm.
        </p>
        <button
          onClick={onStartNewSession}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium rounded-lg text-sm transition-colors cursor-pointer"
        >
          Start new session
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-900 text-stone-100">
      {/* Top toolbar */}
      <div className="h-14 border-b border-stone-800/80 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          {currentSession ? (
            <span>
              {new Date(currentSession.startedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          ) : (
            <span>New Reflection</span>
          )}

          {currentSession?.extractedTheme && (
            <>
              <span>•</span>
              <span className="text-amber-300/90 font-medium">
                {currentSession.extractedTheme}
              </span>
            </>
          )}
        </div>

        <div>
          <button
            id="end-session-action-btn"
            onClick={handleEndSession}
            disabled={isEnding || userMessagesCount === 0 || isInitializing}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
              userMessagesCount > 0 && !isInitializing
                ? 'border-stone-700 text-stone-300 hover:border-amber-500/50 hover:text-amber-300 bg-stone-850 cursor-pointer'
                : 'border-stone-800 text-stone-400 cursor-not-allowed opacity-50'
            }`}
            title={userMessagesCount === 0 ? 'Add at least one entry before ending' : 'End & synthesize session'}
          >
            {isEnding ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Square className="w-3 h-3 text-stone-400" />
                <span>End session</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Conversation Column (Bug 3: Mounted instantly) */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {errorMessage && (
            <div className="p-3 bg-stone-850 border border-rose-900/60 rounded-xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Bug 3: Loading Skeleton for Opening Message while backend resolves */}
          {isInitializing && (!currentSession || currentSession.messages.length === 0) && (
            <div className="flex flex-col items-start">
              <div className="text-[11px] text-stone-400 mb-1 px-1">Echo</div>
              <div className="bg-stone-850/80 border border-stone-800/80 rounded-2xl px-5 py-4 max-w-md flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                <span className="text-xs text-stone-300">
                  Echo is preparing your reflection space...
                </span>
              </div>
            </div>
          )}

          {/* Message Turns */}
          {currentSession?.messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
              >
                {/* Role indicator label */}
                <div className="text-[11px] text-stone-400 mb-1 px-1">
                  {isUser ? 'You' : 'Echo'}
                </div>

                {/* Message Body */}
                <div
                  className={`text-sm leading-relaxed ${
                    isUser
                      ? 'bg-stone-800 text-stone-100 px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[80%]'
                      : 'text-stone-200 px-1 py-1 max-w-full'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  ) : (
                    <div className="markdown-body">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex flex-col items-start">
              <div className="text-[11px] text-stone-400 mb-1 px-1">Echo</div>
              <div className="flex items-center gap-1.5 text-stone-400 text-xs py-2 px-1">
                <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-pulse" />
                <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-pulse [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* End-of-Session Nudge */}
      {endNudge && (
        <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 mb-3">
          <div className="bg-stone-850 border border-stone-750 rounded-2xl p-4 shadow-lg relative transition-all">
            <button
              onClick={() => setEndNudge(null)}
              className="absolute top-3 right-3 text-stone-400 hover:text-stone-300 p-1 rounded-md"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-xs text-amber-300/90 font-medium mb-1 flex items-center gap-1.5">
              <span>Session Concluded</span>
              {endNudge.extractedTheme && (
                <span className="text-stone-400 text-[11px]">
                  • {endNudge.extractedTheme}
                </span>
              )}
            </div>

            <p className="text-xs text-stone-300 mb-3 leading-relaxed">
              {endNudge.summary}
            </p>

            <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 mb-3">
              <div className="text-[11px] text-stone-400 mb-1 font-medium">
                Ponder for next time:
              </div>
              <div className="text-xs text-stone-200 font-serif italic">
                "{endNudge.followUpQuestion}"
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setEndNudge(null)}
                className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={handleRespondToNudge}
                className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium rounded-lg transition-colors cursor-pointer"
              >
                Reflect further
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Composer fixed at bottom (Bug 3: Focusable immediately, send enabled when session ready) */}
      <div className="border-t border-stone-800/80 bg-stone-900/95 backdrop-blur-md px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2 bg-stone-850 border border-stone-750 focus-within:border-stone-600 rounded-2xl p-2.5 transition-colors"
          >
            <textarea
              ref={textareaRef}
              id="composer-textarea"
              value={inputText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={isInitializing ? 'Preparing session... you can start typing' : "What's on your mind?"}
              className="flex-1 bg-transparent text-sm text-stone-100 placeholder:text-stone-400 focus:outline-none resize-none px-2 py-1 max-h-48 leading-relaxed"
            />

            <button
              type="submit"
              id="send-message-button"
              disabled={!inputText.trim() || isSending || isInitializing || !currentSession}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                inputText.trim() && !isSending && !isInitializing && currentSession
                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                  : 'bg-stone-800 text-stone-400 cursor-not-allowed opacity-60'
              }`}
              title={isInitializing ? 'Connecting to Echo...' : 'Send (Enter)'}
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          <div className="text-[11px] text-stone-400 text-center mt-2 font-mono">
            {isInitializing ? 'Connecting to secure session...' : 'Return to send • Shift + Return for new line'}
          </div>
        </div>
      </div>
    </div>
  );
};
