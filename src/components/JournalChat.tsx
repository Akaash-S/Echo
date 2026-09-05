import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, X, Sparkles, Loader2, Square, AlertCircle, RefreshCw, MapPin, Clock, MessageSquarePlus, Compass, ArrowRight } from 'lucide-react';
import { JournalSession, JournalMessage, EndSessionResponse, ReminderStatusResponse, LocationCoords } from '../types';
import { EchoApiClient } from '../lib/api';
import Markdown from 'react-markdown';

interface JournalChatProps {
  api: EchoApiClient;
  currentSession: JournalSession | null;
  previousTheme: string | null;
  reminderStatus?: ReminderStatusResponse | null;
  isInitializing?: boolean;
  sessionError?: string | null;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
  onSessionUpdated: (session: JournalSession) => void;
  onEndSessionSuccess: (analysis: EndSessionResponse) => void;
  onStartNewSession: (location?: LocationCoords, initialPrompt?: string) => void;
  onRetrySession?: () => void;
}

export const JournalChat: React.FC<JournalChatProps> = ({
  api,
  currentSession,
  previousTheme,
  reminderStatus = null,
  isInitializing = false,
  sessionError = null,
  initialPrompt = null,
  onClearInitialPrompt,
  onSessionUpdated,
  onEndSessionSuccess,
  onStartNewSession,
  onRetrySession,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
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

  // Listen for initialPrompt to pre-fill and focus
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setInputText(initialPrompt);
      if (onClearInitialPrompt) {
        onClearInitialPrompt();
      }
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          adjustTextareaHeight();
        }
      }, 50);
    }
  }, [initialPrompt]);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, isSending, endNudge, isInitializing]);

  // Adjust textarea height dynamically with max limit and smooth scrolling
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 180; // Limit height before scrolling
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.height = `${maxHeight}px`;
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.height = `${Math.max(scrollHeight, 38)}px`;
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    adjustTextareaHeight();
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (!textToSend || isSending || !currentSession || isInitializing) return;

    if (customText === undefined) {
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '38px';
        textareaRef.current.style.overflowY = 'hidden';
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

  const userMessagesCount = currentSession?.messages.filter((m) => m.role === 'user').length || 0;
  const isSessionEnded = Boolean(currentSession?.endedAt);

  // If session start failed and there is no active session, show explicit error state with retry
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
          onClick={() => (onRetrySession ? onRetrySession() : onStartNewSession())}
          className="px-4 py-2 bg-stone-850 hover:bg-stone-800 text-stone-200 hover:text-white border border-stone-700 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
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
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-serif text-stone-200 mb-2 font-normal">No active reflection</h2>
        <p className="text-sm max-w-sm mb-6 text-stone-400">
          Begin a clean session to reflect, think out loud, or brainstorm.
        </p>
        <button
          onClick={() => onStartNewSession()}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl text-sm transition-colors cursor-pointer shadow-sm flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Start new reflection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-900 text-stone-100">
      {/* Top toolbar */}
      <div className="h-14 border-b border-stone-800/80 px-6 flex items-center justify-between shrink-0 bg-stone-900/90 backdrop-blur-md">
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
              <span className="text-amber-300/90 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                {currentSession.extractedTheme}
              </span>
            </>
          )}

          {currentSession?.location && (
            <>
              <span>•</span>
              <span className="text-stone-400 text-[11px] flex items-center gap-1 bg-stone-800/80 px-2 py-0.5 rounded-full">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>Geotagged</span>
              </span>
            </>
          )}

          {isSessionEnded && (
            <span className="text-stone-500 italic text-[11px] ml-1">
              (Ended)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isSessionEnded && (
            <button
              onClick={() => onStartNewSession(undefined, currentSession?.extractedTheme ? `Continuing my reflection on "${currentSession.extractedTheme}": ` : undefined)}
              className="text-xs px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 bg-stone-850 font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Start a new conversation inspired by this reflection"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Start in new conversation</span>
            </button>
          )}

          {!isSessionEnded && (
            <button
              id="end-session-action-btn"
              onClick={handleEndSession}
              disabled={isEnding || userMessagesCount === 0 || isInitializing}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 font-medium ${
                userMessagesCount > 0 && !isInitializing
                  ? 'border-stone-700 text-stone-300 hover:border-amber-500/50 hover:text-amber-300 bg-stone-850 cursor-pointer shadow-xs'
                  : 'border-stone-800 text-stone-400 cursor-not-allowed opacity-50'
              }`}
              title={userMessagesCount === 0 ? 'Add at least one entry before ending' : 'End & synthesize session'}
            >
              {isEnding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Square className="w-3 h-3 text-stone-400" />
                  <span>End session</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* In-App Reminder Banner (§2) */}
      {reminderStatus?.shouldRemind && !reminderDismissed && (
        <div className="bg-amber-950/40 border-b border-amber-800/50 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Welcome back. It's been {reminderStatus.daysSinceLastEntry} days since your last reflection. Take a few minutes to untangle your thoughts today.
            </span>
          </div>
          <button
            onClick={() => setReminderDismissed(true)}
            className="text-stone-400 hover:text-stone-200 p-1 rounded-md transition-colors cursor-pointer"
            title="Dismiss reminder"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Conversation Column */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {errorMessage && (
            <div className="p-3.5 bg-stone-850 border border-rose-900/60 rounded-2xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* If viewing a completed/saved past session: render prominent Reflection Highlight Banner at top */}
          {isSessionEnded && currentSession?.summary && (
            <div className="w-full animate-in fade-in duration-300">
              <div className="bg-gradient-to-br from-amber-950/30 via-stone-850/90 to-stone-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Reflection Highlight & Synthesis</span>
                  </div>
                  {currentSession.extractedTheme && (
                    <span className="text-xs bg-amber-500/15 text-amber-200 border border-amber-500/30 px-3 py-1 rounded-full font-medium">
                      {currentSession.extractedTheme}
                    </span>
                  )}
                </div>

                <div className="text-sm text-stone-200 leading-relaxed font-serif pl-3.5 border-l-2 border-amber-500/60">
                  {currentSession.summary}
                </div>

                {currentSession.followUpQuestion && (
                  <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 space-y-1.5">
                    <div className="text-[11px] text-amber-300/80 font-medium tracking-wide uppercase flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      <span>Takeaway for future reflection:</span>
                    </div>
                    <div className="text-xs text-stone-200 font-serif italic leading-relaxed">
                      "{currentSession.followUpQuestion}"
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-2.5 border-t border-stone-800/80">
                  <button
                    onClick={() =>
                      onStartNewSession(
                        undefined,
                        currentSession.extractedTheme
                          ? `Continuing from our reflection on "${currentSession.extractedTheme}": `
                          : currentSession.followUpQuestion
                          ? `Reflecting on "${currentSession.followUpQuestion}": `
                          : undefined
                      )
                    }
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    <span>Start this in a new conversation</span>
                  </button>
                  <button
                    onClick={() => onStartNewSession()}
                    className="px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Start fresh topic
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Skeleton for Opening Message while backend connects */}
          {isInitializing && (!currentSession || currentSession.messages.length === 0) && (
            <div className="flex flex-col items-start space-y-2">
              <div className="text-[11px] text-stone-500 font-medium px-1 tracking-wider uppercase">
                Echo
              </div>
              <div className="bg-stone-850/60 border border-stone-800/80 rounded-2xl px-5 py-4 max-w-md flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                <span className="text-xs text-stone-300">
                  Preparing your reflection space...
                </span>
              </div>
            </div>
          )}

          {/* Message Turns with Symmetrical Margin Pipes */}
          {currentSession?.messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isFirstOpener = index === 0 && !isUser;
            const isThemedCallback = isFirstOpener && Boolean(previousTheme && previousTheme.trim());

            // Themed Opener Card: Visibly distinct memory callback with action button
            if (isThemedCallback) {
              return (
                <div key={msg.id || index} className="w-full my-2 animate-in fade-in duration-300">
                  <div className="bg-gradient-to-b from-amber-950/20 via-stone-850/90 to-stone-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-md space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Echo Continuous Reflection</span>
                      </div>
                      <span className="text-xs bg-amber-500/15 text-amber-200 border border-amber-500/30 px-3 py-0.5 rounded-full font-medium">
                        Theme: {previousTheme}
                      </span>
                    </div>

                    <div className="text-sm text-stone-200 leading-relaxed font-serif pl-3.5 border-l-2 border-amber-500/60">
                      <Markdown>{msg.text}</Markdown>
                    </div>

                    {userMessagesCount === 0 && !isSessionEnded && (
                      <div className="pt-3 flex flex-wrap gap-2.5 border-t border-stone-800/80">
                        <button
                          onClick={() => handleSendMessage(`Following up on our prior reflection about "${previousTheme}": `)}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:scale-[1.01]"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Continue from "{previousTheme}"</span>
                        </button>
                        <button
                          onClick={() => {
                            setInputText("Something new is on my mind today: ");
                            textareaRef.current?.focus();
                            adjustTextareaHeight();
                          }}
                          className="px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Start fresh topic
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Generic Opener Card: Welcoming reflection card for first turn
            if (isFirstOpener) {
              return (
                <div key={msg.id || index} className="w-full my-2 animate-in fade-in duration-300">
                  <div className="bg-stone-850/70 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-stone-300 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Reflection Space</span>
                      </div>
                      <span className="text-xs text-stone-400">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className="text-sm text-stone-200 leading-relaxed font-serif pl-3.5 border-l-2 border-amber-500/50">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                </div>
              );
            }

            // Message Styling: Typography-led with bilateral margin pipes
            return (
              <div
                key={msg.id || index}
                className={`flex flex-col ${isUser ? 'items-end ml-auto' : 'items-start mr-auto'} max-w-[92%] sm:max-w-[88%]`}
              >
                {/* Role Label */}
                <div className="text-[11px] text-stone-500 font-medium mb-1.5 px-1 tracking-wider uppercase">
                  {isUser ? 'You' : 'Echo'}
                </div>

                {/* Turn Body with Pipe Accent */}
                <div
                  className={`text-sm leading-relaxed ${
                    isUser
                      ? 'text-stone-100 bg-transparent pl-3 pr-3 py-1 font-normal border-r-2 border-stone-600/90'
                      : 'text-stone-200 bg-transparent pl-3 pr-1 py-1 font-serif border-l-2 border-stone-600/90'
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

          {/* Clickable Quick Reflection Starters when chat has just started */}
          {userMessagesCount === 0 && !isInitializing && !isSessionEnded && (
            <div className="space-y-3 pt-2 animate-in fade-in duration-300">
              <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-1 flex items-center justify-between">
                <span>Reflection Starters</span>
                <span className="text-stone-400 text-[10px] lowercase font-normal">click to start</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    icon: '🌿',
                    title: "Headspace & Mood",
                    description: "Check in with your current mental state",
                    prompt: "I want to reflect on my headspace and how I'm feeling today."
                  },
                  {
                    icon: '💡',
                    title: "Untangle a Thought",
                    description: "Explore a lingering dilemma or decision",
                    prompt: "There's a thought that's been lingering in my mind that I want to untangle."
                  },
                  {
                    icon: '🎯',
                    title: "Clarify Priorities",
                    description: "Define what truly matters right now",
                    prompt: "I'd like to get clear on my top priorities and what needs my attention."
                  },
                  {
                    icon: '✍️',
                    title: "Stream of Consciousness",
                    description: "Freeform uncensored thoughts",
                    prompt: "Here is a stream of consciousness on what's going on right now: "
                  }
                ].map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputText(starter.prompt);
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                      adjustTextareaHeight();
                    }}
                    className="p-3.5 bg-stone-850/70 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/40 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-3 group shadow-xs"
                  >
                    <span className="text-xl shrink-0 p-1.5 rounded-xl bg-stone-900 border border-stone-800 group-hover:border-amber-500/30 transition-colors">
                      {starter.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-stone-200 group-hover:text-amber-200 font-semibold flex items-center justify-between">
                        <span>{starter.title}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <div className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                        {starter.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isSending && (
            <div className="flex flex-col items-start">
              <div className="text-[11px] text-stone-500 font-medium mb-1 px-1 tracking-wider uppercase">
                Echo
              </div>
              <div className="flex items-center gap-1.5 text-stone-400 text-xs py-2 pl-3 border-l-2 border-amber-500/40">
                <span className="w-1.5 h-1.5 bg-amber-400/80 rounded-full animate-pulse" />
                <span className="w-1.5 h-1.5 bg-amber-400/80 rounded-full animate-pulse [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-amber-400/80 rounded-full animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          {/* Persistent End-of-Session Reflection Summary inside conversation stream */}
          {(endNudge || (isSessionEnded && currentSession?.summary && !currentSession?.messages?.length)) && (
            <div className="w-full my-4 pt-4 border-t border-stone-800/80">
              <div className="bg-stone-850/90 border border-stone-750 rounded-2xl p-5 shadow-lg relative transition-all space-y-3">
                {endNudge && (
                  <button
                    onClick={() => setEndNudge(null)}
                    className="absolute top-3.5 right-3.5 text-stone-400 hover:text-stone-200 p-1 rounded-md transition-colors cursor-pointer"
                    title="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div className="flex items-center gap-2 text-xs font-medium text-amber-300/90">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Session Concluded</span>
                  {(endNudge?.extractedTheme || currentSession?.extractedTheme) && (
                    <span className="text-[11px] bg-amber-500/10 text-amber-300/90 border border-amber-500/20 px-2 py-0.5 rounded-full font-sans font-medium">
                      {endNudge?.extractedTheme || currentSession?.extractedTheme}
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-300 leading-relaxed pl-3 border-l-2 border-amber-500/40">
                  {endNudge?.summary || currentSession?.summary}
                </p>

                {(endNudge?.followUpQuestion || currentSession?.followUpQuestion) && (
                  <div className="bg-stone-900/90 border border-stone-800/90 rounded-xl p-3.5">
                    <div className="text-[11px] text-amber-300/80 mb-1 font-medium tracking-wide uppercase">
                      Between now and your next session:
                    </div>
                    <div className="text-xs text-stone-200 font-serif italic leading-relaxed">
                      "{endNudge?.followUpQuestion || currentSession?.followUpQuestion}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state prompt line */}
          {userMessagesCount === 0 && !isInitializing && !previousTheme && (
            <div className="w-full text-center py-2">
              <p className="text-[11px] text-stone-400 italic font-serif">
                Today is {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}. This is your private space to reflect, untangle thoughts, or brainstorm.
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Area: Completed Status Bar vs. Active Dynamic Composer */}
      <div className="border-t border-stone-800/80 bg-stone-900/95 backdrop-blur-md px-4 sm:px-6 py-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          {isSessionEnded ? (
            <div className="flex items-center justify-between gap-4 bg-stone-850/90 border border-stone-750 rounded-2xl p-3 px-4">
              <div className="flex items-center gap-2 text-xs text-stone-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span>This reflection is completed & saved.</span>
              </div>
              <button
                onClick={() =>
                  onStartNewSession(
                    undefined,
                    currentSession?.extractedTheme
                      ? `Continuing my reflection on "${currentSession.extractedTheme}": `
                      : undefined
                  )
                }
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start New Session</span>
              </button>
            </div>
          ) : (
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
                className="flex-1 bg-transparent text-sm text-stone-100 placeholder:text-stone-400 focus:outline-none resize-none px-2 py-1 leading-relaxed max-h-[180px] overflow-hidden"
                style={{ minHeight: '38px' }}
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
          )}

          {!isSessionEnded && (
            <div className="text-[11px] text-stone-400 text-center mt-2 font-mono">
              {isInitializing ? 'Connecting to secure session...' : 'Return to send • Shift + Return for new line'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
