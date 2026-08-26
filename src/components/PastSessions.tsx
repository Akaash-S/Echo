import React, { useState, useEffect } from 'react';
import { JournalSession } from '../types';
import { EchoApiClient } from '../lib/api';
import { BookOpen, Tag, Calendar, Clock, Sparkles, Trash2, ArrowRight, CheckCircle2, Search, Filter } from 'lucide-react';
import Markdown from 'react-markdown';

interface PastSessionsProps {
  api: EchoApiClient;
  onSelectSession: (session: JournalSession) => void;
  onStartNewSession: () => void;
}

export const PastSessions: React.FC<PastSessionsProps> = ({ api, onSelectSession, onStartNewSession }) => {
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const data = await api.listSessions();
      setSessions(data.sessions || []);
      if (data.sessions && data.sessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data.sessions[0].sessionId);
      }
    } catch (err) {
      console.error('Failed to list sessions', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this reflection?')) return;
    setIsDeleting(sessionId);
    try {
      await api.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    } finally {
      setIsDeleting(null);
    }
  };

  // Collect all unique themes
  const allThemes = Array.from(
    new Set(
      sessions
        .map((s) => s.extractedTheme)
        .filter((t): t is string => Boolean(t && t.trim()))
    )
  );

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      searchQuery === '' ||
      (s.title && s.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.summary && s.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.extractedTheme && s.extractedTheme.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.messages.some((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTheme = !selectedTheme || s.extractedTheme === selectedTheme;

    return matchesSearch && matchesTheme;
  });

  const activeDoc = sessions.find((s) => s.sessionId === selectedSessionId);

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 gap-6 overflow-hidden">
      {/* Sidebar List */}
      <div className="w-full lg:w-96 flex flex-col bg-stone-900 border border-stone-800 rounded-3xl p-4 shadow-xl shrink-0 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h2 className="font-serif font-bold text-base text-stone-100">Past Reflections</h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
            {sessions.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search themes or thoughts..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Themes Filter Tags */}
        {allThemes.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
            <button
              onClick={() => setSelectedTheme(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                selectedTheme === null
                  ? 'bg-amber-500 text-stone-950 font-semibold'
                  : 'bg-stone-800/80 text-stone-400 hover:text-stone-200'
              }`}
            >
              All
            </button>
            {allThemes.map((theme) => (
              <button
                key={theme}
                onClick={() => setSelectedTheme(theme === selectedTheme ? null : theme)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors capitalize ${
                  selectedTheme === theme
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'bg-stone-800/80 text-stone-400 hover:text-stone-200'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        )}

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-stone-500">Loading your journal entries...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              No journal reflections found matching your criteria.
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isSelected = session.sessionId === selectedSessionId;
              return (
                <div
                  key={session.sessionId}
                  onClick={() => setSelectedSessionId(session.sessionId)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                      : 'bg-stone-950/40 border-stone-800/60 hover:bg-stone-800/50 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`text-xs font-semibold line-clamp-1 ${isSelected ? 'text-amber-300' : 'text-stone-200'}`}>
                      {session.title || 'Untitled Reflection'}
                    </h3>
                    <button
                      onClick={(e) => handleDelete(session.sessionId, e)}
                      disabled={isDeleting === session.sessionId}
                      className="text-stone-500 hover:text-rose-400 p-1 rounded-md transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {session.extractedTheme && (
                    <div className="mb-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/20 capitalize">
                        {session.extractedTheme}
                      </span>
                    </div>
                  )}

                  {session.summary && (
                    <p className="text-[11px] text-stone-400 line-clamp-2 mb-2 font-sans">
                      {session.summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1.5 border-t border-stone-800/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(session.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span>{session.messages.length} messages</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Pane */}
      <div className="flex-1 flex flex-col bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl overflow-y-auto">
        {activeDoc ? (
          <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="pb-4 border-b border-stone-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-amber-400 font-mono">
                    /users/{activeDoc.userId}/sessions/{activeDoc.sessionId}
                  </span>
                </div>
                <h1 className="font-serif font-bold text-xl text-stone-100">
                  {activeDoc.title || 'Journal Reflection'}
                </h1>
                <p className="text-xs text-stone-400 mt-0.5">
                  Started {new Date(activeDoc.startedAt).toLocaleString()}
                  {activeDoc.endedAt && ` • Concluded ${new Date(activeDoc.endedAt).toLocaleTimeString()}`}
                </p>
              </div>

              <button
                onClick={() => onSelectSession(activeDoc)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center gap-1.5 shrink-0 transition-transform hover:scale-105"
              >
                <span>Continue In Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Extracted Theme & Executive Summary */}
            {activeDoc.extractedTheme && (
              <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
                  <Tag className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-stone-300">Identified Theme:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium capitalize">
                    {activeDoc.extractedTheme}
                  </span>
                </div>
                {activeDoc.summary && (
                  <div className="text-xs text-stone-300 leading-relaxed mt-2 pt-2 border-t border-stone-800">
                    <div className="markdown-body">
                      <Markdown>{activeDoc.summary}</Markdown>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Proactive Follow-Up Nudge */}
            {activeDoc.followUpQuestion && (
              <div className="bg-gradient-to-r from-amber-950/30 via-stone-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                  Proactive Follow-Up Question
                </span>
                <p className="text-sm font-serif italic text-amber-100">
                  "{activeDoc.followUpQuestion}"
                </p>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  {activeDoc.followUpReferencedNext
                    ? '✓ Referenced in your subsequent journal session opener'
                    : 'Available for contextual next-session callback'}
                </span>
              </div>
            )}

            {/* Full Conversation History */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Conversation Transcript ({activeDoc.messages.length} turns)
              </h3>
              <div className="space-y-3">
                {activeDoc.messages.map((msg, idx) => (
                  <div
                    key={msg.id || idx}
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-amber-600/20 border border-amber-500/30 text-amber-100 ml-6'
                        : 'bg-stone-950/80 border border-stone-800 text-stone-300 mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
                      <span className="font-semibold uppercase tracking-wider text-amber-400/80">
                        {msg.role === 'user' ? 'You' : 'Echo'}
                      </span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="markdown-body text-xs">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-stone-500">
            <BookOpen className="w-12 h-12 text-stone-700 mb-3" />
            <p className="text-sm">Select a reflection from the left to read its summary and transcript.</p>
          </div>
        )}
      </div>
    </div>
  );
};
