import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { AuthUser, JournalSession, EndSessionResponse } from './types';
import { EchoApiClient } from './lib/api';
import { AuthScreen } from './components/AuthScreen';
import { JournalChat } from './components/JournalChat';
import { Sidebar } from './components/Sidebar';
import { PanelLeft, Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [currentSession, setCurrentSession] = useState<JournalSession | null>(null);
  const [previousTheme, setPreviousTheme] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitializingSession, setIsInitializingSession] = useState(false);

  const [apiClient, setApiClient] = useState<EchoApiClient>(
    () => new EchoApiClient('')
  );

  // Monitor Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const authUser: AuthUser = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Journaler',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || undefined,
            token,
          };
          setCurrentUser(authUser);
          const client = new EchoApiClient(token);
          setApiClient(client);
          await startNewSessionWithClient(client, authUser.uid);
        } catch (err) {
          console.error('Failed to get user token on auth state change:', err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        setCurrentSession(null);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const startNewSessionWithClient = async (client: EchoApiClient, uid: string) => {
    setIsInitializingSession(true);
    try {
      const startRes = await client.startSession();
      const newSession: JournalSession = {
        sessionId: startRes.sessionId,
        userId: uid,
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
      console.error('Failed to start session with backend API', err);
      // Fallback local initial state if backend is still starting up
      const fallbackTime = new Date().toISOString();
      setCurrentSession({
        sessionId: `sess_${Date.now()}`,
        userId: uid,
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
      setIsInitializingSession(false);
    }
  };

  const handleStartNewSession = () => {
    if (apiClient && currentUser) {
      startNewSessionWithClient(apiClient, currentUser.uid);
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
    setCurrentUser(null);
    setCurrentSession(null);
  };

  if (isAuthChecking) {
    return (
      <div className="h-screen w-screen bg-stone-900 text-stone-100 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

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
