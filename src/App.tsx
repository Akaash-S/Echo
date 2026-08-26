import React, { useState, useEffect } from 'react';
import { AuthUser, JournalSession, EndSessionResponse } from './types';
import { EchoApiClient } from './lib/api';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { JournalChat } from './components/JournalChat';
import { EndOfSessionModal } from './components/EndOfSessionModal';
import { PastSessions } from './components/PastSessions';
import { SecurityComplianceView } from './components/SecurityComplianceView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>({
    uid: 'demo-user-alex',
    displayName: 'Alex Chen',
    email: 'alex.chen@google.com',
    token: 'fb_tok_demo-user-alex',
  });

  const [activeTab, setActiveTab] = useState<'journal' | 'archive' | 'security'>('journal');
  const [currentSession, setCurrentSession] = useState<JournalSession | null>(null);
  const [previousTheme, setPreviousTheme] = useState<string | null>(null);
  const [endSessionAnalysis, setEndSessionAnalysis] = useState<EndSessionResponse | null>(null);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const [apiClient, setApiClient] = useState<EchoApiClient>(
    () => new EchoApiClient(currentUser?.token || '')
  );

  useEffect(() => {
    if (currentUser) {
      const client = new EchoApiClient(currentUser.token);
      setApiClient(client);
      // Auto-start a session if none active
      startNewSessionWithClient(client);
    } else {
      setCurrentSession(null);
    }
  }, [currentUser?.uid]);

  const startNewSessionWithClient = async (client: EchoApiClient) => {
    setIsInitializing(true);
    try {
      const startRes = await client.startSession();
      setCurrentSession(startRes.session);
      setPreviousTheme(startRes.previousTheme);
      setActiveTab('journal');
    } catch (err) {
      console.error('Failed to start session', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleStartNewSession = () => {
    if (apiClient) {
      startNewSessionWithClient(apiClient);
    }
  };

  const handleSessionUpdated = (updatedSession: JournalSession) => {
    setCurrentSession(updatedSession);
  };

  const handleEndSessionSuccess = (analysis: EndSessionResponse) => {
    setEndSessionAnalysis(analysis);
    setCurrentSession(analysis.session);
    setIsEndModalOpen(true);
  };

  const handleAnswerFollowUp = (question: string) => {
    setIsEndModalOpen(false);
    if (currentSession) {
      // Append the follow-up question as a prompt from Echo to let user answer
      const updatedMessages = [
        ...currentSession.messages,
        {
          id: `msg_followup_${Date.now()}`,
          role: 'model' as const,
          text: `**Follow-Up Reflection:** ${question}`,
          timestamp: new Date().toISOString(),
        },
      ];
      setCurrentSession({
        ...currentSession,
        messages: updatedMessages,
      });
    }
  };

  const handleConcludeDone = () => {
    setIsEndModalOpen(false);
    setActiveTab('archive');
  };

  const handleSelectPastSession = (session: JournalSession) => {
    setCurrentSession(session);
    setPreviousTheme(null);
    setActiveTab('journal');
  };

  const handleSwitchUser = (newUser: AuthUser) => {
    setCurrentUser(newUser);
    setCurrentSession(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentSession(null);
  };

  if (!currentUser) {
    return <AuthScreen onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Navbar
        user={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNewSession={handleStartNewSession}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        hasActiveSession={Boolean(currentSession)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'journal' && (
          <JournalChat
            api={apiClient}
            currentSession={currentSession}
            previousTheme={previousTheme}
            onSessionUpdated={handleSessionUpdated}
            onEndSessionSuccess={handleEndSessionSuccess}
            onStartNewSession={handleStartNewSession}
          />
        )}

        {activeTab === 'archive' && (
          <PastSessions
            api={apiClient}
            onSelectSession={handleSelectPastSession}
            onStartNewSession={handleStartNewSession}
          />
        )}

        {activeTab === 'security' && (
          <SecurityComplianceView
            api={apiClient}
            currentUserUid={currentUser.uid}
          />
        )}
      </main>

      {/* Signature End-of-Session Nudge Modal */}
      {endSessionAnalysis && (
        <EndOfSessionModal
          analysis={endSessionAnalysis}
          isOpen={isEndModalOpen}
          onClose={() => setIsEndModalOpen(false)}
          onAnswerFollowUp={handleAnswerFollowUp}
          onDone={handleConcludeDone}
        />
      )}
    </div>
  );
}
