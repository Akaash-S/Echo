import React, { useState, useEffect } from 'react';
import { AuthUser, JournalSession, EndSessionResponse } from './types';
import { EchoApiClient } from './lib/api';
import { AuthScreen } from './components/AuthScreen';
import { JournalChat } from './components/JournalChat';
import { Sidebar } from './components/Sidebar';
import { PanelLeft } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    // Default demo session for immediate live interactive preview
    return {
      uid: 'user_alex_chen_demo',
      displayName: 'Alex Chen',
      email: 'alex.chen@example.com',
      token: 'fb_tok_user_alex_chen_demo',
    };
  });

  const [currentSession, setCurrentSession] = useState<JournalSession | null>(null);
  const [previousTheme, setPreviousTheme] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const [apiClient, setApiClient] = useState<EchoApiClient>(
    () => new EchoApiClient(currentUser?.token || '')
  );

  useEffect(() => {
    if (currentUser) {
      const client = new EchoApiClient(currentUser.token);
      setApiClient(client);
      startNewSessionWithClient(client);
    } else {
      setCurrentSession(null);
    }
  }, [currentUser?.uid]);

  const startNewSessionWithClient = async (client: EchoApiClient) => {
    setIsInitializing(true);
    try {
      const startRes = await client.startSession();
      // Assemble initial session state
      const newSession: JournalSession = {
        sessionId: startRes.sessionId,
        userId: currentUser?.uid || '',
        startedAt: startRes.startedAt,
        endedAt: null,
        messages: [
          {
            role: 'model',
            text: startRes.openingMessage,
            timestamp: startRes.startedAt,
          },
        ],
        summary: null,
        extractedTheme: null,
        followUpQuestion: null,
        followUpAsked: false,
        followUpReferencedNext: false,
      };
      setCurrentSession(newSession);
      setPreviousTheme(startRes.previousTheme);
    } catch (err) {
      console.error('Failed to start session', err);
      // Fallback local session state if network is loading
      const fallbackTime = new Date().toISOString();
      setCurrentSession({
        sessionId: `sess_${Date.now()}`,
        userId: currentUser?.uid || '',
        startedAt: fallbackTime,
        endedAt: null,
        messages: [
          {
            role: 'model',
            text: "Welcome to Echo. This is your private space to reflect, untangle thoughts, or brainstorm. What's on your mind today?",
            timestamp: fallbackTime,
          },
        ],
        summary: null,
        extractedTheme: null,
        followUpQuestion: null,
        followUpAsked: false,
        followUpReferencedNext: false,
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleStartNewSession = () => {
    if (apiClient) {
      startNewSessionWithClient(apiClient);
      setIsSidebarOpen(false);
    }
  };

  const handleSessionUpdated = (updatedSession: JournalSession) => {
    setCurrentSession(updatedSession);
  };

  const handleEndSessionSuccess = (analysis: EndSessionResponse) => {
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        summary: analysis.summary,
        extractedTheme: analysis.extractedTheme,
        followUpQuestion: analysis.followUpQuestion,
        endedAt: analysis.endedAt,
        followUpAsked: analysis.followUpAsked,
      });
    }
  };

  const handleSelectPastSession = (session: JournalSession) => {
    setCurrentSession(session);
    setPreviousTheme(null);
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentSession(null);
  };

  if (!currentUser) {
    return <AuthScreen onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="h-screen w-screen bg-stone-900 text-stone-100 flex overflow-hidden font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        api={apiClient}
        currentSessionId={currentSession?.sessionId || null}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onSelectSession={handleSelectPastSession}
        onNewSession={handleStartNewSession}
        onLogout={handleLogout}
        userEmail={currentUser.email}
      />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Mobile Header / Sidebar Toggle */}
        <div className="lg:hidden h-12 border-b border-stone-800 px-4 flex items-center justify-between bg-stone-950 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg"
            title="Open sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <span className="font-serif text-base text-stone-200 font-normal">Echo</span>
          <div className="w-5" />
        </div>

        {/* Conversation Column */}
        <JournalChat
          api={apiClient}
          currentSession={currentSession}
          previousTheme={previousTheme}
          onSessionUpdated={handleSessionUpdated}
          onEndSessionSuccess={handleEndSessionSuccess}
          onStartNewSession={handleStartNewSession}
        />
      </div>
    </div>
  );
}
